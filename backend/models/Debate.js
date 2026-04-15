const mongoose = require('mongoose');

const debateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    rounds: { type: Number, default: 3, min: 1 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Debate', debateSchema);
