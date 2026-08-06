const competitionEventModel = require('../../../../DB/models/competitionEvent.model');
const userModel = require('../../../../DB/models/user.model');
const mongoose = require('mongoose');

// 1. Create a new Competition Event Card (School / Admin / Teacher)
const createCompetitionEvent = async (req, res) => {
    try {
        const userID = req.userData._id;
        const { title, description, eventDate } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Competition title is required" });
        }

        const newEvent = new competitionEventModel({
            title,
            description: description || '',
            eventDate: eventDate ? new Date(eventDate) : undefined,
            createdBy: userID,
            registrations: []
        });

        await newEvent.save();
        res.status(201).json({ message: "success", event: newEvent });
    } catch (error) {
        console.error('Error creating competition event:', error);
        res.status(502).json({ message: error.message });
    }
};

// 2. Get all Competition Event Cards for the School / Teacher
const getSchoolCompetitionEvents = async (req, res) => {
    try {
        const userID = req.userData._id;
        const user = await userModel.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Resolve School ID (if teacher, use createdBy; if School/Admin, use own _id)
        let schoolId = userID;
        if (user.role === 'Teacher' && user.createdBy) {
            schoolId = user.createdBy;
        }

        // Find all events created by this school OR by any teacher in this school
        const teachersInSchool = await userModel.find({ 
            $or: [{ _id: schoolId }, { createdBy: schoolId }] 
        }).select('_id');
        const teacherIds = teachersInSchool.map(t => t._id);

        const events = await competitionEventModel.find({
            createdBy: { $in: teacherIds }
        })
        .populate({
            path: 'registrations.student',
            select: 'userName email role'
        })
        .populate({
            path: 'registrations.teacher',
            select: 'userName email role'
        })
        .sort({ _id: -1 });

        res.json({ message: "success", events });
    } catch (error) {
        console.error('Error fetching competition events:', error);
        res.status(502).json({ message: error.message });
    }
};

// 3. Register / Update Student Selection for a Competition Event (Teacher)
const registerStudentsForEvent = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { eventId } = req.params;
        const { studentIds } = req.body; // Array of student ObjectIds

        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: "studentIds must be an array" });
        }

        const event = await competitionEventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Competition event card not found" });
        }

        // Remove existing registrations for this teacher on this event card
        event.registrations = (event.registrations || []).filter(
            r => String(r.teacher) !== String(teacherID)
        );

        // Add new student registrations for this teacher
        const now = new Date();
        studentIds.forEach(sId => {
            if (sId && mongoose.Types.ObjectId.isValid(sId)) {
                event.registrations.push({
                    teacher: teacherID,
                    student: sId,
                    registeredAt: now
                });
            }
        });

        event.markModified('registrations');
        await event.save();

        const updatedEvent = await competitionEventModel.findById(eventId)
            .populate({ path: 'registrations.student', select: 'userName email role' })
            .populate({ path: 'registrations.teacher', select: 'userName email role' });

        res.json({ message: "success", event: updatedEvent });
    } catch (error) {
        console.error('Error registering students for event:', error);
        res.status(502).json({ message: error.message });
    }
};

// 4. Delete a Competition Event Card (School / Host)
const deleteCompetitionEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        await competitionEventModel.findByIdAndDelete(eventId);
        res.json({ message: "success" });
    } catch (error) {
        console.error('Error deleting competition event:', error);
        res.status(502).json({ message: error.message });
    }
};

module.exports = {
    createCompetitionEvent,
    getSchoolCompetitionEvents,
    registerStudentsForEvent,
    deleteCompetitionEvent
};
