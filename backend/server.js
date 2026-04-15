const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const debateRoutes = require('./routes/debateRoutes');
const registerDebateSocket = require('./sockets/debateSocket');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ message: 'Backend is running' });
});

app.use('/auth', authRoutes);
app.use('/debates', debateRoutes);

registerDebateSocket(io);

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
