import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import Donor from "../models/donorModel.js";
import BloodUsage from "../models/bloodUsageModel.js";
import { BLOOD_TYPES, formatProductItems, normalizeProductItems } from "../utils/bloodProducts.js";

const HANDOVER_LABELS = {
	requested: "Bệnh viện gửi yêu cầu",
	received: "Ngân hàng máu tiếp nhận",
	preparing: "Chuẩn bị máu",
	packed: "Đóng gói",
	shipping: "Vận chuyển",
	confirmed: "Bệnh viện ký, xác nhận",
	rejected: "Từ chối yêu cầu",
};

const getBloodGroup = (item) => item.bloodGroup || item.bloodType;
const getExpiryDate = (item) => item.expiryDate || item.expirationDate;
const REQUEST_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;
const DONOR_COOLDOWN_MONTHS = 6;
const LOW_STOCK_THRESHOLD = 5;

const getRequestItems = (request) => {
	if (request.bloodItems?.length) return request.bloodItems;
	if (request.bloodType && request.units) {
		return [{ bloodType: request.bloodType, units: request.units }];
	}
	return [];
};

const applyExpiredRequestCancellations = async (filter = {}) => {
	const now = new Date();
	const expiredRequests = await BloodRequest.find({
		...filter,
		status: "pending",
		expiresAt: { $lte: now },
	});

	await Promise.all(
		expiredRequests.map(async (request) => {
			request.status = "cancelled";
			request.cancelledAt = now;
			request.cancellationReason = "Đã tự động hủy sau 3 ngày không được chấp nhận.";
			request.handoverTimeline.push({
				status: "rejected",
				label: "Đã tự động hủy sau 3 ngày không được chấp nhận.",
				date: now,
				actor: request.labId,
				note: request.cancellationReason,
			});
			await request.save();
		}),
	);
};

const isSixMonthEligible = (lastDonationDate) => {
	if (!lastDonationDate) return true;
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - DONOR_COOLDOWN_MONTHS);
	return new Date(lastDonationDate) <= sixMonthsAgo;
};

const normalizeLocation = (value = "") =>
	String(value)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/^(tỉnh|thành phố|tp)\s+/i, "")
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
	"dien bien": { lat: 21.386, lng: 103.023 },
	"lai chau": { lat: 22.3862, lng: 103.4707 },
	"son la": { lat: 21.327, lng: 103.9141 },
	"thanh hoa": { lat: 19.8067, lng: 105.7852 },
	"nghe an": { lat: 18.6796, lng: 105.6813 },
	"ha tinh": { lat: 18.3559, lng: 105.8877 },
	"quang tri": { lat: 16.75, lng: 107.2 },
	hue: { lat: 16.4637, lng: 107.5909 },
	"da nang": { lat: 16.0544, lng: 108.2022 },
	"quang ngai": { lat: 15.1205, lng: 108.7923 },
	"khanh hoa": { lat: 12.2388, lng: 109.1967 },
	"gia lai": { lat: 13.9833, lng: 108 },
	"dak lak": { lat: 12.71, lng: 108.2378 },
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
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getNeededBloodTypesForHospital = async (hospitalId) => {
	const [stock, requests] = await Promise.all([
		Blood.find({ hospital: hospitalId }),
		BloodRequest.find({ hospitalId, status: { $in: ["pending", "accepted"] } }),
	]);

	const stockByType = BLOOD_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});
	const requestedByType = BLOOD_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});

	stock.forEach((item) => {
		const type = getBloodGroup(item);
		const expiry = getExpiryDate(item);
		if (BLOOD_TYPES.includes(type) && (!expiry || new Date(expiry) > new Date())) {
			stockByType[type] += item.quantity || 0;
		}
	});

	requests.forEach((request) => {
		getRequestItems(request).forEach((item) => {
			if (BLOOD_TYPES.includes(item.bloodType)) {
				requestedByType[item.bloodType] += item.units || 0;
			}
		});
	});

	return BLOOD_TYPES.filter(
		(type) => requestedByType[type] > stockByType[type] || stockByType[type] < LOW_STOCK_THRESHOLD,
	);
};

const markExpiredHospitalBlood = async (hospitalId) => {
	const now = new Date();
	const expiredStock = await Blood.find({
		hospital: hospitalId,
		status: { $ne: "expired" },
		$or: [{ expiryDate: { $lte: now } }, { expirationDate: { $lte: now } }],
	});

	await Promise.all(
		expiredStock.map(async (stock) => {
			stock.status = "expired";
			await stock.save();

			await Facility.findByIdAndUpdate(hospitalId, {
				$push: {
					history: {
						eventType: "Stock Update",
						description: `${stock.quantity}ml ${stock.bloodGroup || stock.bloodType || stock.componentType} đã hết hạn trong kho máu của bệnh viện.`,
						date: now,
					},
				},
			});
		}),
	);
};

/* HOSPITAL BLOOD REQUEST MANAGEMENT */

/**
 * @desc Hospital requests blood from lab
 * @route POST /api/hospital/blood/request
 * @access Private (Hospital)
 */
export const hospitalRequestBlood = async (req, res) => {
	try {
		const hospitalId = req.user._id;
		const { labId, requestedDeliveryDate } = req.body;
		const { bloodItems, componentItems } = normalizeProductItems(req.body);

		// Validation
		if (!labId || (bloodItems.length === 0 && componentItems.length === 0)) {
			return res.status(400).json({
				success: false,
				message: "Vui lòng cung cấp mã số phòng thí nghiệm và ít nhất một mẫu máu hợp lệ.",
			});
		}

		if (bloodItems.length > BLOOD_TYPES.length || componentItems.length > 3) {
			return res.status(400).json({
				success: false,
				message: "Quá nhiều yêu cầu trong cùng 1 lúc",
			});
		}

		if (!requestedDeliveryDate) {
			return res.status(400).json({
				success: false,
				message: "Vui lòng chọn ngày yêu cầu cần vận chuyển đến",
			});
		}

		const deliveryDate = new Date(requestedDeliveryDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (Number.isNaN(deliveryDate.getTime()) || deliveryDate < today) {
			return res.status(400).json({
				success: false,
				message: "Ngày vận chuyển đến phải là ngày hôm nay hoặc ngày sau đó",
			});
		}

		// Check if lab exists and is approved
		const lab = await Facility.findOne({
			_id: labId,
			facilityType: "blood-lab",
			status: "approved",
		});

		if (!lab) {
			return res.status(404).json({
				success: false,
				message: "Phòng xét nghiệm không tìm thấy hoặc không chấp nhận",
			});
		}

		// Create blood request
		const request = await BloodRequest.create({
			hospitalId,
			labId,
			bloodItems,
			componentItems,
			requestedDeliveryDate: deliveryDate,
			expiresAt: new Date(Date.now() + REQUEST_EXPIRY_MS),
			handoverStatus: "requested",
			handoverTimeline: [
				{
					status: "requested",
					label: HANDOVER_LABELS.requested,
					date: new Date(),
					actor: hospitalId,
				},
			],
		});

		// Add to hospital history
		await Facility.findByIdAndUpdate(hospitalId, {
			$push: {
				history: {
					eventType: "Stock Update",
					description: `Đã yêu cầu ${formatProductItems({ bloodItems, componentItems })} từ ${lab.name}`,
					date: new Date(),
					referenceId: request._id,
				},
			},
		});

		res.status(201).json({
			success: true,
			message: "Yêu cầu đã được gửi thành công",
			data: request,
		});
	} catch (error) {
		console.error("Bệnh viện yêu cầu máu không thành công:", error);
		res.status(500).json({
			success: false,
			message: "Lỗi không gửi được yêu cầu",
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

		await applyExpiredRequestCancellations({ hospitalId });

		const requests = await BloodRequest.find({ hospitalId })
			.populate("labId", "name email phone address")
			.sort({ createdAt: -1 });

		res.json({
			success: true,
			data: requests,
		});
	} catch (err) {
		console.error("Get Hospital Requests Error:", err);
		res.status(500).json({
			success: false,
			message: "Không thể gửi yêu cầu",
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
			Facility.findById(hospitalId).select("history name email phone address lastLogin"),
		]);

		const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
		const pendingRequests = requests.filter((r) => r.status === "pending").length;

		res.json({
			success: true,
			stats: {
				totalUnits,
				pendingRequests,
				totalRequests: requests.length,
			},
			inventory,
			recentRequests: requests.slice(0, 5),
			hospital,
		});
	} catch (error) {
		console.error("Hospital Dashboard Error:", error);
		res.status(500).json({
			success: false,
			message: "Lỗi tải lại",
		});
	}
};

export const getHospitalStock = async (req, res) => {
	try {
		const hospitalId = req.user._id;

		await markExpiredHospitalBlood(hospitalId);

		const stock = await Blood.find({ hospital: hospitalId }).sort({ bloodGroup: 1 });

		res.json({
			success: true,
			data: stock,
		});
	} catch (error) {
		console.error("Get Hospital Stock Error:", error);
		res.status(500).json({
			success: false,
			message: "Lỗi kết nối đến kho máu",
		});
	}
};

const consumeStockLine = async ({ hospitalId, filter, label, quantity }) => {
	const availableStock = await Blood.find({
		hospital: hospitalId,
		...filter,
		status: { $ne: "expired" },
		quantity: { $gt: 0 },
	}).sort({ expiryDate: 1, expirationDate: 1 });

	const availableUnits = availableStock.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
	if (availableUnits < quantity) {
		throw new Error(
			`Không đủ ${label} trong kho. Hiện có: ${availableUnits}ml, yêu cầu: ${quantity}ml.`,
		);
	}

	let remaining = quantity;
	for (const stock of availableStock) {
		if (remaining <= 0) break;
		const used = Math.min(stock.quantity, remaining);
		stock.quantity -= used;
		remaining -= used;

		if (stock.quantity === 0) {
			stock.status = "used";
		}
		await stock.save();
	}
};

const consumeProductItems = async ({ hospitalId, bloodItems, componentItems }) => {
	for (const item of bloodItems) {
		await consumeStockLine({
			hospitalId,
			filter: { productType: "whole_blood", bloodGroup: item.bloodType },
			label: `máu toàn phần ${item.bloodType}`,
			quantity: Number(item.volumeMl || item.units),
		});
	}

	for (const item of componentItems) {
		await consumeStockLine({
			hospitalId,
			filter: { productType: "blood_component", componentType: item.componentType },
			label: `chế phẩm ${item.componentType}`,
			quantity: Number(item.volumeMl || item.units),
		});
	}
};

export const createBloodUsage = async (req, res) => {
	try {
		const hospitalId = req.user._id;
		const { usageDate, usageTime, patientName, patientPhone, relativeName, relativePhone, reason } =
			req.body;
		const { bloodItems, componentItems } = normalizeProductItems(req.body);
		const quantity = [...bloodItems, ...componentItems].reduce(
			(sum, item) => sum + Number(item.volumeMl || item.units || 0),
			0,
		);

		if (
			!usageDate ||
			!usageTime ||
			!patientName ||
			(bloodItems.length === 0 && componentItems.length === 0) ||
			!quantity ||
			!reason
		) {
			return res.status(400).json({
				success: false,
				message: "Vui lòng cung cấp hạn sử dụng, thời gian, tên bệnh nhân, nhóm máu, đơn vị và lý do",
			});
		}

		if (bloodItems.length > BLOOD_TYPES.length || componentItems.length > 3) {
			return res.status(400).json({ success: false, message: "Nhóm máu hoặc đơn vị không hợp lệ" });
		}

		await markExpiredHospitalBlood(hospitalId);

		await consumeProductItems({ hospitalId, bloodItems, componentItems });

		const usage = await BloodUsage.create({
			hospital: hospitalId,
			usageDate: new Date(usageDate),
			usageTime,
			patientName,
			patientPhone,
			relativeName,
			relativePhone,
			bloodItems,
			componentItems,
			units: quantity,
			reason,
		});
		const productSummary = formatProductItems({ bloodItems, componentItems });

		await Facility.findByIdAndUpdate(hospitalId, {
			$push: {
				history: {
					eventType: "Stock Update",
					description: `Đã sử dụng ${productSummary} để truyền cho bệnh nhân ${patientName}. Lý do: ${reason}`,
					date: new Date(),
				},
			},
		});

		res.status(201).json({
			success: true,
			message: "Quy trình sử dụng máu đã được lưu lại",
			data: usage,
		});
	} catch (error) {
		console.error("Create Blood Usage Error:", error);
		res.status(500).json({ success: false, message: "Lỗi! Quá trình sử dụng chưa được lưu lại" });
	}
};

export const getHospitalStockHistory = async (req, res) => {
	try {
		const hospitalId = req.user._id;
		await markExpiredHospitalBlood(hospitalId);
		const hospital = await Facility.findById(hospitalId).select("history");
		if (!hospital)
			return res.status(404).json({ success: false, message: "Không thể tìm thấy bệnh viện" });

		const history = (hospital.history || [])
			.filter((item) => item.eventType === "Stock Update")
			.sort((a, b) => new Date(b.date) - new Date(a.date));

		res.json({ success: true, history });
	} catch (error) {
		console.error("Get Hospital Stock History Error:", error);
		res.status(500).json({ success: false, message: "Không thể tìm thấy lịch sử kho máu" });
	}
};

export const confirmBloodHandover = async (req, res) => {
	try {
		const hospitalId = req.user._id;
		const { id } = req.params;
		const request = await BloodRequest.findOne({ _id: id, hospitalId }).populate("labId", "name");

		if (!request) {
			return res.status(404).json({ success: false, message: "Không thể tìm thấy yêu cầu máu" });
		}

		if (request.status !== "accepted" || request.handoverStatus !== "shipping") {
			return res.status(400).json({
				success: false,
				message: "Chỉ có thể xác nhận các đơn máu đang vận chuyển",
			});
		}

		request.status = "completed";
		request.handoverStatus = "confirmed";
		request.confirmedAt = new Date();
		request.handoverTimeline.push({
			status: "confirmed",
			label: HANDOVER_LABELS.confirmed,
			date: new Date(),
			actor: hospitalId,
		});
		await request.save();
		const productSummary = formatProductItems({
			bloodItems: request.bloodItems || [],
			componentItems: request.componentItems || [],
		});

		await Facility.findByIdAndUpdate(hospitalId, {
			$push: {
				history: {
					eventType: "Stock Update",
					description: `Đã nhận ${productSummary || request.bloodType} từ ${request.labId.name}.`,
					date: new Date(),
					referenceId: request._id,
				},
			},
		});

		res.json({ success: true, message: "Việc giao máu cần được xác nhận", data: request });
	} catch (error) {
		console.error("Confirm Blood Handover Error:", error);
		res.status(500).json({ success: false, message: "Lỗi xác nhận giao máu" });
	}
};

export const getPublicBloodNeeds = async (_req, res) => {
	try {
		const [stock, pendingRequests, donors] = await Promise.all([
			Blood.find({}),
			BloodRequest.find({ status: { $in: ["pending", "accepted"] } }),
			Donor.find({}, "bloodGroup"),
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
			getRequestItems(request).forEach((item) => {
				if (BLOOD_TYPES.includes(item.bloodType)) {
					requestByType[item.bloodType] += item.units || 0;
				}
			});
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
				requestedUnits: requestByType[type],
			};
		});

		res.json({ success: true, data });
	} catch (error) {
		console.error("Public Blood Needs Error:", error);
		res.status(500).json({ success: false, message: "Lỗi hiển thị kho máu" });
	}
};

export const getHospitalHistory = async (req, res) => {
	try {
		const hospitalId = req.user._id;

		const hospital = await Facility.findById(hospitalId).select("history lastLogin");

		if (!hospital)
			return res.status(404).json({
				success: false,
				message: "Không tìm thấy bệnh viện nào hợp lệ",
			});

		res.json({
			success: true,
			history: hospital.history.sort((a, b) => new Date(b.date) - new Date(a.date)),
		});
	} catch (error) {
		console.error("Get Hospital History Error:", error);
		res.status(500).json({
			success: false,
			message: "Lỗi kết nối tới bệnh viện",
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
			limit = 20,
		} = req.query;
		const hospitalId = req.user._id;
		const hospital = await Facility.findById(hospitalId).select("address").lean();
		const neededBloodTypes = await getNeededBloodTypesForHospital(hospitalId);
		const hospitalCoords = getAddressCoords(hospital?.address);
		const hospitalWard = normalizeLocation(hospital?.address?.ward);
		const hospitalCity = normalizeLocation(hospital?.address?.city);
		const hospitalState = normalizeLocation(hospital?.address?.state);

		// Build filter object
		const filter = {};

		// Search filter
		if (search) {
			filter.$or = [
				{ fullName: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ phone: { $regex: search, $options: "i" } },
				{ "address.city": { $regex: search, $options: "i" } },
			];
		}

		// Blood group filter
		if (bloodGroup !== "all") {
			filter.bloodGroup = bloodGroup;
		}

		// City filter
		if (city !== "all") {
			filter["address.city"] = { $regex: city, $options: "i" };
		}

		// Availability filter
		if (availability !== "all") {
			const sixMonthsAgo = new Date();
			sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - DONOR_COOLDOWN_MONTHS);

			if (availability === "available") {
				filter.$or = [
					{ lastDonationDate: { $lte: sixMonthsAgo } },
					{ lastDonationDate: { $exists: false } },
				];
			} else if (availability === "soon") {
				const oneMonthAgo = new Date();
				oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
				filter.lastDonationDate = {
					$gt: sixMonthsAgo,
					$lte: oneMonthAgo,
				};
			}
		}

		const skip = (page - 1) * parseInt(limit);
		const pageLimit = parseInt(limit);

		const [donors, total] = await Promise.all([
			Donor.find(filter).select(
				"fullName email phone bloodGroup lastDonationDate donationHistory address eligibleToDonate",
			),
			Donor.countDocuments(filter),
		]);

		// Calculate stats
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - DONOR_COOLDOWN_MONTHS);

		const annotateDonor = (donorDoc) => {
			const donor = donorDoc.toObject ? donorDoc.toObject() : donorDoc;
			const donorCoords = getAddressCoords(donor.address);
			const distanceKm = getDistanceKm(hospitalCoords, donorCoords);
			const donorWard = normalizeLocation(donor.address?.ward);
			const donorCity = normalizeLocation(donor.address?.city);
			const donorState = normalizeLocation(donor.address?.state);
			const eligibleNow =
				donor.eligibleToDonate !== false && isSixMonthEligible(donor.lastDonationDate);
			const isNearby =
				Boolean(hospitalWard && donorWard && hospitalWard === donorWard) ||
				Boolean(hospitalCity && donorCity && hospitalCity === donorCity) ||
				Boolean(hospitalState && donorState && hospitalState === donorState) ||
				(Number.isFinite(distanceKm) && distanceKm <= 50);
			const isNeededBloodType = neededBloodTypes.includes(donor.bloodGroup);
			const lastDonationDate = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
			const daysSinceLastDonation = lastDonationDate
				? Math.floor((Date.now() - lastDonationDate.getTime()) / (1000 * 60 * 60 * 24))
				: null;
			const locationRank = Number.isFinite(distanceKm)
				? distanceKm
				: hospitalWard && donorWard && hospitalWard === donorWard
					? 0
					: hospitalCity && donorCity && hospitalCity === donorCity
						? 10
						: hospitalState && donorState && hospitalState === donorState
							? 50
							: Number.POSITIVE_INFINITY;

			return {
				...donor,
				eligibleNow,
				isNearby,
				isNeededBloodType,
				recommended: eligibleNow && isNearby && isNeededBloodType,
				daysSinceLastDonation,
				locationRank,
				proximity: {
					distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null,
					source: donorCoords?.source || null,
					label: Number.isFinite(distanceKm)
						? `${distanceKm.toFixed(1)} km`
						: isNearby
							? "Cùng khu vực"
							: "Chưa có tọa độ",
				},
				matchReasons: [
					eligibleNow ? "Chưa hiến máu gần đây" : null,
					isNearby ? "Ở gần bệnh viện" : null,
					isNeededBloodType ? "Nhóm máu đang thiếu" : null,
				].filter(Boolean),
			};
		};

		const compareDonors = (a, b) => {
			const eligibilityDiff = Number(b.eligibleNow) - Number(a.eligibleNow);
			if (eligibilityDiff) return eligibilityDiff;

			if (a.eligibleNow && b.eligibleNow) {
				const locationDiff = a.locationRank - b.locationRank;
				if (locationDiff) return locationDiff;

				const neededDiff = Number(b.isNeededBloodType) - Number(a.isNeededBloodType);
				if (neededDiff) return neededDiff;
			}

			const recentDonationDiff =
				(a.lastDonationDate ? new Date(a.lastDonationDate).getTime() : 0) -
				(b.lastDonationDate ? new Date(b.lastDonationDate).getTime() : 0);
			if (!a.eligibleNow && !b.eligibleNow && recentDonationDiff) return recentDonationDiff;

			if (sortBy === "name") return (a.fullName || "").localeCompare(b.fullName || "");
			if (sortBy === "bloodGroup") return (a.bloodGroup || "").localeCompare(b.bloodGroup || "");
			if (sortBy === "city") return (a.address?.city || "").localeCompare(b.address?.city || "");

			if (recentDonationDiff) return recentDonationDiff;

			return (a.fullName || "").localeCompare(b.fullName || "");
		};

		const sortedDonors = donors.map(annotateDonor).sort(compareDonors);
		const annotatedDonors = sortedDonors.slice(skip, skip + pageLimit);
		const recommendedDonors = sortedDonors.filter((donor) => donor.recommended);

		const [availableDonors, rareBloodDonors] = await Promise.all([
			Donor.countDocuments({
				$or: [{ lastDonationDate: { $lte: sixMonthsAgo } }, { lastDonationDate: { $exists: false } }],
			}),
			Donor.countDocuments({
				bloodGroup: { $in: ["O-", "AB-", "B-", "A-"] },
			}),
		]);

		res.json({
			success: true,
			donors: annotatedDonors,
			recommendedDonors,
			neededBloodTypes,
			pagination: {
				total,
				currentPage: parseInt(page),
				totalPages: Math.ceil(total / limit),
				hasNext: page * pageLimit < total,
				hasPrev: page > 1,
			},
			stats: {
				total,
				available: availableDonors,
				rareBlood: rareBloodDonors,
				recommended: recommendedDonors.length,
			},
		});
	} catch (err) {
		console.error("Get all donors error:", err);
		res.status(500).json({ success: false, message: "Lỗi kết nối với người hiến máu" });
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
		const { method = "phone", note = "" } = req.body || {};

		const donor = await Donor.findById(donorId);
		if (!donor) {
			return res.status(404).json({ success: false, message: "Không tìm thấy người hiến máu" });
		}

		// Add to facility history
		await Facility.findByIdAndUpdate(labId, {
			$push: {
				history: {
					eventType: "Contact",
					description: `Đã liên hệ với người hiến máu ${donor.fullName} (${donor.bloodGroup}).`,
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
			contactType: req.user.facilityType || "hospital",
			method,
			note,
		});

		await donor.save();

		res.json({ success: true, message: "Liên hệ thành công" });
	} catch (err) {
		console.error("Log contact error:", err);
		res.status(500).json({ success: false, message: "Lỗi ghi lại cuộc hội thoại" });
	}
};
