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
    proUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    conUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

debateSchema.pre('validate', function preValidate(next) {
  if (this.participants?.proUser && !this.proUser) {
    this.proUser = this.participants.proUser;
  }
  if (this.participants?.conUser && !this.conUser) {
    this.conUser = this.participants.conUser;
  }

  if (this.proUser && !this.participants?.proUser) {
    this.participants = {
      ...(this.participants || {}),
      proUser: this.proUser,
      conUser: this.participants?.conUser || this.conUser || null
    };
  }

  if (this.conUser && !this.participants?.conUser) {
    this.participants = {
      ...(this.participants || {}),
      proUser: this.participants?.proUser || this.proUser || null,
      conUser: this.conUser
    };
  }

  next();
});

module.exports = mongoose.model('Debate', debateSchema);
