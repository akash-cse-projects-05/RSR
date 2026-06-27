const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    tenantId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    adminEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    },
    subscriptionPlan: {
      type: String,
      enum: ["Starter", "Growth", "Enterprise"],
      default: "Starter"
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid"
    },
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    subscriptionExpiry: {
      type: Date
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Tenant", tenantSchema);
