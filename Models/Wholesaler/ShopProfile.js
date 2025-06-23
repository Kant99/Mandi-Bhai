const mongoose = require("mongoose");

const WholesalerProfileSchema = new mongoose.Schema(
  {
    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
    shopName: {
      type: String,
    },
    shopNumber: {
      type: String,
    },
    shopAddress: {
      type: String,
    },
    mandiRegion: {
      type: String,
    },
    pincode: {
      type: String,
    },
    businessHours: {
      monToSat: {
        open: { type: String, default: "08:00 AM" },
        close: { type: String, default: "08:00 PM" },
      },
      sunday: {
        open: { type: String, default: "09:00 AM" },
        close: { type: String, default: "06:00 PM" },
      },
    },
    isShopOpen: {
      type: Boolean,
      default: true,
    },
    gstNumber: {
      type: String,
      unique: true,
    },
    businessCertificate: {
      // URL link
      type: String,
    },
    kycStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Rejected'],
      default: 'Pending',
    },
    isWholesalerVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WholesalerProfile", WholesalerProfileSchema);
