import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import BloodCamp from "../models/bloodCampModel.js";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SCREENING_FIELDS = ["hiv", "hbv", "hcv", "hepatitis", "syphilis"];

const labFilter = (labId) => ({
  $or: [{ hospital: labId }, { bloodLab: labId }],
});

const appendHistory = async (facilityId, eventType, description, referenceId) => {
  await Facility.findByIdAndUpdate(facilityId, {
    $push: {
      history: {
        eventType,
        description,
        date: new Date(),
        ...(referenceId ? { referenceId } : {}),
      },
    },
  });
};

const generateUnitCode = async () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `BU-${yyyy}${mm}${dd}`;
  const countToday = await Blood.countDocuments({ unitCode: { $regex: `^${prefix}` } });
  return `${prefix}-${String(countToday + 1).padStart(4, "0")}`;
};

const calculateStatusAfterScreening = (screeningResult) => {
  const values = SCREENING_FIELDS.map((field) => screeningResult[field] || "pending");
  if (values.includes("positive")) return "rejected";
  if (values.every((value) => value === "negative")) return "qualified";
  return "pending_screening";
};

export const getBloodLabDashboard = async (req, res) => {
  try {
    const labId = req.user._id;
    const [units, facility, totalCamps, upcomingCamps, recentCamps] = await Promise.all([
      Blood.find(labFilter(labId)),
      Facility.findById(labId).select("history name email phone address operatingHours status lastLogin"),
      BloodCamp.countDocuments({ hospital: labId }),
      BloodCamp.countDocuments({ hospital: labId, status: { $in: ["Upcoming", "Ongoing"] } }),
      BloodCamp.find({ hospital: labId }).sort({ date: -1 }).limit(5),
    ]);

    const stats = {
      totalUnits: units.length,
      pendingScreening: units.filter((u) => u.status === "pending_screening").length,
      qualifiedUnits: units.filter((u) => u.status === "qualified").length,
      availableUnits: units.filter((u) => u.status === "available").length,
      issuedUnits: units.filter((u) => u.status === "issued").length,
      rejectedUnits: units.filter((u) => u.status === "rejected").length,
      discardedUnits: units.filter((u) => u.status === "discarded").length,
      totalVolume: units.reduce((sum, unit) => sum + (unit.quantity || 0), 0),
      availableVolume: units
        .filter((u) => u.status === "available")
        .reduce((sum, unit) => sum + (unit.quantity || 0), 0),
      totalCamps,
      upcomingCamps,
      totalDonors: 0,
    };

    res.json({ success: true, stats, facility, recentCamps });
  } catch (error) {
    console.error("Blood lab dashboard error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blood lab dashboard data" });
  }
};

export const getBloodLabHistory = async (req, res) => {
  try {
    const lab = await Facility.findById(req.user._id).select("history lastLogin");
    if (!lab) return res.status(404).json({ success: false, message: "Blood lab not found" });

    const activity = [...(lab.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, activity, lastLogin: lab.lastLogin });
  } catch (error) {
    console.error("Blood lab history error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blood lab history" });
  }
};

export const getBloodUnits = async (req, res) => {
  try {
    const units = await Blood.find(labFilter(req.user._id)).sort({ createdAt: -1 });
    res.json({ success: true, data: units });
  } catch (error) {
    console.error("Get blood units error:", error);
    res.status(500).json({ success: false, message: "Khong the tai danh sach tui mau" });
  }
};

export const getBloodStock = async (req, res) => {
  try {
    const stock = await Blood.aggregate([
      { $match: { $and: [labFilter(req.user._id), { status: "available" }] } },
      {
        $group: {
          _id: "$bloodType",
          bloodType: { $first: "$bloodType" },
          bloodGroup: { $first: "$bloodGroup" },
          quantity: { $sum: "$quantity" },
          units: { $sum: 1 },
        },
      },
      { $sort: { bloodType: 1 } },
    ]);

    res.json({ success: true, data: stock, stock });
  } catch (error) {
    console.error("Get blood stock error:", error);
    res.status(500).json({ success: false, message: "Khong the tai ton kho mau" });
  }
};

export const createBloodUnit = async (req, res) => {
  try {
    const labId = req.user._id;
    const { bloodType, quantity, collectionDate, expiryDate } = req.body || {};
    const volume = Number(quantity);

    if (!BLOOD_TYPES.includes(bloodType)) {
      return res.status(400).json({ success: false, message: "Nhom mau khong hop le" });
    }

    if (![250, 350, 450].includes(volume)) {
      return res.status(400).json({
        success: false,
        message: "Dung tich tui mau chi duoc chon 250ml, 350ml hoac 450ml",
      });
    }

    if (!collectionDate) {
      return res.status(400).json({ success: false, message: "Vui long chon ngay lay mau" });
    }

    const unitCode = await generateUnitCode();
    const unit = await Blood.create({
      unitCode,
      barcode: unitCode,
      bloodType,
      bloodGroup: bloodType,
      quantity: volume,
      collectionDate,
      expiryDate,
      hospital: labId,
      bloodLab: labId,
      status: "pending_screening",
      screeningResult: {},
    });

    await appendHistory(labId, "Stock Update", `Created blood unit ${unitCode} - ${bloodType} - ${volume}ml`, unit._id);

    res.status(201).json({ success: true, message: "Tao tui mau thanh cong", data: unit });
  } catch (error) {
    console.error("Create blood unit error:", error);
    res.status(500).json({ success: false, message: error.message || "Khong the tao tui mau" });
  }
};

export const updateBloodUnitScreening = async (req, res) => {
  try {
    const labId = req.user._id;
    const screeningResult = {};

    for (const field of SCREENING_FIELDS) {
      screeningResult[field] = req.body?.[field] || "pending";
    }

    const invalid = Object.values(screeningResult).some(
      (value) => !["pending", "negative", "positive"].includes(value),
    );
    if (invalid) {
      return res.status(400).json({ success: false, message: "Ket qua sang loc khong hop le" });
    }

    const blood = await Blood.findOne({ _id: req.params.id, ...labFilter(labId) });
    if (!blood) return res.status(404).json({ success: false, message: "Khong tim thay tui mau" });

    blood.screeningResult = screeningResult;
    blood.status = calculateStatusAfterScreening(screeningResult);
    await blood.save();

    await appendHistory(labId, "Stock Update", `Updated screening result for ${blood.unitCode || blood._id}`, blood._id);

    res.json({ success: true, message: "Cap nhat sang loc thanh cong", data: blood });
  } catch (error) {
    console.error("Update blood unit screening error:", error);
    res.status(500).json({ success: false, message: "Khong the cap nhat sang loc" });
  }
};

export const importBloodUnitToStock = async (req, res) => {
  try {
    const labId = req.user._id;
    const blood = await Blood.findOne({ _id: req.params.id, ...labFilter(labId) });
    if (!blood) return res.status(404).json({ success: false, message: "Khong tim thay tui mau" });

    if (blood.status !== "qualified") {
      return res.status(400).json({
        success: false,
        message: "Chi tui mau dat sang loc moi duoc nhap kho",
      });
    }

    blood.status = "available";
    await blood.save();

    await appendHistory(labId, "Stock Update", `Imported blood unit ${blood.unitCode || blood._id} to stock`, blood._id);

    res.json({ success: true, message: "Nhap kho thanh cong", data: blood });
  } catch (error) {
    console.error("Import blood unit error:", error);
    res.status(500).json({ success: false, message: "Khong the nhap kho" });
  }
};

export const discardBloodUnit = async (req, res) => {
  try {
    const labId = req.user._id;
    const blood = await Blood.findOneAndUpdate(
      { _id: req.params.id, ...labFilter(labId) },
      { status: "discarded" },
      { new: true },
    );

    if (!blood) return res.status(404).json({ success: false, message: "Khong tim thay tui mau" });

    await appendHistory(labId, "Stock Update", `Discarded blood unit ${blood.unitCode || blood._id}`, blood._id);

    res.json({ success: true, message: "Da loai bo tui mau", data: blood });
  } catch (error) {
    console.error("Discard blood unit error:", error);
    res.status(500).json({ success: false, message: "Khong the loai bo tui mau" });
  }
};

export const issueBloodUnits = async (req, res) => {
  try {
    const labId = req.user._id;
    const { bloodType, requestedVolume, hospitalName, reason } = req.body;
    const volumeNeed = Number(requestedVolume);

    if (!BLOOD_TYPES.includes(bloodType) || !volumeNeed || !hospitalName) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap nhom mau, so ml can xuat va benh vien nhan",
      });
    }

    const availableUnits = await Blood.find({
      ...labFilter(labId),
      bloodType,
      status: "available",
    }).sort({ expiryDate: 1 });

    const selectedUnits = [];
    let totalVolume = 0;
    for (const unit of availableUnits) {
      if (totalVolume >= volumeNeed) break;
      selectedUnits.push(unit);
      totalVolume += unit.quantity || 0;
    }

    if (totalVolume < volumeNeed) {
      return res.status(400).json({
        success: false,
        message: `Khong du mau trong kho. Hien co ${totalVolume}ml, can ${volumeNeed}ml`,
        data: { selectedUnits, totalVolume, requestedVolume: volumeNeed },
      });
    }

    const selectedIds = selectedUnits.map((unit) => unit._id);
    await Blood.updateMany(
      { _id: { $in: selectedIds }, ...labFilter(labId) },
      {
        status: "issued",
        issuedTo: hospitalName,
        issueReason: reason || "",
        issuedAt: new Date(),
      },
    );

    const issuedUnits = await Blood.find({ _id: { $in: selectedIds }, ...labFilter(labId) });
    await appendHistory(labId, "Stock Update", `Issued ${totalVolume}ml of ${bloodType} to ${hospitalName}`);

    res.json({
      success: true,
      message: "Xuat mau thanh cong",
      data: { bloodType, requestedVolume: volumeNeed, totalVolume, issuedUnits },
    });
  } catch (error) {
    console.error("Issue blood units error:", error);
    res.status(500).json({ success: false, message: "Khong the xuat mau" });
  }
};

export const getLabBloodRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ labId: req.user._id })
      .populate("hospitalId", "name email phone address")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Get lab blood requests error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
};

export const updateBloodRequestStatus = async (req, res) => {
  try {
    const { action } = req.body;
    const labId = req.user._id;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const request = await BloodRequest.findOne({ _id: req.params.id, labId }).populate("hospitalId", "name");
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Request already processed" });
    }

    request.status = action === "accept" ? "accepted" : "rejected";
    request.handoverStatus = action === "accept" ? "received" : "requested";
    request.processedAt = new Date();
    request.handoverTimeline.push({
      status: request.handoverStatus,
      label: action === "accept" ? "Accepted by blood lab" : "Rejected by blood lab",
      actor: labId,
    });

    await request.save();
    await appendHistory(labId, "Request Approved", `${action === "accept" ? "Accepted" : "Rejected"} blood request ${request._id}`, request._id);

    res.json({ success: true, message: `Request ${action}ed successfully`, data: request });
  } catch (error) {
    console.error("Update request status error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to process request" });
  }
};

export const updateBloodHandoverStatus = async (req, res) => {
  try {
    const labId = req.user._id;
    const { handoverStatus, note } = req.body;
    const allowed = ["received", "preparing", "packed", "shipping"];

    if (!allowed.includes(handoverStatus)) {
      return res.status(400).json({ success: false, message: "Invalid handover status" });
    }

    const request = await BloodRequest.findOne({ _id: req.params.id, labId });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    if (!["accepted", "completed"].includes(request.status)) {
      return res.status(400).json({ success: false, message: "Only accepted requests can be handed over" });
    }

    request.handoverStatus = handoverStatus;
    request.handoverTimeline.push({
      status: handoverStatus,
      label: `Blood lab updated handover to ${handoverStatus}`,
      actor: labId,
      note,
    });
    await request.save();

    await appendHistory(labId, "Request Approved", `Updated handover ${request._id} to ${handoverStatus}`, request._id);

    res.json({ success: true, message: "Handover updated", data: request });
  } catch (error) {
    console.error("Update handover status error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update handover" });
  }
};

export const getAllLabs = async (_req, res) => {
  try {
    const labs = await Facility.find({ facilityType: "blood-lab", status: "approved" }).select(
      "name email phone address operatingHours",
    );
    res.json({ success: true, labs });
  } catch (error) {
    console.error("Get labs error:", error);
    res.status(500).json({ success: false, message: "Error fetching blood labs" });
  }
};
