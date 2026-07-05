import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import Donor from "../models/donorModel.js";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const HANDOVER_LABELS = {
  requested: "Bệnh viện gửi yêu cầu",
  received: "Ngân hàng máu tiếp nhận",
  preparing: "Chuẩn bị máu",
  packed: "Đóng gói",
  shipping: "Vận chuyển",
  confirmed: "Bệnh viện ký, xác nhận",
  rejected: "Từ chối yêu cầu"
};

const getBloodGroup = (item) => item.bloodGroup || item.bloodType;
const getExpiryDate = (item) => item.expiryDate || item.expirationDate;

/* ==============================================================
   HOSPITAL BLOOD REQUEST MANAGEMENT
   ============================================================== */

/**
 * @desc Hospital requests blood from lab
 * @route POST /api/hospital/blood/request
 * @access Private (Hospital)
 */
export const hospitalRequestBlood = async (req, res) => {
  try {
    const hospitalId = req.user._id;
    const { labId, bloodType, units } = req.body;

    // Validation
    if (!labId || !bloodType || !units) {
      return res.status(400).json({
        success: false,
        message: "Please provide labId, bloodType, and units"
      });
    }

    if (units < 1) {
      return res.status(400).json({
        success: false,
        message: "Units must be at least 1"
      });
    }

    // Check if lab exists and is approved
    const lab = await Facility.findOne({ 
      _id: labId, 
      facilityType: "blood-lab", 
      status: "approved" 
    });

    if (!lab) {
      return res.status(404).json({
        success: false,
        message: "Blood lab not found or not approved"
      });
    }

    // Create blood request
    const request = await BloodRequest.create({
      hospitalId,
      labId,
      bloodType,
      units,
      handoverStatus: "requested",
      handoverTimeline: [{
        status: "requested",
        label: HANDOVER_LABELS.requested,
        date: new Date(),
        actor: hospitalId
      }]
    });

    await Promise.all([
      Facility.findByIdAndUpdate(hospitalId, {
        $push: {
          history: {
            eventType: "Stock Update",
            description: `Requested ${units} units of ${bloodType} from ${lab.name}`,
            date: new Date(),
            referenceId: request._id,
          },
        },
      }),
      Facility.findByIdAndUpdate(labId, {
        $push: {
          history: {
            eventType: "Stock Update",
            description: `Received blood request ${request._id} for ${units} units of ${bloodType}`,
            date: new Date(),
            referenceId: request._id,
          },
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: "Blood request sent to lab successfully",
      data: request
    });

  } catch (error) {
    console.error("Hospital Request Blood Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error sending blood request" 
    });
  }
};

/**
 * @desc Get hospital's blood requests
 * @route GET /api/hospital/blood/requests
 * @access Private (Hospital)
 */
export const getHospitalRequests = async (req, res) => {
  try {
    const hospitalId = req.user._id;

    const requests = await BloodRequest.find({ hospitalId })
      .populate("labId", "name email phone address")
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      data: requests 
    });
  } catch (err) {
    console.error("Get Hospital Requests Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch blood requests" 
    });
  }
};

/* ==============================================================
   HOSPITAL DASHBOARD & INVENTORY
   ============================================================== */

export const getHospitalDashboard = async (req, res) => {
  try {
    const hospitalId = req.user._id;

    const [inventory, requests, hospital] = await Promise.all([
      Blood.find({ hospital: hospitalId }),
      BloodRequest.find({ hospitalId }).populate("labId", "name").sort({ createdAt: -1 }),
      Facility.findById(hospitalId).select("history name email phone address lastLogin")
    ]);

    const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const pendingRequests = requests.filter(r => r.status === "pending").length;

    res.json({
      success: true,
      stats: {
        totalUnits,
        pendingRequests,
        totalRequests: requests.length
      },
      inventory,
      recentRequests: requests.slice(0, 5),
      hospital
    });

  } catch (error) {
    console.error("Hospital Dashboard Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load hospital dashboard" 
    });
  }
};

export const getHospitalStock = async (req, res) => {
  try {
    const hospitalId = req.user._id;

    const stock = await Blood.find({ hospital: hospitalId }).sort({ bloodGroup: 1 });

    res.json({ 
      success: true, 
      data: stock 
    });
  } catch (error) {
    console.error("Get Hospital Stock Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch hospital stock" 
    });
  }
};

export const confirmBloodHandover = async (req, res) => {
  try {
    const hospitalId = req.user._id;
    const { id } = req.params;
    const request = await BloodRequest.findOne({ _id: id, hospitalId }).populate("labId", "name");

    if (!request) {
      return res.status(404).json({ success: false, message: "Blood request not found" });
    }

    if (request.status !== "accepted" || request.handoverStatus !== "shipping") {
      return res.status(400).json({
        success: false,
        message: "Only blood shipments in transport can be confirmed"
      });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 42);
    let receivedQuantity = request.fulfilledVolume || 0;

    if (request.fulfilledUnitIds?.length > 0) {
      const issuedUnits = await Blood.find({
        _id: { $in: request.fulfilledUnitIds },
        bloodLab: request.labId._id,
        status: "issued"
      });

      receivedQuantity = issuedUnits.reduce((sum, unit) => sum + (unit.quantity || 0), 0) || receivedQuantity;

      await Blood.updateMany(
        { _id: { $in: issuedUnits.map((unit) => unit._id) } },
        { $set: { status: "used" } }
      );
    } else {
      const labStock = await Blood.findOne({
        bloodLab: request.labId._id,
        bloodGroup: request.bloodType
      });

      if (!labStock || labStock.quantity < request.units) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock to complete handover. Available: ${labStock?.quantity || 0} units`
        });
      }

      labStock.quantity -= request.units;
      receivedQuantity = request.units;

      if (labStock.quantity === 0) {
        await Blood.findByIdAndDelete(labStock._id);
      } else {
        await labStock.save();
      }
    }

    const hospitalStock = await Blood.findOne({
      hospital: hospitalId,
      bloodGroup: request.bloodType
    });

    if (hospitalStock) {
      hospitalStock.quantity += receivedQuantity;
      hospitalStock.expiryDate = expiryDate;
      hospitalStock.status = "available";
      await hospitalStock.save();
    } else {
      await Blood.create({
        bloodGroup: request.bloodType,
        bloodType: request.bloodType,
        quantity: receivedQuantity,
        expiryDate,
        hospital: hospitalId,
        status: "available"
      });
    }

    request.status = "completed";
    request.handoverStatus = "confirmed";
    request.confirmedAt = new Date();
    request.handoverTimeline.push({
      status: "confirmed",
      label: HANDOVER_LABELS.confirmed,
      date: new Date(),
      actor: hospitalId
    });
    await request.save();

    await Facility.findByIdAndUpdate(hospitalId, {
      $push: {
        history: {
          eventType: "Stock Update",
          description: `Confirmed receipt of ${request.units} units of ${request.bloodType} from ${request.labId.name}`,
          date: new Date(),
          referenceId: request._id,
        },
      },
    });

    res.json({ success: true, message: "Blood handover confirmed", data: request });
  } catch (error) {
    console.error("Confirm Blood Handover Error:", error);
    res.status(500).json({ success: false, message: "Failed to confirm blood handover" });
  }
};

export const getPublicBloodNeeds = async (_req, res) => {
  try {
    const [stock, pendingRequests, donors] = await Promise.all([
      Blood.find({}),
      BloodRequest.find({ status: { $in: ["pending", "accepted"] } }),
      Donor.find({}, "bloodGroup")
    ]);

    const totalDonors = donors.length;
    const stockByType = BLOOD_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});
    const requestByType = BLOOD_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});
    const donorByType = BLOOD_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});

    stock.forEach((item) => {
      const type = getBloodGroup(item);
      const expiry = getExpiryDate(item);
      if (BLOOD_TYPES.includes(type) && (!expiry || new Date(expiry) > new Date())) {
        stockByType[type] += item.quantity || 0;
      }
    });

    pendingRequests.forEach((request) => {
      if (BLOOD_TYPES.includes(request.bloodType)) {
        requestByType[request.bloodType] += request.units || 0;
      }
    });

    donors.forEach((donor) => {
      if (BLOOD_TYPES.includes(donor.bloodGroup)) {
        donorByType[donor.bloodGroup] += 1;
      }
    });

    const data = BLOOD_TYPES.map((type) => {
      const shortage = requestByType[type] - stockByType[type];
      let need = "Thấp";
      if (shortage > 10 || (requestByType[type] > 0 && stockByType[type] < 5)) need = "Rất khẩn cấp";
      else if (shortage > 0 || stockByType[type] < 10) need = "Cao";
      else if (stockByType[type] < 25 || requestByType[type] > 0) need = "Trung bình";

      return {
        type,
        need,
        donors: totalDonors ? `${Math.round((donorByType[type] / totalDonors) * 100)}%` : "0%",
        availableUnits: stockByType[type],
        requestedUnits: requestByType[type]
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Public Blood Needs Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch public blood needs" });
  }
};

export const getHospitalHistory = async (req, res) => {
  try {
    const hospitalId = req.user._id;

    const hospital = await Facility.findById(hospitalId).select("history lastLogin");

    if (!hospital) return res.status(404).json({ 
      success: false, 
      message: "Hospital not found" 
    });

    res.json({
      success: true,
      history: hospital.history.sort((a, b) => new Date(b.date) - new Date(a.date))
    });

  } catch (error) {
    console.error("Get Hospital History Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch hospital history" 
    });
  }
};

// Add to bloodLabController.js

/**
 * @desc Get all donors with filtering and pagination
 * @route GET /api/blood-lab/donors
 * @access Private (Blood Lab)
 */
export const getAllDonors = async (req, res) => {
  try {
    const {
      search = "",
      bloodGroup = "all",
      city = "all",
      availability = "all",
      sortBy = "lastDonation",
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { 'address.city': { $regex: search, $options: "i" } }
      ];
    }

    // Blood group filter
    if (bloodGroup !== "all") {
      filter.bloodGroup = bloodGroup;
    }

    // City filter
    if (city !== "all") {
      filter['address.city'] = { $regex: city, $options: "i" };
    }

    // Availability filter
    if (availability !== "all") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      if (availability === "available") {
        filter.$or = [
          { lastDonationDate: { $lt: threeMonthsAgo } },
          { lastDonationDate: { $exists: false } }
        ];
      } else if (availability === "soon") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filter.lastDonationDate = {
          $gte: threeMonthsAgo,
          $lte: oneWeekAgo
        };
      }
    }

    // Sort options
    const sortOptions = {};
    switch (sortBy) {
      case "name":
        sortOptions.fullName = 1;
        break;
      case "bloodGroup":
        sortOptions.bloodGroup = 1;
        break;
      case "city":
        sortOptions['address.city'] = 1;
        break;
      case "lastDonation":
      default:
        sortOptions.lastDonationDate = -1;
        break;
    }

    const skip = (page - 1) * parseInt(limit);

    // Get donors with pagination
    const [donors, total] = await Promise.all([
      Donor.find(filter)
        .select('fullName email phone bloodGroup lastDonationDate donationHistory address')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Donor.countDocuments(filter)
    ]);

    // Calculate stats
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [availableDonors, rareBloodDonors] = await Promise.all([
      Donor.countDocuments({
        $or: [
          { lastDonationDate: { $lt: threeMonthsAgo } },
          { lastDonationDate: { $exists: false } }
        ]
      }),
      Donor.countDocuments({
        bloodGroup: { $in: ['O-', 'AB-', 'B-', 'A-'] }
      })
    ]);

    res.json({
      success: true,
      donors,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      stats: {
        total,
        available: availableDonors,
        rareBlood: rareBloodDonors
      }
    });
  } catch (err) {
    console.error("Get all donors error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch donors" });
  }
};

/**
 * @desc Log contact attempt
 * @route POST /api/blood-lab/donors/:id/contact
 * @access Private (Blood Lab)
 */
export const logContactAttempt = async (req, res) => {
  try {
    const donorId = req.params.id;
    const labId = req.user._id;

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    // Add to facility history
    await Facility.findByIdAndUpdate(labId, {
      $push: {
        history: {
          eventType: "Contact",
          description: `Contacted donor ${donor.fullName} (${donor.bloodGroup})`,
          date: new Date(),
          referenceId: donor._id,
        },
      },
    });

    // Add to donor contact history
    donor.contactHistory = donor.contactHistory || [];
    donor.contactHistory.push({
      contactedBy: labId,
      contactDate: new Date(),
      contactType: "hospital"
    });

    await donor.save();

    res.json({ success: true, message: "Contact logged successfully" });
  } catch (err) {
    console.error("Log contact error:", err);
    res.status(500).json({ success: false, message: "Failed to log contact" });
  }
};
