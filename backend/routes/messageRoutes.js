const express = require('express');
const {
	getMessagesByDebate,
	getMessagesByDebateAndRole,
	getGroupedMessagesByDebate,
	getTopThoughtsByDebate,
	createMessage,
	toggleThoughtReaction
} = require('../controllers/messageController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createMessage);
router.get('/:debateId/grouped', authMiddleware, getGroupedMessagesByDebate);
router.get('/:debateId/role/:role', authMiddleware, getMessagesByDebateAndRole);
router.get('/:debateId', authMiddleware, getMessagesByDebate);
router.get('/:debateId/top-thoughts', authMiddleware, getTopThoughtsByDebate);
router.post('/:messageId/react', authMiddleware, toggleThoughtReaction);

module.exports = router;
