const competitionEventRouter = require('express').Router();
const {
    createCompetitionEvent,
    getSchoolCompetitionEvents,
    registerStudentsForEvent,
    deleteCompetitionEvent,
    updateCompetitionEvent
} = require('./controller/competitionEvent.controller');
const { teacherAuth, optionalAuth } = require('../../middleware/auth');

competitionEventRouter.post('/competition-event/create', optionalAuth, createCompetitionEvent);
competitionEventRouter.get('/competition-event/list', optionalAuth, getSchoolCompetitionEvents);
competitionEventRouter.post('/competition-event/:eventId/register', optionalAuth, registerStudentsForEvent);
competitionEventRouter.put('/competition-event/:eventId', optionalAuth, updateCompetitionEvent);
competitionEventRouter.delete('/competition-event/:eventId', optionalAuth, deleteCompetitionEvent);

module.exports = competitionEventRouter;
