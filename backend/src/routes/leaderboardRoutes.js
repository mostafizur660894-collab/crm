const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const {
  getLeaderboard,
  getBranchLeaderboard,
  getAnalytics,
} = require('../controllers/leaderboardController');

router.use(authenticate);

// Employee leaderboard (branch-filtered by role)
router.get('/', getLeaderboard);

// Branch-wise leaderboard
router.get('/branches', getBranchLeaderboard);

// Analytics
router.get('/analytics', getAnalytics);

module.exports = router;
