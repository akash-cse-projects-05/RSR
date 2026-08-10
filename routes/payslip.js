const express = require('express');
const router = express.Router();
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');

// HR Authorization Middleware
function hrAuth(req, res, next) {
  if (!req.session.userId || req.session.role !== 'HR') {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
    if (isJson) return res.status(401).json({ error: 'Unauthorized. HR session required.' });
    return res.redirect('/hr/hr-login');
  }
  next();
}

// HR: Generate payslip for an employee
router.post('/generate', hrAuth, async (req, res) => {
  try {
    let {
      employeeId, month, year,
      basicSalary, hra, travelAllowance, otherAllowances, bonuses, reimbursements,
      pf, professionalTax, taxes, deductions, gstPercent
    } = req.body;

    // Parse Numbers (Default to 0)
    basicSalary = Number(basicSalary) || 0;
    hra = Number(hra) || 0;
    travelAllowance = Number(travelAllowance) || 0;
    otherAllowances = Number(otherAllowances) || 0;
    bonuses = Number(bonuses) || 0;
    reimbursements = Number(reimbursements) || 0;

    pf = Number(pf) || 0;
    professionalTax = Number(professionalTax) || 0;
    taxes = Number(taxes) || 0; // Income Tax / TDS
    deductions = Number(deductions) || 0; // Manual Deductions
    gstPercent = Number(gstPercent) || 0;

    // Get employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).send('Employee not found');
    }

    // --- CALCULATE EARNINGS ---
    // Total Allowances (for DB aggregate field if needed)
    const totalAllowances = hra + travelAllowance + otherAllowances;

    const totalEarnings = basicSalary + totalAllowances + bonuses + reimbursements;

    // --- CALCULATE DEDUCTIONS ---
    let deductionDetails = [];

    // 1. GST
    let gstDeduction = 0;
    if (gstPercent > 0) {
      gstDeduction = (totalEarnings * gstPercent) / 100;
      deductionDetails.push({
        type: 'GST',
        label: `GST Deduction (${gstPercent}%)`,
        amount: gstDeduction
      });
    }

    // 2. LOP Calculation
    const Leave = require('../models/Leave');
    const monthStr = month.toString().padStart(2, '0');
    const searchPattern = new RegExp(`^${year}-${monthStr}-`);
    
    const lopLeaves = await Leave.find({
      employeeId: employee._id,
      leaveType: 'LOP',
      status: 'APPROVED',
      fromDate: { $regex: searchPattern }
    });

    let lopDays = 0;
    lopLeaves.forEach(l => lopDays += l.totalDays);

    if (employee.lopDaysThisMonth > lopDays) {
      lopDays = employee.lopDaysThisMonth;
    }

    let lopDeduction = 0;
    if (lopDays > 0) {
      lopDeduction = (basicSalary / 30) * lopDays;
      deductionDetails.push({
        type: 'LOP',
        label: `Loss of Pay for ${lopDays} day(s)`,
        amount: lopDeduction
      });
    }

    // 3. Manual Deductions
    if (deductions > 0) {
      deductionDetails.push({
        type: 'Manual',
        label: 'Other Manual Deductions',
        amount: deductions
      });
    }

    // 4. PF & PT (Add to details for transparency, also stored in fields)
    if (pf > 0) {
      deductionDetails.push({ type: 'PF', label: 'Provident Fund', amount: pf });
    }
    if (professionalTax > 0) {
      deductionDetails.push({ type: 'PT', label: 'Professional Tax', amount: professionalTax });
    }

    const otherDeductionsSum = deductions + gstDeduction + lopDeduction;

    // Net Pay
    const netPay = totalEarnings - (otherDeductionsSum + pf + professionalTax + taxes);

    await Payslip.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        basicSalary,
        hra,
        travelAllowance,
        otherAllowances,
        allowances: totalAllowances, // Aggregate
        bonuses,
        reimbursements,
        pf,
        professionalTax,
        taxes, // TDS
        deductions: otherDeductionsSum, // Manual + LOP + Gst
        deductionDetails,
        lopDays,
        netPay,
        paymentStatus: 'Not Yet Paid'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Reset monthly LOP counter
    await Employee.updateOne(
      { _id: employeeId },
      { $set: { lopDaysThisMonth: 0 } }
    );

    res.redirect(`/payslip/hr/payslips/${employeeId}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating payslip: ' + err.message });
  }
});

// Employee: View payslips (ownership enforced)
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');

    // Security: Only allow if the employee is viewing their OWN payslips, or if they are HR
    if (req.params.employeeId !== req.session.employeeId?.toString() && req.session.role !== 'HR') {
      if (isJson) return res.status(403).json({ error: 'Access denied. You can only view your own payslips.' });
      return res.status(403).send('Access denied. You can only view your own payslips.');
    }

    const payslips = await Payslip.find({ employee: req.params.employeeId }).sort({ year: -1, month: -1 });
    if (isJson) {
      return res.json({ payslips });
    }
    res.render('employee/payslips', { payslips });
  } catch (err) {
    res.status(500).send('Error loading payslips');
  }
});

// Employee: View own payslips (session-based)
router.get('/employee-payslips', async (req, res) => {
  try {
    if (!req.session.employeeId) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.redirect('/auth/login');
    }
    const payslips = await Payslip.find({ employee: req.session.employeeId }).sort({ year: -1, month: -1 });
    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({ payslips });
    }
    res.render('employee/payslips', { payslips });
  } catch (err) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: 'Error loading payslips' });
    }
    res.status(500).send('Error loading payslips');
  }
});


// Printable Payslip View (ownership enforced)
router.get('/view/:payslipId', async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.payslipId);
    if (!payslip) return res.status(404).send('Payslip not found');

    if (!payslip.employee) {
      return res.status(404).send('Employee record missing from payslip');
    }

    const employee = await Employee.findById(payslip.employee);
    if (!employee) {
      return res.status(404).send('Employee details not found');
    }

    // Security: Only allow if the payslip belongs to the logged-in user, or if they are HR
    if (req.session.employeeId?.toString() !== employee._id.toString() && req.session.role !== 'HR') {
      return res.status(403).send('Access denied. You can only view your own payslips.');
    }

    res.render('employee/payslip-print', { payslip, employee });
  } catch (err) {
    res.status(500).send('Error downloading payslip');
  }
});

// Download/Print View (ownership enforced)
router.get('/download/:payslipId', async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.payslipId);
    if (!payslip) return res.status(404).send('Payslip not found');

    if (!payslip.employee) {
      return res.status(404).send('Employee record missing from payslip');
    }

    const employee = await Employee.findById(payslip.employee);
    if (!employee) {
      return res.status(404).send('Employee details not found');
    }

    // Security: Only allow if the payslip belongs to the logged-in user, or if they are HR
    if (req.session.employeeId?.toString() !== employee._id.toString() && req.session.role !== 'HR') {
      return res.status(403).send('Access denied. You can only view your own payslips.');
    }

    res.render('employee/payslip_download', { payslip, employee });
  } catch (err) {
    res.status(500).send('Error downloading payslip');
  }
});


// HR: List all employees for payslip management (HR only)
router.get('/hr/payslips', hrAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeCode: searchRegex }
      ];
    }
    const employees = await Employee.find(query);
    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({ employees });
    }
    res.render('hr/payslips', { employees, searchQuery: req.query.search });
  } catch (err) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: 'Error loading employees' });
    }
    res.status(500).send('Error loading employees');
  }
});

// HR: Manage payslips for a specific employee (HR only)
router.get('/hr/payslips/:employeeId', hrAuth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    const payslips = await Payslip.find({ employee: req.params.employeeId }).sort({ year: -1, month: -1 });

    // Get total LOP count from employee
    const totalLopDays = employee.lopCount || 0;
    const monthlyLopDays = employee.lopDaysThisMonth || 0;

    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({ employee, payslips, totalLopDays, monthlyLopDays });
    }

    res.render('hr/manage-payslip', {
      employee,
      payslips,
      totalLopDays,
      monthlyLopDays
    });
  } catch (err) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: 'Error loading payslips' });
    }
    res.status(500).send('Error loading payslips');
  }
});

// HR: Update Salary Structure (HR only)
router.post('/hr/update-structure/:employeeId', hrAuth, async (req, res) => {
  try {
    const {
      salary, hra, travelAllowance, otherAllowances, bonuses, reimbursements, deductions,
      pf, professionalTax, incomeTax
    } = req.body;

    await Employee.findByIdAndUpdate(req.params.employeeId, {
      salary: Number(salary) || 0,
      hra: Number(hra) || 0,
      travelAllowance: Number(travelAllowance) || 0,
      otherAllowances: Number(otherAllowances) || 0,
      bonuses: Number(bonuses) || 0,
      reimbursements: Number(reimbursements) || 0,
      deductions: Number(deductions) || 0,
      pf: Number(pf) || 0,
      professionalTax: Number(professionalTax) || 0,
      incomeTax: Number(incomeTax) || 0
    });

    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }
    res.redirect(`/payslip/hr/payslips/${req.params.employeeId}?structureUpdated=true`);
  } catch (err) {
    console.error(err);
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: 'Update failed' });
    }
    res.redirect(`/payslip/hr/payslips/${req.params.employeeId}?error=update_failed`);
  }
});

// HR: Bulk Generate Payslips (HR only)
router.post('/bulk-generate', hrAuth, async (req, res) => {
  const { month, year } = req.body;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (parseInt(year) > currentYear || (parseInt(year) === currentYear && parseInt(month) > currentMonth)) {
    return res.redirect('/payslip/hr/payslips?error=future_date');
  }

  let generatedCount = 0;

  // Import PayrollConfig (ensure it exists or use defaults)
  const PayrollConfig = require('../models/PayrollConfig');
  let config = await PayrollConfig.findOne();
  if (!config) {
    // Default rule: > 50000 gets 5% tax
    config = {
      taxRules: [{ minIncome: 50000, percentage: 5 }],
      pfPercentage: 0,
      ptAmount: 0 // Default 0 as requested "same on salary" storage implies standardization
    };
  }

  const employees = await Employee.find({ status: 'Active' });
  const Leave = require('../models/Leave');

  for (const emp of employees) {
    try {
      // 1. Basic Salary
      const basicSalary = emp.salary || 0;

      // 2. Allowances (From Employee Database)
      const hra = emp.hra || 0;
      const travelAllowance = emp.travelAllowance || 0;
      const otherAllowances = emp.otherAllowances || 0;
      const bonuses = 0; // Bonuses are typically one-off, so 0 is safer for bulk, can be edited manually later.
      const totalEarnings = basicSalary + hra + travelAllowance + otherAllowances + bonuses;

      // 3. LOP Calculation
      // Find approved LOP leaves in this month/year
      // DB stores dates as strings "YYYY-MM-DD", need to filter carefully
      // Matches strictly by month/year regex
      const monthStr = month.toString().padStart(2, '0');
      const searchPattern = new RegExp(`^${year}-${monthStr}-`);

      const lopLeaves = await Leave.find({
        employeeId: emp._id,
        leaveType: 'LOP',
        status: 'APPROVED',
        fromDate: { $regex: searchPattern } // Simplified overlap check (starts in month)
      });

      let lopDays = 0;
      lopLeaves.forEach(l => lopDays += l.totalDays);

      // Also check 'lopDaysThisMonth' field in Employee (manual sync)
      if (emp.lopDaysThisMonth > lopDays) {
        lopDays = emp.lopDaysThisMonth;
      }

      const lopDeduction = (basicSalary / 30) * lopDays;

      // 4. Tax Calculation (Automatic)
      // Rule: "Income Tax where 50000 above will get 5% percent income"
      // Applied on (Earnings - LOP)
      const taxableIncome = totalEarnings - lopDeduction;
      let taxAmount = 0;

      // Check config rules
      if (config.taxRules && config.taxRules.length > 0) {
        for (const rule of config.taxRules) {
          if (taxableIncome > rule.minIncome) {
            taxAmount = (taxableIncome * rule.percentage) / 100;
            break; // specific rule: "50000 above will get 5%" implies single bracket logic usually
          }
        }
      }

      // 5. Approved Claims (Reimbursements)
      // Fetch approved expenses for this month/year
      // Logic: Date of expense falls in the selected month/year
      const Expense = require('../models/Expense');
      const startOfPayPeriod = new Date(year, month - 1, 1);
      const endOfPayPeriod = new Date(year, month, 0, 23, 59, 59);

      const approvedExpenses = await Expense.find({
        employeeId: emp._id,
        status: 'Approved',
        date: {
          $gte: startOfPayPeriod,
          $lte: endOfPayPeriod
        }
      });

      const totalReimbursements = approvedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      // 6. Deductions
      const pt = (emp.professionalTax !== undefined && emp.professionalTax > 0) ? emp.professionalTax : (config.ptAmount || 0);
      const pf = (emp.pf !== undefined && emp.pf > 0) ? emp.pf : ((basicSalary * (config.pfPercentage || 0)) / 100);
      const totalDeductions = lopDeduction + taxAmount + pt + pf;

      // Net Pay = Earnings + Reimbursements - Deductions
      const netPay = totalEarnings + totalReimbursements - totalDeductions;

      // Deduction Details
      const deductionDetails = [];
      if (lopDeduction > 0) deductionDetails.push({ type: 'LOP', label: `Loss of Pay (${lopDays} days)`, amount: lopDeduction });
      if (taxAmount > 0) deductionDetails.push({ type: 'Tax', label: 'Income Tax (TDS)', amount: taxAmount });
      if (pt > 0) deductionDetails.push({ type: 'PT', label: 'Professional Tax', amount: pt });
      if (pf > 0) deductionDetails.push({ type: 'PF', label: 'Provident Fund', amount: pf });

      // Create/Upsert Payslip
      await Payslip.findOneAndUpdate(
        { employee: emp._id, month, year },
        {
          basicSalary,
          hra,
          travelAllowance,
          otherAllowances,
          allowances: hra + travelAllowance + otherAllowances,
          bonuses,
          reimbursements: totalReimbursements,
          lopDays,
          deductions: totalDeductions, // Storing total deduction sum here for simplicity in listing
          deductionDetails,
          taxes: taxAmount,
          professionalTax: pt,
          pf,
          netPay,
          paymentStatus: 'Not Yet Paid'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      generatedCount++;

    } catch (innerErr) {
      console.error(`Error generating payslip for ${emp.employeeCode}:`, innerErr);
    }
  }

  if (req.headers.accept?.includes('application/json')) {
    return res.json({ success: true, count: generatedCount });
  }
  res.redirect(`/payslip/hr/payslips?success=true&count=${generatedCount}`);
});

module.exports = router;
