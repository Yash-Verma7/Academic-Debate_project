const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const debateRoutes = require('./routes/debateRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const { getLeaderboard } = require('./controllers/userController');
const registerDebateSocket = require('./sockets/debateSocket');
const startCronJobs = require('./jobs/debateCron');

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

startCronJobs(io);

app.set('io', io);

app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
  res.send('API is running');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ message: 'Backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/debates', debateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.get('/api/leaderboard', authMiddleware, getLeaderboard);

registerDebateSocket(io);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ message: 'Profile image must be 1MB or smaller' });
  }

  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
