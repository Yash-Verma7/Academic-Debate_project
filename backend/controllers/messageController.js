const mongoose = require('mongoose');
const LiveChat = require('../models/LiveChat');
const Debate = require('../models/Debate');
const User = require('../models/User');
const Argument = require('../models/Argument');

const CHANNELS = ['pro', 'con', 'audience'];
const ARGUMENT_TYPES = ['argument', 'rebuttal', 'question'];

const normalizeAudiencePayload = (entry) => ({
  _id: entry._id,
  debateId: entry.debateId,
  userId: entry.userId,
  side: 'audience',
  role: 'audience',
  type: 'live',
  content: entry.message || '',
  likesCount: entry.likesCount || 0,
  likedBy: entry.likedBy || [],
  createdAt: entry.createdAt
});

const normalizeArgumentPayload = (entry) => ({
  _id: entry._id,
  debateId: entry.debateId,
  userId: entry.userId,
  side: entry.side,
  role: entry.side,
  type: entry.type || 'argument',
  content: entry.content || '',
  likesCount: 0,
  likedBy: [],
  createdAt: entry.createdAt
});

const ensureDebateId = (debateId, res) => {
  if (!mongoose.Types.ObjectId.isValid(debateId)) {
    res.status(400).json({ message: 'Invalid debate ID' });
    return false;
  }

  return true;
};

const getMessagesByDebate = async (req, res) => {
  try {
    const { debateId } = req.params;

    if (!ensureDebateId(debateId, res)) {
      return undefined;
    }

    const audienceMessages = await LiveChat.find({ debateId, role: 'audience' })
      .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
      .sort({ createdAt: 1 });

    return res.status(200).json(audienceMessages.map(normalizeAudiencePayload));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch live chat', error: error.message });
  }
};

const getMessagesByDebateAndRole = async (req, res) => {
  try {
    const { debateId } = req.params;
    const requestedRole = (req.params.role || req.query.role || '').toLowerCase();

    if (!ensureDebateId(debateId, res)) {
      return undefined;
    }

    if (!CHANNELS.includes(requestedRole)) {
      return res.status(400).json({ message: 'Role must be pro, con, or audience' });
    }

    if (requestedRole === 'audience') {
      const audienceMessages = await LiveChat.find({ debateId, role: 'audience' })
        .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
        .sort({ createdAt: 1 });

      return res.status(200).json(audienceMessages.map(normalizeAudiencePayload));
    }

    const sideArguments = await Argument.find({ debateId, side: requestedRole })
      .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
      .sort({ createdAt: 1 });

    return res.status(200).json(sideArguments.map(normalizeArgumentPayload));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch channel messages', error: error.message });
  }
};

const getGroupedMessagesByDebate = async (req, res) => {
  try {
    const { debateId } = req.params;

    if (!ensureDebateId(debateId, res)) {
      return undefined;
    }

    const [proArguments, conArguments, audienceMessages] = await Promise.all([
      Argument.find({ debateId, side: 'pro' })
        .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
        .sort({ createdAt: 1 }),
      Argument.find({ debateId, side: 'con' })
        .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
        .sort({ createdAt: 1 }),
      LiveChat.find({ debateId, role: 'audience' })
        .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
        .sort({ createdAt: 1 })
    ]);

    return res.status(200).json({
      pro: proArguments.map(normalizeArgumentPayload),
      con: conArguments.map(normalizeArgumentPayload),
      audience: audienceMessages.map(normalizeAudiencePayload)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
};

const getTopThoughtsByDebate = async (req, res) => {
  try {
    const { debateId } = req.params;

    if (!ensureDebateId(debateId, res)) {
      return undefined;
    }

    const topThoughts = await LiveChat.find({ debateId, role: 'audience' })
      .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(10);

    return res.status(200).json(topThoughts.map(normalizeAudiencePayload));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch top thoughts', error: error.message });
  }
};

const createMessage = async (req, res) => {
  try {
    const { debateId, side, role, type = 'argument', content } = req.body;

    if (!ensureDebateId(debateId, res)) {
      return undefined;
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const requestedChannel = (role || side || '').toLowerCase();
    const normalizedChannel = CHANNELS.includes(requestedChannel) ? requestedChannel : 'audience';
    const normalizedType = ARGUMENT_TYPES.includes((type || '').toLowerCase()) ? type.toLowerCase() : 'argument';

    const debate = await Debate.findById(debateId);
    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    if (debate.status !== 'live') {
      return res.status(409).json({ message: 'Debate is not live for messaging' });
    }

    const latestUser = await User.findById(req.user.id).select('role');
    const trimmedContent = content.trim();

    if (normalizedChannel === 'audience') {
      const recentDuplicate = await LiveChat.findOne({
        debateId,
        userId: req.user.id,
        role: 'audience',
        message: trimmedContent,
        createdAt: { $gte: new Date(Date.now() - 2000) }
      }).sort({ createdAt: -1 });

      if (recentDuplicate) {
        const existing = await recentDuplicate.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');
        return res.status(200).json({
          ...normalizeAudiencePayload(existing),
          userRole: latestUser?.role || 'student'
        });
      }

      const savedAudienceMessage = await LiveChat.create({
        debateId,
        userId: req.user.id,
        role: 'audience',
        message: trimmedContent
      });

      await User.findByIdAndUpdate(req.user.id, { $inc: { points: 2 } });

      const populatedAudience = await savedAudienceMessage.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');

      return res.status(201).json({
        ...normalizeAudiencePayload(populatedAudience),
        userRole: latestUser?.role || 'student'
      });
    }

    const allowedUserId = normalizedChannel === 'pro' ? debate.participants?.proUser : debate.participants?.conUser;
    if (!allowedUserId || allowedUserId.toString() !== req.user.id) {
      return res.status(403).json({ message: `Join debate as ${normalizedChannel.toUpperCase()} before posting` });
    }

    const recentDuplicate = await Argument.findOne({
      debateId,
      userId: req.user.id,
      side: normalizedChannel,
      type: normalizedType,
      content: trimmedContent,
      createdAt: { $gte: new Date(Date.now() - 2000) }
    }).sort({ createdAt: -1 });

    if (recentDuplicate) {
      const existing = await recentDuplicate.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');
      return res.status(200).json({
        ...normalizeArgumentPayload(existing),
        userRole: latestUser?.role || 'student'
      });
    }

    const savedArgument = await Argument.create({
      debateId,
      userId: req.user.id,
      side: normalizedChannel,
      type: normalizedType,
      content: trimmedContent
    });

    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 2 } });

    const populatedArgument = await savedArgument.populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl');

    return res.status(201).json({
      ...normalizeArgumentPayload(populatedArgument),
      userRole: latestUser?.role || 'student'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create message', error: error.message });
  }
};

const toggleThoughtReaction = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await LiveChat.findOne({ _id: messageId, role: 'audience' });
    if (!message) {
      return res.status(404).json({ message: 'Audience message not found' });
    }

    const likedIndex = message.likedBy.findIndex((userId) => userId.toString() === req.user.id);
    let liked = false;

    if (likedIndex >= 0) {
      message.likedBy.splice(likedIndex, 1);
      message.likesCount = Math.max(0, message.likesCount - 1);
      liked = false;
    } else {
      message.likedBy.push(req.user.id);
      message.likesCount += 1;
      liked = true;
    }

    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(message.debateId.toString()).emit('thoughtReaction', {
        messageId: message._id.toString(),
        likesCount: message.likesCount,
        likedBy: message.likedBy.map((item) => item.toString())
      });
    }

    return res.status(200).json({ message: liked ? 'Reaction added' : 'Reaction removed', likesCount: message.likesCount, liked });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to react to thought', error: error.message });
  }
};

module.exports = {
  getMessagesByDebate,
  getMessagesByDebateAndRole,
  getGroupedMessagesByDebate,
  getTopThoughtsByDebate,
  createMessage,
  toggleThoughtReaction
};
