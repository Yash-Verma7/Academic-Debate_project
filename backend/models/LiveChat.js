const mongoose = require('mongoose');

const liveChatSchema = new mongoose.Schema(
  {
    debateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debate', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['audience'], default: 'audience' },
    message: { type: String, required: true, trim: true },
    likesCount: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

liveChatSchema.index({ debateId: 1, createdAt: 1 });
liveChatSchema.index({ debateId: 1, role: 1, createdAt: 1 });

module.exports = mongoose.model('LiveChat', liveChatSchema);
