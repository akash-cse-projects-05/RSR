const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const User = require("../models/User");
const Document = require("../models/Documents");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const EmployeeChecklist = require("../models/EmployeeChecklist");

// HR Authorization Middleware
function hrAuth(req, res, next) {
  if (!req.session.userId || req.session.role !== 'HR') {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
    if (isJson) return res.status(401).json({ error: 'Unauthorized. HR session required.' });
    return res.redirect('/hr/hr-login');
  }
  next();
}

// Field Whitelist Helper
const whitelistEmployeeFields = (body) => {
  const allowed = [
    'employeeCode', 'firstName', 'lastName', 'dob', 'email', 'phoneNumber', 'address',
    'department', 'designation', 'employmentType', 'joiningDate', 'reportingManager',
    'workLocation', 'status', 'salary', 'hra', 'travelAllowance', 'otherAllowances',
    'bonuses', 'reimbursements', 'deductions', 'pf', 'professionalTax', 'incomeTax'
  ];
  const cleaned = {};
  allowed.forEach(f => {
    if (body[f] !== undefined) cleaned[f] = body[f];
  });
  return cleaned;
};

// SHOW ADD EMPLOYEE PAGE (NEW - HR Only)
router.get("/add", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const managers = await Employee.find({ designation: "MANAGER", status: "Active" }).sort({ firstName: 1 });
    if (isJson) {
      return res.json({ success: true, managers });
    }
    res.render("employee/add.ejs", { managers });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading add employee page");
  }
});

// HR add employee (FORM SUBMIT - HR Only)
router.post("/add", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const sanitizedData = whitelistEmployeeFields(req.body);
    const employee = await Employee.create(sanitizedData);

    await User.create({
      employeeId: employee._id,
      username: employee.employeeCode,
      password: "temp123"
    });

    // Lifecycle Onboarding Checklist Trigger
    const template = await ChecklistTemplate.findOne({ type: "Onboarding" });
    let runTasks = [];
    if (template && template.tasks && template.tasks.length > 0) {
      runTasks = template.tasks.map(t => ({
        taskTitle: t.taskTitle,
        assignedRole: t.assignedRole,
        status: "Pending"
      }));
    } else {
      runTasks = [
        { taskTitle: "Collect Bank Details & PAN/Aadhar Documents", assignedRole: "HR" },
        { taskTitle: "Allocate Laptop & Set Up Workstation", assignedRole: "IT" },
        { taskTitle: "Conduct Security & General Compliance Briefing", assignedRole: "HR" },
        { taskTitle: "Manager Welcome Meeting & Goal Setting", assignedRole: "Manager" }
      ];
    }
    await EmployeeChecklist.create({
      employeeId: employee._id,
      type: "Onboarding",
      tasks: runTasks
    });

    if (isJson) {
      return res.json({ success: true, employee });
    }
    res.redirect('/hr/dashboard');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to create employee: " + err.message });
    res.status(500).send("Failed to create employee");
  }
});


// Profile page route
// filepath: d:\RSR_AVIATION\routes\employee.js
// router.get('/profile', async (req, res) => {
//   const user = await User.findById(req.session.userId);
//   res.render('employee/profile', { user });
// });

router.get('/profile', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    // Fetch user
    const user = await User.findById(req.session.userId)
      .populate('employeeId'); // Populates employee details

    if (!user) {
      if (isJson) return res.status(404).json({ error: "User profile not found" });
      return res.status(404).send("User profile not found");
    }

    // Fetch documents related to this user
    const documents = await Document.find({ user: req.session.userId });

    // Fetch LOP leaves for this employee
    const Leave = require('../models/Leave');
    const lopLeaves = await Leave.find({
      employeeId: user.employeeId._id,
      leaveType: 'LOP',
      status: 'APPROVED'
    }).sort({ appliedAt: -1 });

    if (isJson) {
      return res.json({
        user,
        employee: user.employeeId,
        documents,
        lopLeaves
      });
    }

    res.render('employee/profile', {
      user,
      employee: user.employeeId, // Populated employee details
      documents,
      lopLeaves
    });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: 'Error loading profile' });
    res.status(500).send('Error loading profile');
  }
});



router.get('/photo/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee || !employee.profilePhoto || !employee.profilePhoto.data) {
      return res.status(404).send('No photo found');
    }
    res.set('Content-Type', employee.profilePhoto.contentType);
    res.send(employee.profilePhoto.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching photo');
  }
});

router.get("/edit/:id", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: "Employee not found" });
      return res.redirect('/hr/users?error=not_found');
    }
    if (isJson) {
      return res.json({ employee });
    }
    res.render("employee/edit", { employee });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Load failed" });
    res.redirect('/hr/users?error=load_failed');
  }
});

router.post("/edit/:id", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const sanitizedData = whitelistEmployeeFields(req.body);
    const employee = await Employee.findByIdAndUpdate(req.params.id, sanitizedData, { new: true });
    if (isJson) {
      return res.json({ success: true, employee });
    }
    res.redirect('/hr/users');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Update failed" });
    res.redirect('/hr/users?error=update_failed');
  }
});

const Announcement = require('../models/Announcement');
const { sendEmail } = require('../utils/email');

// Handle Resignation Application
router.post('/resign', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: 'Employee not found' });
      return res.status(404).send('Employee not found');
    }

    employee.resignationStatus = 'Pending';
    employee.resignationDate = new Date();
    employee.resignationReason = req.body.reason || 'No reason provided';
    await employee.save();

    // Lifecycle Offboarding Checklist Trigger
    const template = await ChecklistTemplate.findOne({ type: "Offboarding" });
    let runTasks = [];
    if (template && template.tasks && template.tasks.length > 0) {
      runTasks = template.tasks.map(t => ({
        taskTitle: t.taskTitle,
        assignedRole: t.assignedRole,
        status: "Pending"
      }));
    } else {
      runTasks = [
        { taskTitle: "Conduct Exit Interview", assignedRole: "HR" },
        { taskTitle: "Approve Asset Return & Laptop Cleanse", assignedRole: "IT" },
        { taskTitle: "Process Final Settlement & Gratuity Calculation", assignedRole: "Finance" },
        { taskTitle: "Revoke Email and System Access Logs", assignedRole: "IT" },
        { taskTitle: "Manager Clearance & Handover Review", assignedRole: "Manager" }
      ];
    }
    await EmployeeChecklist.create({
      employeeId: employee._id,
      type: "Offboarding",
      tasks: runTasks
    });

    // Notify Manager via Department Announcement (Scoped)
    await Announcement.create({
      title: `Resignation: ${employee.firstName} ${employee.lastName}`,
      message: `${employee.firstName} ${employee.lastName} (${employee.designation}) has submitted their resignation.\nReason: ${employee.resignationReason}`,
      department: employee.department
    });

    // Find Manager for Email
    const manager = await Employee.findOne({ department: employee.department, designation: 'MANAGER' });
    if (manager && manager.email) {
      await sendEmail({
        to: manager.email,
        subject: `Resignation Request - ${employee.firstName} ${employee.lastName}`,
        html: `<p>Dear ${manager.firstName},</p>
                 <p>${employee.firstName} ${employee.lastName} has applied for resignation on ${new Date().toLocaleDateString()}.</p>
                 <p><strong>Reason:</strong> ${employee.resignationReason}</p>
                 <p>Please log in to the HRMS to review pending actions if any.</p>`
      });
    }

    if (isJson) {
      return res.json({ success: true, message: "Resignation submitted successfully", employee });
    }
    res.redirect('/employee/profile');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: 'Error processing resignation' });
    res.status(500).send('Error processing resignation');
  }
});

// Handle Resignation Revocation
router.post('/revoke-resignation', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: 'Employee not found' });
      return res.status(404).send('Employee not found');
    }

    if (employee.resignationStatus === 'Pending') {
      employee.resignationStatus = 'Revoked'; // Or null if you prefer simply clearing it. Storing 'Revoked' keeps history.
      await employee.save();

      // Notify Manager of Revocation
      await Announcement.create({
        title: `Resignation Revoked: ${employee.firstName} ${employee.lastName}`,
        message: `${employee.firstName} ${employee.lastName} has revoked their resignation request.`,
        department: employee.department
      });
    }

    if (isJson) {
      return res.json({ success: true, message: "Resignation revoked successfully", employee });
    }
    res.redirect('/employee/profile');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: 'Error revoking resignation' });
    res.status(500).send('Error revoking resignation');
  }
});

module.exports = router;
