const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    try {
      const adminDb = mongoose.connection.useDb("admin");
      const dbs = await adminDb.db.admin().listDatabases();
      console.log("Databases in MongoDB:");
      dbs.databases.forEach(db => {
        console.log(`- ${db.name}`);
      });
    } catch (dbListErr) {
      console.log("Databases connected (Atlas restricted view).");
    }
    
    const Tenant = require("../models/master/Tenant");
    const tenants = await Tenant.find({});
    console.log("\nTenants registered in Master Registry:");
    tenants.forEach(t => {
      console.log(`- Company: ${t.companyName}, Slug: ${t.tenantId}, Status: ${t.status}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
