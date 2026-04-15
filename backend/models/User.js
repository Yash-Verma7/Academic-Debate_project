const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'moderator'], default: 'student' }
  },
  { timestamps: true, collection: 'users' }
);

module.exports = mongoose.model('User', userSchema);
