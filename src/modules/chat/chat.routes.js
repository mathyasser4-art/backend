const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
// Note: Normally you would add auth middleware for admin routes, but adapting to current structure
// Auth middleware should verify the token and the role (e.g., 'School' or 'IT')

// User (Public) Routes
router.get('/chat/sync/:sessionId', chatController.syncChat);
router.post('/chat/send', chatController.sendMessage);

// Admin Routes (Protect these with auth in production)
router.get('/chat/admin/all', chatController.getAllChats);
router.post('/chat/admin/reply', chatController.replyToChat);
router.post('/chat/admin/read/:sessionId', chatController.markAdminRead);

module.exports = router;
