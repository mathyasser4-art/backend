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

        // Fetch teacher name to send in global pusher notification
        const teacher = await userModel.findById(teacherID).select('userName');
        const teacherName = teacher ? teacher.userName : "Your Teacher";

        // Trigger real-time global battle notification for active students
        try {
            await pusher.trigger('global-battle-arena', 'battle-created', {
                competitionId: String(newCompetition._id),
                title: newCompetition.title,
                teacherName: teacherName
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
        const studentID = req.userData._id;
        const { competitionId } = req.params;

        console.log(`[JOIN] Student ${studentID} attempting to join competition ${competitionId}`);
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
            p => String(p.student) === String(studentID)
        );

        if (!isAlreadyParticipant) {
            competition.participants.push({ student: studentID, score: 0 });
            await competition.save();
            console.log(`[JOIN] Student ${studentID} added to participants (total: ${competition.participants.length})`);
        } else {
            console.log(`[JOIN] Student ${studentID} already in participants list`);
        }

        // Fetch student details to broadcast to other lobby members
        const studentDetails = await userModel.findById(studentID).select('userName email');

        // Broadcast "student-joined" event to the lobby channel
        try {
            const channelName = `competition-${competitionId}`;
            const eventData = {
                studentId: String(studentDetails._id),
                userName: studentDetails.userName
            };
            console.log(`[JOIN] Triggering Pusher event on channel '${channelName}':`, JSON.stringify(eventData));
            await pusher.trigger(channelName, 'student-joined', eventData);
            console.log(`[JOIN] Pusher event triggered successfully for ${studentDetails.userName}`);
        } catch (pusherErr) {
            console.error('[JOIN] Pusher trigger error:', pusherErr.message, pusherErr.statusCode, pusherErr.body);
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
        const studentID = req.userData._id;
        const { competitionId } = req.params;
        const { score, totalAnswered, wrongAnswers, finished, answers } = req.body;

        const competition = await competitionModel.findById(competitionId);
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        // Allow updates in both 'active' and 'finished' states so students
        // who finish just as the teacher ends the battle can still save their final score
        if (competition.status !== 'active' && competition.status !== 'finished') {
            return res.status(400).json({ message: "Competition is not active" });
        }

        // Update score of the student in database
        const participant = competition.participants.find(
            p => String(p.student) === String(studentID)
        );

        if (!participant) {
            return res.status(403).json({ message: "You are not a registered participant in this competition" });
        }

        participant.score = score !== undefined ? score : participant.score;
        participant.totalAnswered = totalAnswered !== undefined ? totalAnswered : participant.totalAnswered;
        participant.wrongAnswers = wrongAnswers !== undefined ? wrongAnswers : participant.wrongAnswers;
        if (finished && !participant.finishedAt) {
            participant.finishedAt = new Date();
        }
        if (answers !== undefined) {
            participant.answers = answers;
        }

        competition.markModified('participants');
        await competition.save();

        const studentDetails = await userModel.findById(studentID).select('userName');

        // Broadcast score update to real-time scoreboard channel
        await pusher.trigger(`competition-${competitionId}`, 'score-updated', {
            studentId: studentID,
            userName: studentDetails.userName,
            score: participant.score,
            totalAnswered: participant.totalAnswered,
            wrongAnswers: participant.wrongAnswers,
            finished: !!finished,
            finishedAt: participant.finishedAt,
            answers: participant.answers
        });

        res.json({ message: "success" });
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
        await competition.save();

        // Broadcast ending event so clients transition to the podium/results screen
        await pusher.trigger(`competition-${competitionId}`, 'competition-finished', {});

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
    finishCompetition
};
