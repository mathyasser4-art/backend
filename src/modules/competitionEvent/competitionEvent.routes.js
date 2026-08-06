const competitionEventRouter = require('express').Router();
const {
    createCompetitionEvent,
    getSchoolCompetitionEvents,
    registerStudentsForEvent,
    deleteCompetitionEvent
} = require('./controller/competitionEvent.controller');
const { teacherAuth, optionalAuth } = require('../../middleware/auth');

competitionEventRouter.post('/competition-event/create', teacherAuth, createCompetitionEvent);
competitionEventRouter.get('/competition-event/list', optionalAuth, getSchoolCompetitionEvents);
competitionEventRouter.post('/competition-event/:eventId/register', teacherAuth, registerStudentsForEvent);
competitionEventRouter.delete('/competition-event/:eventId', teacherAuth, deleteCompetitionEvent);

module.exports = competitionEventRouter;
