const Pusher = require('pusher');
const competitionModel = require('../../../../DB/models/competition.model');
const userModel = require('../../../../DB/models/user.model');

// Initialize Pusher with keys provided by the user
const pusher = new Pusher({
  appId: "215914",
  key: "18e355bfbafee7a1aa57",
  secret: "88dae70475dc4b8453a7",
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

// 3. Get detailed status of a competition (Lobby / Live / Scores)
const getCompetitionDetails = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const competition = await competitionModel.findById(competitionId)
            .populate('questions', '-correctAnswer -chapter')
            .populate('participants.student', 'userName email')
            .populate('createdBy', 'userName email');

        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        res.json({ message: "success", competition });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// 4. Student joins the competition lobby
const joinCompetition = async (req, res) => {
    try {
        const studentID = req.userData._id;
        const { competitionId } = req.params;

        const competition = await competitionModel.findById(competitionId);
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (competition.status !== 'lobby') {
            return res.status(400).json({ message: "Cannot join. Competition has already started or finished." });
        }

        // Check if student is already in the participants list
        const isAlreadyParticipant = competition.participants.some(
            p => String(p.student) === String(studentID)
        );

        if (!isAlreadyParticipant) {
            competition.participants.push({ student: studentID, score: 0 });
            await competition.save();
        }

        // Fetch student details to broadcast to other lobby members
        const studentDetails = await userModel.findById(studentID).select('userName email');

        // Broadcast "student-joined" event to the lobby channel
        await pusher.trigger(`competition-${competitionId}`, 'student-joined', {
            studentId: studentDetails._id,
            userName: studentDetails.userName
        });

        res.json({ message: "success", competition });
    } catch (error) {
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
        const { score, finished } = req.body;

        const competition = await competitionModel.findById(competitionId);
        if (!competition) {
            return res.status(404).json({ message: "Competition not found" });
        }

        if (competition.status !== 'active') {
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
        if (finished) {
            participant.finishedAt = new Date();
        }

        await competition.save();

        const studentDetails = await userModel.findById(studentID).select('userName');

        // Broadcast score update to real-time scoreboard channel
        await pusher.trigger(`competition-${competitionId}`, 'score-updated', {
            studentId: studentID,
            userName: studentDetails.userName,
            score: participant.score,
            finished: !!finished
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
