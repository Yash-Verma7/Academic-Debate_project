const Argument = require('../models/Argument');

const getArgumentsByDebate = async (debateId) =>
  Argument.find({ debateId }).populate('userId', 'name email role').sort({ createdAt: 1 });

const createArgument = async ({ debateId, userId, roundNumber, content, type }) =>
  Argument.create({ debateId, userId, roundNumber, content, type });

module.exports = { getArgumentsByDebate, createArgument };
