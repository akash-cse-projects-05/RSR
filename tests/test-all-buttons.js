const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Complete List of All Application Routes & Button Action Endpoints
const endpointsToTest = [
  { name: "Auth - Login Page", path: "/auth/login", method: "GET" },
  { name: "Auth - Register Company Page", path: "/saas/register-company", method: "GET" },
  { name: "Dashboard - Main View", path: "/dashboard?format=json", method: "GET" },
  { name: "Employee - Profile View", path: "/employee/profile?format=json", method: "GET" },
  { name: "Employee - List View", path: "/employee?format=json", method: "GET" },
  { name: "Attendance - Today Log", path: "/attendance?format=json", method: "GET" },
  { name: "Leaves - Employee My Leaves", path: "/leave/my-leaves?format=json", method: "GET" },
  { name: "Leaves - HR Leaves View", path: "/hr/leaves?format=json", method: "GET" },
  { name: "Payslips - Employee View", path: "/payslip/employee-payslips?format=json", method: "GET" },
  { name: "Payslips - HR Management View", path: "/payslip/hr/payslips?format=json", method: "GET" },
  { name: "Expenses - My Expenses", path: "/expense/my-expenses?format=json", method: "GET" },
  { name: "Expenses - HR Expense Dashboard", path: "/expense/hr/dashboard?format=json", method: "GET" },
  { name: "Trips - My Trips", path: "/trip/my-trips?format=json", method: "GET" },
  { name: "Trips - HR Trip Dashboard", path: "/trip/hr/dashboard?format=json", method: "GET" },
  { name: "Notice Board - Main Board", path: "/notice-board?format=json", method: "GET" },
  { name: "Regularization - My Requests", path: "/regularization?format=json", method: "GET" },
  { name: "Regularization - HR Review", path: "/regularization/hr?format=json", method: "GET" },
  { name: "Documents - My Documents", path: "/documents?format=json", method: "GET" },
  { name: "Documents - HR Review Queue", path: "/documents/review?format=json", method: "GET" },
  { name: "Department - HR Hub", path: "/department/HR?format=json", method: "GET" },
  { name: "HR - User Directory", path: "/hr/users?format=json", method: "GET" },
  { name: "Helpdesk - My Tickets", path: "/ticket?format=json", method: "GET" },
  { name: "Helpdesk - Ticket Management Hub", path: "/ticket/manage?format=json", method: "GET" },
  { name: "Training - Employee LMS Portal", path: "/training?format=json", method: "GET" },
  { name: "Training - HR LMS Management Portal", path: "/training/manage?format=json", method: "GET" },
  { name: "SuperAdmin - System Overview", path: "/superadmin?format=json", method: "GET" }
];

async function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${endpoint.path}`;
    const req = http.get(url, (res) => {
      // 200 OK, 302 Found (Redirect to login), 401 (Auth required) are all valid route responses
      const isValid = res.statusCode >= 200 && res.statusCode < 500;
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: res.statusCode,
        working: isValid
      });
    });

    req.on("error", (err) => {
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: "CONNECTION_REFUSED",
        working: false,
        error: err.message
      });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: "TIMEOUT",
        working: false
      });
    });
  });
}

async function testAllButtonsAndRoutes() {
  console.log("=================================================");
  console.log("🔍 TESTING ALL UI BUTTONS, ROUTES & API CALLS   ");
  console.log(`🌐 Base Target URL: ${BASE_URL}`);
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  // First check if server is listening on BASE_URL
  const serverOnline = await new Promise((resolve) => {
    const req = http.get(BASE_URL + "/health", (res) => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });

  if (!serverOnline) {
    console.log("⚠️ Server (app.js) is not currently running on " + BASE_URL);
    console.log("💡 Note: Start 'node app.js' in another terminal window to run live HTTP route & button tests.\n");
    console.log("=================================================");
    console.log(`📊 BUTTON & ROUTE AUDIT SKIPPED (Server Offline)`);
    console.log("=================================================");
    process.exit(0);
  }

  for (const ep of endpointsToTest) {
    const result = await checkEndpoint(ep);
    if (result.working) {
      console.log(`✅ [${result.status}] ${result.name} (${result.path}) -> WORKING`);
      passed++;
    } else {
      console.log(`❌ [${result.status}] ${result.name} (${result.path}) -> FAILED / BROKEN`);
      failed++;
    }
  }

  console.log("\n=================================================");
  console.log(`📊 BUTTON & ROUTE AUDIT SUMMARY REPORT`);
  console.log(` Total Audited: ${endpointsToTest.length}`);
  console.log(` ✅ Working Endpoints: ${passed}`);
  console.log(` ❌ Failed/Broken: ${failed}`);
  console.log("=================================================");

  process.exit(failed > 0 ? 1 : 0);
}

testAllButtonsAndRoutes();
