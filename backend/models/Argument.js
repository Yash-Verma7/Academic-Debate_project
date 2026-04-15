const mongoose = require('mongoose');

const argumentSchema = new mongoose.Schema(
  {
    debateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debate', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roundNumber: { type: Number, default: 1, min: 1 },
    content: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['argument', 'rebuttal', 'question'],
      default: 'argument'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Argument', argumentSchema);
