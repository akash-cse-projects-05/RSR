const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');

// Middleware to check if user is HR
// function isHR(req, res, next) {
//   if (req.session && req.session.department === 'HR') {
//     return next();
//   }
//   return res.status(403).send('Access denied. HR only.');
// }

// Main Notice Board Page
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find({
      $or: [{ department: { $exists: false } }, { department: null }]
    }).sort({ date: -1 });

    const notifications = await Notification.find().sort({ date: -1 });
    const employees = await Employee.find(); // Fetch all employees
    // Today's Birthdays
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const birthdays = await Employee.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$dob" }, day] },
          { $eq: [{ $month: "$dob" }, month] }
        ]
      }
    });

    // New Joiners (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const newJoiners = await Employee.find({
      joiningDate: { $gte: thirtyDaysAgo }
    });

    res.render('notice-board', {
      announcements,
      notifications,
      birthdays,
      newJoiners,
      employees,
      isHR: req.session && req.session.department === 'HR'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// HR: Unified Form for Announcement/Notification
router.get('/new', (req, res) => {
  res.render('hr/new-announcement');
});

// HR: Post Announcement or Notification
router.post('/new', async (req, res) => {
  const { type, title, message } = req.body;
  if (type === 'announcement') {
    await Announcement.create({ title, message });
  } else if (type === 'notification') {
    await Notification.create({ title, message });
  }
  res.redirect('/notice-board');
});

module.exports = router;