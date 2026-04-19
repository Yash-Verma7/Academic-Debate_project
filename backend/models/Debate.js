const mongoose = require('mongoose');

const debateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    topic: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    category: {
      type: String,
      enum: ['Technology', 'Science', 'Politics', 'Education', 'Environment', 'Others'],
      default: 'Others'
    },
    status: { type: String, enum: ['live', 'upcoming', 'completed'], default: 'upcoming' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    scheduledTime: { type: Date, default: null }, // kept for backwards compatibility just in case
    watchersCount: { type: Number, default: 0, min: 0 },
    proVotes: { type: Number, default: 0, min: 0 },
    conVotes: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: {
      proUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      conUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    participantLabels: {
      proLabel: { type: String, trim: true, default: '' },
      conLabel: { type: String, trim: true, default: '' }
    },
    watchedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    votes: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['student', 'professional', 'moderator', 'other'], default: 'student' },
        side: { type: String, enum: ['pro', 'con'], required: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Debate', debateSchema);
