const express = require('express');
const {
	getDebates,
	getLatestDebates,
	getHomeFeed,
	getDebateById,
	createDebate,
	joinDebate,
	registerWatch,
	voteDebate
} = require('../controllers/debateController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getDebates);
router.get('/latest', authMiddleware, getLatestDebates);
router.get('/home-feed', authMiddleware, getHomeFeed);
router.get('/:id', authMiddleware, getDebateById);
router.post('/', authMiddleware, createDebate);
router.post('/:id/join', authMiddleware, joinDebate);
router.post('/:id/watch', authMiddleware, registerWatch);
router.post('/:id/vote', authMiddleware, voteDebate);

module.exports = router;
