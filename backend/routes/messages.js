const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// Get all messages for a conversation
router.get('/:conversationId', protect, async (req, res, next) => {
    try {
        const messages = await Message.find({ conversation: req.params.conversationId })
            .sort({ createdAt: 1 });
        res.status(200).json({ status: 'success', data: { messages } });
    } catch (error) {
        next(error);
    }
});

// Send a new message
router.post('/', protect, async (req, res, next) => {
    try {
        const { conversationId, text } = req.body;
        if (!conversationId || !text) {
            return res.status(400).json({ status: 'fail', message: 'conversationId and text are required' });
        }
        const message = await Message.create({
            conversation: conversationId,
            sender: req.user._id,
            text
        });
        res.status(201).json({ status: 'success', data: { message } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;