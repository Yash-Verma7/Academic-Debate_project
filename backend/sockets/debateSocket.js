const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Debate = require('../models/Debate');
const Argument = require('../models/Argument');

const parseToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const header = socket.handshake.headers?.authorization;

  if (authToken) return authToken;
  if (header && header.startsWith('Bearer ')) return header.split(' ')[1];
  return null;
};

const registerDebateSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = parseToken(socket);
      if (!token) {
        return next(new Error('Unauthorized socket connection'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (_error) {
      return next(new Error('Invalid socket token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinDebate', async (debateId) => {
      if (!mongoose.Types.ObjectId.isValid(debateId)) {
        socket.emit('errorMessage', { message: 'Invalid debate ID' });
        return;
      }

      const debate = await Debate.findById(debateId);
      if (!debate) {
        socket.emit('errorMessage', { message: 'Debate not found' });
        return;
      }

      socket.join(debateId);
    });

    socket.on('sendArgument', async (data) => {
      try {
        const { debateId, content, type = 'argument', roundNumber = 1 } = data || {};

        if (!mongoose.Types.ObjectId.isValid(debateId)) {
          socket.emit('errorMessage', { message: 'Invalid debate ID' });
          return;
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
          socket.emit('errorMessage', { message: 'Argument content is required' });
          return;
        }

        const debate = await Debate.findById(debateId);
        if (!debate || debate.status !== 'active') {
          socket.emit('errorMessage', { message: 'Debate unavailable' });
          return;
        }

        const saved = await Argument.create({
          debateId,
          userId: socket.user.id,
          roundNumber,
          content: content.trim(),
          type
        });

        const populated = await saved.populate('userId', 'name email role');

        io.to(debateId).emit('newArgument', populated);
      } catch (_error) {
        socket.emit('errorMessage', { message: 'Failed to send argument' });
      }
    });
  });
};

module.exports = registerDebateSocket;
