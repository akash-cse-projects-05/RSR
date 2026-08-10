require("dotenv").config();
const mongoose = require("mongoose");

const Tenant = require("./models/master/Tenant");
const Employee = require("./models/Employee");
const Leave = require("./models/Leave");
const Expense = require("./models/Expense");
const Payslip = require("./models/Payslip");
const tenantLocalStorage = require("./utils/tenantStore");
const { getTenantConnection } = require("./utils/tenantManager");

async function run() {
  try {
    console.log("Connecting to central DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    const tenantId = "rsr"; // Test RSR Aviation tenant
    console.log(`Getting connection for tenant '${tenantId}'...`);
    const tenantConn = await getTenantConnection(tenantId);
    console.log("Got connection. Database:", tenantConn.name);

    // Run in AsyncLocalStorage context so createTenantModelProxy works correctly
    await tenantLocalStorage.run({ connection: tenantConn, tenantId }, async () => {
      const employees = await Employee.find({ status: 'Active' });
      console.log(`Found active employees count: ${employees.length}`);
      
      for (const emp of employees) {
        console.log(`- Employee: ${emp.firstName} ${emp.lastName} (${emp.employeeCode}), Salary: ${emp.salary}`);
      }

      // Simulate bulk generate for July (month 7), 2026
      const month = 7;
      const year = 2026;
      let generatedCount = 0;

      const PayrollConfig = require('./models/PayrollConfig');
      let config = await PayrollConfig.findOne();
      if (!config) {
        console.log("No custom PayrollConfig found. Using default.");
        config = {
          taxRules: [{ minIncome: 50000, percentage: 5 }],
          pfPercentage: 0,
          ptAmount: 0
        };
      } else {
        console.log("Found custom PayrollConfig:", JSON.stringify(config));
      }

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
          console.log(`Searching LOP leaves for ${emp.firstName} pattern: ${searchPattern}`);

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
          console.log(`LOP days: ${lopDays}`);

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
          console.log(`Tax amount: ${taxAmount}`);

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
          console.log(`Reimbursements: ${totalReimbursements}`);

          const pt = (emp.professionalTax !== undefined && emp.professionalTax > 0) ? emp.professionalTax : (config.ptAmount || 0);
          const pf = (emp.pf !== undefined && emp.pf > 0) ? emp.pf : ((basicSalary * (config.pfPercentage || 0)) / 100);
          const totalDeductions = lopDeduction + taxAmount + pt + pf;

          const netPay = totalEarnings + totalReimbursements - totalDeductions;
          console.log(`Net Pay calculated: ${netPay}`);

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
          console.log(`Updating/creating payslip for ${emp.firstName}...`);
          const upserted = await Payslip.findOneAndUpdate(query, update, { upsert: true, new: true, setDefaultsOnInsert: true });
          console.log(`Upserted successfully: ${upserted._id}`);

          generatedCount++;
        } catch (innerErr) {
          console.error(`Error for ${emp.employeeCode}:`, innerErr);
        }
      }

      console.log(`Generated ${generatedCount} payslips.`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
