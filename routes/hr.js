const express = require("express");
const router = express.Router();

const Employee = require("../models/Employee");
const Attendance = require("../models/Attendence"); // keep spelling same as file
const Leave = require("../models/Leave");
const User = require('../models/User');

const Document = require('../models/Documents');
/* ==========================
   HR AUTH MIDDLEWARE
========================== */
function hrAuth(req, res, next) {
  if (!req.session.userId || req.session.role !== "HR") {
    return res.redirect("/hr/hr-login");
  }
  next();
}

/* ==========================
   HR LOGIN
========================== */

// GET HR Login Page
router.get("/hr-login", (req, res) => {
  if (req.session.userId && req.session.role === "HR") {
    return res.redirect("/hr/dashboard");
  }
  res.render("hr/login");
});

// POST HR Login
router.post("/hr-login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Find User by username (which corresponds to employeeCode)
    const user = await User.findOne({ username });

    if (!user) {
      return res.render("hr/login", { error: "Invalid credentials" });
    }

    // 2. Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render("hr/login", { error: "Invalid credentials" });
    }

    // 3. Find associated Employee to check Role/Department
    const employee = await Employee.findOne({
      _id: user.employeeId,
      status: "Active"
    });

    if (!employee) {
      return res.render("hr/login", { error: "Employee record not found or inactive" });
    }

    // 4. Role validation
    if (employee.department !== "HR") {
      return res.render("hr/login", { error: "Access denied: Not an HR" });
    }

    // 5. Create HR session
    req.session.userId = user._id; // Store User ID in session
    req.session.employeeId = employee._id;
    req.session.role = "HR";

    console.log("✅ HR logged in:", employee.employeeCode);

    res.redirect("/hr/dashboard");

  } catch (err) {
    console.error(err);
    res.status(500).send("HR login error");
  }
});

/* ==========================
   HR DASHBOARD
========================== */
router.get("/dashboard", hrAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalEmployees = await Employee.countDocuments({ status: "Active" });

    const todayAttendance = await Attendance.find({ date: today })
      .populate("employeeId");

    const present = todayAttendance.length;
    const completed = todayAttendance.filter(a => a.punchOut).length;
    const inProgress = todayAttendance.filter(a => !a.punchOut).length;
    const absent = Math.max(totalEmployees - present, 0);

    res.render("hr/dashboard", {
      totalEmployees,
      present,
      completed,
      inProgress,
      absent,
      todayAttendance
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("HR dashboard error");
  }
});

/* ==========================
   ATTENDANCE HISTORY
========================== */


/* ==========================
   HR LEAVE MANAGEMENT
========================== */

// View all leave requests
router.get("/leaves", hrAuth, async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("employeeId")
      .sort({ appliedAt: -1 });

    res.render("hr/leaves", { leaves });

  } catch (err) {
    console.error(err);
    res.status(500).send("Leave dashboard error");
  }
});

// Approve / Reject leave
// router.post("/leave-action/:id", hrAuth, async (req, res) => {
//   try {
//     const { status, hrRemark } = req.body;

//     await Leave.findByIdAndUpdate(req.params.id, {
//       status,
//       hrRemark
//     });

//     res.redirect("/hr/leaves");

//   } catch (err) {
//     console.error(err);
//     res.redirect('/hr/dashboard?error=leave_action_error');
//   }
// });
router.post("/leave-action/:id", hrAuth, async (req, res) => {
  try {
    let { status, hrRemark } = req.body;
    if (status) status = status.toUpperCase();
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.redirect('/hr/dashboard?error=leave_not_found');
    }

    // Prevent status change if already approved or rejected
    if (leave.status === "APPROVED" || leave.status === "REJECTED") {
      return res.redirect('/hr/dashboard?error=already_finalized');
    }

    const employee = await Employee.findById(leave.employeeId);
    if (!employee) {
      return res.redirect('/hr/dashboard?error=employee_not_found');
    }

    // Handle APPROVED status
    if (status === "APPROVED") {
      if (leave.leaveType === "LOP") {
        // Track LOP count
        const newLopCount = employee.lopCount + leave.totalDays;
        const newLopDaysThisMonth = employee.lopDaysThisMonth + leave.totalDays;

        await Employee.updateOne(
          { _id: employee._id },
          {
            $set: {
              lopCount: newLopCount,
              lopDaysThisMonth: newLopDaysThisMonth
            }
          }
        );

        // Calculate and apply LOP deduction to payslip
        const Payslip = require('../models/Payslip');
        const fromDate = new Date(leave.fromDate);
        const month = fromDate.getMonth() + 1;
        const year = fromDate.getFullYear();

        const payslip = await Payslip.findOne({
          employee: employee._id,
          month,
          year
        });

        if (payslip) {
          const perDaySalary = payslip.basicSalary / 30;
          const lopDeduction = perDaySalary * leave.totalDays;

          // Add to deduction details
          payslip.deductionDetails.push({
            type: 'LOP',
            label: `Loss of Pay for ${leave.totalDays} day(s)`,
            amount: lopDeduction
          });

          // Update LOP days count
          payslip.lopDays += leave.totalDays;

          payslip.deductions += lopDeduction;
          payslip.netPay = payslip.basicSalary + payslip.allowances + payslip.bonuses - payslip.deductions - payslip.taxes;
          await payslip.save();

          console.log(`✅ LOP deduction applied: ₹${lopDeduction.toFixed(2)} for ${leave.totalDays} days`);
        }
      } else {
        // Regular leave - deduct from leave balance
        if (employee.leaveBalance < leave.totalDays) {
          return res.redirect('/hr/dashboard?error=insufficient_balance');
        }
        const newBalance = employee.leaveBalance - leave.totalDays;
        await Employee.updateOne(
          { _id: employee._id },
          { $set: { leaveBalance: newBalance } }
        );
      }
    }

    // Update leave status and HR remark
    leave.status = status;
    leave.hrRemark = hrRemark;
    if (status === "REJECTED") {
      leave.rejectionReason = req.body.rejectionReason || hrRemark;
    }
    // Ensure department is set
    if (!leave.department) {
      if (employee && employee.department) {
        leave.department = employee.department;
      }
    }
    await leave.save();

    // --- SEND EMAIL NOTIFICATION (Approved/Rejected) ---
    try {
      if (employee.email) {
        const nodemailer = require("nodemailer");

        let emailSubject = '';
        let messageHeader = '';
        let statusColor = '';

        if (status === "APPROVED") {
          emailSubject = 'Leave Approved - RSR Aviation (HR)';
          messageHeader = 'Leave Approved';
          statusColor = '#28a745';
        } else {
          emailSubject = 'Leave Rejected - RSR Aviation (HR)';
          messageHeader = 'Leave Rejected';
          statusColor = '#dc3545';
        }

        const transporter = nodemailer.createTransport({
          service: process.env.SMTP_SERVICE || "Gmail",
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
          }
        });

        await transporter.sendMail({
          to: employee.email,
          from: process.env.SMTP_EMAIL,
          subject: emailSubject,
          html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: ${statusColor};">${messageHeader}</h2>
                <p>Dear <strong>${employee.firstName}</strong>,</p>
                <p>Your leave request has been <strong>${status}</strong> by HR.</p>
                
                ${status === 'REJECTED' ? `<p style="color: #d9534f;"><strong>HR Remark/Reason:</strong> ${leave.hrRemark || leave.rejectionReason}</p>` : ''}

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
            `
        });
        console.log(`HR Email sent to ${employee.email} [Status: ${status}]`);
      }
    } catch (emailErr) {
      console.error("HR Email error:", emailErr);
    }

    res.redirect("/hr/leaves");

  } catch (err) {
    console.error(err);
    res.redirect('/hr/dashboard?error=leave_action_error');
  }
});
/* ==========================
   LOP STATISTICS
========================== */
router.get("/lop-stats", hrAuth, async (req, res) => {
  try {
    const employees = await Employee.find({ status: "Active" })
      .select("employeeCode firstName lastName department lopCount lopDaysThisMonth")
      .sort({ lopCount: -1 });

    const totalLopDays = employees.reduce((sum, emp) => sum + emp.lopCount, 0);
    const employeesWithLop = employees.filter(emp => emp.lopCount > 0).length;

    res.json({
      success: true,
      totalLopDays,
      employeesWithLop,
      employees
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================
   RESET MONTHLY LOP COUNTER
========================== */
router.post("/reset-monthly-lop", hrAuth, async (req, res) => {
  try {
    await Employee.updateMany(
      {},
      { $set: { lopDaysThisMonth: 0 } }
    );

    res.json({
      success: true,
      message: "Monthly LOP counters reset for all employees"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================
   HR LOGOUT
========================== */
// HR LOGOUT
router.get("/logout", hrAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    res.clearCookie("connect.sid");
    res.redirect("/hr/hr-login");
  });
});



// TO GET THE OVERALL ATTENDANCE OF THE EMPLOYEES

// Example: routes/hr.js
router.get("/attendance-history", hrAuth, async (req, res) => {
  try {
    const query = { status: "Active" };
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeCode: searchRegex }
      ];
    }
    const employees = await Employee.find(query);

    const attendanceStats = await Promise.all(
      employees.map(async emp => {
        const presentDays = await Attendance.countDocuments({
          employeeId: emp._id,
          punchOut: { $ne: null }
        });

        return {
          employeeCode: emp.employeeCode,
          name: emp.firstName + " " + (emp.lastName || ""),
          presentDays
        };
      })
    );

    //  VERY IMPORTANT
    // console.log("attendanceStats sent to EJS:", attendanceStats);

    res.render("hr/history", {
      attendanceStats,
      searchQuery: req.query.search
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Attendance summary error");
  }
});



//hr report 

// List all users
router.get('/users', async (req, res) => {
  const users = await User.find().populate('employeeId');
  res.render('hr/users', { users });
});

// HR views a user's profile
router.get('/profile/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId).populate('employeeId');
  const documents = await Document.find({ user: req.params.userId, name: { $ne: '__OVERALL_STATUS__' } });
  const statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
  res.render('hr/profile', {
    user,
    employee: user.employeeId,
    documents,
    status: statusDoc?.overallStatus || 'OPEN'
  });
});


// HR updates overall status
router.post('/profile/:userId/status', async (req, res) => {
  let statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
  if (!statusDoc) statusDoc = new Document({ name: '__OVERALL_STATUS__' });
  statusDoc.overallStatus = req.body.status;
  await statusDoc.save();
  res.redirect(`/hr/profile/${req.params.userId}`);
});

// HR approves/rejects a document
router.post('/profile/:userId/document/:docId/:action', async (req, res) => {
  const status = req.params.action === 'approve' ? 'APPROVED' : 'REJECTED';
  await Document.findByIdAndUpdate(req.params.docId, { status });
  res.redirect(`/hr/profile/${req.params.userId}`);
});



// HR changes THEIR OWN password
router.post('/change-my-password', hrAuth, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.redirect('back');
    }
    if (!newPassword || newPassword.length < 6) {
      return res.redirect('back');
    }

    const user = await User.findById(req.session.userId); // Change OWN password
    if (!user) return res.status(404).send('User not found');

    user.password = newPassword;
    await user.save();

    res.redirect('/hr/dashboard?passwordUpdated=true');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
  }
});

module.exports = router;
