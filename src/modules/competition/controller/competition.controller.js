const Pusher = require('pusher');
const mongoose = require('mongoose');
const competitionModel = require('../../../../DB/models/competition.model');
const userModel = require('../../../../DB/models/user.model');
const { shuffleAndBalanceMCQ } = require('../../../services/mcqShuffle.service');

// Initialize Pusher with keys provided by the user
const pusher = new Pusher({
  appId: "2159196",
  key: "06df370fb33f1263ec1f",
  secret: "7a18da6f618ed58c073b",
  cluster: "eu",
  useTLS: true
});

// Normalise Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩) → Western (0–9)
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const normalizeDigits = (str) => {
    if (!str) return str
    return String(str)
        .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => ARABIC_DIGITS.indexOf(d).toString())
        .trim()
}

// Grace period (seconds) after the timer / teacher end during which late
// (in-flight) score submissions are still accepted.
const SCORE_GRACE_SECONDS = 10

// Fields that reveal the correct answer and must never reach a student
const ANSWER_FIELDS = ['correctAnswer', 'answer', 'correctPicAnswer', 'answerPic', 'answerPicID']

// Pusher rejects payloads over 10KB and a failed broadcast must never turn an
// already-persisted DB change into a 502 for the client.
const safeTrigger = async (channel, event, data) => {
    try {
        await pusher.trigger(channel, event, data)
    } catch (err) {
        console.error(`[PUSHER] Failed to trigger '${event}' on '${channel}':`, err.message)
    }
}

const participantMatches = (p, id) => {
    if (!p || !id) return false
    const target = String(id)
    return (p.student && String(p.student._id || p.student) === target) || (p.guestId && String(p.guestId) === target)
}

// 1. Create a new competition lobby (Teacher only)
const createCompetition = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { title, questions, timer } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Competition title is required" });
        }

        let validatedTimer = Number(timer) || 300;
        // If teacher entered 1-15 (meaning minutes), convert to seconds
        if (validatedTimer > 0 && validatedTimer <= 15) {
            validatedTimer = validatedTimer * 60;
        }
        validatedTimer = Math.min(7200, Math.max(60, validatedTimer)); // Enforce 60s - 2h

        // Keep only valid, de-duplicated question IDs (a bad ID used to abort the save
        // with a cast error, and duplicates inflated the question count)
        const questionIds = Array.isArray(questions)
            ? [...new Set(questions.map(String))].filter(id => mongoose.Types.ObjectId.isValid(id))
            : [];
        if (questionIds.length === 0) {
            return res.status(400).json({ message: "You must add at least one question to the competition" });
        }

        const newCompetition = new competitionModel({
            title,
            createdBy: teacherID,
            questions: questionIds,
            timer: validatedTimer,
            status: 'lobby',
            participants: []
        });

        await newCompetition.save();

        // Economy: Reward teacher for creating a battle
        try {
            await userModel.updateOne({ _id: teacherID }, { $inc: { coins: 50 } });
        } catch (err) {
            console.error('Failed to reward teacher coins:', err);
        }

        // Fetch teacher name and school reference to send in global pusher notification
        const teacher = await userModel.findById(teacherID).select('userName createdBy role').populate('createdBy', 'userName');
        const teacherName = teacher ? teacher.userName : "Your Teacher";
        
        let schoolId = null;
        let schoolName = null;
        if (teacher) {
            if (teacher.role === 'School' || teacher.role === 'Admin' || teacher.role === 'IT') {
                schoolId = String(teacher._id);
                schoolName = teacher.userName;
            } else if (teacher.createdBy) {
                schoolId = String(teacher.createdBy._id || teacher.createdBy);
                schoolName = teacher.createdBy.userName;
            }
        }

        // Trigger real-time global battle notification for active students
        try {
            await pusher.trigger('global-battle-arena', 'battle-created', {
                competitionId: String(newCompetition._id),
                title: newCompetition.title,
                teacherName: teacherName,
                teacherId: String(teacherID),
                schoolId: schoolId,
                schoolName: schoolName
            });
            console.log(`[BROADCAST] Triggered battle-created globally for lobby ${newCompetition._id}`);
        } catch (pusherErr) {
            console.error('[BROADCAST] Global Pusher trigger error:', pusherErr.message);
        }

        res.status(201).json({ message: "success", competition: newCompetition });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 2. Get all competitions created by a teacher
const getTeacherCompetitions = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const competitions = await competitionModel.find({ createdBy: teacherID })
            .populate('questions', '-correctAnswer -chapter')
            .sort({ _id: -1 });

        res.json({ message: "success", competitions });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

const sanitizeCompetitionQuestions = (competitionObj) => {
    if (competitionObj && Array.isArray(competitionObj.questions)) {
        competitionObj.questions = shuffleAndBalanceMCQ(competitionObj.questions, { sanitize: true });
        // shuffleAndBalanceMCQ only strips the answer for the "happy path" of each
        // question type; strip every answer-revealing field unconditionally.
        competitionObj.questions.forEach(q => {
            if (q) ANSWER_FIELDS.forEach(field => { delete q[field]; });
        });
    }
    return competitionObj;
};

// 3. Get detailed status of a competition (Lobby / Live / Scores)
const getCompetitionDetails = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const requesterId = req.userData?._id;

        const competition = await competitionModel.findById(competitionId)
            .populate('participants.student', 'userName email')
            .populate('createdBy', 'userName email');

        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const isTeacher = !!requesterId && String(competition.createdBy?._id || competition.createdBy) === String(requesterId);

        // Questions are populated with their answers for everyone: the teacher needs
        // them for reports, students need them so the MCQ shuffler can place the
        // correct option before the answer fields are stripped below.
        await competition.populate({
            path: 'questions',
            select: '-chapter'
        });

        let competitionObj = competition.toObject();
        if (competitionObj.participants && Array.isArray(competitionObj.participants)) {
            competitionObj.participants.forEach(p => {
                if (!p.student && p.guestId) {
                    p.student = {
                        _id: p.guestId,
                        userName: p.guestName || "Guest",
                        email: "Guest Account"
                    };
                }
            });
        }
        if (!isTeacher) {
            competitionObj = sanitizeCompetitionQuestions(competitionObj);
            // Other participants' graded answers would reveal which answers are
            // correct mid-battle. Students only get their own answer log.
            (competitionObj.participants || []).forEach(p => {
                if (!participantMatches(p, requesterId)) {
                    p.answers = [];
                }
            });
        }

        const serverNow = Date.now();
        let remainingSeconds = competitionObj.timer || 300;
        if (competitionObj.status === 'active' && competitionObj.startedAt) {
            const elapsed = Math.max(0, Math.floor((serverNow - new Date(competitionObj.startedAt).getTime()) / 1000));
            remainingSeconds = Math.max(0, (competitionObj.timer || 300) - elapsed);
        }
        competitionObj.remainingSeconds = remainingSeconds;
        competitionObj.serverNow = serverNow;

        res.json({ message: "success", competition: competitionObj });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 4. Student joins the competition lobby
const joinCompetition = async (req, res) => {
    try {
        const { competitionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        let studentID = req.userData ? req.userData._id : null;
        let userName = req.userData ? req.userData.userName : null;
        let addedByTeacher = false;

        if (req.userData && req.userData.role === 'Teacher' && req.body.studentId && String(req.body.studentId) !== String(req.userData._id)) {
            // Teacher is "summoning" one of their students into the lobby
            if (!mongoose.Types.ObjectId.isValid(req.body.studentId)) {
                return res.status(400).json({ message: "Invalid student ID" });
            }
            const foundStudent = await userModel.findById(req.body.studentId).select('userName');
            if (!foundStudent) {
                return res.status(404).json({ message: "Student not found" });
            }
            studentID = foundStudent._id;
            userName = foundStudent.userName;
            addedByTeacher = true;
        } else if (!studentID) {
            const candidateId = req.body.studentId;
            if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
                try {
                    const foundUser = await userModel.findById(candidateId).select('userName');
                    if (foundUser) {
                        studentID = foundUser._id;
                        userName = foundUser.userName;
                    }
                } catch (e) {
                    console.error('[JOIN] User lookup error for candidateId:', candidateId, e);
                }
            }
            if (!studentID) {
                return res.status(401).json({ message: "Guests are not allowed. Only logged-in students can join competitions. Please log in first." });
            }
        }

        const competition = await competitionModel.findById(competitionId).select('status createdBy participants.student participants.guestId');
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (addedByTeacher && String(competition.createdBy) !== String(req.userData._id)) {
            return res.status(403).json({ message: "Only the host teacher can add students to this competition" });
        }

        // A participant re-opening the page (refresh / reconnect) is always allowed
        // back in, even once the battle has started.
        const isAlreadyParticipant = competition.participants.some(p => participantMatches(p, studentID));
        if (isAlreadyParticipant) {
            if (addedByTeacher && competition.status === 'lobby') {
                await safeTrigger('global-battle-arena', 'force-join-student', { studentId: String(studentID), competitionId: String(competitionId) });
            }
            return res.json({ message: "success", alreadyJoined: true, competition: { _id: competition._id, status: competition.status } });
        }

        if (competition.status !== 'lobby') {
            return res.status(400).json({ message: "Cannot join. Competition has already started or finished." });
        }

        // Atomic conditional push: no duplicate entries when the same student
        // double-joins, and no lost joins when many students join at once.
        const updated = await competitionModel.findOneAndUpdate(
            { _id: competitionId, status: 'lobby', 'participants.student': { $ne: studentID } },
            { $push: { participants: { student: studentID, score: 0, totalAnswered: 0, wrongAnswers: 0, answers: [] } } },
            { new: true, projection: { status: 1 } }
        );

        if (!updated) {
            // Either someone else's request added this student first, or the teacher just started
            const latest = await competitionModel.findById(competitionId).select('status participants.student participants.guestId');
            if (latest && latest.participants.some(p => participantMatches(p, studentID))) {
                return res.json({ message: "success", alreadyJoined: true, competition: { _id: latest._id, status: latest.status } });
            }
            return res.status(400).json({ message: "Cannot join. Competition has already started or finished." });
        }

        await safeTrigger(`competition-${competitionId}`, 'student-joined', {
            studentId: String(studentID),
            userName: userName
        });

        if (addedByTeacher) {
            // Redirect the summoned student's open app straight into the lobby
            await safeTrigger('global-battle-arena', 'force-join-student', { studentId: String(studentID), competitionId: String(competitionId) });
        }

        res.json({ message: "success", competition: { _id: updated._id, status: updated.status } });
    } catch (error) {
        console.error('[JOIN] Error in joinCompetition:', error);
        res.status(502).json({ message: error.message });
    }
};

// 5. Start the competition (Teacher only)
const startCompetition = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { competitionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const existing = await competitionModel.findById(competitionId).select('createdBy status questions');
        if (!existing) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (String(existing.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Only the host teacher can start this competition" });
        }

        if (existing.status !== 'lobby') {
            return res.status(400).json({ message: "Competition is already started or finished" });
        }

        if (!existing.questions || existing.questions.length === 0) {
            return res.status(400).json({ message: "This competition has no questions" });
        }

        const serverNow = Date.now();
        // startedAt is 3s in the future to cover the synchronized 3-2-1 countdown.
        // The conditional update makes a double-click / double request start only once.
        const competition = await competitionModel.findOneAndUpdate(
            { _id: competitionId, createdBy: teacherID, status: 'lobby' },
            { $set: { status: 'active', startedAt: new Date(serverNow + 3000) } },
            { new: true }
        );

        if (!competition) {
            return res.status(400).json({ message: "Competition is already started or finished" });
        }

        let compObj = competition.toObject();
        compObj.remainingSeconds = competition.timer;
        compObj.serverNow = serverNow;

        // Economy: Reward teacher for starting a battle
        try {
            await userModel.updateOne({ _id: teacherID }, { $inc: { coins: 150 } });
        } catch (err) {
            console.error('Failed to reward teacher coins:', err);
        }

        // Broadcast "start-competition" event with start config to all listening students
        await safeTrigger(`competition-${competitionId}`, 'start-competition', {
            startedAt: competition.startedAt,
            timer: competition.timer,
            remainingSeconds: competition.timer,
            serverNow: serverNow,
            questionsCount: competition.questions.length
        });

        res.json({ message: "success", competition: compObj });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

const normalizeText = (val) => {
    if (val === undefined || val === null) return "";
    return normalizeDigits(String(val)).toLowerCase().trim();
};

const isAnswerCorrect = (q, studentAnswer) => {
    if (q.typeOfAnswer === 'MCQ') {
        return normalizeText(q.correctAnswer) !== "" && normalizeText(q.correctAnswer) === normalizeText(studentAnswer);
    }
    if (q.typeOfAnswer === 'Graph') {
        return String(q.correctPicAnswer || "").trim() !== "" && String(q.correctPicAnswer || "").trim() === String(studentAnswer || "").trim();
    }
    // Essay / Complete (default type)
    return Array.isArray(q.answer) && q.answer.map(normalizeText).includes(normalizeText(studentAnswer));
};

// 6. Submit a live score update (Student only)
const updateLiveScore = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const { finished, finishedAt: clientFinishedAt, answers, studentId, userName } = req.body;
        if (!mongoose.Types.ObjectId.isValid(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        let activeID = req.userData ? req.userData._id : (studentId || req.body.guestId);
        let activeName = req.userData ? req.userData.userName : (userName || req.body.guestName || 'Guest');

        if (!activeID) {
            return res.status(403).json({ message: "User identification missing" });
        }

        const competition = await competitionModel.findById(competitionId).populate('questions');
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const nowMs = Date.now();

        if (competition.status !== 'active' && competition.status !== 'finished') {
            return res.status(400).json({ message: "Competition is not active" });
        }

        // Timer validation (grace period covers network latency of the final submit)
        if (competition.startedAt && competition.timer) {
            const elapsedSeconds = (nowMs - new Date(competition.startedAt).getTime()) / 1000;
            if (elapsedSeconds > competition.timer + SCORE_GRACE_SECONDS) {
                return res.status(400).json({ message: "Competition time has expired." });
            }
        }

        // Students who submit just as the teacher ends the battle can still save their
        // final score, but only within the grace window - not indefinitely afterwards.
        if (competition.status === 'finished') {
            const endedMs = competition.endedAt ? new Date(competition.endedAt).getTime() : 0;
            if (!endedMs || nowMs - endedMs > SCORE_GRACE_SECONDS * 1000) {
                return res.status(400).json({ message: "Competition has already ended." });
            }
        }

        const participant = competition.participants.find(p => participantMatches(p, activeID));

        if (!participant) {
            return res.status(403).json({ message: "You are not a registered participant in this competition" });
        }

        // SECURE SCORING: grade every answer against the database. Scores sent by the
        // client are ignored. Answers are merged by question so an out-of-order
        // request carrying fewer answers can never erase newer ones.
        const questionMap = new Map(competition.questions.filter(Boolean).map(q => [String(q._id), q]));
        const mergedAnswers = new Map();
        (participant.answers || []).forEach(a => {
            if (a && a.question && questionMap.has(String(a.question))) {
                mergedAnswers.set(String(a.question), a.studentAnswer);
            }
        });
        if (Array.isArray(answers)) {
            answers.forEach(submittedAns => {
                if (!submittedAns || !submittedAns.question) return;
                const qId = String(submittedAns.question);
                if (!questionMap.has(qId)) return;
                const value = submittedAns.studentAnswer;
                if (value === undefined || value === null || String(value).trim() === "") return;
                mergedAnswers.set(qId, String(value));
            });
        }

        let secureScore = 0;
        let secureWrongAnswers = 0;
        const secureAnswers = [];
        mergedAnswers.forEach((studentAnswer, qId) => {
            const q = questionMap.get(qId);
            const isCorrect = isAnswerCorrect(q, studentAnswer);
            if (isCorrect) secureScore++;
            else secureWrongAnswers++;
            secureAnswers.push({ question: q._id, studentAnswer, isCorrect });
        });

        const update = {
            'participants.$.score': secureScore,
            'participants.$.totalAnswered': secureAnswers.length,
            'participants.$.wrongAnswers': secureWrongAnswers,
            'participants.$.answers': secureAnswers
        };

        let finishedAtValue = participant.finishedAt || null;
        if (finished && !participant.finishedAt) {
            let validatedFinishedAt = new Date(nowMs);
            if (clientFinishedAt) {
                const parsedDate = new Date(clientFinishedAt);
                if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() <= nowMs) {
                    validatedFinishedAt = parsedDate;
                }
            }
            if (competition.startedAt) {
                const startMs = new Date(competition.startedAt).getTime();
                if (validatedFinishedAt.getTime() < startMs) {
                    validatedFinishedAt = new Date(startMs);
                }
                if (competition.timer) {
                    const maxFinishMs = startMs + (competition.timer * 1000);
                    if (validatedFinishedAt.getTime() > maxFinishMs) {
                        validatedFinishedAt = new Date(maxFinishMs);
                    }
                }
            }
            update['participants.$.finishedAt'] = validatedFinishedAt;
            finishedAtValue = validatedFinishedAt;
        }

        // Positional update of this participant only: concurrent submissions from
        // other students no longer overwrite each other (or throw VersionError).
        const result = await competitionModel.updateOne(
            { _id: competitionId, 'participants._id': participant._id },
            { $set: update }
        );
        if (!result.matchedCount) {
            return res.status(403).json({ message: "You are not a registered participant in this competition" });
        }

        // Broadcast score update to the real-time scoreboard. The graded answers are
        // deliberately NOT broadcast: the channel is public and would leak correct
        // answers to other students (the teacher gets them from the details endpoint).
        await safeTrigger(`competition-${competitionId}`, 'score-updated', {
            studentId: String(activeID),
            userName: activeName,
            score: secureScore,
            totalAnswered: secureAnswers.length,
            wrongAnswers: secureWrongAnswers,
            finished: !!finishedAtValue,
            finishedAt: finishedAtValue
        });

        res.json({
            message: "success",
            answers: secureAnswers,
            score: secureScore,
            totalAnswered: secureAnswers.length,
            wrongAnswers: secureWrongAnswers,
            finishedAt: finishedAtValue
        });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

const rankParticipants = (participants) => [...participants].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);

    const aFinished = !!a.finishedAt;
    const bFinished = !!b.finishedAt;
    if (aFinished && !bFinished) return -1;
    if (!aFinished && bFinished) return 1;

    if (aFinished && bFinished) {
        const timeDiff = new Date(a.finishedAt) - new Date(b.finishedAt);
        if (timeDiff !== 0) return timeDiff;
    }

    const aWrong = a.wrongAnswers || 0;
    const bWrong = b.wrongAnswers || 0;
    if (aWrong !== bWrong) return aWrong - bWrong;

    const aTotal = Math.max(a.totalAnswered || 0, (a.answers && a.answers.length) || 0, (a.score || 0) + aWrong);
    const bTotal = Math.max(b.totalAnswered || 0, (b.answers && b.answers.length) || 0, (b.score || 0) + bWrong);
    return bTotal - aTotal;
});

// 7. Finish the competition (Teacher only or auto-ends on client timer)
const finishCompetition = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { competitionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const existing = await competitionModel.findById(competitionId).select('createdBy status');
        if (!existing) {
            return res.status(404).json({ message: "Competition not found" });
        }

        // Allow finishing if it is the host teacher
        if (String(existing.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Only the host teacher can force-end this competition" });
        }

        const now = new Date();

        // Atomic transition: only the first finish request (manual click, teacher
        // timer, retry...) does the work, so podium coins are awarded exactly once.
        const transitioned = await competitionModel.findOneAndUpdate(
            { _id: competitionId, createdBy: teacherID, status: { $ne: 'finished' } },
            { $set: { status: 'finished', endedAt: now } },
            { new: true }
        );

        if (!transitioned) {
            const alreadyFinished = await competitionModel.findById(competitionId);
            return res.json({ message: "success", alreadyFinished: true, competition: alreadyFinished });
        }

        const maxFinishMs = transitioned.startedAt && transitioned.timer
            ? new Date(transitioned.startedAt).getTime() + (transitioned.timer * 1000)
            : now.getTime();
        const cappedNow = new Date(Math.min(now.getTime(), maxFinishMs));

        // Stamp / clamp finish times with array filters so in-flight score updates
        // for individual participants are not overwritten.
        await competitionModel.updateOne(
            { _id: competitionId },
            { $set: { 'participants.$[unfinished].finishedAt': cappedNow } },
            { arrayFilters: [{ 'unfinished.finishedAt': null }] }
        );
        if (transitioned.startedAt && transitioned.timer) {
            await competitionModel.updateOne(
                { _id: competitionId },
                { $set: { 'participants.$[late].finishedAt': new Date(maxFinishMs) } },
                { arrayFilters: [{ 'late.finishedAt': { $gt: new Date(maxFinishMs) } }] }
            );
        }

        const competition = await competitionModel.findById(competitionId);

        // Economy: Award coins to top 3 participants
        try {
            const sortedParticipants = rankParticipants(competition.participants || []);
            const rewards = [50, 30, 10]; // 1st, 2nd, 3rd place rewards

            for (let i = 0; i < Math.min(sortedParticipants.length, 3); i++) {
                const participant = sortedParticipants[i];
                if (participant.score > 0) {
                    const studentId = participant.student || (participant.guestId && mongoose.Types.ObjectId.isValid(participant.guestId) ? participant.guestId : null);
                    if (studentId) {
                        await userModel.updateOne({ _id: studentId }, { $inc: { coins: rewards[i] } });
                        console.log(`Awarded ${rewards[i]} coins to student ${studentId} for placing #${i + 1}`);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to award competition coins:', err);
        }

        // Broadcast ending event so clients transition to the podium/results screen.
        // Keep the payload tiny (Pusher's limit is 10KB) - clients re-fetch details.
        await safeTrigger(`competition-${competitionId}`, 'competition-finished', {
            competitionId: String(competitionId),
            status: 'finished',
            endedAt: now
        });

        res.json({ message: "success", competition });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 8. Proxy helper to broadcast real-time events for Math Racer Multiplayer Game
const triggerMathRacerEvent = async (req, res) => {
    try {
        const { channelName, eventName, eventData } = req.body;
        console.log(`[MATHRACER] Proxy trigger event: ${eventName} on channel: ${channelName}`);

        if (typeof channelName !== 'string' || !channelName || typeof eventName !== 'string' || !eventName) {
            return res.status(400).json({ message: "channelName and eventName are required" });
        }

        // This proxy is unauthenticated. Competition channels and the global battle
        // arena are server-only: otherwise anyone could fake "competition-finished",
        // "score-updated", "student-kicked" or redirect students via "force-join-student".
        if (channelName.startsWith('competition-') || channelName === 'global-battle-arena' || channelName.startsWith('private-') || channelName.startsWith('presence-')) {
            return res.status(403).json({ message: "Broadcasting on this channel is not allowed" });
        }

        // Economy: Award coins for finishing 1st, 2nd, 3rd in Math Racer or Tanks Game
        if (eventName === 'mathracer-gameover' || eventName === 'tanks-gameover') {
            let parsedData = eventData;
            if (typeof eventData === 'string') {
                try { parsedData = JSON.parse(eventData); } catch (e) { console.error('[MATHRACER] Failed to parse eventData:', e); }
            }
            if (parsedData && Array.isArray(parsedData.ranks)) {
                const rewards = [50, 30, 10];
                for (let i = 0; i < Math.min(parsedData.ranks.length, 3); i++) {
                    const studentId = parsedData.ranks[i]?.id;
                    if (studentId) {
                        try {
                            const student = await userModel.findById(studentId);
                            if (student) {
                                student.coins = (student.coins || 0) + rewards[i];
                                await student.save();
                                console.log(`Awarded ${rewards[i]} coins to student ${student._id} for placing #${i+1} in ${eventName}`);
                            }
                        } catch (err) {
                            console.error(`Failed to award coins for ${eventName}:`, err);
                        }
                    }
                }
            }
        }

        await pusher.trigger(channelName, eventName, typeof eventData === 'string' ? eventData : JSON.stringify(eventData));
        res.json({ message: "success" });
    } catch (error) {
        console.error('[MATHRACER] Proxy trigger error:', error.message);
        res.status(502).json({ message: error.message });
    }
};

// 9. Kick/Remove a participant from the competition (Teacher host only)
const removeParticipant = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { competitionId } = req.params;
        const { participantId, studentId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const existing = await competitionModel.findById(competitionId).select('createdBy');
        if (!existing) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (String(existing.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Only the host teacher can remove participants" });
        }

        const targetId = String(participantId || studentId || '');
        if (!targetId) {
            return res.status(400).json({ message: "Participant target ID is required" });
        }

        const pullConditions = [{ guestId: targetId }];
        if (mongoose.Types.ObjectId.isValid(targetId)) {
            const oid = new mongoose.Types.ObjectId(targetId);
            pullConditions.push({ _id: oid }, { student: oid });
        }

        // Atomic $pull so a kick can't wipe out students joining at the same moment
        await competitionModel.updateOne(
            { _id: competitionId },
            { $pull: { participants: { $or: pullConditions } } }
        );

        // Return participants populated so the lobby keeps showing names, not IDs
        const competition = await competitionModel.findById(competitionId)
            .populate('participants.student', 'userName email');

        // Broadcast real-time kick event to update all client screens & kick the student
        await safeTrigger(`competition-${competitionId}`, 'student-kicked', {
            studentId: targetId
        });
        console.log(`[KICK] Removed participant ${targetId} from competition ${competitionId}`);

        res.json({ message: "success", competition });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

module.exports = {
    createCompetition,
    getTeacherCompetitions,
    getCompetitionDetails,
    joinCompetition,
    startCompetition,
    updateLiveScore,
    finishCompetition,
    removeParticipant,
    triggerMathRacerEvent
};
