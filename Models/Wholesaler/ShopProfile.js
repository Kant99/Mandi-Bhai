const mongoose = require("mongoose");

const WholesalerProfileSchema = new mongoose.Schema(
  {
    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ['Proprietorship', 'Partnership', 'Private Limited', 'LLP', 'Other'],
    },
    gstNumber: {
      type: String,
      required: true,
      unique: true,
    },
    apmcRegion: {
      type: String,
      required: true,
    },
    businessAddress: {
      shopNumber: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
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
    idProof: {
      type: String, // URL to uploaded Aadhaar or PAN card
    },
    businessRegistration: {
      type: String, // URL to uploaded Certificate of Incorporation
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WholesalerProfile", WholesalerProfileSchema);
