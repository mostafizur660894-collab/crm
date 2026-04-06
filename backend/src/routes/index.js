const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const branchRoutes = require('./branchRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const leadRoutes = require('./leadRoutes');
const clientRoutes = require('./clientRoutes');
const taskRoutes = require('./taskRoutes');
const followUpRoutes = require('./followUpRoutes');
const noteRoutes = require('./noteRoutes');
const sheetRoutes = require('./sheetRoutes');
const activityRoutes = require('./activityRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');
const notificationRoutes = require('./notificationRoutes');

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bimano CRM API is running',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
router.use('/auth', authRoutes);

// Branch routes
router.use('/branches', branchRoutes);

// User routes
router.use('/users', userRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Lead routes
router.use('/leads', leadRoutes);

// Client routes
router.use('/clients', clientRoutes);

// Task routes
router.use('/tasks', taskRoutes);

// Follow-up routes
router.use('/followups', followUpRoutes);

// Note routes
router.use('/notes', noteRoutes);

// Sheet routes (Google Sheets integration)
router.use('/sheets', sheetRoutes);

// Activity routes (call/visit tracking)
router.use('/activities', activityRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Leaderboard & analytics routes
router.use('/leaderboard', leaderboardRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
