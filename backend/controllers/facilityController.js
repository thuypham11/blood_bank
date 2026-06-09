import Facility from "../models/facilityModel.js";
import Blood from "../models/bloodModel.js";
import bcrypt from "bcryptjs";

const normalizeLocation = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(tinh|thanh pho|tp)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

const PROVINCE_COORDS = {
  "ha noi": { lat: 21.0285, lng: 105.8542 },
  "bac ninh": { lat: 21.1861, lng: 106.0763 },
  "quang ninh": { lat: 21.0064, lng: 107.2925 },
  "hai phong": { lat: 20.8449, lng: 106.6881 },
  "hung yen": { lat: 20.6464, lng: 106.0511 },
  "ninh binh": { lat: 20.2506, lng: 105.9745 },
  "cao bang": { lat: 22.6666, lng: 106.2639 },
  "tuyen quang": { lat: 21.8233, lng: 105.2142 },
  "lao cai": { lat: 22.4809, lng: 103.9755 },
  "thai nguyen": { lat: 21.5672, lng: 105.8252 },
  "lang son": { lat: 21.8537, lng: 106.7615 },
  "phu tho": { lat: 21.2684, lng: 105.2046 },
  "dien bien": { lat: 21.3860, lng: 103.0230 },
  "lai chau": { lat: 22.3862, lng: 103.4707 },
  "son la": { lat: 21.3270, lng: 103.9141 },
  "thanh hoa": { lat: 19.8067, lng: 105.7852 },
  "nghe an": { lat: 18.6796, lng: 105.6813 },
  "ha tinh": { lat: 18.3559, lng: 105.8877 },
  "quang tri": { lat: 16.7500, lng: 107.2000 },
  "hue": { lat: 16.4637, lng: 107.5909 },
  "da nang": { lat: 16.0544, lng: 108.2022 },
  "quang ngai": { lat: 15.1205, lng: 108.7923 },
  "khanh hoa": { lat: 12.2388, lng: 109.1967 },
  "gia lai": { lat: 13.9833, lng: 108.0000 },
  "dak lak": { lat: 12.7100, lng: 108.2378 },
  "lam dong": { lat: 11.5753, lng: 108.1429 },
  "tay ninh": { lat: 11.3352, lng: 106.1099 },
  "dong nai": { lat: 10.9574, lng: 106.8427 },
  "ho chi minh": { lat: 10.7769, lng: 106.7009 },
  "vinh long": { lat: 10.2537, lng: 105.9722 },
  "dong thap": { lat: 10.4938, lng: 105.6882 },
  "an giang": { lat: 10.5216, lng: 105.1259 },
  "can tho": { lat: 10.0452, lng: 105.7469 },
  "ca mau": { lat: 9.1768, lng: 105.1524 },
};

const getAddressCoords = (address = {}) => {
  const coordinates = address.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const [lng, lat] = coordinates.map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, source: "exact" };
  }

  const lat = Number(address.latitude);
  const lng = Number(address.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, source: "exact" };

  const stateKey = normalizeLocation(address.state || address.city);
  if (PROVINCE_COORDS[stateKey]) return { ...PROVINCE_COORDS[stateKey], source: "province" };

  return null;
};

const getDistanceKm = (from, to) => {
  if (!from || !to) return null;
  const earthRadiusKm = 6371;
  const toRad = (degree) => (degree * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * @desc Get facility profile
 * @route GET /api/facility/profile
 */
export const getProfile = async (req, res) => {
  try {
    const facility = await Facility.findById(req.user.id)
      .select("-password -__v")
      .lean();

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    res.status(200).json({
      success: true,
      facility
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile"
    });
  }
};

/**
 * @desc Update facility profile
 * @route PUT /api/facility/profile
 */
export const updateProfile = async (req, res) => {
  const session = await Facility.startSession();
  session.startTransaction();

  try {
    console.log("📝 Facility profile update request:", {
      userId: req.user._id,
      updates: Object.keys(req.body)
    });

    const updates = { ...req.body };
    // The user ID is expected to be attached to the request object via middleware (e.g., auth middleware)
    const facilityId = req.user._id;

    // Validate facility exists
    const existingFacility = await Facility.findById(facilityId).session(session);
    if (!existingFacility) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    // Define allowed fields for update by the facility user
    const allowedFields = [
      "name", "phone", "emergencyContact", "operatingHours",
      "services", "description", "website", "contactPerson",
      "password" // Allowing password update via the same endpoint
    ];

    // Filter updates to only include allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && key !== "password") {
        filteredUpdates[key] = updates[key];
      }
    });

    // Handle address updates separately to merge with existing data
    if (updates.address && typeof updates.address === 'object') {
      // Merge new address fields with existing ones to avoid accidental deletion
      filteredUpdates.address = {
        ...existingFacility.address.toObject(), // Use toObject() for Mongoose subdocuments
        ...updates.address
      };
    }

    // Handle password update (if provided)
    if (updates.password) {
      if (updates.password.length < 6) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long"
        });
      }
      const salt = await bcrypt.genSalt(12);
      filteredUpdates.password = await bcrypt.hash(updates.password, salt);
    }

    // Update facility in MongoDB
    const updatedFacility = await Facility.findByIdAndUpdate(
      facilityId,
      {
        ...filteredUpdates,
        // Log the profile update event in history
        $push: {
          history: {
            eventType: "Profile Update",
            description: "Facility profile updated by user",
            date: new Date(),
          }
        }
      },
      {
        new: true,
        runValidators: true,
        session,
        // Exclude sensitive fields from the returned object
        select: "-password -__v"
      }
    );

    // Trim history if too long (optional safety feature)
    if (updatedFacility.history.length > 50) {
      updatedFacility.history = updatedFacility.history.slice(-50);
      await updatedFacility.save({ session });
    }

    await session.commitTransaction();

    console.log("✅ Facility profile updated successfully:", updatedFacility._id);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      facility: updatedFacility
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("🚨 Update Facility Profile Error:", error);

    let errorMessage = "Failed to update profile";
    let validationErrors = {};

    if (error.name === 'ValidationError') {
      // Format Mongoose validation errors for frontend consumption
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      errorMessage = "Validation failed: Please check your input.";
    }

    res.status(400).json({ // Use 400 for validation errors
      success: false,
      message: errorMessage,
      errors: validationErrors, // Send detailed errors to frontend
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};
/**
 * @desc Facility dashboard overview
 * @route GET /api/facility/dashboard
 */
export const getFacilityDashboard = async (req, res) => {
  try {
    const facility = await Facility.findById(req.user._id)
      .select("name history facilityType")
      .lean();

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    // Calculate stats (you'll replace these with actual model queries)
    const totalCamps = facility.history.filter(h => h.eventType === "Blood Camp").length;
    const recentHistory = facility.history
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    const dashboardData = {
      totalCamps,
      upcomingCamps: 2, // Replace with: await Camp.countDocuments({ facility: facilityId, date: { $gte: new Date() } })
      bloodSlots: 10, // Replace with: await Slot.countDocuments({ facility: facilityId, status: 'available' })
      activeRequests: 4, // Replace with: await Request.countDocuments({ facility: facilityId, status: 'pending' })
      totalHistory: facility.history.length,
      recentHistory,
    };

    res.status(200).json({
      success: true,
      facility: facility.name,
      facilityType: facility.facilityType,
      stats: dashboardData,
    });
  } catch (error) {
    console.error("Facility Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data"
    });
  }
};

export const getAllLabs = async (req, res) => {
  try {
    const hospital = await Facility.findById(req.user._id).select("address facilityType").lean();
    const labs = await Facility.find({ 
      facilityType: "blood-lab", 
      status: "approved" 
    }).select("name email phone address operatingHours").lean();

    const labIds = labs.map((lab) => lab._id);
    const stocks = await Blood.find({
      $or: [
        { bloodLab: { $in: labIds } },
        { hospital: { $in: labIds } },
      ],
    }).select("bloodLab hospital bloodGroup bloodType quantity status expiryDate expirationDate").lean();

    const stockByLab = new Map();
    stocks.forEach((stock) => {
      const ownerId = String(stock.bloodLab || stock.hospital);
      const bloodType = stock.bloodGroup || stock.bloodType;
      const quantity = Number(stock.quantity || 0);
      const expiryDate = stock.expiryDate || stock.expirationDate;

      if (!bloodType || quantity <= 0) return;
      if (stock.status && !["available", "pending_testing"].includes(stock.status)) return;
      if (expiryDate && new Date(expiryDate) <= new Date()) return;

      if (!stockByLab.has(ownerId)) {
        stockByLab.set(ownerId, { totalUnits: 0, byType: {} });
      }

      const summary = stockByLab.get(ownerId);
      summary.totalUnits += quantity;
      summary.byType[bloodType] = (summary.byType[bloodType] || 0) + quantity;
    });

    const hospitalWard = normalizeLocation(hospital?.address?.ward);
    const hospitalCity = normalizeLocation(hospital?.address?.city);
    const hospitalState = normalizeLocation(hospital?.address?.state);
    const hospitalCoords = getAddressCoords(hospital?.address);

    const labsWithStock = labs
      .map((lab) => {
        const sameWard = hospitalWard && normalizeLocation(lab.address?.ward) === hospitalWard;
        const sameCity = hospitalCity && normalizeLocation(lab.address?.city) === hospitalCity;
        const sameState = hospitalState && normalizeLocation(lab.address?.state) === hospitalState;
        const labCoords = getAddressCoords(lab.address);
        const distanceKm = getDistanceKm(hospitalCoords, labCoords);
        const proximityScore = distanceKm !== null ? Math.max(0, 10000 - distanceKm) : sameWard ? 300 : sameCity ? 200 : sameState ? 100 : 0;

        return {
          ...lab,
          stockSummary: stockByLab.get(String(lab._id)) || { totalUnits: 0, byType: {} },
          proximity: {
            score: proximityScore,
            distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(1)),
            source: hospitalCoords?.source === "exact" && labCoords?.source === "exact" ? "exact" : "estimated",
            label: distanceKm !== null
              ? `${distanceKm.toFixed(1)} km${hospitalCoords?.source === "exact" && labCoords?.source === "exact" ? "" : " (uoc tinh theo tinh/thanh)"}`
              : sameWard
                ? "Cung phuong/xa"
                : sameCity
                  ? "Cung thanh pho"
                  : sameState
                    ? "Cung tinh/thanh"
                    : "Chua co du lieu vi tri",
          },
        };
      })
      .sort((a, b) => {
        if (a.proximity.distanceKm !== null && b.proximity.distanceKm !== null) {
          return a.proximity.distanceKm - b.proximity.distanceKm || b.stockSummary.totalUnits - a.stockSummary.totalUnits;
        }
        return b.proximity.score - a.proximity.score || b.stockSummary.totalUnits - a.stockSummary.totalUnits;
      });

    res.status(200).json({ 
      success: true, 
      labs: labsWithStock
    });
  } catch (error) {
    console.error("Get Labs Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching blood labs" 
    });
  }
}