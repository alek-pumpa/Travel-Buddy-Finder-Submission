const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Get user conversations
router.get('/conversations', protect, async (req, res) => {
    try {
        console.log('Fetching conversations for user:', req.user._id);
        
        const conversations = await Conversation.find({
            participants: req.user._id,
            isActive: true
        })
        .populate({
            path: 'participants',
            select: 'name profilePicture photo'
        })
        .populate({
            path: 'lastMessage',
            select: 'content sender createdAt messageType'
        })
        .sort({ updatedAt: -1 })
        .lean();

        console.log(`Found ${conversations.length} conversations`);

        // Transform conversations to show the other participant
        const transformedConversations = conversations.map(conversation => {
            // Filter out current user from participants
            const otherParticipants = conversation.participants.filter(
                participant => participant._id.toString() !== req.user._id.toString()
            );
            
            return {
                ...conversation,
                participants: otherParticipants // Only show other participants
            };
        });

        res.status(200).json({
            status: 'success',
            results: transformedConversations.length,
            data: transformedConversations
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch conversations'
        });
    }
});

// Create new conversation
router.post('/conversations', protect, async (req, res) => {
    try {
        const { participantId, initialMessage } = req.body;
        
        console.log('Creating conversation between:', req.user._id, 'and', participantId);

        // Validate participant exists
        const participant = await User.findById(participantId);
        if (!participant) {
            return res.status(404).json({
                status: 'fail',
                message: 'Participant not found'
            });
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, participantId] },
            conversationType: 'direct'
        });

        if (conversation) {
            // Populate and transform existing conversation
            await conversation.populate([
                {
                    path: 'participants',
                    select: 'name profilePicture photo'
                },
                {
                    path: 'lastMessage',
                    select: 'content sender createdAt messageType'
                }
            ]);

            // Filter out current user from participants
            const transformedConversation = {
                ...conversation.toObject(),
                participants: conversation.participants.filter(
                    p => p._id.toString() !== req.user._id.toString()
                )
            };

            return res.status(200).json({
                status: 'success',
                data: transformedConversation
            });
        }

        // Create new conversation
        conversation = await Conversation.create({
            participants: [req.user._id, participantId],
            conversationType: 'direct',
            createdBy: req.user._id
        });

        // Send initial message if provided
        if (initialMessage) {
            const message = await Message.create({
                conversation: conversation._id,
                sender: req.user._id,
                content: initialMessage
            });

            conversation.lastMessage = message._id;
            await conversation.save();
        }

        // Populate the new conversation
        await conversation.populate([
            {
                path: 'participants',
                select: 'name profilePicture photo'
            },
            {
                path: 'lastMessage',
                select: 'content sender createdAt messageType'
            }
        ]);

        // Transform new conversation
        const transformedConversation = {
            ...conversation.toObject(),
            participants: conversation.participants.filter(
                p => p._id.toString() !== req.user._id.toString()
            )
        };

        console.log('Created conversation:', conversation._id);

        res.status(201).json({
            status: 'success',
            data: transformedConversation
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create conversation'
        });
    }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', protect, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        console.log('Fetching messages for conversation:', conversationId, 'by user:', req.user._id);

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                status: 'fail',
                message: 'Conversation not found or you do not have access'
            });
        }

        const messages = await Message.find({
            conversation: conversationId,
            deleted: false
        })
        .populate({
            path: 'sender',
            select: 'name profilePicture photo'
        })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

        // Mark messages as read for current user
        await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: req.user._id },
                isRead: false
            },
            { 
                isRead: true,
                $addToSet: {
                    readBy: {
                        user: req.user._id,
                        readAt: new Date()
                    }
                }
            }
        );

        console.log(`Found ${messages.length} messages in conversation`);

        res.status(200).json({
            status: 'success',
            results: messages.length,
            data: messages.reverse() // Reverse to get chronological order
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch messages'
        });
    }
});

// Send a message
router.post('/conversations/:conversationId/messages', protect, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, messageType = 'text' } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Message content is required'
            });
        }

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                status: 'fail',
                message: 'Conversation not found'
            });
        }

        // Create message
        const message = await Message.create({
            conversation: conversationId,
            sender: req.user._id,
            content: content.trim(),
            messageType
        });

        // Update conversation's last message
        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        // Populate sender info
        await message.populate({
            path: 'sender',
            select: 'name profilePicture photo'
        });

        res.status(201).json({
            status: 'success',
            data: message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send message'
        });
    }
});

module.exports = router;