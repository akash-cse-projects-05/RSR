const { execSync } = require("child_process");
const path = require("path");

const testFiles = [
  "test-db.js",
  "check-dbs.js",
  "test-admin.js",
  "test-hr-users.js",
  "test-attendance.js",
  "test-leaves.js",
  "test-expenses.js",
  "test-notices.js",
  "test-tickets.js",
  "test-training.js",
  "test-all-buttons.js",
  "test-bulk.js",
  "test-mongoose.js"
];

console.log("=================================================");
console.log("🚀 EXECUTING ALL HRMS BACKEND & API TESTS       ");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`▶️ Running: ${file}...`);
  try {
    const output = execSync(`node "${filePath}"`, { encoding: "utf-8" });
    console.log(output.trim());
    console.log(`✔ ${file} PASSED\n`);
    passed++;
  } catch (err) {
    console.error(`❌ ${file} FAILED:`);
    console.error(err.stdout || err.message);
    console.log("\n");
    failed++;
  }
}

console.log("=================================================");
console.log(`📊 TEST SUMMARY REPORT`);
console.log(` Total Executed: ${testFiles.length}`);
console.log(` ✅ Passed: ${passed}`);
console.log(` ❌ Failed: ${failed}`);
console.log("=================================================");

process.exit(failed > 0 ? 1 : 0);
