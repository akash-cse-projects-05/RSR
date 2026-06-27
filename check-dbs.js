require("dotenv").config();
const mongoose = require("mongoose");

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const adminDb = mongoose.connection.useDb("admin");
    const dbs = await adminDb.db.admin().listDatabases();
    console.log("Databases in MongoDB:");
    dbs.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
    // Also print contents of Tenant registry
    const Tenant = require("./models/master/Tenant");
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
