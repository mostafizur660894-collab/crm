const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword } = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// Public routes
router.post('/login', login);

// Protected routes (require auth)
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

// Admin-only: register new users
router.post('/register', authenticate, restrictTo('admin'), register);

module.exports = router;
