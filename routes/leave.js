const express = require("express");
const router = express.Router();
const Leave = require("../models/Leave");
const Employee = require("../models/Employee"); // ✅ FIX 1
const Payslip = require('../models/Payslip');
const nodemailer = require("nodemailer");


/* ===============================
   APPLY LEAVE PAGE (GET)
============================= */
router.get("/apply", async (req, res) => {
  try {
    if (!req.session.employeeId) {
      return res.redirect("/auth/login");
    }

    const employee = await Employee.findById(req.session.employeeId);

    res.render("leave/apply", {
      employee // ✅ FIX 2
    });

  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});



/* ===============================
   APPLY LEAVE (POST)
================================ */



router.post("/apply", async (req, res) => {
  try {
    if (!req.session.employeeId) {
      return res.redirect("/auth/login");
    }

    const { leaveType, fromDate, toDate, reason } = req.body;

    const from = new Date(fromDate);
    const to = new Date(toDate);

    const totalDays =
      Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

    const employee = await Employee.findById(req.session.employeeId);

    // Validate Leave Balance
    if (leaveType !== 'LOP') {
      if (employee.leaveBalance <= 0 || employee.leaveBalance < totalDays) {
        return res.render("leave/apply", {
          employee,
          error: "Your leaves are finished / Insufficient balance. You can only apply for LOP."
        });
      }
    }

    await Leave.create({
      employeeId: req.session.employeeId,
      department: employee.department,
      leaveType,
      fromDate,
      toDate,
      totalDays,
      reason,
      status: "PENDING"
    });

    // --- EMAIL NOTIFICATION LOGIC ---
    try {
      console.log("Attempting to send email for Employee ID:", req.session.employeeId);

      // 1. Fetch employee again but populate reportingManager to get their details (email)
      const empWithManager = await Employee.findById(req.session.employeeId).populate("reportingManager");

      console.log("Employee Found:", empWithManager ? "Yes" : "No");

      console.log("Employee Found:", empWithManager ? "Yes" : "No");

      let managerToNotify = null;

      // Strategy: Find the "Manager" for this department based on designation
      // User specified: "there is MANAGER that's it" (exact match or uppercase)
      if (empWithManager) {
        console.log("Searching for 'MANAGER' in department:", empWithManager.department);

        // Using regex to match "MANAGER", "Project MANAGER", etc.
        // Case-insensitive is strict enough, but user emphasized capital letters.
        const deptManager = await Employee.findOne({
          department: empWithManager.department,
          designation: { $regex: /MANAGER/i },
          _id: { $ne: empWithManager._id }
        });

        if (deptManager) {
          console.log("Found Department Manager:", deptManager.firstName, "Designation:", deptManager.designation);
          managerToNotify = deptManager;
        } else {
          console.log("No MANAGER found for department:", empWithManager.department);
        }
      }

      if (managerToNotify && managerToNotify.email) {

        const managerEmail = managerToNotify.email;
        console.log("Sending email to:", managerEmail);

        const managerName = managerToNotify.firstName;
        const employeeName = `${empWithManager.firstName} ${empWithManager.lastName}`;

        // 2. Setup Transporter
        const transporter = nodemailer.createTransport({
          service: process.env.SMTP_SERVICE || "Gmail",
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
          }
        });

        // 3. Email Content
        const mailOptions = {
          to: managerEmail,
          from: process.env.SMTP_EMAIL,
          subject: `Leave Application - ${employeeName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #0052cc;">New Leave Application</h2>
              <p>Dear <strong>${managerName}</strong>,</p>
              <p>Employee <strong>${employeeName}</strong> has applied for leave. details are below:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Leave Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${leaveType}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>From Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${fromDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>To Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${toDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Total Days:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${totalDays}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Reason:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${reason}</td>
                </tr>
              </table>

              <p style="margin-top: 30px;">Please login to the properties dashboard to approve or reject this request.</p>
              <p style="color: #888; font-size: 12px; margin-top: 20px;">This is an automated message from RSR Aviation HRMS.</p>
            </div>
          `
        };

        // 4. Send Email
        await transporter.sendMail(mailOptions);
        console.log(`Leave notification email sent to manager: ${managerEmail}`);
      } else {
        console.log("No reporting manager found or manager has no email.");
      }

    } catch (emailErr) {
      console.error("Failed to send leave notification email:", emailErr);
      // We do not block the response if email fails, just log it.
    }

    res.redirect("/leave/my-leaves");

  } catch (err) {
    console.error(err);
    res.redirect('/leave/apply?error=application_failed');
  }
});

/* ===============================
   EMPLOYEE - MY LEAVES
================================ */

router.get("/my-leaves", async (req, res) => {
  try {
    if (!req.session.employeeId) {
      return res.redirect("/auth/login");
    }

    const leaves = await Leave.find({
      employeeId: req.session.employeeId
    }).sort({ createdAt: -1 });

    res.render("leave/my-leaves", { leaves });

  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});


//SHOWING THE REAMINIG LEAVES 
router.post("/approve/:leaveId", async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.leaveId);

    if (!leave) {
      return res.redirect('back');
    }

    if (leave.status === "APPROVED") {
      return res.redirect('back');
    }

    const employee = await Employee.findById(leave.employeeId);

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
      console.log("Before deduction:", employee.leaveBalance);
      if (employee.leaveBalance < leave.totalDays) {
        return res.redirect('/leave/apply?error=insufficient_balance');
      }
      // Only update leaveBalance field to avoid validation errors
      const newBalance = employee.leaveBalance - leave.totalDays;
      await Employee.updateOne(
        { _id: employee._id },
        { $set: { leaveBalance: newBalance } }
      );
      console.log("After deduction:", newBalance);
    }

    // Update leave status
    leave.status = "APPROVED";
    leave.actionBy = req.session.employeeId; // or HR ID
    leave.actionAt = new Date();

    await leave.save();

    const message = leave.leaveType === "LOP"
      ? `LOP Leave approved. Total LOP days: ${employee.lopCount + leave.totalDays}`
      : `Leave approved. Remaining balance: ${employee.leaveBalance - leave.totalDays}`;

    // --- SEND APPROVAL EMAIL TO EMPLOYEE ---
    try {
      if (employee.email) {
        const transporter = nodemailer.createTransport({
          service: process.env.SMTP_SERVICE || "Gmail",
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
          }
        });

        const mailOptions = {
          to: employee.email,
          from: process.env.SMTP_EMAIL,
          subject: 'Leave Approved - RSR Aviation',
          html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #28a745;">Leave Approved</h2>
                <p>Dear <strong>${employee.firstName}</strong>,</p>
                <p>Your leave request has been <strong>APPROVED</strong>.</p>
                
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
        };

        await transporter.sendMail(mailOptions);
        console.log(`Approval email sent to ${employee.email}`);
      }
    } catch (emailErr) {
      console.error("Error sending approval email:", emailErr);
    }

    res.redirect('back');

  } catch (err) {
    console.error(err);
    res.redirect('back');
  }
});



module.exports = router;






































