import Blood from "../models/BloodModel.js";
import LabTestResult from "../models/LabTestResult.js";
import AuditLog from "../models/AuditLogModel.js";

const RESULT_FIELDS = ["hiv", "hbv", "hcv", "hepatitis", "syphilis"];
const RESULT_VALUES = ["pending", "negative", "positive"];
const pendingStatuses = ["pending_screening", "pending-testing", "pending_testing", "testing", "quarantine"];

const bloodAtFacility = (facilityId) => ({
	$or: [{ bloodLab: facilityId }, { hospital: facilityId }],
});

const normalizeResults = (input = {}) => Object.fromEntries(
	RESULT_FIELDS.map((field) => [field, input[field] || "pending"]),
);

const audit = (req, action, targetId, description, changes) => AuditLog.create({
	action,
	performedBy: { userType: "LabStaff", userId: req.user._id, name: req.user.fullName },
	target: { targetType: "LabTestResult", targetId },
	changes,
	description,
	ipAddress: req.ip,
});

export const getMyLabStaffProfile = async (req, res) => {
	res.json({
		success: true,
		data: {
			id: req.user._id,
			fullName: req.user.fullName,
			employeeCode: req.user.employeeCode,
			email: req.user.email,
			permissions: req.user.permissions,
			facility: req.user.facility,
		},
	});
};

export const getWorklist = async (req, res) => {
	try {
		const units = await Blood.find({
			...bloodAtFacility(req.facilityId),
			status: { $in: [...pendingStatuses, "qualified", "rejected"] },
		})
			.select("unitCode barcode testSampleCode bloodType bloodGroup quantity collectionDate status screeningResult donorSnapshot donationNumber intakeWarnings")
			.sort({ createdAt: -1 })
			.lean();

		const records = await LabTestResult.find({ bloodUnit: { $in: units.map((unit) => unit._id) } })
			.populate("enteredBy", "fullName employeeCode")
			.populate("submittedBy", "fullName employeeCode")
			.populate("approvedBy", "fullName employeeCode")
			.lean();
		const byUnit = new Map(records.map((record) => [String(record.bloodUnit), record]));

		res.json({
			success: true,
			data: units.map((unit) => ({ ...unit, testRecord: byUnit.get(String(unit._id)) || null })),
		});
	} catch (error) {
		res.status(500).json({ success: false, message: "Không thể tải danh sách mẫu xét nghiệm" });
	}
};

export const saveDraftResult = async (req, res) => {
	try {
		const results = normalizeResults(req.body?.results);
		if (Object.values(results).some((value) => !RESULT_VALUES.includes(value))) {
			return res.status(400).json({ success: false, message: "Kết quả xét nghiệm không hợp lệ" });
		}
		const blood = await Blood.findOne({ _id: req.params.bloodUnitId, ...bloodAtFacility(req.facilityId) });
		if (!blood) return res.status(404).json({ success: false, message: "Không tìm thấy mẫu máu" });

		const existing = await LabTestResult.findOne({ bloodUnit: blood._id });
		if (existing && existing.status !== "draft") {
			return res.status(409).json({ success: false, message: "Kết quả đã gửi duyệt nên không thể sửa trực tiếp" });
		}
		if (existing && String(existing.enteredBy) !== String(req.user._id)) {
			return res.status(403).json({ success: false, message: "Chỉ người nhập kết quả mới được sửa bản nháp" });
		}

		const before = existing?.results?.toObject?.() || null;
		const record = existing || new LabTestResult({
			facility: req.facilityId,
			bloodUnit: blood._id,
			enteredBy: req.user._id,
		});
		record.results = results;
		await record.save();
		if (blood.status === "pending_screening" || blood.status === "pending-testing" || blood.status === "pending_testing") {
			blood.status = "testing";
			await blood.save();
		}
		await audit(req, "SAVE_LAB_RESULT_DRAFT", record._id, `Lưu nháp kết quả cho mẫu ${blood.unitCode}`, { before, after: results });

		res.json({ success: true, message: "Đã lưu bản nháp", data: record });
	} catch (error) {
		if (error?.code === 11000) return res.status(409).json({ success: false, message: "Mẫu đã có kết quả xét nghiệm" });
		res.status(500).json({ success: false, message: error.message || "Không thể lưu kết quả" });
	}
};

export const submitResult = async (req, res) => {
	try {
		const record = await LabTestResult.findOne({
			_id: req.params.id,
			facility: req.facilityId,
			enteredBy: req.user._id,
			status: "draft",
		});
		if (!record) return res.status(404).json({ success: false, message: "Không tìm thấy bản nháp có thể gửi" });
		if (Object.values(record.results.toObject()).some((value) => value === "pending")) {
			return res.status(400).json({ success: false, message: "Cần nhập đủ tất cả chỉ số trước khi gửi duyệt" });
		}
		record.status = "submitted";
		record.submittedBy = req.user._id;
		record.submittedAt = new Date();
		await record.save();
		await audit(req, "SUBMIT_LAB_RESULT", record._id, "Gửi kết quả xét nghiệm để phê duyệt", { status: "submitted" });
		res.json({ success: true, message: "Đã gửi kết quả để phê duyệt", data: record });
	} catch (error) {
		res.status(500).json({ success: false, message: "Không thể gửi kết quả" });
	}
};

export const approveResult = async (req, res) => {
	try {
		const record = await LabTestResult.findOne({ _id: req.params.id, facility: req.facilityId, status: "submitted" });
		if (!record) return res.status(404).json({ success: false, message: "Không tìm thấy kết quả đang chờ duyệt" });
		if (String(record.enteredBy) === String(req.user._id)) {
			return res.status(403).json({ success: false, message: "Không được tự phê duyệt kết quả do chính mình nhập" });
		}

		const finalResults = record.results.toObject();
		const status = Object.values(finalResults).some((value) => value === "positive") ? "rejected" : "qualified";
		const blood = await Blood.findOneAndUpdate(
			{ _id: record.bloodUnit, ...bloodAtFacility(req.facilityId) },
			{ $set: { screeningResult: finalResults, status } },
			{ new: true },
		);
		if (!blood) return res.status(404).json({ success: false, message: "Không tìm thấy mẫu máu" });

		record.status = "approved";
		record.approvedBy = req.user._id;
		record.approvedAt = new Date();
		await record.save();
		await audit(req, "APPROVE_LAB_RESULT", record._id, `Phê duyệt kết quả mẫu ${blood.unitCode}`, { results: finalResults, bloodStatus: status });
		res.json({ success: true, message: "Đã phê duyệt kết quả", data: record });
	} catch (error) {
		res.status(500).json({ success: false, message: "Không thể phê duyệt kết quả" });
	}
};
