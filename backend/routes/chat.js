const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/auth');

// Get all conversations for the logged-in user
router.get('/', protect, async (req, res, next) => {
    try {
        const conversations = await Conversation.find({ participants: req.user._id })
            .populate('participants', 'name profilePicture')
            .sort({ updatedAt: -1 });
        res.status(200).json({ status: 'success', data: { conversations } });
    } catch (error) {
        next(error);
    }
});

// Create a new conversation (between two users)
router.post('/', protect, async (req, res, next) => {
    try {
        const { participantId } = req.body;
        if (!participantId) {
            return res.status(400).json({ status: 'fail', message: 'participantId is required' });
        }
        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, participantId], $size: 2 }
        });
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [req.user._id, participantId]
            });
        }
        res.status(201).json({ status: 'success', data: { conversation } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;