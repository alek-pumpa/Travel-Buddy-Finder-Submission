const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    // Optionally, add a name for group chats
    name: {
      type: String
    },
    // Optionally, track the last message for quick access
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);