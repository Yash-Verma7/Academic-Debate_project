const mongoose = require('mongoose');

const argumentSchema = new mongoose.Schema(
  {
    debateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debate', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    side: { type: String, enum: ['pro', 'con'], required: true },
    type: { type: String, enum: ['argument', 'rebuttal', 'question'], default: 'argument' },
    content: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

argumentSchema.index({ debateId: 1, createdAt: 1 });

module.exports = mongoose.model('Argument', argumentSchema);
