const Pusher = require('pusher');
const competitionModel = require('../../../../DB/models/competition.model');
const userModel = require('../../../../DB/models/user.model');

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

// 1. Create a new competition lobby (Teacher only)
const createCompetition = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { title, questions, timer } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Competition title is required" });
        }

        const newCompetition = new competitionModel({
            title,
            createdBy: teacherID,
            questions: questions || [],
            timer: timer || 300, // default 5 minutes
            status: 'lobby',
            participants: []
        });

        await newCompetition.save();

        // Economy: Reward teacher for creating a battle
        try {
            const teacherDoc = await userModel.findById(teacherID);
            if (teacherDoc) {
                teacherDoc.coins = (teacherDoc.coins || 0) + 50;
                await teacherDoc.save();
            }
        } catch (err) {
            console.error('Failed to reward teacher coins:', err);
        }

        // Fetch teacher name and school reference to send in global pusher notification
        const teacher = await userModel.findById(teacherID).select('userName createdBy');
        const teacherName = teacher ? teacher.userName : "Your Teacher";
        const schoolId = teacher && teacher.createdBy ? String(teacher.createdBy) : null;

        // Trigger real-time global battle notification for active students
        try {
            await pusher.trigger('global-battle-arena', 'battle-created', {
                competitionId: String(newCompetition._id),
                title: newCompetition.title,
                teacherName: teacherName,
                teacherId: String(teacherID),
                schoolId: schoolId
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
        competitionObj.questions.forEach(q => {
            if (q.typeOfAnswer === 'MCQ' && Array.isArray(q.wrongAnswer)) {
                const correctVal = String(q.correctAnswer || "").trim();
                if (correctVal) {
                    const normalizedWrong = q.wrongAnswer.map(e => String(e || "").trim());
                    if (!normalizedWrong.includes(correctVal)) {
                        q.wrongAnswer.push(q.correctAnswer);
                    }
                }
                // Shuffle choices on the backend
                q.wrongAnswer.sort(() => Math.random() - 0.5);
                delete q.correctAnswer;
            } else if (q.typeOfAnswer === 'Graph' && Array.isArray(q.wrongPicAnswer)) {
                const correctPic = String(q.correctPicAnswer || "").trim();
                if (correctPic) {
                    const normalizedWrongPic = q.wrongPicAnswer.map(e => String(e || "").trim());
                    if (!normalizedWrongPic.includes(correctPic)) {
                        q.wrongPicAnswer.push(q.correctPicAnswer);
                    }
                }
                // Shuffle choices on the backend
                q.wrongPicAnswer.sort(() => Math.random() - 0.5);
                delete q.correctPicAnswer;
            }
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

        const isTeacher = String(competition.createdBy?._id || competition.createdBy) === String(requesterId);

        if (isTeacher) {
            // Teacher gets full question details including correct answers
            await competition.populate({
                path: 'questions',
                select: '-chapter'
            });
        } else {
            // Student gets questions with correctAnswer populated so backend can shuffle and sanitize them
            await competition.populate({
                path: 'questions',
                select: '-chapter'
            });
        }

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
        }

        res.json({ message: "success", competition: competitionObj });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 4. Student joins the competition lobby
const joinCompetition = async (req, res) => {
    try {
        const { competitionId } = req.params;
        let studentID = req.userData ? req.userData._id : null;
        let userName = req.userData ? req.userData.userName : null;
        let isGuest = false;

        if (req.userData && req.userData.role === 'Teacher' && req.body.studentId) {
            studentID = req.body.studentId;
            userName = req.body.userName || req.body.guestName || 'Student';
        } else if (!studentID) {
            studentID = req.body.studentId || req.body.guestId || 'guest_' + Math.random().toString(36).substr(2, 9);
            userName = req.body.userName || req.body.guestName || 'Guest';
            isGuest = true;
        }

        console.log(`[JOIN] User ${studentID} (${userName}) attempting to join competition ${competitionId}`);
        console.log(`[JOIN] Request origin: ${req.headers.origin || 'unknown'}`);
        console.log(`[JOIN] Auth header present: ${!!req.headers.authrization}`);

        const competition = await competitionModel.findById(competitionId);
        if (!competition) {
            console.log(`[JOIN] Competition ${competitionId} not found`);
            return res.status(404).json({ message: "Competition not found" });
        }

        if (competition.status !== 'lobby') {
            console.log(`[JOIN] Competition status is '${competition.status}', rejecting join`);
            return res.status(400).json({ message: "Cannot join. Competition has already started or finished." });
        }

        // Check if student is already in the participants list
        const isAlreadyParticipant = competition.participants.some(
            p => (p.student && String(p.student) === String(studentID)) || (p.guestId && String(p.guestId) === String(studentID))
        );

        if (!isAlreadyParticipant) {
            if (isGuest) {
                competition.participants.push({ guestId: studentID, guestName: userName, score: 0 });
            } else {
                competition.participants.push({ student: studentID, score: 0 });
            }
            await competition.save();
            console.log(`[JOIN] User ${studentID} added to participants (total: ${competition.participants.length})`);
        } else {
            console.log(`[JOIN] User ${studentID} already in participants list`);
        }

        // Broadcast "student-joined" event to the lobby channel
        try {
            const channelName = `competition-${competitionId}`;
            const eventData = {
                studentId: String(studentID),
                userName: userName
            };
            console.log(`[JOIN] Triggering Pusher event on channel '${channelName}':`, JSON.stringify(eventData));
            await pusher.trigger(channelName, 'student-joined', eventData);
            console.log(`[JOIN] Pusher event triggered successfully for ${userName}`);
        } catch (pusherErr) {
            console.error('[JOIN] Pusher trigger error:', pusherErr.message);
        }

        res.json({ message: "success", competition });
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

        const competition = await competitionModel.findById(competitionId);
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (String(competition.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Only the host teacher can start this competition" });
        }

        if (competition.status !== 'lobby') {
            return res.status(400).json({ message: "Competition is already started or finished" });
        }

        competition.status = 'active';
        competition.startedAt = new Date();
        await competition.save();

        // Economy: Reward teacher for starting a battle
        try {
            const teacherDoc = await userModel.findById(teacherID);
            if (teacherDoc) {
                teacherDoc.coins = (teacherDoc.coins || 0) + 150;
                await teacherDoc.save();
            }
        } catch (err) {
            console.error('Failed to reward teacher coins:', err);
        }

        // Broadcast "start-competition" event with start config to all listening students
        await pusher.trigger(`competition-${competitionId}`, 'start-competition', {
            startedAt: competition.startedAt,
            timer: competition.timer,
            questionsCount: competition.questions.length
        });

        res.json({ message: "success", competition });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 6. Submit a live score update (Student only)
const updateLiveScore = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const { score, totalAnswered, wrongAnswers, finished, answers, studentId, userName } = req.body;

        let activeID = req.userData ? req.userData._id : (studentId || req.body.guestId);
        let activeName = req.userData ? req.userData.userName : (userName || req.body.guestName || 'Guest');

        if (!activeID) {
            return res.status(403).json({ message: "User identification missing" });
        }

        const competition = await competitionModel.findById(competitionId).populate('questions');
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        // Allow updates in both 'active' and 'finished' states so students
        // who finish just as the teacher ends the battle can still save their final score
        if (competition.status !== 'active' && competition.status !== 'finished') {
            return res.status(400).json({ message: "Competition is not active" });
        }
        
        // Timer validation: if timer has expired (with a 10-second grace period for network latency), don't allow updates unless already finished.
        if (competition.startedAt && competition.timer && competition.status === 'active') {
             const elapsedSeconds = (Date.now() - new Date(competition.startedAt).getTime()) / 1000;
             if (elapsedSeconds > competition.timer + 10) {
                 return res.status(400).json({ message: "Competition time has expired." });
             }
        }

        // Update score of the student in database
        const participant = competition.participants.find(
            p => (p.student && String(p.student) === String(activeID)) || (p.guestId && String(p.guestId) === String(activeID))
        );

        if (!participant) {
            return res.status(403).json({ message: "You are not a registered participant in this competition" });
        }

        // SECURE SCORING: Calculate score from answers against database
        let secureScore = 0;
        let secureTotalAnswered = 0;
        let secureWrongAnswers = 0;
        let secureAnswers = [];

        if (answers && Array.isArray(answers)) {
            answers.forEach(submittedAns => {
                const q = competition.questions.find(dbQ => String(dbQ._id) === String(submittedAns.question));
                if (q && submittedAns.studentAnswer !== undefined && submittedAns.studentAnswer !== "") {
                    secureTotalAnswered++;
                    let isCorrect = false;

                    const studentAnsStr = normalizeDigits(submittedAns.studentAnswer);
                    
                    if (q.typeOfAnswer === 'Essay') {
                        if (q.answer && q.answer.map(normalizeDigits).includes(studentAnsStr)) {
                            isCorrect = true;
                        }
                    } else if (q.typeOfAnswer === 'MCQ') {
                        if (normalizeDigits(q.correctAnswer) === studentAnsStr) {
                            isCorrect = true;
                        }
                    } else if (q.typeOfAnswer === 'Graph') {
                        if (q.correctPicAnswer === submittedAns.studentAnswer) {
                            isCorrect = true;
                        }
                    }

                    if (isCorrect) {
                        secureScore++;
                    } else {
                        secureWrongAnswers++;
                    }

                    secureAnswers.push({
                        question: q._id,
                        studentAnswer: submittedAns.studentAnswer,
                        isCorrect: isCorrect
                    });
                }
            });
            participant.score = secureScore;
            participant.totalAnswered = secureTotalAnswered;
            participant.wrongAnswers = secureWrongAnswers;
            participant.answers = secureAnswers;
        } else {
            // Keep existing logic if no answers array provided
            participant.score = score !== undefined ? score : participant.score;
            participant.totalAnswered = totalAnswered !== undefined ? totalAnswered : participant.totalAnswered;
            participant.wrongAnswers = wrongAnswers !== undefined ? wrongAnswers : participant.wrongAnswers;
        }

        if (finished && !participant.finishedAt) {
            participant.finishedAt = new Date();
        }

        competition.markModified('participants');
        await competition.save();

        // Broadcast score update to real-time scoreboard channel
        await pusher.trigger(`competition-${competitionId}`, 'score-updated', {
            studentId: String(activeID),
            userName: activeName,
            score: participant.score,
            totalAnswered: participant.totalAnswered,
            wrongAnswers: participant.wrongAnswers,
            finished: !!finished,
            finishedAt: participant.finishedAt,
            answers: participant.answers
        });

        res.json({ message: "success", answers: participant.answers });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 7. Finish the competition (Teacher only or auto-ends on client timer)
const finishCompetition = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { competitionId } = req.params;

        const competition = await competitionModel.findById(competitionId);
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        // Allow finishing if it is the host teacher
        if (String(competition.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Only the host teacher can force-end this competition" });
        }

        competition.status = 'finished';
        const now = new Date();
        if (competition.participants && competition.participants.length > 0) {
            competition.participants.forEach(p => {
                if (!p.finishedAt) {
                    p.finishedAt = now;
                }
            });
            competition.markModified('participants');
        }

        // Economy: Award coins to top 3 participants
        try {
            const sortedParticipants = [...competition.participants].sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                
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
                
                return (b.totalAnswered || 0) - (a.totalAnswered || 0);
            });
            const rewards = [50, 30, 10]; // 1st, 2nd, 3rd place rewards
            
            for (let i = 0; i < Math.min(sortedParticipants.length, 3); i++) {
                const participant = sortedParticipants[i];
                if (participant.score > 0) {
                    const student = await userModel.findById(participant.student);
                    if (student) {
                        student.coins = (student.coins || 0) + rewards[i];
                        await student.save();
                        console.log(`Awarded ${rewards[i]} coins to student ${student._id} for placing #${i+1}`);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to award competition coins:', err);
        }

        await competition.save();

        // Broadcast ending event so clients transition to the podium/results screen
        await pusher.trigger(`competition-${competitionId}`, 'competition-finished', { competition });

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

        // Economy: Award coins for finishing 1st, 2nd, 3rd in Math Racer or Tanks Game
        if (eventName === 'mathracer-gameover' || eventName === 'tanks-gameover') {
            if (eventData && eventData.ranks) {
                const rewards = [50, 30, 10];
                for (let i = 0; i < Math.min(eventData.ranks.length, 3); i++) {
                    const studentId = eventData.ranks[i].id;
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

        await pusher.trigger(channelName, eventName, eventData);
        res.json({ message: "success" });
    } catch (error) {
        console.error('[MATHRACER] Proxy trigger error:', error.message);
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
    triggerMathRacerEvent
};
