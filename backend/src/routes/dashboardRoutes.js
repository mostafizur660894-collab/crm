const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const {
  adminDashboard,
  subAdminDashboard,
  employeeDashboard,
  clientDashboard,
  branchDashboard,
  employeePerformance,
} = require('../controllers/dashboardController');

router.use(authenticate);

// Role-based dashboards
router.get('/admin', restrictTo('admin'), adminDashboard);
router.get('/sub-admin', restrictTo('admin', 'sub_admin'), subAdminDashboard);
router.get('/employee', restrictTo('admin', 'sub_admin', 'employee'), employeeDashboard);
router.get('/client', restrictTo('admin', 'client'), clientDashboard);

// Branch dashboard
router.get('/branches', restrictTo('admin', 'sub_admin'), branchDashboard);

// Employee performance
router.get('/employees', restrictTo('admin', 'sub_admin'), employeePerformance);

module.exports = router;
