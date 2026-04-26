const Chat = require('./chat.model');

// User Endpoints
exports.syncChat = async (req, res) => {
    try {
        const { sessionId } = req.params;
        let chat = await Chat.findOne({ sessionId });
        
        if (!chat) {
            chat = new Chat({ sessionId, messages: [] });
            await chat.save();
        }

        // Mark as read by user
        if (chat.unreadByUser) {
            chat.unreadByUser = false;
            await chat.save();
        }

        res.status(200).json({ message: 'success', chat });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { sessionId, text } = req.body;
        
        if (!sessionId || !text) {
            return res.status(400).json({ message: 'sessionId and text are required' });
        }

        let chat = await Chat.findOne({ sessionId });
        if (!chat) {
            chat = new Chat({ sessionId, messages: [] });
        }

        chat.messages.push({
            senderRole: 'user',
            text: text,
            timestamp: new Date()
        });
        
        chat.unreadByAdmin = true;
        chat.updatedAt = new Date();
        
        await chat.save();
        res.status(200).json({ message: 'success', chat });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};

// Admin Endpoints
exports.getAllChats = async (req, res) => {
    try {
        // Sort by updatedAt descending so active chats are at the top
        const chats = await Chat.find().sort({ updatedAt: -1 });
        res.status(200).json({ message: 'success', chats });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};

exports.replyToChat = async (req, res) => {
    try {
        const { sessionId, text } = req.body;
        
        if (!sessionId || !text) {
            return res.status(400).json({ message: 'sessionId and text are required' });
        }

        const chat = await Chat.findOne({ sessionId });
        if (!chat) {
            return res.status(404).json({ message: 'Chat session not found' });
        }

        chat.messages.push({
            senderRole: 'admin',
            text: text,
            timestamp: new Date()
        });
        
        chat.unreadByUser = true;
        chat.unreadByAdmin = false; // Admin has read it if they are replying
        chat.updatedAt = new Date();
        
        await chat.save();
        res.status(200).json({ message: 'success', chat });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};

exports.markAdminRead = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const chat = await Chat.findOne({ sessionId });
        
        if (chat && chat.unreadByAdmin) {
            chat.unreadByAdmin = false;
            await chat.save();
        }
        res.status(200).json({ message: 'success' });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};
