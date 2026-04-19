const Argument = require('../models/Argument');

const getArgumentsByDebate = async (debateId) =>
  Argument.find({ debateId }).populate('userId', 'name firstName middleName lastName email role profileImage avatarUrl').sort({ createdAt: 1 });

const createArgument = async ({ debateId, userId, side, content }) =>
  Argument.create({ debateId, userId, side, content });

module.exports = { getArgumentsByDebate, createArgument };
