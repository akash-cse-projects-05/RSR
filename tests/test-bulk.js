const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Leave = require("../models/Leave");
const Expense = require("../models/Expense");
const Payslip = require("../models/Payslip");
const PayrollConfig = require("../models/PayrollConfig");

async function testBulkPayslip() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB for bulk payslip test");

    const month = 1;
    const year = 2026;

    let config = await PayrollConfig.findOne({});
    if (!config) {
      config = {
        taxRules: [
          { minIncome: 50000, percentage: 5 },
          { minIncome: 100000, percentage: 10 }
        ],
        pfPercentage: 12,
        ptAmount: 200
      };
    }

    const employees = await Employee.find({ status: 'Active' });
    console.log(`Found ${employees.length} active employees.`);

    let generatedCount = 0;

    for (const emp of employees) {
      try {
        const basicSalary = emp.salary || 0;
        const hra = emp.hra || 0;
        const travelAllowance = emp.travelAllowance || 0;
        const otherAllowances = emp.otherAllowances || 0;
        const bonuses = 0;
        const totalEarnings = basicSalary + hra + travelAllowance + otherAllowances + bonuses;

        const monthStr = month.toString().padStart(2, '0');
        const searchPattern = new RegExp(`^${year}-${monthStr}-`);

        const lopLeaves = await Leave.find({
          employeeId: emp._id,
          leaveType: 'LOP',
          status: 'APPROVED',
          fromDate: { $regex: searchPattern }
        });

        let lopDays = 0;
        lopLeaves.forEach(l => lopDays += l.totalDays);
        if (emp.lopDaysThisMonth > lopDays) {
          lopDays = emp.lopDaysThisMonth;
        }

        const lopDeduction = (basicSalary / 30) * lopDays;
        const taxableIncome = totalEarnings - lopDeduction;
        let taxAmount = 0;

        if (config.taxRules && config.taxRules.length > 0) {
          for (const rule of config.taxRules) {
            if (taxableIncome > rule.minIncome) {
              taxAmount = (taxableIncome * rule.percentage) / 100;
              break;
            }
          }
        }

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

        const pt = (emp.professionalTax !== undefined && emp.professionalTax > 0) ? emp.professionalTax : (config.ptAmount || 0);
        const pf = (emp.pf !== undefined && emp.pf > 0) ? emp.pf : ((basicSalary * (config.pfPercentage || 0)) / 100);
        const totalDeductions = lopDeduction + taxAmount + pt + pf;

        const netPay = totalEarnings + totalReimbursements - totalDeductions;

        const deductionDetails = [];
        if (lopDeduction > 0) deductionDetails.push({ type: 'LOP', label: `Loss of Pay (${lopDays} days)`, amount: lopDeduction });
        if (taxAmount > 0) deductionDetails.push({ type: 'Tax', label: 'Income Tax (TDS)', amount: taxAmount });
        if (pt > 0) deductionDetails.push({ type: 'PT', label: 'Professional Tax', amount: pt });
        if (pf > 0) deductionDetails.push({ type: 'PF', label: 'Provident Fund', amount: pf });

        const query = { employee: emp._id, month, year };
        const update = {
          basicSalary,
          hra,
          travelAllowance,
          otherAllowances,
          allowances: hra + travelAllowance + otherAllowances,
          bonuses,
          reimbursements: totalReimbursements,
          lopDays,
          deductions: totalDeductions,
          deductionDetails,
          taxes: taxAmount,
          professionalTax: pt,
          pf,
          netPay,
          paymentStatus: 'Not Yet Paid'
        };
        await Payslip.findOneAndUpdate(query, update, { upsert: true, new: true, setDefaultsOnInsert: true });
        generatedCount++;
      } catch (err) {
        console.error(`Failed to process employee ${emp.firstName}:`, err);
      }
    }

    console.log(`✅ Bulk payslip generation complete: ${generatedCount} payslips processed.`);
    process.exit(0);
  } catch (err) {
    console.error("Bulk payslip test error:", err);
    process.exit(1);
  }
}

testBulkPayslip();
