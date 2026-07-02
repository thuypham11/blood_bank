import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import QRCode from "qrcode";
import axios from "axios";
import multer from "multer";
import { generateBloodStorageId } from "../services/barcodeService.js";
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SCREENING_VALUES = ["pending", "negative", "positive"];
const REQUIRED_SCREENING_FIELDS = ["hiv", "hbv", "hcv", "hepatitis", "syphilis"];
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8001";
export const labResultCsvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
});
const labFilter = (labId) => ({
    $or: [{ hospital: labId }, { bloodLab: labId }],
});

const calculatesStatusAfterScreening = (screeningResult) => {
    const values = REQUIRED_SCREENING_FIELDS.map((field) => screeningResult?.[field] || "pending");
    if (values.includes("positive")) return "rejected";
    if (values.every((value) => value == "negative")) return "qualified";

    return "pending_screening";
};

const hasPassedRequiredScreening = (screeningResult) =>
    REQUIRED_SCREENING_FIELDS.every((field) => screeningResult?.[field] === "negative");

const normalizeOptionalText = (value) => {
    const normalized = String(value || "").trim();
    return normalized || undefined;
};

const normalizeSamplePrefix = (value) =>
    normalizeOptionalText(value)?.toUpperCase().replace(/\s+/g, "-");

const normalizeLookupCode = (value) =>
    normalizeOptionalText(value)?.toUpperCase();

const validateIntakeDates = ({ collectionDate, expiryDate }) => {
    const collectedAt = new Date(collectionDate);
    if (!collectionDate || Number.isNaN(collectedAt.getTime())) {
        return "Ngày lấy máu không hợp lệ";
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (collectedAt > today) {
        return "Ngày lấy máu không được ở tương lai";
    }

    if (expiryDate) {
        const expiresAt = new Date(expiryDate);
        if (Number.isNaN(expiresAt.getTime())) {
            return "Hạn dùng không hợp lệ";
        }
        if (expiresAt <= collectedAt) {
            return "Hạn dùng phải sau ngày lấy máu";
        }
    }

    return null;
};

export const getBloodLabDashboard = async (req, res) => {
    try {
        const labId = req.user._id;
        const [units, facility] = await Promise.all([
            Blood.find(labFilter(labId)),
            Facility.findById(labId).select(
                "history name email phone address operatingHours status lastLogin"
            ),
        ]);
        const stats = {  // thống kê từng đơn vị trạng thái máu
            totalUnits: units.length,
            pendingScreening: units.filter((u) => u.status === "pending_screening").length,
            availableUnits: units.filter((u) => u.status === "available").length,
            issuedUnits: units.filter((u) => u.status === "issued").length,
            rejectedUnits: units.filter((u) => u.status === "rejected").length,
            discardedUnits: units.filter((u) => u.status === "discarded").length,
            totalVolume: units.reduce((sum, unit) => sum + (unit.quantity || 0), 0),
            availableVolume: units
                .filter((u) => u.status === "available")
                .reduce((sum, unit) => sum + (unit.quantity || 0), 0),
        };

        res.json({
            success: true,
            stats,
            facility,
        });
    } catch (error) {
        console.error(" Dashboard error", error),
            res.status(500).json({
                success: false,
                message: "Failed to fetch blood Lab dashboard data",
            });
    }
};
// Lịch sử hoạt động
export const getBloodLabHistory = async (req, res) => {
    try {
        const labId = req.user._id;
        const lab = await Facility.findById(labId).select("history lastLogin");

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: "Blood Lab not found",
            });
        }
        const activity = lab.history
            .filter((item) =>
                ["Stock Update", "Screening", "Issue", "Login"].includes(item.eventType)
            )
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // sắp xếp theo ngày
        res.json({
            success: true,
            activity,
            lastLogin: lab.lastLogin,
        });
    } catch (error) {
        console.error("History Error", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch blood lab history",
        });
    }
};

export const getBloodUnits = async (req, res) => {
    try {
        const labId = req.user._id;
        const units = await Blood.find(labFilter(labId))
            .populate("donor", "fullName phone email bloodGroup")
            .sort({
                createdAt: -1,
            });
        res.json({
            success: true,
            data: units,
        });
    } catch (error) {
        console.error("Get Blood Units Error :", error);
        res.status(500).json({
            success: false,
            message: "Không thể tải danh sách túi máu",
        });
    }
};

export const getBloodStock = async (req, res) => {
    try {
        const stock = await Blood.aggregate([
            { $match: { $and: [labFilter(req.user._id), { status: "available" }] } },
            {
                $group: {
                    _id: "$bloodType",
                    units: { $sum: 1 },
                    quantity: { $sum: "$quantity" },
                },
            },
            { $project: { _id: 0, bloodType: "$_id", units: 1, quantity: 1 } },
            { $sort: { bloodType: 1 } },
        ]);
        res.json({ success: true, data: stock });
    } catch (error) {
        console.error("Get Blood Stock Error:", error);
        res.status(500).json({ success: false, message: "Không thể tải tồn kho máu" });
    }
};

export const getBloodUnitByBarcode = async (req, res) => {
    try {
        const lookupCode = String(req.params.barcode || "").trim().toUpperCase();
        if (!lookupCode) {
            return res.status(400).json({ success: false, message: "Mã tra cứu không hợp lệ" });
        }

        const unit = await Blood.findOne({
            $and: [
                labFilter(req.user._id),
                { $or: [{ barcode: lookupCode }, { unitCode: lookupCode }, { testSampleCode: lookupCode }] },
            ],
        })
            .populate("parentUnit", "barcode unitCode componentType")
            .populate("donor", "fullName phone email bloodGroup");

        if (!unit) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn vị máu" });
        }

        res.json({ success: true, data: unit });
    } catch (error) {
        console.error("Lookup Barcode Error:", error);
        res.status(500).json({ success: false, message: "Không thể tra cứu barcode" });
    }
};

export const getBloodUnitCodeImage = async (req, res) => {
    try {
        const unit = await Blood.findOne({
            _id: req.params.id,
            ...labFilter(req.user._id),
        }).select("barcode unitCode");

        if (!unit) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn vị máu" });
        }

        const identifier = unit.barcode || unit.unitCode;
        if (!identifier) {
            return res.status(409).json({ success: false, message: "Đơn vị máu chưa có barcode" });
        }

        const dataUrl = await QRCode.toDataURL(identifier, {
            errorCorrectionLevel: "H",
            margin: 2,
            width: 320,
            type: "image/png",
        });

        res.json({
            success: true,
            data: { identifier, format: "QR", errorCorrectionLevel: "H", dataUrl },
        });
    } catch (error) {
        console.error("Generate QR Error:", error);
        res.status(500).json({ success: false, message: "Không thể tạo mã QR" });
    }
};

export const splitBloodUnitComponents = async (req, res) => {
    const labId = req.user._id;
    const allowedTypes = new Set(["red_cells", "platelets", "plasma"]);
    const components = Array.isArray(req.body?.components) ? req.body.components : [];
    const normalizedComponents = components.map((component) => ({
        type: component?.type,
        quantity: Number(component?.quantity),
        expiryDate: component?.expiryDate ? new Date(component.expiryDate) : null,
    }));
    const uniqueTypes = new Set(normalizedComponents.map((component) => component.type));

    if (
        normalizedComponents.length === 0 ||
        uniqueTypes.size !== normalizedComponents.length ||
        normalizedComponents.some(
            (component) =>
                !allowedTypes.has(component.type) ||
                !Number.isFinite(component.quantity) ||
                component.quantity <= 0 ||
                !component.expiryDate ||
                Number.isNaN(component.expiryDate.getTime())
        )
    ) {
        return res.status(400).json({
            success: false,
            message: "Mỗi chế phẩm cần loại, dung tích và hạn sử dụng hợp lệ",
        });
    }

    const splitAt = new Date();
    const createdIds = [];
    let source;
    let previousStatus;

    try {
        source = await Blood.findOneAndUpdate(
            {
                _id: req.params.id,
                ...labFilter(labId),
                componentType: { $in: ["whole_blood", null] },
                status: { $in: ["qualified", "available"] },
                splitAt: null,
            },
            { $set: { splitAt, status: "processed" } },
            { new: false }
        );

        if (!source) {
            return res.status(409).json({
                success: false,
                message: "Túi máu không phù hợp để tách hoặc đã được tách trước đó",
            });
        }

        previousStatus = source.status;
        let parentBarcode = source.barcode || source.unitCode;
        if (!parentBarcode) {
            parentBarcode = await generateBloodStorageId({ facilityId: labId });
            await Blood.updateOne(
                { _id: source._id, splitAt },
                { $set: { barcode: parentBarcode, unitCode: parentBarcode } }
            );
        }

        const createdComponents = [];
        for (const component of normalizedComponents) {
            const identifier = await generateBloodStorageId({ facilityId: labId });
            const created = await Blood.create({
                unitCode: identifier,
                barcode: identifier,
                bloodType: source.bloodType || source.bloodGroup,
                bloodGroup: source.bloodGroup || source.bloodType,
                quantity: component.quantity,
                collectionDate: source.collectionDate,
                expiryDate: component.expiryDate,
                expirationDate: component.expiryDate,
                bloodLab: source.bloodLab || labId,
                hospital: source.hospital || labId,
                componentType: component.type,
                parentUnit: source._id,
                parentBarcode,
                screeningResult: source.screeningResult,
                status: previousStatus,
            });
            createdIds.push(created._id);
            createdComponents.push(created);
        }

        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Stock Update",
                    description: `Split blood unit ${parentBarcode} into ${createdComponents.length} components`,
                    date: new Date(),
                    referenceId: source._id,
                },
            },
        });

        res.status(201).json({
            success: true,
            message: "Tách chế phẩm và cấp barcode thành công",
            data: { parentId: parentBarcode, components: createdComponents },
        });
    } catch (error) {
        if (createdIds.length > 0) {
            await Blood.deleteMany({ _id: { $in: createdIds }, parentUnit: source?._id });
        }
        if (source?._id && previousStatus) {
            await Blood.updateOne(
                { _id: source._id, splitAt },
                { $set: { status: previousStatus }, $unset: { splitAt: 1 } }
            );
        }

        console.error("Split Blood Components Error:", error);
        res.status(500).json({ success: false, message: "Không thể tách chế phẩm máu" });
    }
};

export const createBloodUnit = async (req, res) => {
    try {
        console.log("BODY:", req.body);
        const labId = req.user._id;
        const {
            bloodType,
            quantity,
            collectionDate,
            expiryDate,
            testSampleCode,
            sampleType,
            intakeNote,
        } = req.body || {};
        const allowedQuantities = [250, 350, 450, 700];

        if (!allowedQuantities.includes(Number(quantity))) {
            return res.status(400).json({
                success: false,
                message: "Dung tích túi máu chỉ được chọn 250ml, 350ml hoặc 450ml",
            });
        }

        if (!BLOOD_TYPES.includes(bloodType) || !quantity || !collectionDate) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập nhóm máu , dung tích và ngày lấy máu",
            });
        }
        if (Number(quantity) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Dung tích máu phải lớn hơn 0",
            });
        }

        const dateError = validateIntakeDates({ collectionDate, expiryDate });
        if (dateError) {
            return res.status(400).json({
                success: false,
                message: dateError,
            });
        }

        const unitCode = await generateBloodStorageId({ facilityId: labId });

        const unit = await Blood.create({
            unitCode,
            barcode: unitCode,
            bloodType,
            bloodGroup: bloodType,
            quantity: Number(quantity),
            collectionDate,
            expiryDate,
            receivedAt: new Date(),
            testSampleCode: normalizeOptionalText(testSampleCode) || `SMP-${unitCode}`,
            sampleType: sampleType || "unknown",
            sampleCollectedAt: collectionDate,
            traceabilityVerified: true,
            intakeNote: normalizeOptionalText(intakeNote),
            hospital: labId,
            bloodLab: labId,
            componentType: "whole_blood",
            status: "pending_screening",
            screeningResult: {
                hiv: "pending",
                hbv: "pending",
                hcv: "pending",
                hepatitis: "pending",
                syphilis: "pending",
            },
        });
        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Stock Update",
                    description: ` Created blood unit ${unitCode} - ${bloodType} -${quantity}ml `,
                    date: new Date(),
                    referenceId: unit._id,
                },
            },
        });
        res.status(201).json({
            success: true,
            message: "Tạo túi máu thành công",
            data: unit,
        });
    } catch (error) {
        console.error("Create Blood Unit Error", error);
        res.status(500).json({
            success: false,
            message: error.message || " Không thể tạo túi máu ",
        });
    }
};

export const createBloodBatch = async (req, res) => {
    try {
        const labId = req.user._id;
        const {
            bloodType,
            quantity,
            unitCount,
            collectionDate,
            expiryDate,
            batchCode,
            testSampleCodePrefix,
            sampleType,
            intakeNote,
        } = req.body || {};
        const allowedQuantities = [250, 350, 450, 700];
        const count = Number(unitCount);
        const volume = Number(quantity);

        if (!BLOOD_TYPES.includes(bloodType) || !volume || !collectionDate) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập nhóm máu, dung tích và ngày lấy máu",
            });
        }

        if (!allowedQuantities.includes(volume)) {
            return res.status(400).json({
                success: false,
                message: "Dung tích túi máu chỉ được chọn 250ml, 350ml, 450ml hoặc 700ml",
            });
        }

        if (!Number.isInteger(count) || count < 1 || count > 500) {
            return res.status(400).json({
                success: false,
                message: "Số lượng túi trong lô phải từ 1 đến 500",
            });
        }

        const dateError = validateIntakeDates({ collectionDate, expiryDate });
        if (dateError) {
            return res.status(400).json({
                success: false,
                message: dateError,
            });
        }

        const normalizedBatchCode = String(batchCode || `LO-${bloodType.replace("+", "P").replace("-", "N")}-${Date.now()}`)
            .trim()
            .toUpperCase();
        const normalizedSamplePrefix = normalizeSamplePrefix(testSampleCodePrefix);

        const existingBatch = await Blood.exists({
            ...labFilter(labId),
            batchCode: normalizedBatchCode,
        });
        if (existingBatch) {
            return res.status(409).json({
                success: false,
                message: "Mã lô đã tồn tại trong kho của trung tâm",
            });
        }

        const units = [];
        for (let index = 0; index < count; index += 1) {
            const unitCode = await generateBloodStorageId({ facilityId: labId });
            units.push({
                unitCode,
                barcode: unitCode,
                batchCode: normalizedBatchCode,
                batchReceivedAt: new Date(),
                receivedAt: new Date(),
                bloodType,
                bloodGroup: bloodType,
                quantity: volume,
                collectionDate,
                expiryDate,
                testSampleCode: normalizedSamplePrefix
                    ? `${normalizedSamplePrefix}-${String(index + 1).padStart(3, "0")}`
                    : `SMP-${unitCode}`,
                sampleType: sampleType || "unknown",
                sampleCollectedAt: collectionDate,
                traceabilityVerified: true,
                intakeNote: normalizeOptionalText(intakeNote),
                hospital: labId,
                bloodLab: labId,
                componentType: "whole_blood",
                status: "pending_screening",
                screeningResult: {
                    hiv: "pending",
                    hbv: "pending",
                    hcv: "pending",
                    hepatitis: "pending",
                    syphilis: "pending",
                },
            });
        }

        const createdUnits = await Blood.insertMany(units, { ordered: true });
        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Stock Update",
                    description: `Created blood batch ${normalizedBatchCode} - ${count} units - ${bloodType} - ${volume}ml`,
                    date: new Date(),
                },
            },
        });

        res.status(201).json({
            success: true,
            message: "Nhập lô máu thành công",
            data: {
                batchCode: normalizedBatchCode,
                count: createdUnits.length,
                units: createdUnits,
            },
        });
    } catch (error) {
        console.error("Create Blood Batch Error", error);
        res.status(500).json({
            success: false,
            message: error.message || "Không thể nhập lô máu",
        });
    }
};

export const updateBloodUnitScreening = async (req, res) => {
    try {
        const labId = req.user._id;
        const { id } = req.params;
        const { hiv, hbv, hcv, hepatitis, syphilis } = req.body;

        const blood = await Blood.findOne({
            _id: id,
            ...labFilter(labId),
        });
        if (!blood) {
            return res.status(404).json({
                success: false,
                message: "Không thể tìm thấy túi máu",
            });
        }
        const screeningResult = {
            hiv,
            hbv,
            hcv,
            hepatitis,
            syphilis,
        };
        if (Object.values(screeningResult).some((value) => !SCREENING_VALUES.includes(value))) {
            return res.status(400).json({
                success: false,
                message: "Kết quả sàng lọc không hợp lệ",
            });
        }
        blood.screeningResult = screeningResult;
        blood.status = calculatesStatusAfterScreening(screeningResult);

        await blood.save();
        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "screening",
                    description: `Updated screening result for ${blood.unitCode}`,
                    date: new Date(),
                    referenceId: blood._id,
                },
            },
        });
        res.json({
            success: true,
            message: " cập nhật sàng lọc thành công",
            data: blood,
        });
    } catch (error) {
        console.error("Update Blood Unit Screening Error", error),
            res.status(500).json({
                success: false,
                message: " Không thể cập nhật sàng lọc",
            });
    }
};

export const updateBloodBatchScreening = async (req, res) => {
    try {
        const labId = req.user._id;
        const batchCode = String(req.params.batchCode || "").trim().toUpperCase();
        const positiveField = String(req.body?.positiveField || "").trim();
        const exceptionCodes = Array.isArray(req.body?.exceptionCodes)
            ? req.body.exceptionCodes
            : String(req.body?.exceptionCodes || "")
                .split(/\r?\n|,|;/)
                .map((code) => code.trim())
                .filter(Boolean);

        if (!batchCode) {
            return res.status(400).json({ success: false, message: "Mã lô không hợp lệ" });
        }

        if (!REQUIRED_SCREENING_FIELDS.includes(positiveField)) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn tác nhân dương tính cho các túi ngoại lệ",
            });
        }

        const normalizedExceptionCodes = [
            ...new Set(exceptionCodes.map(normalizeLookupCode).filter(Boolean)),
        ];

        const units = await Blood.find({
            ...labFilter(labId),
            batchCode,
            status: { $in: ["pending_screening", "pending-testing", "pending_testing", "quarantine", "qualified", "rejected"] },
        });

        if (units.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lô máu cần cập nhật xét nghiệm",
            });
        }

        const unitsByCode = new Map();
        units.forEach((unit) => {
            [unit.unitCode, unit.barcode, unit.testSampleCode]
                .map(normalizeLookupCode)
                .filter(Boolean)
                .forEach((code) => unitsByCode.set(code, unit));
        });

        const unknownCodes = normalizedExceptionCodes.filter((code) => !unitsByCode.has(code));
        if (unknownCodes.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Có mã không thuộc lô ${batchCode}: ${unknownCodes.join(", ")}`,
            });
        }

        const exceptionIds = new Set(
            normalizedExceptionCodes.map((code) => String(unitsByCode.get(code)._id))
        );

        const negativeResult = REQUIRED_SCREENING_FIELDS.reduce((result, field) => {
            result[field] = "negative";
            return result;
        }, {});

        const positiveResult = {
            ...negativeResult,
            [positiveField]: "positive",
        };

        const passIds = [];
        const rejectedIds = [];

        units.forEach((unit) => {
            const id = String(unit._id);
            if (exceptionIds.has(id)) rejectedIds.push(unit._id);
            else passIds.push(unit._id);
        });

        const operations = [];
        if (passIds.length > 0) {
            operations.push(
                Blood.updateMany(
                    { _id: { $in: passIds }, ...labFilter(labId), batchCode },
                    { $set: { screeningResult: negativeResult, status: "qualified" } }
                )
            );
        }
        if (rejectedIds.length > 0) {
            operations.push(
                Blood.updateMany(
                    { _id: { $in: rejectedIds }, ...labFilter(labId), batchCode },
                    { $set: { screeningResult: positiveResult, status: "rejected" } }
                )
            );
        }

        await Promise.all(operations);

        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Screening",
                    description: `Batch screening ${batchCode}: ${passIds.length} qualified, ${rejectedIds.length} rejected`,
                    date: new Date(),
                },
            },
        });

        res.json({
            success: true,
            message: "Đã cập nhật kết quả xét nghiệm theo lô",
            data: {
                batchCode,
                qualifiedCount: passIds.length,
                rejectedCount: rejectedIds.length,
                rejectedCodes: normalizedExceptionCodes,
                positiveField,
            },
        });
    } catch (error) {
        console.error("Update Blood Batch Screening Error", error);
        res.status(500).json({
            success: false,
            message: "Không thể cập nhật xét nghiệm theo lô",
        });
    }
};

export const importBloodBatchScreeningFromCsv = async (req, res) => {
    try {
        const labId = req.user._id;
        const batchCode = String(req.params.batchCode || "").trim().toUpperCase();

        if (!batchCode) {
            return res.status(400).json({ success: false, message: "Mã lô không hợp lệ" });
        }
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: "Vui lòng chọn file CSV kết quả xét nghiệm" });
        }

        const csvContent = req.file.buffer.toString("utf8");
        const { data: parsed } = await axios.post(
            `${PYTHON_SERVICE_URL}/lab-results/parse`,
            {
                filename: req.file.originalname,
                content: csvContent,
            },
            { timeout: 10000 }
        );

        if (!parsed?.success) {
            return res.status(400).json({
                success: false,
                message: parsed?.message || "Python service không đọc được file xét nghiệm",
            });
        }

        const records = Array.isArray(parsed.records) ? parsed.records : [];
        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: "File không có dòng kết quả hợp lệ để cập nhật",
                data: parsed,
            });
        }

        const units = await Blood.find({
            ...labFilter(labId),
            batchCode,
            status: { $in: ["pending_screening", "pending-testing", "pending_testing", "testing", "quarantine", "qualified", "rejected"] },
        });

        if (units.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lô máu cần cập nhật xét nghiệm",
            });
        }

        const unitsByCode = new Map();
        units.forEach((unit) => {
            [unit.unitCode, unit.barcode, unit.testSampleCode]
                .map(normalizeLookupCode)
                .filter(Boolean)
                .forEach((code) => unitsByCode.set(code, unit));
        });

        const unknownCodes = [];
        const operations = [];
        let qualifiedCount = 0;
        let rejectedCount = 0;

        for (const record of records) {
            const code = normalizeLookupCode(record.code);
            const unit = unitsByCode.get(code);
            if (!unit) {
                unknownCodes.push(record.code);
                continue;
            }

            const screeningResult = REQUIRED_SCREENING_FIELDS.reduce((result, field) => {
                result[field] = SCREENING_VALUES.includes(record.results?.[field])
                    ? record.results[field]
                    : "pending";
                return result;
            }, {});
            const status = Object.values(screeningResult).includes("positive") ? "rejected" : "qualified";
            if (status === "rejected") rejectedCount += 1;
            else qualifiedCount += 1;

            operations.push({
                updateOne: {
                    filter: { _id: unit._id, ...labFilter(labId), batchCode },
                    update: { $set: { screeningResult, status } },
                },
            });
        }

        if (operations.length === 0) {
            return res.status(400).json({
                success: false,
                message: `Không có mã nào trong file thuộc lô ${batchCode}`,
                data: { unknownCodes, pythonSummary: parsed.summary, pythonErrors: parsed.errors },
            });
        }

        const result = await Blood.bulkWrite(operations);

        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Screening",
                    description: `Imported batch screening via Python ${batchCode}: ${qualifiedCount} qualified, ${rejectedCount} rejected`,
                    date: new Date(),
                },
            },
        });

        res.json({
            success: true,
            message: "Đã import kết quả xét nghiệm bằng Python service",
            data: {
                batchCode,
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                qualifiedCount,
                rejectedCount,
                unknownCodes,
                pythonSummary: parsed.summary,
                pythonErrors: parsed.errors,
            },
        });
    } catch (error) {
        console.error("Import Batch Screening CSV Error", error.response?.data || error);
        const isPythonError = error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT";
        res.status(isPythonError ? 503 : 500).json({
            success: false,
            message: isPythonError
                ? "Python service chưa chạy. Hãy chạy npm run dev:python hoặc npm run dev:integrated."
                : error.response?.data?.message || "Không thể import file xét nghiệm bằng Python",
        });
    }
};
// nhập đơn vị máu vào kho
export const importBloodUnitToStock = async (req, res) => {
    try {
        const labId = req.user._id;
        const { id } = req.params;

        const blood = await Blood.findOne({
            _id: id,
            ...labFilter(labId),
        });
        if (!blood) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy túi máu",
            });
        }
        if (blood.status !== "qualified") {
            return res.status(400).json({
                success: false,
                message: "Chỉ túi máu đạt sàng lọc mới được nhập kho",
            });
        }
        if (!hasPassedRequiredScreening(blood.screeningResult)) {
            return res.status(400).json({
                success: false,
                message: "Túi máu chưa đủ kết quả sàng lọc âm tính bắt buộc",
            });
        }
        blood.status = "available";
        await blood.save();

        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "StockUpdate",
                    description: `Imported blood unit ${blood.unitCode} to stock`,
                    date: new Date(),
                    referenceId: blood._id,
                },
            },
        });
        res.json({
            success: true,
            message: " nhập kho thành công ",
            data: blood,
        });
    } catch (error) {
        console.error("Import Blood Unit Error", error);
        res.status(500).json({
            success: false,
            message: "Không thể nhập kho"
        });
    }
};

export const importBloodBatchToStock = async (req, res) => {
    try {
        const labId = req.user._id;
        const batchCode = String(req.params.batchCode || "").trim().toUpperCase();

        if (!batchCode) {
            return res.status(400).json({ success: false, message: "Mã lô không hợp lệ" });
        }

        const eligibleUnits = await Blood.find({
            ...labFilter(labId),
            batchCode,
            status: "qualified",
        }).select("_id screeningResult");

        const eligibleIds = eligibleUnits
            .filter((unit) => hasPassedRequiredScreening(unit.screeningResult))
            .map((unit) => unit._id);

        if (eligibleIds.length === 0) {
            return res.status(409).json({
                success: false,
                message: "Lô này chưa có túi máu nào đủ điều kiện nhập kho. Cần hoàn tất sàng lọc âm tính trước.",
            });
        }

        const result = await Blood.updateMany(
            {
                _id: { $in: eligibleIds },
                ...labFilter(labId),
                batchCode,
                status: "qualified",
            },
            {
                $set: {
                    status: "available",
                },
            }
        );

        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "StockUpdate",
                    description: `Imported blood batch ${batchCode} to stock - ${result.modifiedCount} units`,
                    date: new Date(),
                },
            },
        });

        res.json({
            success: true,
            message: "Đã chuyển lô máu sang trạng thái sẵn sàng",
            data: {
                batchCode,
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
            },
        });
    } catch (error) {
        console.error("Import Blood Batch Error", error);
        res.status(500).json({
            success: false,
            message: "Không thể nhập kho theo lô",
        });
    }
};
export const discardBloodUnit = async (req, res) => {
    try {
        const labId = req.user._id;
        const { id } = req.params;

        const blood = await Blood.findOneAndUpdate(
            {
                _id: id,
                ...labFilter(labId),
            },
            {
                status: "discarded",
            },
            { new: true }
        );
        if (!blood) {
            return res.status(404).json({
                success: false,
                message: " Không tìm thấy túi máu ",
            });
        }
        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Stock Update",
                    description: `Discarded blood unit ${blood.unitCode}`,
                    date: new Date(),
                    referenceId: blood._id,
                },
            },
        });
        res.json({
            success: true,
            message: " Đã loại bỏ túi máu",
            data: blood,
        });
    } catch (error) {
        console.error("Discard Blood unit Error", error);
        res.status(500).json({
            success: false,
            message: "không thể loại bỏ túi máu",
        });
    }
};
// Xuất đơn vị máu
export const issueBloodUnits = async (req, res) => {
    try {
        const labId = req.user._id;
        const { bloodType, requestedVolume, hospitalName, reason } = req.body;

        if (!bloodType || !requestedVolume || !hospitalName) {
            return res.status(400).json({
                success: false,
                message: " Vui lòng nhập nhóm máu , số ml cần xuất và bệnh viện nhận",
            });
        }
        const volumeNeed = Number(requestedVolume);

        if (volumeNeed <= 0) {
            return res.status(400).json({
                success: false,
                message: " Số ml cần xuất phải lớn hơn 0",
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
            totalVolume += unit.quantity;
        }
        if (totalVolume < volumeNeed) {
            return res.status(400).json({
                success: false,
                message: `Không đủ máu trong kho. Hiện có ${totalVolume}ml, cần ${volumeNeed}ml`,
                data: {
                    selectedUnits,
                    totalVolume,
                    requestedVolume: volumeNeed,
                },
            });
        }
        const selectedIds = selectedUnits.map((unit) => unit._id);

        await Blood.updateMany(
            {
                _id: { $in: selectedIds },
                ...labFilter(labId),
            },
            {
                status: "issued",
                issuedTo: hospitalName,
                issueReason: reason || "",
                issuedAt: new Date(),
            }
        );
        const issuedUnits = await Blood.find({
            _id: { $in: selectedIds },
            ...labFilter(labId),
        });
        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Issue",
                    description: `Issued ${totalVolume}ml of ${bloodType} to ${hospitalName}`,
                    date: new Date(),
                },
            },
        });
        res.json({
            success: true,
            message: "Xuất máu thành công",
            data: {
                bloodType,
                requestedVolume: volumeNeed,
                totalVolume,
                issuedUnits,
            },
        });
    } catch (error) {
        console.error("Issue Blood Units Error:", error);
        res.status(500).json({
            success: false,
            message: " Không thể xuất máu ",
        });
    }
};
// Yêu cầu xét nghiệm máu
export const getLabBloodRequests = async (req, res) => {
    try {
        const labId = req.user._id;

        const requests = await BloodRequest.find({
            labId,
        })
            .populate(
                "hospitalId",
                "name email phone address"
            )
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            requests,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch requests",
        });
    }
};
// Cập nhật trạng thái yêu cầu
export const updateBloodRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const labId = req.user._id;

        if (!["accept", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: " Invalid action Must be 'accept' or 'reject' ",
            });
        }
        const request = await BloodRequest.findOne({
            _id: id,
            labId,
        }).populate("hospitalId", "name");
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found",
            });
        }
        if (request.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: " Request already processed",
            });
        }
        request.status = action === "accept" ? "accepted" : "rejected";
        request.processedAt = new Date();

        await request.save();
        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Issue",
                    description: `${action === "accept" ? "Accepted" : "Rejected"} blood request ${request._id}`,
                    date: new Date(),
                    referenceId: request._id,
                }
            }
        });
        res.json({
            success: true,
            message: `Request ${action}ed successfully`,
            data: request,
        });
    } catch (error) {
        console.error("Update Request status Error", error);
        res.status(500).json({
            success: false,
            message: error.message || " Failed to process request",
        });
    }
};

export const updateBloodHandoverStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { handoverStatus } = req.body;
        const labId = req.user._id;
        const allowedStatuses = ["received", "preparing", "packed", "shipping"];

        if (!allowedStatuses.includes(handoverStatus)) {
            return res.status(400).json({ success: false, message: "Trạng thái bàn giao không hợp lệ" });
        }

        const request = await BloodRequest.findOne({ _id: id, labId });
        if (!request) {
            return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
        }
        if (request.status !== "accepted") {
            return res.status(400).json({ success: false, message: "Yêu cầu chưa được chấp nhận" });
        }

        request.handoverStatus = handoverStatus;
        request.handoverTimeline.push({
            status: handoverStatus,
            label: `Blood lab updated handover to ${handoverStatus}`,
            actor: labId,
        });
        await request.save();

        res.json({ success: true, message: "Đã cập nhật trạng thái bàn giao", data: request });
    } catch (error) {
        console.error("Update Handover Error:", error);
        res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái bàn giao" });
    }
};
console.log("bloodLabcontroller active");

export const getAllLabs = async (req, res) => {
    try {
        const labs = await Facility.find({
            facilityType: "blood-lab",
            status: "approved",
        }).select("name email phone address operatingHours");
        res.json({
            success: true,
            labs,
        });
    } catch (error) {
        console.error("Get Labs Error :", error);
        res.status(500).json({
            success: false,
            message: "Error fetching blood labs",
        });
    }
};
