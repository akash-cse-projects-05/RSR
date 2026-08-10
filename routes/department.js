const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const Announcement = require('../models/Announcement');
const Payslip = require('../models/Payslip'); // Import Payslip model

// Employee: View training tasks and update progress
router.get('/:department/training/:employeeId', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  const department = req.params.department;
  const employeeId = req.params.employeeId;
  const employee = await Employee.findById(employeeId);
  if (!employee || employee.department !== department) {
    if (isJson) return res.status(403).json({ error: 'Not authorized' });
    return res.status(403).send('Not authorized');
  }
  const tasks = await Task.find({ department, assignedTo: employeeId, type: 'Training' });
  if (isJson) {
    return res.json({ department, employee, tasks });
  }
  res.render('employee/training', { department, employee, tasks });
});

// Employee: Update training progress
router.post('/:department/training/:taskId/progress', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { progress } = req.body;
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    if (isJson) return res.status(404).json({ error: 'Task not found' });
    return res.status(404).send('Task not found');
  }
  task.progress = Math.max(0, Math.min(100, parseInt(progress, 10)));
  if (task.progress === 100) {
    task.status = 'Completed';
    task.completed = true;
    task.completedAt = new Date();
  } else if (task.status === 'Completed') {
    task.status = 'Acknowledged';
    task.completed = false;
    task.completedAt = null;
  }
  await task.save();
  if (isJson) {
    return res.json({ success: true, message: 'Training progress updated successfully', task });
  }
  res.redirect(`/department/${task.department}/training/${task.assignedTo}`);
});

// Render announcement page
router.get('/:department/announcement', async (req, res) => {
  const department = req.params.department;
  const userId = req.session.userId;
  const employee = await Employee.findById(userId);
  res.render('department/announcement', { department, employee });
});

// Render task page
router.get('/:department/task', async (req, res) => {
  const department = req.params.department;
  const userId = req.session.userId;
  const employee = await Employee.findById(userId);
  const employees = await Employee.find({ department });
  res.render('department/task', { department, employee, employees });
});

// Render leave approval page
router.get('/:department/leave', async (req, res) => {
  const department = req.params.department;
  const userId = req.session.userId;
  const employee = await Employee.findById(userId);
  const employees = await Employee.find({ department });
  const leaves = await Leave.find({ department });
  res.render('department/leave', { department, employee, employees, leaves });
});

// Department dashboard: show all employees in department
router.get('/:department', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  const department = req.params.department;
  const userId = req.session.userId;
  console.log('Dashboard access attempt. Session userId:', userId); // Debug log

  let employee = null;
  if (req.session.employeeId) {
    employee = await Employee.findById(req.session.employeeId);
    console.log('Employee found for dashboard:', employee); // Debug log
  } else {
    console.log('No userId in session. Proceeding without employee.');
  }

  try {
    const employees = await Employee.find({ department });
    const tasks = await Task.find({ department });
    const leaves = await Leave.find({ department });
    const announcements = await Announcement.find({ department });
    if (isJson) {
      return res.json({
        employee,
        employees,
        tasks,
        leaves,
        department,
        announcements
      });
    }
    res.render('department/dashboard', {
      employee,
      employees,
      tasks,
      leaves,
      department,
      announcements
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    if (isJson) return res.status(500).json({ error: 'Error loading dashboard' });
    res.status(500).send('Error loading dashboard');
  }
});

// Manager: allot task/training to staff
router.post('/:department/task', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { title, description, assignedTo, startDate, deadline, type, resources } = req.body;
  if (!title || !description || !assignedTo || !startDate || !deadline || !type) {
    if (isJson) return res.status(400).json({ error: 'Missing required fields' });
    req.flash('error_msg', 'Missing required fields. Please fill in all fields before deploying the mission.');
    return res.redirect(`/department/${req.params.department}/task`);
  }
  const manager = await Employee.findOne({ department: req.params.department, designation: 'MANAGER' });
  if (!manager) {
    if (isJson) return res.status(403).json({ error: 'No manager found in department' });
    return res.status(403).send('No manager found in department');
  }
  try {
    const task = await Task.create({
      title,
      description,
      type,
      assignedTo,
      assignedBy: manager._id,
      department: manager.department,
      startDate,
      deadline,
      resources: resources ? [resources] : []
    });
    if (isJson) {
      return res.json({ success: true, message: 'Mission successfully deployed', task });
    }
    req.flash('success_msg', 'Mission successfully deployed to personnel.');
    res.redirect(`/department/${manager.department}`);
  } catch (err) {
    console.error('Error creating task:', err);
    if (isJson) return res.status(500).json({ error: 'Failed to create task' });
    req.flash('error_msg', 'Failed to create task. Please check the logs.');
    res.redirect(`/department/${req.params.department}/task`);
  }
});

// Staff: view all tasks assigned to them
router.get('/:department/mytasks/:employeeId', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  const department = req.params.department;
  const employeeId = req.params.employeeId;
  const employee = await Employee.findById(employeeId);
  if (!employee || employee.department !== department) {
    if (isJson) return res.status(403).json({ error: 'Not authorized' });
    return res.status(403).send('Not authorized');
  }
  const tasks = await Task.find({ department, assignedTo: employeeId });
  if (isJson) {
    return res.json({ department, employee, tasks });
  }
  res.render('department/mytasks', { department, employee, tasks });
});

// Staff: acknowledge a task
router.post('/:department/task/:taskId/acknowledge', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const employeeId = req.body.employeeId || req.session.employeeId;
  const employee = await Employee.findById(employeeId);
  const task = await Task.findById(req.params.taskId);
  if (!employee || !task || task.assignedTo.toString() !== employee._id.toString()) {
    if (isJson) return res.status(403).json({ error: 'Not authorized' });
    return res.status(403).send('Not authorized');
  }
  task.status = 'Acknowledged';
  task.acknowledged = true;
  task.acknowledgedAt = new Date();
  await task.save();
  if (isJson) {
    return res.json({ success: true, message: 'Task acknowledged successfully', task });
  }
  res.redirect(`/department/${req.params.department}/mytasks/${employee._id}`);
});

// Staff: complete a task
router.post('/:department/task/:taskId/complete', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { comments } = req.body;
  const employeeId = req.body.employeeId || req.session.employeeId;
  const employee = await Employee.findById(employeeId);
  const task = await Task.findById(req.params.taskId);
  if (!employee || !task || task.assignedTo.toString() !== employee._id.toString()) {
    if (isJson) return res.status(403).json({ error: 'Not authorized' });
    return res.status(403).send('Not authorized');
  }
  task.status = 'Completed';
  task.completed = true;
  task.completedAt = new Date();
  task.comments = comments || '';
  if (task.type === 'Training') {
    task.progress = 100;
  }
  await task.save();
  if (isJson) {
    return res.json({ success: true, message: 'Task completed successfully', task });
  }
  res.redirect(`/department/${req.params.department}/mytasks/${employee._id}`);
});

const { sendEmail } = require('../utils/email');

// Manager: approve/reject leave for staff in department
router.post('/:department/leave/:leaveId', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { action, rejectionReason } = req.body; // 'approve' or 'reject'
  const leave = await Leave.findById(req.params.leaveId);
  const manager = await Employee.findOne({ department: req.params.department, designation: 'MANAGER' });

  if (!manager || !leave || leave.department !== manager.department) {
    if (isJson) return res.status(403).json({ error: 'Not authorized' });
    return res.status(403).send('Not authorized');
  }

  // Check if already processed
  if (leave.status === 'APPROVED' || leave.status === 'REJECTED') {
    if (isJson) return res.status(400).json({ error: 'Leave already processed' });
    return res.redirect(`/department/${req.params.department}/leave?error=already_processed`);
  }

  let emailSubject = '';
  let emailBody = '';
  let isActioned = false;

  if (action === 'approve') {
    leave.status = 'APPROVED';
    leave.rejectionReason = null;
    emailSubject = 'Leave Approved - RSR Aviation';
    isActioned = true;

    // If LOP, deduct salary in payslip
    if (leave.leaveType === 'LOP') {
      const fromDate = new Date(leave.fromDate);
      const month = fromDate.getMonth() + 1;
      const year = fromDate.getFullYear();
      const payslip = await Payslip.findOne({ employee: leave.employeeId, month, year });
      if (payslip) {
        const perDay = payslip.basicSalary / 31;
        const deductionAmount = perDay * leave.totalDays;
        payslip.deductions += deductionAmount;
        payslip.netPay -= deductionAmount;
        payslip.deductionDetails = payslip.deductionDetails || [];
        payslip.deductionDetails.push({
          type: 'LOP',
          label: `Loss of Pay for ${leave.totalDays} day(s)`,
          amount: deductionAmount
        });
        await payslip.save();
      }
    } else {
      // Regular Leave - Deduct from Balance
      const employee = await Employee.findById(leave.employeeId);
      if (employee) {
        if (employee.leaveBalance >= leave.totalDays) {
          employee.leaveBalance -= leave.totalDays;
          await employee.save();
          console.log(`Deducted ${leave.totalDays} days from ${employee.firstName}. New Balance: ${employee.leaveBalance}`);
        } else {
          // Warning: Approved but insufficient balance. 
          // You might want to block this or force it to LOP. 
          // For now, we deduct (can go negative) or just let it be. 
          // Typically we should check before approving.
          console.log("Warning: Insufficient leave balance, but approved.");
          // Optional: employee.leaveBalance -= leave.totalDays; (allowing negative)
          // For safety:
          if (employee.leaveBalance > 0) {
            employee.leaveBalance = Math.max(0, employee.leaveBalance - leave.totalDays);
            await employee.save();
          }
        }
      }
    }
  } else if (action === 'regularize-unpaid') {
    leave.status = 'APPROVED';
    leave.leaveType = 'LOP';
    leave.rejectionReason = null;
    emailSubject = 'Leave Approved (Regularized as Unpaid) - RSR Aviation';
    isActioned = true;

    const fromDate = new Date(leave.fromDate);
    const month = fromDate.getMonth() + 1;
    const year = fromDate.getFullYear();
    const payslip = await Payslip.findOne({ employee: leave.employeeId, month, year });
    if (payslip) {
      const perDay = payslip.basicSalary / 31;
      const deductionAmount = perDay * leave.totalDays;
      payslip.deductions += deductionAmount;
      payslip.netPay -= deductionAmount;
      payslip.deductionDetails = payslip.deductionDetails || [];
      payslip.deductionDetails.push({
        type: 'LOP',
        label: `Regularized as Unpaid Leave for ${leave.totalDays} day(s)`,
        amount: deductionAmount
      });
      await payslip.save();
    }
  } else if (action === 'reject') {
    leave.status = 'REJECTED';
    leave.rejectionReason = rejectionReason || 'No reason provided';
    emailSubject = 'Leave Rejected - RSR Aviation';
    isActioned = true;
  }

  await leave.save();

  // --- SEND EMAIL NOTIFICATION TO EMPLOYEE ---
  if (isActioned) {
    try {
      const employee = await Employee.findById(leave.employeeId);
      if (employee && employee.email) {

        const statusColor = leave.status === 'APPROVED' ? '#28a745' : '#dc3545';
        const messageHeader = leave.status === 'APPROVED' ? 'Leave Approved' : 'Leave Rejected';

        emailBody = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: ${statusColor};">${messageHeader}</h2>
            <p>Dear <strong>${employee.firstName}</strong>,</p>
            <p>Your leave request has been <strong>${leave.status}</strong> by ${manager.firstName} (Manager).</p>
            
            ${leave.status === 'REJECTED' ? `<p style="color: #d9534f;"><strong>Reason for Rejection:</strong> ${leave.rejectionReason}</p>` : ''}

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Leave Type:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${leave.leaveType}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>From Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${leave.fromDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>To Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${leave.toDate}</td>
              </tr>
                <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Total Days:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${leave.totalDays}</td>
              </tr>
            </table>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">RSR Aviation HRMS</p>
          </div>
        `;

        await sendEmail({
          to: employee.email,
          subject: emailSubject,
          html: emailBody
        });
        console.log(`Notification email sent to ${employee.email} regarding leave status: ${leave.status}`);
      }
    } catch (emailErr) {
      console.error("Error sending notification email:", emailErr);
    }
  }

  if (isJson) return res.json({ success: true, message: `Leave successfully actioned: ${leave.status}`, leave });
  return res.redirect(`/department/${manager.department}`);
});

// Manager: post announcement
router.post('/:department/announcement', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const manager = await Employee.findOne({ department: req.params.department, designation: 'MANAGER' });
  if (!manager) {
    if (isJson) return res.status(403).json({ error: 'Authorization Error: No manager found for this department.' });
    req.flash('error_msg', 'Authorization Error: No manager found for this department.');
    return res.redirect(`/department/${req.params.department}`);
  }
  if (!req.body.title || !req.body.message) {
    if (isJson) return res.status(400).json({ error: 'Announcement failed: Title and Message are required.' });
    req.flash('error_msg', 'Announcement failed: Title and Message are required.');
    return res.redirect(`/department/${req.params.department}/announcement`);
  }
  const announcement = await Announcement.create({
    title: req.body.title,
    message: req.body.message,
    department: manager.department
  });
  if (isJson) {
    return res.json({ success: true, message: 'Announcement successfully posted to the department board.', announcement });
  }
  req.flash('success_msg', 'Announcement successfully posted to the department board.');
  res.redirect(`/department/${manager.department}`);
});

// Manager: Allot WFH
router.post('/:department/allot-wfh', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { employeeId, startDate, endDate, reason } = req.body;
  const manager = await Employee.findOne({ department: req.params.department, designation: 'MANAGER' });

  if (!manager) {
    if (isJson) return res.status(403).json({ error: 'Authorization Error: No manager found for this department.' });
    req.flash('error_msg', 'Authorization Error: No manager found for this department.');
    return res.redirect(`/department/${req.params.department}`);
  }

  if (!employeeId || !startDate || !endDate || !reason) {
    if (isJson) return res.status(400).json({ error: 'Missing required fields for WFH allotment.' });
    req.flash('error_msg', 'Missing required fields for WFH allotment.');
    return res.redirect(`/department/${req.params.department}/wfh-allotment`);
  }

  try {
    const employee = await Employee.findById(employeeId);
    if (employee) {
      employee.wfhSchedule = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason,
        allottedBy: manager._id
      };
      await employee.save();
      console.log(`WFH Allotted to ${employee.firstName} from ${startDate} to ${endDate}`);
      if (isJson) {
        return res.json({ success: true, message: `WFH successfully allotted to ${employee.firstName}`, employee });
      }
      req.flash('success_msg', `WFH successfully allotted to ${employee.firstName}.`);
    } else {
      if (isJson) return res.status(404).json({ error: 'Employee not found' });
    }
    res.redirect(`/department/${manager.department}`);
  } catch (err) {
    console.error("Error allotting WFH:", err);
    if (isJson) return res.status(500).json({ error: 'Error allotting WFH' });
    res.status(500).send("Error allotting WFH");
  }
});

// Manager: Allot WFH (GET Page)
router.get('/:department/wfh-allotment', async (req, res) => {
  const manager = await Employee.findOne({ department: req.params.department, designation: 'MANAGER' });
  if (!manager) return res.status(403).send('Not authorized');

  const employees = await Employee.find({ department: req.params.department });
  res.render('department/wfh_allotment', {
    department: req.params.department,
    employees,
    manager
  });
});

// Manager: Process Resignation
router.post('/:department/resignation/:employeeId', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { action } = req.body;
  const manager = await Employee.findOne({ department: req.params.department, designation: 'MANAGER' });

  if (!manager) {
    if (isJson) return res.status(403).json({ error: 'Not authorized' });
    return res.status(403).send('Not authorized');
  }

  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: 'Employee not found' });
      return res.status(404).send('Employee not found');
    }

    if (action === 'approve') {
      employee.resignationStatus = 'Approved';
      employee.status = 'Resigned'; // Update main status

      // Notify Employee
      if (employee.email) {
        await sendEmail({
          to: employee.email,
          subject: 'Resignation Accepted - RSR Aviation',
          html: `<p>Dear ${employee.firstName},</p><p>Your resignation has been accepted by the management. HR will contact you for the exit process.</p>`
        });
      }

    } else if (action === 'reject') {
      employee.resignationStatus = 'Rejected';

      // Notify Employee
      if (employee.email) {
        await sendEmail({
          to: employee.email,
          subject: 'Resignation Request Rejected',
          html: `<p>Dear ${employee.firstName},</p><p>Your resignation request has been declined. Please discuss with your manager.</p>`
        });
      }
    }

    await employee.save();
    if (isJson) {
      return res.json({ success: true, message: `Resignation successfully ${action}d`, employee });
    }
    res.redirect(`/department/${manager.department}`);

  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: 'Error processing resignation' });
    res.status(500).send('Error processing resignation');
  }
});

module.exports = router;
