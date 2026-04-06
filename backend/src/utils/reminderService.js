const { pool } = require('../database/connection');
const { createNotification, createBulkNotifications } = require('./notificationHelper');
const logger = require('./logger');

/**
 * Reminder service — checks for upcoming follow-ups and task deadlines,
 * then creates notification records for the assigned employees.
 * Designed to run on an interval (e.g., every 15 minutes).
 */

let isRunning = false;

const checkFollowUpReminders = async () => {
  try {
    // Follow-ups due today that are still pending and haven't been notified
    const [followUps] = await pool.execute(
      `SELECT f.id, f.assigned_to, f.followup_date, f.lead_id, f.client_id,
              l.name as lead_name, cl.name as client_name
       FROM follow_ups f
       LEFT JOIN leads l ON f.lead_id = l.id
       LEFT JOIN clients cl ON f.client_id = cl.id
       WHERE f.status = 'pending'
         AND DATE(f.followup_date) = CURDATE()
         AND f.id NOT IN (
           SELECT CAST(reference_id AS UNSIGNED) FROM notifications
           WHERE reference_type = 'followup'
             AND type = 'followup_reminder'
             AND DATE(created_at) = CURDATE()
         )`
    );

    for (const fu of followUps) {
      const entityName = fu.lead_name || fu.client_name || 'Unknown';
      await createNotification(
        fu.assigned_to,
        'Follow-Up Reminder',
        `You have a follow-up scheduled today for ${entityName}`,
        'followup_reminder',
        'followup',
        fu.id
      );
    }

    if (followUps.length > 0) {
      logger.info(`Sent ${followUps.length} follow-up reminders`);
    }
  } catch (err) {
    logger.error('Error checking follow-up reminders:', err.message);
  }
};

const checkOverdueTasks = async () => {
  try {
    // Tasks past due date that are not completed and not yet notified today
    const [tasks] = await pool.execute(
      `SELECT t.id, t.assigned_to, t.title, t.due_date
       FROM tasks t
       WHERE t.status != 'completed'
         AND t.due_date < NOW()
         AND t.id NOT IN (
           SELECT CAST(reference_id AS UNSIGNED) FROM notifications
           WHERE reference_type = 'task'
             AND type = 'task_overdue'
             AND DATE(created_at) = CURDATE()
         )`
    );

    for (const task of tasks) {
      await createNotification(
        task.assigned_to,
        'Task Overdue',
        `Task "${task.title}" is past its due date`,
        'task_overdue',
        'task',
        task.id
      );
    }

    if (tasks.length > 0) {
      logger.info(`Sent ${tasks.length} overdue task reminders`);
    }
  } catch (err) {
    logger.error('Error checking overdue tasks:', err.message);
  }
};

const checkMissedFollowUps = async () => {
  try {
    // Mark follow-ups that are past date and still pending as missed
    const [result] = await pool.execute(
      `UPDATE follow_ups
       SET status = 'missed'
       WHERE status = 'pending'
         AND followup_date < CURDATE()`
    );

    if (result.affectedRows > 0) {
      logger.info(`Marked ${result.affectedRows} follow-ups as missed`);
    }
  } catch (err) {
    logger.error('Error marking missed follow-ups:', err.message);
  }
};

const runReminders = async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    await checkFollowUpReminders();
    await checkOverdueTasks();
    await checkMissedFollowUps();
  } catch (err) {
    logger.error('Reminder service error:', err.message);
  } finally {
    isRunning = false;
  }
};

let intervalId = null;

const startReminderService = (intervalMinutes = 15) => {
  logger.info(`Starting reminder service (interval: ${intervalMinutes}m)`);
  // Run once immediately
  runReminders();
  intervalId = setInterval(runReminders, intervalMinutes * 60 * 1000);
};

const stopReminderService = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Reminder service stopped');
  }
};

module.exports = {
  startReminderService,
  stopReminderService,
  runReminders,
};
