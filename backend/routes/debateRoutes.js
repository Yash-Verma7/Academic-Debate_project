const express = require('express');
const { getDebates, getDebateById, createDebate } = require('../controllers/debateController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getDebates);
router.get('/:id', authMiddleware, getDebateById);
router.post('/', authMiddleware, roleMiddleware(['moderator']), createDebate);

module.exports = router;
