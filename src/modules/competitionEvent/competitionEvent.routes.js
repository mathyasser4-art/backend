const competitionEventRouter = require('express').Router();
const {
    createCompetitionEvent,
    getSchoolCompetitionEvents,
    registerStudentsForEvent,
    deleteCompetitionEvent,
    updateCompetitionEvent
} = require('./controller/competitionEvent.controller');
const { generalAuth } = require('../../middleware/auth');

competitionEventRouter.post('/competition-event/create', generalAuth, createCompetitionEvent);
competitionEventRouter.get('/competition-event/list', generalAuth, getSchoolCompetitionEvents);
competitionEventRouter.post('/competition-event/:eventId/register', generalAuth, registerStudentsForEvent);
competitionEventRouter.put('/competition-event/:eventId', generalAuth, updateCompetitionEvent);
competitionEventRouter.delete('/competition-event/:eventId', generalAuth, deleteCompetitionEvent);

module.exports = competitionEventRouter;
