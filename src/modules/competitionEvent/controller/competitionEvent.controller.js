const competitionEventModel = require('../../../../DB/models/competitionEvent.model');
const userModel = require('../../../../DB/models/user.model');
const mongoose = require('mongoose');

// Roles that own a school "tenant" themselves; everyone else belongs to the
// school/organization that created their account.
const SCHOOL_OWNER_ROLES = ['School', 'Admin', 'Organization'];

const resolveSchoolId = (user) => {
    if (!user) return null;
    if (SCHOOL_OWNER_ROLES.includes(user.role) || !user.createdBy) return user._id;
    return user.createdBy._id || user.createdBy;
};

// Only the card's creator, the creator's school, or an Admin may modify a card
const canManageEvent = async (user, event) => {
    if (!user || !event) return false;
    if (user.role === 'Admin') return true;
    if (String(event.createdBy) === String(user._id)) return true;
    const creator = await userModel.findById(event.createdBy).select('createdBy');
    return !!(creator && creator.createdBy && String(creator.createdBy) === String(user._id));
};

// 1. Create a new Competition Event Card (School / Admin / Teacher)
const createCompetitionEvent = async (req, res) => {
    try {
        // Never trust a createdBy sent in the body - it allowed creating cards as anyone
        const userID = req.userData._id;
        const { title, description, eventDate } = req.body;

        if (req.userData.role === 'Student' || req.userData.role === 'User') {
            return res.status(403).json({ message: "You do not have access to create competition cards" });
        }

        if (!title || !String(title).trim()) {
            return res.status(400).json({ message: "Competition title is required" });
        }

        if (eventDate && isNaN(new Date(eventDate).getTime())) {
            return res.status(400).json({ message: "Invalid event date" });
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
        // Previously an unauthenticated request returned every school's cards
        // including the registered students' names and emails.
        if (req.userData.role === 'Student' || req.userData.role === 'User') {
            return res.json({ message: "success", events: [] });
        }
        const schoolId = resolveSchoolId(req.userData);

        const membersOfSchool = await userModel.find({
            $or: [{ _id: schoolId }, { createdBy: schoolId }]
        }).select('_id');
        const memberIds = membersOfSchool.map(t => t._id);

        let events = await competitionEventModel.find({
            createdBy: { $in: memberIds }
        })
        .populate({ path: 'registrations.student', select: 'userName email role' })
        .populate({ path: 'registrations.teacher', select: 'userName email role' })
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

        if (req.userData.role === 'Student' || req.userData.role === 'User') {
            return res.status(403).json({ message: "Only teachers can register students" });
        }

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: "Competition event card not found" });
        }

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

        // Add new student registrations for this teacher (de-duplicated)
        const now = new Date();
        [...new Set(studentIds.map(String))].forEach(sId => {
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
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: "Competition event card not found" });
        }
        const event = await competitionEventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Competition event card not found" });
        }
        if (!(await canManageEvent(req.userData, event))) {
            return res.status(403).json({ message: "You do not have access to delete this competition card" });
        }
        await competitionEventModel.deleteOne({ _id: eventId });
        res.json({ message: "success" });
    } catch (error) {
        console.error('Error deleting competition event:', error);
        res.status(502).json({ message: error.message });
    }
};

// 5. Update / Edit a Competition Event Card (Title, Description, Event Date)
const updateCompetitionEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { title, description, eventDate } = req.body;
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: "Competition event card not found" });
        }

        const event = await competitionEventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Competition event card not found" });
        }

        if (!(await canManageEvent(req.userData, event))) {
            return res.status(403).json({ message: "You do not have access to edit this competition card" });
        }

        if (title !== undefined && !String(title).trim()) {
            return res.status(400).json({ message: "Competition title is required" });
        }
        if (eventDate && isNaN(new Date(eventDate).getTime())) {
            return res.status(400).json({ message: "Invalid event date" });
        }

        if (title !== undefined) event.title = title;
        if (description !== undefined) event.description = description;
        if (eventDate !== undefined) event.eventDate = eventDate ? new Date(eventDate) : null;

        await event.save();
        res.json({ message: "success", event });
    } catch (error) {
        console.error('Error updating competition event:', error);
        res.status(502).json({ message: error.message });
    }
};

module.exports = {
    createCompetitionEvent,
    getSchoolCompetitionEvents,
    registerStudentsForEvent,
    deleteCompetitionEvent,
    updateCompetitionEvent
};
