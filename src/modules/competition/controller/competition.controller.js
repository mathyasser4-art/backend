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

// ─────────────────────────────────────────────────────────────────────────────
// Timing rules (all times are SERVER time)
//   startedAt              = moment the questions appear (3s after "Start", covers the 3-2-1)
//   deadline               = startedAt + timer
//   deadline + 10s         = last moment an answer submission is accepted (network latency)
//   deadline + 15s         = competition is finalized automatically if the host hasn't ended it
//                            (e.g. the teacher closed the tab), so ranks/coins are never stuck
// ─────────────────────────────────────────────────────────────────────────────
const SCORE_GRACE_MS = 10 * 1000
const AUTO_FINALIZE_AFTER_MS = 15 * 1000
const EARLY_START_TOLERANCE_MS = 1500
// A "finished" timestamp sent by the client may not be older than this (anti back-dating)
const FINISH_BACKDATE_LIMIT_MS = 20 * 1000
const PODIUM_REWARDS = [50, 30, 10]

// Fields that reveal the correct answer and must never reach a student
const ANSWER_FIELDS = ['correctAnswer', 'answer', 'correctPicAnswer', 'answerPic', 'answerPicID']

// Channel layout:
//  competition-<id>       : everyone (start / finished / kicked)
//  competition-<id>-host  : host teacher only (joins and live score updates). Keeping the
//                           high-volume score events off the shared channel cuts Pusher
//                           message usage by ~N times and keeps students' devices responsive.
const mainChannel = (id) => `competition-${id}`
const hostChannel = (id) => `competition-${id}-host`

// Pusher rejects payloads over 10KB and a failed broadcast must never turn an
// already-persisted DB change into a 502 for the client.
const safeTrigger = async (channel, event, data) => {
    try {
        await pusher.trigger(channel, event, data)
    } catch (err) {
        console.error(`[PUSHER] Failed to trigger '${event}' on '${channel}':`, err.message)
    }
}

const isValidId = (id) => !!id && mongoose.Types.ObjectId.isValid(String(id))

const participantMatches = (p, id) => {
    if (!p || !id) return false
    const target = String(id)
    return (p.student && String(p.student._id || p.student) === target) || (p.guestId && String(p.guestId) === target)
}

const getDeadlineMs = (competition) => {
    if (!competition || !competition.startedAt || !competition.timer) return null
    return new Date(competition.startedAt).getTime() + competition.timer * 1000
}

// ── Answer checking ──────────────────────────────────────────────────────────
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const normalizeDigits = (str) => {
    if (str === undefined || str === null) return ''
    return String(str)
        .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
        .replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d)))
        .trim()
}

const normalizeText = (val) => normalizeDigits(val).toLowerCase().replace(/\s+/g, ' ').trim()

// "05" == "5", "5.0" == "5", "1,000" == "1000", "−3" == "-3"
const toComparableNumber = (val) => {
    let str = normalizeDigits(val)
        .replace(/[\s ]/g, '')
        .replace(/[−–—]/g, '-')
        .replace(/٫/g, '.')   // Arabic decimal separator
        .replace(/٬/g, ',')   // Arabic thousands separator
    if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) str = str.replace(/,/g, '')
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(str)) return null
    const num = Number(str)
    return Number.isFinite(num) ? num : null
}

const textAnswersMatch = (expected, given) => {
    const a = normalizeText(expected)
    const b = normalizeText(given)
    if (!a || !b) return false
    if (a === b) return true
    const x = toComparableNumber(expected)
    const y = toComparableNumber(given)
    return x !== null && y !== null && x === y
}

const isAnswerCorrect = (q, studentAnswer) => {
    if (q.typeOfAnswer === 'MCQ') {
        const correct = normalizeText(q.correctAnswer)
        return correct !== '' && correct === normalizeText(studentAnswer)
    }
    if (q.typeOfAnswer === 'Graph') {
        const correct = String(q.correctPicAnswer || '').trim()
        return correct !== '' && correct === String(studentAnswer || '').trim()
    }
    // Essay / Complete (default type)
    return Array.isArray(q.answer) && q.answer.some(ans => textAnswersMatch(ans, studentAnswer))
}

// ── Ranking (the frontend's utils/competitionRanking.js mirrors this) ─────────
//  1. more correct answers
//  2. earlier finish time (completed all questions / reached final score sooner);
//     students without a finish time come last
//  3. fewer wrong answers
//  4. more questions answered
//  5. joined the lobby earlier (deterministic, never a coin flip)
const finishMs = (p) => (p && p.finishedAt ? new Date(p.finishedAt).getTime() : Number.POSITIVE_INFINITY)
const answeredCount = (p) => Math.max(p.totalAnswered || 0, (p.answers && p.answers.length) || 0)

const rankParticipants = (participants) => (participants || [])
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
        const x = a.p, y = b.p
        if ((y.score || 0) !== (x.score || 0)) return (y.score || 0) - (x.score || 0)
        const tx = finishMs(x), ty = finishMs(y)
        if (tx !== ty) return tx < ty ? -1 : 1
        if ((x.wrongAnswers || 0) !== (y.wrongAnswers || 0)) return (x.wrongAnswers || 0) - (y.wrongAnswers || 0)
        if (answeredCount(y) !== answeredCount(x)) return answeredCount(y) - answeredCount(x)
        const jx = x.joinedAt ? new Date(x.joinedAt).getTime() : 0
        const jy = y.joinedAt ? new Date(y.joinedAt).getTime() : 0
        if (jx !== jy) return jx - jy
        return a.index - b.index
    })
    .map(entry => entry.p)

// ── Finalization (shared by the teacher's "End" and the automatic expiry) ─────
const finalizeCompetition = async (competitionId, { teacherID = null } = {}) => {
    const now = new Date()
    const filter = { _id: competitionId, status: { $ne: 'finished' } }
    if (teacherID) filter.createdBy = teacherID

    // Atomic transition: only one caller (manual End, the teacher's timer, an
    // automatic expiry, a retry...) does the work, so coins are awarded exactly once.
    // From this moment every score update is rejected, so the ranking is frozen.
    const transitioned = await competitionModel.findOneAndUpdate(
        filter,
        { $set: { status: 'finished', endedAt: now } },
        { new: true }
    )
    if (!transitioned) return false

    const deadlineMs = getDeadlineMs(transitioned)
    const stampMs = deadlineMs ? Math.min(now.getTime(), deadlineMs) : now.getTime()

    // Students who never submitted "finished" get the end time (capped at the deadline)
    await competitionModel.updateOne(
        { _id: competitionId },
        { $set: { 'participants.$[unfinished].finishedAt': new Date(stampMs) } },
        { arrayFilters: [{ 'unfinished.finishedAt': null }] }
    )
    if (deadlineMs) {
        await competitionModel.updateOne(
            { _id: competitionId },
            { $set: { 'participants.$[late].finishedAt': new Date(deadlineMs) } },
            { arrayFilters: [{ 'late.finishedAt': { $gt: new Date(deadlineMs) } }] }
        )
    }

    const competition = await competitionModel.findById(competitionId)
    const ranked = rankParticipants(competition.participants || [])

    const ops = ranked.map((p, idx) => ({
        updateOne: {
            filter: { _id: competitionId },
            update: {
                $set: {
                    'participants.$[target].finalRank': idx + 1,
                    'participants.$[target].coinsAwarded': (idx < PODIUM_REWARDS.length && (p.score || 0) > 0) ? PODIUM_REWARDS[idx] : 0
                }
            },
            arrayFilters: [{ 'target._id': p._id }]
        }
    }))
    if (ops.length) {
        await competitionModel.bulkWrite(ops)
    }

    // Economy: award coins to the top 3 (only students who scored)
    for (let i = 0; i < Math.min(ranked.length, PODIUM_REWARDS.length); i++) {
        const participant = ranked[i]
        if ((participant.score || 0) <= 0) continue
        const studentId = participant.student || (isValidId(participant.guestId) ? participant.guestId : null)
        if (!studentId) continue
        try {
            await userModel.updateOne({ _id: studentId }, { $inc: { coins: PODIUM_REWARDS[i] } })
            console.log(`Awarded ${PODIUM_REWARDS[i]} coins to student ${studentId} for placing #${i + 1}`)
        } catch (err) {
            console.error('Failed to award competition coins:', err)
        }
    }

    // Tiny payload (Pusher's limit is 10KB) - clients re-fetch the results
    await safeTrigger(mainChannel(competitionId), 'competition-finished', {
        competitionId: String(competitionId),
        status: 'finished',
        endedAt: now
    })
    return true
}

// Finalizes an active competition whose time ran out long ago (host left / tab asleep)
const autoFinalizeIfExpired = async (competition) => {
    if (!competition || competition.status !== 'active') return false
    const deadlineMs = getDeadlineMs(competition)
    if (!deadlineMs || Date.now() <= deadlineMs + AUTO_FINALIZE_AFTER_MS) return false
    try {
        await finalizeCompetition(competition._id)
        return true
    } catch (err) {
        console.error('[AUTO-FINALIZE] Failed:', err.message)
        return false
    }
}

const timingInfo = (competition) => {
    const serverNow = Date.now()
    let remainingSeconds = competition.timer || 300
    const deadlineMs = getDeadlineMs(competition)
    if (competition.status === 'active' && deadlineMs) {
        const startMs = new Date(competition.startedAt).getTime()
        remainingSeconds = serverNow < startMs
            ? competition.timer
            : Math.max(0, Math.ceil((deadlineMs - serverNow) / 1000))
    } else if (competition.status === 'finished') {
        remainingSeconds = 0
    }
    return { serverNow, remainingSeconds, deadline: deadlineMs ? new Date(deadlineMs) : null }
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
        competitionObj.questions = shuffleAndBalanceMCQ(competitionObj.questions.filter(Boolean), { sanitize: true });
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
        if (!isValidId(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }
        // Identity comes from the auth token only: accepting an id from the query
        // string would let anyone read another student's graded answers.
        const requesterId = req.userData?._id || null;

        const loadCompetition = () => competitionModel.findById(competitionId)
            .populate('participants.student', 'userName email')
            .populate('createdBy', 'userName email');

        let competition = await loadCompetition();
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (await autoFinalizeIfExpired(competition)) {
            competition = await loadCompetition();
        }

        const isTeacher = !!req.userData && String(competition.createdBy?._id || competition.createdBy) === String(req.userData._id);

        // Questions are populated with their answers for everyone: the teacher needs
        // them for reports, students need them so the MCQ shuffler can place the
        // correct option before the answer fields are stripped below.
        await competition.populate({
            path: 'questions',
            select: '-chapter'
        });

        let competitionObj = competition.toObject();
        delete competitionObj.removedStudents;
        competitionObj.questionsCount = (competitionObj.questions || []).filter(Boolean).length;

        competitionObj.participants = (competitionObj.participants || []).map(p => {
            if (!p.student && p.guestId) {
                p.student = { _id: p.guestId, userName: p.guestName || "Guest", email: "Guest Account" };
            } else if (!p.student) {
                // The student's account was deleted
                p.student = { _id: String(p._id), userName: p.guestName || "Deleted student", email: "" };
            }
            return p;
        });

        // Ranks: frozen final ranks once finished, live ranks while running
        const ranked = rankParticipants(competitionObj.participants);
        ranked.forEach((p, idx) => {
            p.rank = (competitionObj.status === 'finished' && p.finalRank) ? p.finalRank : idx + 1;
        });
        competitionObj.participants = [...ranked].sort((a, b) => a.rank - b.rank);

        if (!isTeacher) {
            if (competitionObj.status === 'lobby') {
                // Don't hand out the questions before the start - students could
                // work them out while waiting in the lobby.
                competitionObj.questions = [];
            } else {
                competitionObj = sanitizeCompetitionQuestions(competitionObj);
            }
            // Other participants' graded answers would reveal which answers are
            // correct, and their emails are private. Students only see their own.
            competitionObj.participants.forEach(p => {
                if (!participantMatches(p, requesterId)) {
                    p.answers = [];
                    if (p.student) p.student = { _id: p.student._id, userName: p.student.userName };
                }
            });
            if (competitionObj.createdBy && typeof competitionObj.createdBy === 'object') {
                competitionObj.createdBy = { _id: competitionObj.createdBy._id, userName: competitionObj.createdBy.userName };
            }
        }

        Object.assign(competitionObj, timingInfo(competitionObj));

        res.json({ message: "success", competition: competitionObj });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 3b. Lightweight status poll (fallback when a Pusher event is missed)
const getCompetitionStatus = async (req, res) => {
    try {
        const { competitionId } = req.params;
        if (!isValidId(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }
        const requesterId = req.userData?._id || (isValidId(req.query.studentId) ? req.query.studentId : null);

        const load = () => competitionModel.findById(competitionId)
            .select('status startedAt endedAt timer questions createdBy removedStudents participants.student participants.guestId participants.finishedAt');

        let competition = await load();
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }
        if (await autoFinalizeIfExpired(competition)) {
            competition = await load();
        }

        const me = requesterId ? competition.participants.find(p => participantMatches(p, requesterId)) : null;

        res.json({
            message: "success",
            status: competition.status,
            startedAt: competition.startedAt || null,
            endedAt: competition.endedAt || null,
            timer: competition.timer,
            questionsCount: (competition.questions || []).length,
            participantsCount: competition.participants.length,
            isParticipant: requesterId ? !!me : null,
            isRemoved: requesterId ? (competition.removedStudents || []).some(id => String(id) === String(requesterId)) : null,
            myFinishedAt: me ? (me.finishedAt || null) : null,
            ...timingInfo(competition)
        });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 4. Student joins the competition lobby
const joinCompetition = async (req, res) => {
    try {
        const { competitionId } = req.params;
        if (!isValidId(competitionId)) {
            return res.status(404).json({ message: "Competition not found", code: 'NOT_FOUND' });
        }

        let studentID = req.userData ? req.userData._id : null;
        let userName = req.userData ? req.userData.userName : null;
        let addedByTeacher = false;

        if (req.userData && req.userData.role === 'Teacher' && req.body.studentId && String(req.body.studentId) !== String(req.userData._id)) {
            // Teacher is "summoning" one of their students into the lobby
            if (!isValidId(req.body.studentId)) {
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
            if (isValidId(candidateId)) {
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
                return res.status(401).json({ message: "Guests are not allowed. Only logged-in students can join competitions. Please log in first.", code: 'AUTH' });
            }
        }

        const competition = await competitionModel.findById(competitionId).select('status createdBy removedStudents participants.student participants.guestId');
        if (!competition) {
            return res.status(404).json({ message: "Competition not found", code: 'NOT_FOUND' });
        }

        if (addedByTeacher && String(competition.createdBy) !== String(req.userData._id)) {
            return res.status(403).json({ message: "Only the host teacher can add students to this competition" });
        }

        // The host must not end up on their own leaderboard / podium
        if (!addedByTeacher && String(competition.createdBy) === String(studentID)) {
            return res.status(403).json({ message: "You are the host of this competition. Open it from your teacher dashboard to run it.", code: 'HOST' });
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

        if (!addedByTeacher && (competition.removedStudents || []).some(id => String(id) === String(studentID))) {
            return res.status(403).json({ message: "You were removed from this competition by the host teacher.", code: 'REMOVED' });
        }

        if (competition.status !== 'lobby') {
            return res.status(400).json({
                message: competition.status === 'finished'
                    ? "This competition has already ended."
                    : "This competition has already started. You can no longer join it.",
                code: competition.status === 'finished' ? 'FINISHED' : 'STARTED'
            });
        }

        // Atomic conditional push: no duplicate entries when the same student
        // double-joins, and no lost joins when many students join at once.
        const update = { $push: { participants: { student: studentID, score: 0, totalAnswered: 0, wrongAnswers: 0, answers: [], joinedAt: new Date() } } };
        if (addedByTeacher) update.$pull = { removedStudents: studentID };
        const updated = await competitionModel.findOneAndUpdate(
            { _id: competitionId, status: 'lobby', 'participants.student': { $ne: studentID } },
            update,
            { new: true, projection: { status: 1 } }
        );

        if (!updated) {
            // Either a parallel request added this student first, or the teacher just started
            const latest = await competitionModel.findById(competitionId).select('status participants.student participants.guestId');
            if (latest && latest.participants.some(p => participantMatches(p, studentID))) {
                return res.json({ message: "success", alreadyJoined: true, competition: { _id: latest._id, status: latest.status } });
            }
            return res.status(400).json({ message: "This competition has already started. You can no longer join it.", code: 'STARTED' });
        }

        await safeTrigger(hostChannel(competitionId), 'student-joined', {
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
        if (!isValidId(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const existing = await competitionModel.findById(competitionId).select('createdBy status questions participants.student');
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

        // Nobody can join after the start, so starting an empty lobby only wastes the battle
        if (!existing.participants || existing.participants.length === 0) {
            return res.status(400).json({ message: "No students have joined yet. Wait for at least one student before starting." });
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
        compObj.deadline = new Date(getDeadlineMs(competition));

        // Economy: Reward teacher for starting a battle
        try {
            await userModel.updateOne({ _id: teacherID }, { $inc: { coins: 150 } });
        } catch (err) {
            console.error('Failed to reward teacher coins:', err);
        }

        // Broadcast "start-competition" event with start config to all listening students
        await safeTrigger(mainChannel(competitionId), 'start-competition', {
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

// 6. Submit a live score update (Student only)
const updateLiveScore = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const { finished, finishedAt: clientFinishedAt, answers, studentId, userName } = req.body;
        if (!isValidId(competitionId)) {
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

        // Results are frozen at the end: any later change would contradict the
        // podium, the certificates and the coins that were already awarded.
        if (competition.status === 'finished') {
            return res.status(400).json({ message: "Competition has already ended.", code: 'COMPETITION_FINISHED' });
        }
        if (competition.status !== 'active') {
            return res.status(400).json({ message: "Competition has not started yet.", code: 'NOT_STARTED' });
        }

        const startMs = competition.startedAt ? new Date(competition.startedAt).getTime() : null;
        if (startMs && nowMs < startMs - EARLY_START_TOLERANCE_MS) {
            return res.status(400).json({ message: "Competition has not started yet.", code: 'NOT_STARTED' });
        }

        const deadlineMs = getDeadlineMs(competition);
        if (deadlineMs && nowMs > deadlineMs + SCORE_GRACE_MS) {
            return res.status(400).json({ message: "Competition time has expired.", code: 'TIME_EXPIRED' });
        }

        const participant = competition.participants.find(p => participantMatches(p, activeID));
        if (!participant) {
            return res.status(403).json({ message: "You are not a registered participant in this competition", code: 'NOT_PARTICIPANT' });
        }

        const currentState = (p) => ({
            message: "success",
            answers: p.answers || [],
            score: p.score || 0,
            totalAnswered: p.totalAnswered || 0,
            wrongAnswers: p.wrongAnswers || 0,
            finishedAt: p.finishedAt || null
        });

        // Once a student has submitted their final answers, nothing can change any
        // more (otherwise someone could "finish" early to get a fast time and keep
        // answering afterwards).
        if (participant.finishedAt) {
            return res.json({ ...currentState(participant), alreadyFinished: true });
        }

        // SECURE SCORING: grade every answer against the database. Scores sent by the
        // client are ignored. Answers are merged by question so a request carrying
        // fewer answers can never erase newer ones.
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
                mergedAnswers.set(qId, String(value).slice(0, 500));
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

        let finishedAtValue = null;
        if (finished) {
            // The finish time is the moment the student completed (sent by the client
            // in SERVER time, see the frontend's clock-offset logic). It can't be in
            // the future, before the start, after the deadline, or back-dated by more
            // than a few seconds - so a wrong device clock or a tampered request
            // can't win the time tie-breaker.
            const upper = deadlineMs ? Math.min(nowMs, deadlineMs) : nowMs;
            const lower = Math.max(startMs || 0, nowMs - FINISH_BACKDATE_LIMIT_MS);
            let finishMsValue = nowMs;
            if (clientFinishedAt) {
                const parsed = new Date(clientFinishedAt).getTime();
                if (!isNaN(parsed)) finishMsValue = parsed;
            }
            finishMsValue = Math.min(Math.max(finishMsValue, lower), upper);
            if (startMs) finishMsValue = Math.max(finishMsValue, startMs);
            finishedAtValue = new Date(finishMsValue);
            update['participants.$.finishedAt'] = finishedAtValue;
        }

        // Positional update of this participant only (concurrent submissions from
        // other students can't overwrite each other). The filter re-checks, atomically,
        // that the battle is still running and this student hasn't finished.
        const result = await competitionModel.updateOne(
            {
                _id: competitionId,
                status: 'active',
                participants: { $elemMatch: { _id: participant._id, finishedAt: null } }
            },
            { $set: update }
        );

        if (!result.matchedCount) {
            const latest = await competitionModel.findById(competitionId).select('status participants');
            if (!latest || latest.status === 'finished') {
                return res.status(400).json({ message: "Competition has already ended.", code: 'COMPETITION_FINISHED' });
            }
            const latestMe = latest.participants.find(p => participantMatches(p, activeID));
            if (!latestMe) {
                return res.status(403).json({ message: "You are not a registered participant in this competition", code: 'NOT_PARTICIPANT' });
            }
            return res.json({ ...currentState(latestMe), alreadyFinished: !!latestMe.finishedAt });
        }

        // Live scoreboard for the host only. The graded answers are deliberately NOT
        // broadcast: Pusher channels are public and that would leak correct answers.
        await safeTrigger(hostChannel(competitionId), 'score-updated', {
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

// 7. Finish the competition (Teacher only or auto-ends on client timer)
const finishCompetition = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { competitionId } = req.params;
        if (!isValidId(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const existing = await competitionModel.findById(competitionId).select('createdBy status');
        if (!existing) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (String(existing.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Only the host teacher can force-end this competition" });
        }

        const transitioned = await finalizeCompetition(competitionId, { teacherID });
        const competition = await competitionModel.findById(competitionId);

        res.json({ message: "success", alreadyFinished: !transitioned, competition });
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
        if (!isValidId(competitionId)) {
            return res.status(404).json({ message: "Competition not found" });
        }

        const existing = await competitionModel.findById(competitionId).select('createdBy status participants._id participants.student participants.guestId');
        if (!existing) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (String(existing.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Only the host teacher can remove participants" });
        }

        if (existing.status === 'finished') {
            return res.status(400).json({ message: "The competition has ended - results are final and can no longer be changed" });
        }

        const targetId = String(participantId || studentId || '');
        if (!targetId) {
            return res.status(400).json({ message: "Participant target ID is required" });
        }

        // The frontend may send the student id, the participant entry id or a guest id
        const target = existing.participants.find(p => String(p._id) === targetId || participantMatches(p, targetId));
        const targetStudentId = target && target.student ? String(target.student) : (isValidId(targetId) ? targetId : null);

        const pullConditions = [{ guestId: targetId }];
        if (isValidId(targetId)) {
            const oid = new mongoose.Types.ObjectId(targetId);
            pullConditions.push({ _id: oid }, { student: oid });
        }
        if (target) pullConditions.push({ _id: target._id });

        // Atomic $pull so a kick can't wipe out students joining at the same moment.
        // The student is remembered so they can't simply re-join by themselves.
        const update = { $pull: { participants: { $or: pullConditions } } };
        if (targetStudentId) update.$addToSet = { removedStudents: new mongoose.Types.ObjectId(targetStudentId) };
        await competitionModel.updateOne({ _id: competitionId }, update);

        // Return participants populated so the lobby keeps showing names, not IDs
        const competition = await competitionModel.findById(competitionId)
            .populate('participants.student', 'userName email');

        // Broadcast real-time kick event to update all client screens & kick the student
        await safeTrigger(mainChannel(competitionId), 'student-kicked', {
            studentId: targetStudentId || targetId,
            participantId: target ? String(target._id) : null
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
    getCompetitionStatus,
    joinCompetition,
    startCompetition,
    updateLiveScore,
    finishCompetition,
    removeParticipant,
    triggerMathRacerEvent,
    // exported for tests
    rankParticipants,
    isAnswerCorrect
};
