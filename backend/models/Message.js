const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: function() {
            return !this.group;
        }
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: function() {
            return !this.conversation; 
        }
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Message must have a sender']
    },
    content: {
        type: String,
        required: [true, 'Message cannot be empty'],
        trim: true,
        maxLength: [2000, 'Message cannot exceed 2000 characters']
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'location', 'system'],
        default: 'text'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    editedAt: {
        type: Date
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

messageSchema.pre('validate', function(next) {
    if (!this.conversation && !this.group) {
        next(new Error('Message must belong to either a conversation or a group'));
    } else if (this.conversation && this.group) {
        next(new Error('Message cannot belong to both a conversation and a group'));
    } else {
        next();
    }
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;