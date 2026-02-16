const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');

// Main Notice Board Page
router.get('/', async (req, res) => {
  try {
    const today = new Date();
    // Normalize today to start of day in local time for comparison
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const month = today.getMonth() + 1;
    const day = today.getDate();

    // 1. Fetch Communications
    const announcements = await Announcement.find({
      $or: [{ department: { $exists: false } }, { department: null }]
    }).sort({ date: -1 });
    const notifications = await Notification.find().sort({ date: -1 });

    // 2. Fetch ALL Active Employees once to process logic
    const allEmployees = await Employee.find({ status: 'Active' });

    // 3. Logic for Today's Birthdays
    // We filter in JS to avoid UTC/Timezone offset issues with MongoDB $expr
    const todaysBirthdays = allEmployees.filter(emp => {
      if (!emp.dob) return false;
      const d = new Date(emp.dob);
      return d.getDate() === day && (d.getMonth() + 1) === month;
    });

    // 4. Logic for Upcoming Birthdays (Next 10 days)
    const upcomingBirthdays = allEmployees.filter(emp => {
      if (!emp.dob) return false;
      const d = new Date(emp.dob);
      let nextBday = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (nextBday < startOfToday) nextBday.setFullYear(today.getFullYear() + 1);

      const diffTime = nextBday - startOfToday;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 10;
    });

    // 5. New Joiners (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const newJoiners = allEmployees.filter(emp => {
      return emp.joiningDate && new Date(emp.joiningDate) >= thirtyDaysAgo;
    }).sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate));

    res.render('notice-board', {
      announcements,
      notifications,
      todaysBirthdays,
      upcomingBirthdays,
      newJoiners,
      isHR: req.session && req.session.role === 'HR' // Changed from department to role
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// HR: Unified Form for Announcement/Notification
router.get('/new', (req, res) => {
  // Simple check for HR role
  if (!req.session || req.session.role !== 'HR') {
    return res.redirect('/notice-board');
  }
  res.render('hr/new-announcement');
});

// HR: Post Announcement or Notification
router.post('/new', async (req, res) => {
  if (!req.session || req.session.role !== 'HR') {
    return res.status(403).send('Unauthorized');
  }

  const { type, title, message } = req.body;
  try {
    if (type === 'announcement') {
      await Announcement.create({ title, message });
    } else if (type === 'notification') {
      await Notification.create({ title, message });
    }
    res.redirect('/notice-board');
  } catch (e) {
    console.error(e);
    res.status(500).send("Error creating notice");
  }
});

module.exports = router;