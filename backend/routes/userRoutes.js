const express = require('express');
const { getLeaderboard, searchUsers, getProfile, updateProfile } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/leaderboard', authMiddleware, getLeaderboard);
router.get('/search', authMiddleware, searchUsers);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
