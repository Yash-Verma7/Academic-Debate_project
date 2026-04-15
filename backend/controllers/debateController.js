const mongoose = require('mongoose');
const Debate = require('../models/Debate');
const Argument = require('../models/Argument');

const getDebates = async (_req, res) => {
  try {
    const debates = await Debate.find()
      .populate('participants', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json(debates);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch debates', error: error.message });
  }
};

const getDebateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid debate ID' });
    }

    const debate = await Debate.findById(id).populate('participants', 'name email role');
    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    const argumentsList = await Argument.find({ debateId: id })
      .populate('userId', 'name email role')
      .sort({ createdAt: 1 });

    return res.status(200).json({ ...debate.toObject(), arguments: argumentsList });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch debate', error: error.message });
  }
};

const createDebate = async (req, res) => {
  try {
    const { title, topic, participants = [], status, rounds } = req.body;

    if (!title || !topic) {
      return res.status(400).json({ message: 'Title and topic are required' });
    }

    const debate = await Debate.create({
      title,
      topic,
      participants,
      status: status || 'active',
      rounds: rounds || 3
    });

    const populatedDebate = await Debate.findById(debate._id).populate('participants', 'name email role');

    return res.status(201).json(populatedDebate);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create debate', error: error.message });
  }
};

module.exports = { getDebates, getDebateById, createDebate };
