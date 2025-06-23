const Auth = require("../../Models/Common/Auth");
const WholesalerProfile = require("../../Models/Wholesaler/ShopProfile");
const PhoneOtp = require("../../Models/Common/Phoneotp");
const { apiResponse } = require("../../utils/apiResponse");
const { uploadImageOrPdf } = require("../../utils/s3Upload");
const mongoose = require("mongoose");


exports.signupWholesaler = async (req, res) => {
  try {
    const { name, phoneNumber, email, otp } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !email || !otp) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Name, phone number, email, and OTP are required"));
    }

    // Validate name (basic: alphanumeric and spaces, 2-50 characters)
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    if (!nameRegex.test(name)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid name format (2-50 characters, letters and spaces only)"));
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number must be 10 digits"));
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid email format"));
    }

    // Fetch OTP record
    const otpRecord = await PhoneOtp.findOne({ phoneNumber }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res
        .status(400)
        .json(apiResponse(400, false, "OTP not found for this phone number"));
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(401).json(apiResponse(401, false, "Invalid OTP"));
    }

    // Check OTP expiry (5 minutes)
    const otpExpiryTime = 5 * 60 * 1000; // 5 minutes
    const otpAge = Date.now() - otpRecord.createdAt.getTime();
    if (otpAge > otpExpiryTime) {
      return res.status(400).json(apiResponse(400, false, "OTP has expired"));
    }

    // Check if wholesaler exists
    let wholesaler = await Auth.findOne({ phoneNumber });

    if (wholesaler) {
      if (wholesaler.role !== "Wholesaler") {
        return res
          .status(403)
          .json(apiResponse(403, false, "Phone number registered with a different role"));
      }
      if (wholesaler.hasShopDetail) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Wholesaler already exists with profile"));
      } else {
        return res
          .status(400)
          .json(apiResponse(400, false, "Wholesaler profile not created, please create profile"));
      }
    }

    // Create new wholesaler
    wholesaler = new Auth({
      name,
      phoneNumber,
      email,
      isPhoneVerified: true,
      role: "Wholesaler",
    });

    // Save wholesaler
    await wholesaler.save();

    // Create empty shop profile with wholesalerId
    const shopProfile = new WholesalerProfile({
      wholesalerId: wholesaler._id,
    });

    // Save shop profile
    await shopProfile.save();

    // Remove OTP record
    await PhoneOtp.deleteOne({ phoneNumber });
    console.log(wholesaler);

    return res
      .status(201)
      .json(apiResponse(201, true, "Wholesaler signed up successfully, please create shop profile", { wholesaler }));
  } catch (error) {
    console.log("Error in signupWholesaler:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number or email already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to sign up wholesaler"));
  }
};


exports.createShopProfile = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const {
      shopName,
      shopNumber,
      shopAddress,
      businessHours: businessHoursString,
      gstNumber,
      mandiRegion,
      pincode,
    } = req.body;

    const businessCertificateFile = req.file; // From multer

    // Validate wholesalerId
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid wholesaler ID"));
    }

    // Validate required fields
    if (
      !shopName ||
      !shopNumber ||
      !shopAddress ||
      !businessHoursString ||
      !gstNumber ||
      !mandiRegion ||
      !pincode ||
      !businessCertificateFile
    ) {
      return res
        .status(400)
        .json(apiResponse(400, false, "All shop profile fields and business certificate file are required"));
    }

    // Validate shopName (2-100 characters, alphanumeric and spaces)
    const shopNameRegex = /^[a-zA-Z0-9\s]{2,100}$/;
    if (!shopNameRegex.test(shopName)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid shop name (2-100 characters, alphanumeric and spaces)"));
    }

    // Validate shopNumber (alphanumeric, 1-50 characters)
    const shopNumberRegex = /^[a-zA-Z0-9\s\-\/]{1,50}$/;
    if (!shopNumberRegex.test(shopNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid shop number format"));
    }

    // Validate shopAddress (5-200 characters)
    if (shopAddress.length < 5 || shopAddress.length > 200) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Shop address must be 5-200 characters"));
    }

    // Parse businessHours
    let businessHours;
    try {
      businessHours = JSON.parse(businessHoursString);
    } catch (parseError) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid business hours format: must be a valid JSON string"));
    }

    // Validate businessHours structure and format
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (
      !businessHours.monToSat ||
      !businessHours.monToSat.open ||
      !businessHours.monToSat.close ||
      !businessHours.sunday ||
      !businessHours.sunday.open ||
      !businessHours.sunday.close ||
      !timeRegex.test(businessHours.monToSat.open) ||
      !timeRegex.test(businessHours.monToSat.close) ||
      !timeRegex.test(businessHours.sunday.open) ||
      !timeRegex.test(businessHours.sunday.close)
    ) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid business hours format (e.g., '08:00 AM')"));
    }

    // Validate GST number (Indian GST: 15 characters)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid GST number format"));
    }

    // Validate mandiRegion (2-100 characters)
    if (mandiRegion.length < 2 || mandiRegion.length > 100) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Mandi region must be 2-100 characters"));
    }

    // Validate pincode (6 digits for India)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid pincode format (6 digits)"));
    }

    // Find wholesaler
    const wholesaler = await Auth.findOne({ _id: wholesalerId, role: "Wholesaler" });

    if (!wholesaler) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Wholesaler not found"));
    }

    if (!wholesaler.isPhoneVerified) {
      return res
        .status(403)
        .json(apiResponse(403, false, "Phone number not verified"));
    }

    if (wholesaler.hasShopDetail) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Shop profile already created"));
    }

    // Find existing shop profile
    let shopProfile = await WholesalerProfile.findOne({ wholesalerId });

    if (!shopProfile) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Shop profile not found for this wholesaler"));
    }

    // Upload business certificate to S3
    let businessCertificateUrl;
    try {
      businessCertificateUrl = await uploadImageOrPdf(businessCertificateFile, "business-certificates");
    } catch (uploadError) {
      return res
        .status(400)
        .json(apiResponse(400, false, `Failed to upload business certificate: ${uploadError.message}`));
    }

    // Update shop profile with details
    shopProfile.shopName = shopName;
    shopProfile.shopNumber = shopNumber;
    shopProfile.shopAddress = shopAddress;
    shopProfile.businessHours = businessHours;
    shopProfile.gstNumber = gstNumber;
    shopProfile.mandiRegion = mandiRegion;
    shopProfile.pincode = pincode;
    shopProfile.businessCertificate = businessCertificateUrl;

    // Save updated profile
    await shopProfile.save();

    // Update Auth model
    wholesaler.hasShopDetail = true;
    await wholesaler.save();

    return res
      .status(201)
      .json(apiResponse(201, true, "Shop profile updated successfully, awaiting admin verification", { shopProfile }));
  } catch (error) {
    console.log("Error in createShopProfile:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "GST number already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to update shop profile"));
  }
};

