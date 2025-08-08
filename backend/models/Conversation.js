const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    conversationType: {
        type: String,
        enum: ['direct', 'group'],
        default: 'direct'
    },
    title: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Ensure only two participants for direct conversations
conversationSchema.pre('save', function(next) {
    if (this.conversationType === 'direct' && this.participants.length !== 2) {
        next(new Error('Direct conversation must have exactly 2 participants'));
    }
    next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;