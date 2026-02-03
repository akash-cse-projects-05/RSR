const express = require('express');
const router = express.Router();
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');

// HR: Generate payslip for an employee
router.post('/generate', async (req, res) => {
  try {
    let {
      employeeId, month, year,
      basicSalary, hra, travelAllowance, otherAllowances, bonuses,
      pf, professionalTax, taxes, deductions, gstPercent
    } = req.body;

    // Parse Numbers (Default to 0)
    basicSalary = Number(basicSalary) || 0;
    hra = Number(hra) || 0;
    travelAllowance = Number(travelAllowance) || 0;
    otherAllowances = Number(otherAllowances) || 0;
    bonuses = Number(bonuses) || 0;

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

    const totalEarnings = basicSalary + totalAllowances + bonuses;

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

    // 2. LOP
    let lopDeduction = 0;
    const lopDays = employee.lopDaysThisMonth || 0;
    if (lopDays > 0) {
      // Assuming LOP is based on Basic Salary? Or Gross? Usually Basic. 
      // Using Basic as per previous logic.
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

    // Total Deductions Sum (PF + PT + Taxes/TDS + Manual + LOP + GST)
    // Note: 'taxes' here is TDS. PT is Professional Tax.
    // Previous system had 'deductions' DB field as the sum of non-tax deductions.
    // For clarity, we will store the specific fields. 
    // And 'deductions' field can store the "Manual + LOP + GST" part to not break old views completely,
    // OR we just rely on netPay calculation.
    // Let's make 'deductions' field = Manual + LOP + GST.
    // And 'taxes' field = TDS.
    // PF and PT have their own fields.

    const otherDeductionsSum = deductions + gstDeduction + lopDeduction;

    // Net Pay
    const netPay = totalEarnings - (otherDeductionsSum + pf + professionalTax + taxes);

    const payslip = new Payslip({
      employee: employeeId,
      month,
      year,
      basicSalary,
      hra,
      travelAllowance,
      otherAllowances,
      allowances: totalAllowances, // Aggregate
      bonuses,

      pf,
      professionalTax,
      taxes, // TDS

      deductions: otherDeductionsSum, // Manual + LOP + Gst
      deductionDetails,
      lopDays,

      netPay
    });

    await payslip.save();

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

// Employee: View payslips
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const payslips = await Payslip.find({ employee: req.params.employeeId }).sort({ year: -1, month: -1 });
    res.render('employee/payslips', { payslips });
  } catch (err) {
    res.status(500).send('Error loading payslips');
  }
});


// Printable Payslip View
router.get('/view/:payslipId', async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.payslipId);
    if (!payslip) return res.status(404).send('Payslip not found');

    // Check if employee field exists
    if (!payslip.employee) {
      return res.status(404).send('Employee record missing from payslip');
    }

    const employee = await Employee.findById(payslip.employee);
    if (!employee) {
      return res.status(404).send('Employee details not found');
    }

    // Ensure we have access (simple check, strictly should check session user vs employee id)
    // if (req.session.employeeId && req.session.employeeId !== employee._id.toString()) ... 

    res.render('employee/payslip-print', { payslip, employee });
  } catch (err) {
    res.status(500).send('Error downloading payslip');
  }
});

// Download/Print View (Alternative Layout)
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

    res.render('employee/payslip_download', { payslip, employee });
  } catch (err) {
    res.status(500).send('Error downloading payslip');
  }
});


// HR: List all employees for payslip management
router.get('/hr/payslips', async (req, res) => {
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
    res.render('hr/payslips', { employees, searchQuery: req.query.search });
  } catch (err) {
    res.status(500).send('Error loading employees');
  }
});

// HR: Manage payslips for a specific employee
router.get('/hr/payslips/:employeeId', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    const payslips = await Payslip.find({ employee: req.params.employeeId }).sort({ year: -1, month: -1 });

    // Get total LOP count from employee
    const totalLopDays = employee.lopCount || 0;
    const monthlyLopDays = employee.lopDaysThisMonth || 0;

    res.render('hr/manage-payslip', {
      employee,
      payslips,
      totalLopDays,
      monthlyLopDays
    });
  } catch (err) {
    res.status(500).send('Error loading payslips');
  }
});

// HR: Bulk Generate Payslips (Automated)
router.post('/bulk-generate', async (req, res) => {
  const { month, year } = req.body;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (parseInt(year) > currentYear || (parseInt(year) === currentYear && parseInt(month) > currentMonth)) {
    return res.send(`<script>alert('Error: Not allowed to generate payslips for future months.'); window.location.href='/payslip/hr/payslips';</script>`);
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
          allowances: 0,
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

  res.send(`<script>alert('Successfully generated ${generatedCount} payslips for ${month}/${year}.'); window.location.href='/payslip/hr/payslips';</script>`);
});

module.exports = router;
