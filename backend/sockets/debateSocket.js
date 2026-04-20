const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Debate = require('../models/Debate');
const User = require('../models/User');
const LiveChat = require('../models/LiveChat');
const Argument = require('../models/Argument');

const MESSAGE_ROLES = ['pro', 'con', 'audience'];
const MESSAGE_TYPES = ['argument', 'rebuttal', 'question'];
const onlineUserConnections = new Map();

const getOnlineParticipantsCount = () => onlineUserConnections.size;

const incrementOnlineUser = (userId) => {
  const currentCount = onlineUserConnections.get(userId) || 0;
  onlineUserConnections.set(userId, currentCount + 1);
};

const decrementOnlineUser = (userId) => {
  const currentCount = onlineUserConnections.get(userId) || 0;

  if (currentCount <= 1) {
    onlineUserConnections.delete(userId);
    return;
  }

  onlineUserConnections.set(userId, currentCount - 1);
};

const toArgumentPayload = (entry, fallbackUserRole) => ({
  _id: entry._id,
  debateId: entry.debateId,
  userId: entry.userId,
  content: entry.content,
  side: entry.side,
  role: entry.side,
  type: entry.type || 'argument',
  likesCount: 0,
  likedBy: [],
  userRole: fallbackUserRole,
  createdAt: entry.createdAt
});

const toAudiencePayload = (entry, fallbackUserRole) => ({
  _id: entry._id,
  debateId: entry.debateId,
  userId: entry.userId,
  content: entry.message,
  side: 'audience',
  role: 'audience',
  type: 'live',
  likesCount: entry.likesCount || 0,
  likedBy: entry.likedBy || [],
  userRole: fallbackUserRole,
  createdAt: entry.createdAt
});

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
    const userId = socket.user?.id ? String(socket.user.id) : null;

    if (userId) {
      socket.data.userId = userId;
      incrementOnlineUser(userId);
    }

    io.emit('onlineParticipants', { count: getOnlineParticipantsCount() });

    socket.on('getOnlineParticipants', () => {
      socket.emit('onlineParticipants', { count: getOnlineParticipantsCount() });
    });

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

    const handleSendMessage = async (data) => {
      try {
        const { debateId, content, side, role, type } = data || {};

        if (!mongoose.Types.ObjectId.isValid(debateId)) {
          socket.emit('errorMessage', { message: 'Invalid debate ID' });
          return;
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
          socket.emit('errorMessage', { message: 'Message content is required' });
          return;
        }

        const requestedRole = (role || side || '').toLowerCase();
        const normalizedSide = MESSAGE_ROLES.includes(requestedRole) ? requestedRole : 'audience';
        const requestedType = (type || '').toLowerCase();
        const normalizedType = MESSAGE_TYPES.includes(requestedType) ? requestedType : 'argument';

        const debate = await Debate.findById(debateId);
        if (!debate || debate.status !== 'live') {
          socket.emit('errorMessage', { message: 'Debate unavailable' });
          return;
        }

        const latestUser = await User.findById(socket.user.id).select('role');

        const trimmed = content.trim();

        if (normalizedSide === 'audience') {
          const recentDuplicate = await LiveChat.findOne({
            debateId,
            userId: socket.user.id,
            role: 'audience',
            message: trimmed,
            createdAt: { $gte: new Date(Date.now() - 2000) }
          }).sort({ createdAt: -1 });

          if (recentDuplicate) {
            const existing = await recentDuplicate.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');
            io.to(debateId).emit('newArgument', toAudiencePayload(existing, latestUser?.role || socket.user.role || 'student'));
            return;
          }

          const savedAudienceMessage = await LiveChat.create({
            debateId,
            userId: socket.user.id,
            role: 'audience',
            message: trimmed
          });

          const populatedAudience = await savedAudienceMessage.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');
          await User.findByIdAndUpdate(socket.user.id, { $inc: { points: 2 } });

          io.to(debateId).emit('newArgument', toAudiencePayload(populatedAudience, latestUser?.role || socket.user.role || 'student'));
        } else {
          const allowedUserId = normalizedSide === 'pro'
            ? (debate.participants?.proUser || debate.proUser)
            : (debate.participants?.conUser || debate.conUser);
          if (!allowedUserId || allowedUserId.toString() !== socket.user.id) {
            socket.emit('errorMessage', { message: `You must join as ${normalizedSide.toUpperCase()} before posting` });
            return;
          }

          const recentDuplicate = await Argument.findOne({
            debateId,
            userId: socket.user.id,
            side: normalizedSide,
            type: normalizedType,
            content: trimmed,
            createdAt: { $gte: new Date(Date.now() - 2000) }
          }).sort({ createdAt: -1 });

          if (recentDuplicate) {
            const existing = await recentDuplicate.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');
            io.to(debateId).emit('newArgument', toArgumentPayload(existing, latestUser?.role || socket.user.role || 'student'));
            return;
          }

          const savedArgument = await Argument.create({
            debateId,
            userId: socket.user.id,
            side: normalizedSide,
            type: normalizedType,
            content: trimmed
          });

          const populatedArgument = await savedArgument.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');
          await User.findByIdAndUpdate(socket.user.id, { $inc: { points: 2 } });

          io.to(debateId).emit('newArgument', toArgumentPayload(populatedArgument, latestUser?.role || socket.user.role || 'student'));
        }

        io.emit('debateActivity', {
          debateId,
          type: 'message',
          userId: socket.user.id
        });
      } catch (_error) {
        socket.emit('errorMessage', { message: 'Failed to send message' });
      }
    };

    socket.on('sendMessage', handleSendMessage);
    socket.on('sendArgument', handleSendMessage);

    socket.on('raiseHand', async (payload) => {
      const { debateId, note } = payload || {};
      if (!mongoose.Types.ObjectId.isValid(debateId)) {
        socket.emit('errorMessage', { message: 'Invalid debate ID for hand raise' });
        return;
      }

      io.to(debateId).emit('handRaised', {
        debateId,
        userId: socket.user.id,
        role: (await User.findById(socket.user.id).select('role'))?.role || socket.user.role || 'student',
        note: note || 'Audience hand raise',
        createdAt: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      const disconnectedUserId = socket.data?.userId;
      if (!disconnectedUserId) return;

      decrementOnlineUser(disconnectedUserId);
      io.emit('onlineParticipants', { count: getOnlineParticipantsCount() });
    });
  });
};

module.exports = registerDebateSocket;
