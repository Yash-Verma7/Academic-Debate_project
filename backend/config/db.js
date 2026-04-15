const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in .env');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    if (err?.message?.toLowerCase().includes('bad auth')) {
      console.error('MongoDB Atlas authentication failed. Check username/password in MONGO_URI.');
    }

    if (err?.message?.toLowerCase().includes('ip') || err?.message?.toLowerCase().includes('not allowed')) {
      console.error('MongoDB Atlas network access blocked. Whitelist your current IP in Atlas.');
    }

    throw err;
  }
};

module.exports = connectDB;
