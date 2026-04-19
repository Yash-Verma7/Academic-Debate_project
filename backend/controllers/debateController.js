const mongoose = require('mongoose');
const Debate = require('../models/Debate');
const Argument = require('../models/Argument');
const User = require('../models/User');

const buildVoteSummary = (debate) => {
  const votes = debate?.votes || [];

  const summary = {
    overall: { pro: 0, con: 0 },
    student: { pro: 0, con: 0 },
    professional: { pro: 0, con: 0 },
    moderator: { pro: 0, con: 0 },
    other: { pro: 0, con: 0 }
  };

  votes.forEach((vote) => {
    const role = ['student', 'professional', 'moderator', 'other'].includes(vote.role) ? vote.role : 'student';
    const side = vote.side === 'con' ? 'con' : 'pro';
    summary.overall[side] += 1;
    summary[role][side] += 1;
  });

  return summary;
};

const debatePopulation = [
  { path: 'createdBy', select: 'name firstName middleName lastName email role profileImage avatarUrl' },
  { path: 'participants.proUser', select: 'name firstName middleName lastName email role profileImage avatarUrl' },
  { path: 'participants.conUser', select: 'name firstName middleName lastName email role profileImage avatarUrl' }
];

const ALLOWED_CATEGORIES = ['Technology', 'Science', 'Politics', 'Education', 'Environment', 'Others'];

const getDebates = async (_req, res) => {
  try {
    const debates = await Debate.find()
      .populate('createdBy', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.proUser', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.conUser', 'name firstName middleName lastName email role profileImage avatarUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json(debates);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch debates', error: error.message });
  }
};

const getLatestDebates = async (_req, res) => {
  try {
    const latestDebates = await Debate.find()
      .populate('createdBy', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.proUser', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.conUser', 'name firstName middleName lastName email role profileImage avatarUrl')
      .sort({ createdAt: -1 })
      .limit(8);

    return res.status(200).json(latestDebates);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch latest debates', error: error.message });
  }
};

const getHomeFeed = async (_req, res) => {
  try {
    const categories = ALLOWED_CATEGORIES;

    const pros = await Debate.distinct('participants.proUser');
    const cons = await Debate.distinct('participants.conUser');
    const activeDebatersCount = new Set([...pros, ...cons].filter(Boolean).map((id) => id.toString())).size;

    const [
      recentDebates,
      trendingDebates,
      liveRoomsCount,
      upcomingRoomsCount,
      completedRoomsCount,
      ...categoryDebateArrays
    ] = await Promise.all([
      Debate.find()
        .populate('createdBy', 'name firstName middleName lastName email role profileImage avatarUrl')
        .populate('participants.proUser', 'name firstName middleName lastName email role profileImage avatarUrl')
        .populate('participants.conUser', 'name firstName middleName lastName email role profileImage avatarUrl')
        .sort({ createdAt: -1 })
        .limit(10),
      Debate.find({ status: { $in: ['live', 'upcoming'] } })
        .populate('createdBy', 'name firstName middleName lastName email role profileImage avatarUrl')
        .populate('participants.proUser', 'name firstName middleName lastName email role profileImage avatarUrl')
        .populate('participants.conUser', 'name firstName middleName lastName email role profileImage avatarUrl')
        .sort({ watchersCount: -1, proVotes: -1, conVotes: -1, createdAt: -1 })
        .limit(10),
      Debate.countDocuments({ status: 'live' }),
      Debate.countDocuments({ status: 'upcoming' }),
      Debate.countDocuments({ status: 'completed' }),
      ...categories.map((category) =>
        Debate.find({ category })
          .populate('createdBy', 'name firstName middleName lastName email role profileImage avatarUrl')
          .populate('participants.proUser', 'name firstName middleName lastName email role profileImage avatarUrl')
          .populate('participants.conUser', 'name firstName middleName lastName email role profileImage avatarUrl')
          .sort({ createdAt: -1 })
          .limit(5)
      )
    ]);

    const categoryDebates = categories.reduce((accumulator, category, index) => {
      accumulator[category] = categoryDebateArrays[index] || [];
      return accumulator;
    }, {});

    return res.status(200).json({
      recentDebates,
      trendingDebates,
      categoryDebates,
      activeDebatersCount,
      liveRoomsCount,
      upcomingRoomsCount,
      completedRoomsCount
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch home feed', error: error.message });
  }
};

const getDebateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid debate ID' });
    }

    const debate = await Debate.findById(id)
      .populate('createdBy', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.proUser', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.conUser', 'name firstName middleName lastName email role profileImage avatarUrl');

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    const debateArguments = await Argument.find({ debateId: id })
      .populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl')
      .sort({ createdAt: 1 });

    const argumentsList = debateArguments.map((item) => ({
      _id: item._id,
      debateId: item.debateId,
      userId: item.userId,
      content: item.content,
      side: item.side,
      role: item.side,
      type: item.type || 'argument',
      likesCount: 0,
      likedBy: [],
      createdAt: item.createdAt
    }));

    const currentUserVote = debate.votes?.find((vote) => vote.userId?.toString() === req.user.id)?.side || null;
    const voteSummary = buildVoteSummary(debate);

    return res.status(200).json({ ...debate.toObject(), arguments: argumentsList, currentUserVote, voteSummary });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch debate', error: error.message });
  }
};

const createDebate = async (req, res) => {
  try {
    const latestUser = await User.findById(req.user.id).select('role');
    if (!latestUser || latestUser.role !== 'moderator') {
      return res.status(403).json({ message: 'Only moderators can create debates' });
    }

    const {
      title,
      topic,
      description,
      category,
      status,
      startTime,
      scheduledTime,
      endTime,
      proParticipant,
      conParticipant,
      proUserId,
      conUserId
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const normalizedStartTime = startTime || scheduledTime;
    if (!normalizedStartTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }

    const startDate = new Date(normalizedStartTime);
    const endDate = new Date(endTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const normalizedCategory = typeof category === 'string' ? category.trim() : '';
    if (normalizedCategory && !ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({ message: 'Invalid category selected' });
    }
    const safeCategory = normalizedCategory || 'Others';

    const normalizedProUserId = typeof proUserId === 'string' ? proUserId.trim() : '';
    const normalizedConUserId = typeof conUserId === 'string' ? conUserId.trim() : '';

    if (normalizedProUserId && !mongoose.Types.ObjectId.isValid(normalizedProUserId)) {
      return res.status(400).json({ message: 'Invalid Pro participant user ID' });
    }
    if (normalizedConUserId && !mongoose.Types.ObjectId.isValid(normalizedConUserId)) {
      return res.status(400).json({ message: 'Invalid Con participant user ID' });
    }
    if (normalizedProUserId && normalizedConUserId && normalizedProUserId === normalizedConUserId) {
      return res.status(400).json({ message: 'Pro and Con participants must be different users' });
    }

    let proUser = null;
    let conUser = null;
    if (normalizedProUserId || normalizedConUserId) {
      const targetIds = [normalizedProUserId, normalizedConUserId].filter(Boolean);
      const existingUsers = await User.find({ _id: { $in: targetIds } }).select('_id name');
      const userMap = new Map(existingUsers.map((user) => [user._id.toString(), user]));

      if (normalizedProUserId && !userMap.has(normalizedProUserId)) {
        return res.status(404).json({ message: 'Selected Pro participant not found' });
      }
      if (normalizedConUserId && !userMap.has(normalizedConUserId)) {
        return res.status(404).json({ message: 'Selected Con participant not found' });
      }

      proUser = normalizedProUserId ? userMap.get(normalizedProUserId) : null;
      conUser = normalizedConUserId ? userMap.get(normalizedConUserId) : null;
    }

    const now = new Date();
    let lifecycleStatus = 'upcoming';
    if (now >= endDate) {
      lifecycleStatus = 'completed';
    } else if (now >= startDate) {
      lifecycleStatus = 'live';
    }

    const debate = await Debate.create({
      title,
      topic: topic || '',
      description: description || '',
      category: safeCategory,
      status: ['upcoming', 'live', 'completed'].includes(status) ? status : lifecycleStatus,
      startTime: startDate,
      scheduledTime: startDate,
      endTime: endDate,
      participantLabels: {
        proLabel: proUser?.name || proParticipant || '',
        conLabel: conUser?.name || conParticipant || ''
      },
      participants: {
        proUser: normalizedProUserId || null,
        conUser: normalizedConUserId || null
      },
      createdBy: req.user.id
    });

    const populatedDebate = await Debate.findById(debate._id).populate(debatePopulation);

    const io = req.app.get('io');
    if (io) {
      io.emit('debateCreated', {
        id: populatedDebate._id,
        title: populatedDebate.title,
        category: populatedDebate.category,
        startTime: populatedDebate.startTime,
        scheduledTime: populatedDebate.scheduledTime,
        endTime: populatedDebate.endTime,
        status: populatedDebate.status,
        createdAt: populatedDebate.createdAt
      });
    }

    return res.status(201).json(populatedDebate);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create debate', error: error.message });
  }
};

const joinDebate = async (req, res) => {
  try {
    const { id } = req.params;
    const { side } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid debate ID' });
    }

    if (!['pro', 'con'].includes(side)) {
      return res.status(400).json({ message: 'Side must be either pro or con' });
    }

    const debate = await Debate.findById(id);
    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    const latestUser = await User.findById(req.user.id).select('role');
    const effectiveRole = latestUser?.role || req.user.role;
    if (effectiveRole !== 'student') {
      return res.status(403).json({ message: 'Only students can join Pro or Con' });
    }

    const targetField = side === 'pro' ? 'proUser' : 'conUser';
    const oppositeField = side === 'pro' ? 'conUser' : 'proUser';

    const joinedPro = debate.participants?.proUser?.toString() === req.user.id;
    const joinedCon = debate.participants?.conUser?.toString() === req.user.id;
    const alreadyJoined = joinedPro || joinedCon;

    if (alreadyJoined) {
      const joinedSide = joinedPro ? 'pro' : 'con';
      if (joinedSide === side) {
        const populatedDebate = await Debate.findById(id).populate(debatePopulation);
        return res.status(200).json({
          message: `You have already joined as ${joinedSide.toUpperCase()}`,
          debate: populatedDebate
        });
      }

      return res.status(409).json({ message: 'You can only join one side' });
    }

    if (debate.participants?.proUser && debate.participants?.conUser) {
      return res.status(409).json({ message: 'Pro and Con positions are filled. You can join live chat.' });
    }

    if (debate.participants[targetField] && debate.participants[targetField].toString() !== req.user.id) {
      return res.status(409).json({ message: `The ${side.toUpperCase()} side is already occupied` });
    }

    if (debate.participants[oppositeField] && debate.participants[oppositeField].toString() === req.user.id) {
      return res.status(409).json({ message: 'You have already joined this debate on the opposite side' });
    }

    const query = {
      _id: id,
      [`participants.${targetField}`]: null,
      $or: [
        { [`participants.${oppositeField}`]: null },
        { [`participants.${oppositeField}`]: { $ne: req.user.id } }
      ]
    };

    const updated = await Debate.findOneAndUpdate(
      query,
      { $set: { [`participants.${targetField}`]: req.user.id } },
      { new: true }
    );

    if (!updated) {
      const refreshed = await Debate.findById(id);
      if (!refreshed) {
        return res.status(404).json({ message: 'Debate not found' });
      }

      if (refreshed.participants[targetField]) {
        return res.status(409).json({ message: `The ${side.toUpperCase()} side is already occupied` });
      }

      if (refreshed.participants[oppositeField]?.toString() === req.user.id) {
        return res.status(409).json({ message: 'You have already joined this debate on the opposite side' });
      }

      return res.status(409).json({ message: 'Role assignment conflict. Please try again.' });
    }

    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 5 } });

    const updatedDebate = await Debate.findById(id).populate(debatePopulation);

    const io = req.app.get('io');
    if (io) {
      io.to(id).emit('debateUpdated', {
        debateId: id,
        status: updatedDebate.status,
        startTime: updatedDebate.startTime,
        endTime: updatedDebate.endTime,
        scheduledTime: updatedDebate.scheduledTime,
        watchersCount: updatedDebate.watchersCount,
        proVotes: updatedDebate.proVotes,
        conVotes: updatedDebate.conVotes,
        voteSummary: buildVoteSummary(updatedDebate),
        participants: updatedDebate.participants
      });
      io.emit('debateActivity', {
        debateId: id,
        type: 'join',
        side,
        userId: req.user.id
      });
    }

    return res.status(200).json({ message: 'Joined debate successfully', debate: updatedDebate });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to join debate', error: error.message });
  }
};

const registerWatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid debate ID' });
    }

    const debate = await Debate.findById(id);
    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    const alreadyWatching = debate.watchedBy.some((userId) => userId.toString() === req.user.id);

    if (!alreadyWatching) {
      debate.watchedBy.push(req.user.id);
      debate.watchersCount += 1;
      await debate.save();
    }

    const populatedDebate = await Debate.findById(id)
      .populate('createdBy', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.proUser', 'name firstName middleName lastName email role profileImage avatarUrl')
      .populate('participants.conUser', 'name firstName middleName lastName email role profileImage avatarUrl');

    const io = req.app.get('io');
    if (io) {
      io.to(id).emit('debateUpdated', {
        debateId: id,
        status: populatedDebate.status,
        startTime: populatedDebate.startTime,
        endTime: populatedDebate.endTime,
        scheduledTime: populatedDebate.scheduledTime,
        watchersCount: populatedDebate.watchersCount,
        proVotes: populatedDebate.proVotes,
        conVotes: populatedDebate.conVotes,
        voteSummary: buildVoteSummary(populatedDebate)
      });
    }

    return res.status(200).json({
      message: alreadyWatching ? 'Watch already registered' : 'Watch registered',
      alreadyWatching,
      debate: populatedDebate
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register watch', error: error.message });
  }
};

const voteDebate = async (req, res) => {
  try {
    const { id } = req.params;
    const { side } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid debate ID' });
    }

    if (!['pro', 'con'].includes(side)) {
      return res.status(400).json({ message: 'Side must be either pro or con' });
    }

    const debate = await Debate.findById(id);
    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    const actingUser = await User.findById(req.user.id).select('role');
    const roleSnapshot = actingUser?.role || 'student';
    const existingVoteIndex = debate.votes.findIndex((vote) => vote.userId.toString() === req.user.id);
    const existingVote = existingVoteIndex >= 0 ? debate.votes[existingVoteIndex] : null;
    let message = 'Vote submitted';

    if (!existingVote) {
      debate.votes.push({ userId: req.user.id, side, role: roleSnapshot });
      if (side === 'pro') {
        debate.proVotes += 1;
      } else {
        debate.conVotes += 1;
      }
      await User.findByIdAndUpdate(req.user.id, { $inc: { points: 1 } });
    } else if (existingVote.side !== side) {
      if (existingVote.side === 'pro' && debate.proVotes > 0) {
        debate.proVotes -= 1;
      }
      if (existingVote.side === 'con' && debate.conVotes > 0) {
        debate.conVotes -= 1;
      }

      existingVote.side = side;
      existingVote.role = roleSnapshot;
      if (side === 'pro') {
        debate.proVotes += 1;
      } else {
        debate.conVotes += 1;
      }
      message = 'Vote updated';
    } else {
      if (existingVote.side === 'pro' && debate.proVotes > 0) {
        debate.proVotes -= 1;
      }
      if (existingVote.side === 'con' && debate.conVotes > 0) {
        debate.conVotes -= 1;
      }

      debate.votes.splice(existingVoteIndex, 1);
      message = 'Vote removed';
    }

    await debate.save();

    const populatedDebate = await Debate.findById(id)
      .populate('createdBy', 'name email role')
      .populate('participants.proUser', 'name email role')
      .populate('participants.conUser', 'name email role');

    const currentUserVote = populatedDebate.votes?.find((vote) => vote.userId?.toString() === req.user.id)?.side || null;

    const io = req.app.get('io');
    if (io) {
      io.to(id).emit('debateUpdated', {
        debateId: id,
        status: populatedDebate.status,
        startTime: populatedDebate.startTime,
        endTime: populatedDebate.endTime,
        scheduledTime: populatedDebate.scheduledTime,
        watchersCount: populatedDebate.watchersCount,
        proVotes: populatedDebate.proVotes,
        conVotes: populatedDebate.conVotes,
        voteSummary: buildVoteSummary(populatedDebate)
      });
      io.emit('debateActivity', {
        debateId: id,
        type: 'vote',
        side,
        userId: req.user.id
      });
    }

    return res.status(200).json({
      message,
      debate: { ...populatedDebate.toObject(), currentUserVote, voteSummary: buildVoteSummary(populatedDebate) }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit vote', error: error.message });
  }
};

module.exports = {
  getDebates,
  getLatestDebates,
  getHomeFeed,
  getDebateById,
  createDebate,
  joinDebate,
  registerWatch,
  voteDebate
};
