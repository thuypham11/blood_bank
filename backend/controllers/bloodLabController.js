import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import QRCode from "qrcode";
import { generateBloodStorageId } from "../services/barcodeService.js";
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SCREENING_VALUES = ["pending", "negative", "positive"];
const DEFAULT_UNIT_VOLUME_ML = 450;
const HANDOVER_LABELS = {
    requested: "Benh vien gui yeu cau",
    received: "Trung tam tiep nhan",
    preparing: "Dang chuan bi mau",
    packed: "Da dong goi",
    shipping: "Dang van chuyen",
    confirmed: "Benh vien xac nhan nhan mau",
    rejected: "Tu choi yeu cau",
};
const labFilter = (labId) => ({
    $or: [{ hospital: labId }, { bloodLab: labId }],
});

const requestLabFilter = (labId) => ({
    $or: [
        { labId },
        { bloodLabId: labId },
        { bloodLab: labId },
        { lab: labId },
    ],
});

const calculatesStatusAfterScreening = (screeningResult) => {
    const values = Object.values(screeningResult);
    if (values.includes("positive")) return "rejected";
    if (values.every((value) => value == "negative")) return "qualified";

    return "pending_screening";
};

const pushTimeline = (request, status, actor, note = "") => {
    if (request.handoverTimeline?.some((item) => item.status === status)) return;

    request.handoverTimeline.push({
        status,
        label: HANDOVER_LABELS[status] || status,
        date: new Date(),
        actor,
        note,
    });
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
        const units = await Blood.find(labFilter(labId)).sort({
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
        const barcode = String(req.params.barcode || "").trim().toUpperCase();
        if (!barcode) {
            return res.status(400).json({ success: false, message: "Barcode không hợp lệ" });
        }

        const unit = await Blood.findOne({
            $and: [
                labFilter(req.user._id),
                { $or: [{ barcode }, { unitCode: barcode }] },
            ],
        }).populate("parentUnit", "barcode unitCode componentType");

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
        const { bloodType, quantity, collectionDate, expiryDate } = req.body || {};
        const allowedQuantities = [250, 350, 450];

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
        const unitCode = await generateBloodStorageId({ facilityId: labId });

        const unit = await Blood.create({
            unitCode,
            barcode: unitCode,
            bloodType,
            quantity: Number(quantity),
            collectionDate,
            expiryDate,
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
export const checkBloodExpiry = async (req, res) => {
    try {
        const labId = req.user._id;
        const thresholdDays = Number(req.query.threshold) || 3;
        const today = new Date();

        const availableUnits = await Blood.find({
            bloodLab: labId,
            status: "available",
            expiryDate: { $gte: today }
        }).lean();

        const expiringUnits = availableUnits
            .filter(unit => {
                const expiry = new Date(unit.expiryDate);
                const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                return diffDays <= thresholdDays;
            })
            .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

        await Facility.findByIdAndUpdate(labId, {
            $push: {
                history: {
                    eventType: "Expiry Alert",
                    description: `Checked blood expiry: ${expiringUnits.length} units near expiry`,
                    date: new Date(),
                    referenceIds: expiringUnits.map(u => u._id)
                }
            }
        });

        res.json({ success: true, expiringUnits });
    } catch (error) {
        console.error("Check Blood Expiry Error:", error);
        res.status(500).json({ success: false, message: "Không thể kiểm tra hạn sử dụng" });
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
// Xuất đơn vị máu - hỗ trợ nhiều chế phẩm, nhiều nhóm máu trong 1 lần xuất
const COMPONENT_TYPES = ["whole_blood", "red_cells", "platelets", "plasma"];

const getIssueCode = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");

    return `ISSUE-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const normalizeIssueItems = (items = []) => {
    const grouped = new Map();

    for (const raw of items) {
        const bloodType = String(raw.bloodType || "").trim().toUpperCase();
        const componentType = raw.componentType || "whole_blood";
        const requestedVolume = Number(raw.requestedVolume || 0);

        if (!BLOOD_TYPES.includes(bloodType)) {
            throw new Error(`Nhóm máu không hợp lệ: ${bloodType}`);
        }

        if (!COMPONENT_TYPES.includes(componentType)) {
            throw new Error(`Chế phẩm không hợp lệ: ${componentType}`);
        }

        if (!Number.isFinite(requestedVolume) || requestedVolume <= 0) {
            throw new Error("Số ml yêu cầu phải lớn hơn 0");
        }

        const key = `${bloodType}_${componentType}`;

        if (!grouped.has(key)) {
            grouped.set(key, {
                bloodType,
                componentType,
                requestedVolume: 0,
            });
        }

        grouped.get(key).requestedVolume += requestedVolume;
    }

    return Array.from(grouped.values());
};

const isNotExpired = (unit) => {
    const expiry = unit.expiryDate || unit.expirationDate;
    if (!expiry) return true;

    return new Date(expiry).getTime() >= new Date().setHours(0, 0, 0, 0);
};

const buildIssuePlan = async ({ labId, items }) => {
    const normalizedItems = normalizeIssueItems(items);
    const usedUnitIds = new Set();
    const plan = [];
    const missingItems = [];

    for (const item of normalizedItems) {
        const query = {
            ...labFilter(labId),
            bloodType: item.bloodType,
            status: "available",
        };

        if (item.componentType === "whole_blood") {
            query.componentType = { $in: ["whole_blood", null] };
        } else {
            query.componentType = item.componentType;
        }

        let availableUnits = await Blood.find(query).lean();

        availableUnits = availableUnits
            .filter((unit) => isNotExpired(unit))
            .filter((unit) => !usedUnitIds.has(String(unit._id)))
            .sort((a, b) => {
                const aDate = new Date(a.expiryDate || a.expirationDate || "2999-12-31").getTime();
                const bDate = new Date(b.expiryDate || b.expirationDate || "2999-12-31").getTime();
                return aDate - bDate;
            });

        const selectedUnits = [];
        let allocatedVolume = 0;

        for (const unit of availableUnits) {
            if (allocatedVolume >= item.requestedVolume) break;

            selectedUnits.push(unit);
            usedUnitIds.add(String(unit._id));
            allocatedVolume += Number(unit.quantity || 0);
        }

        const planItem = {
            bloodType: item.bloodType,
            componentType: item.componentType,
            requestedVolume: item.requestedVolume,
            allocatedVolume,
            unitIds: selectedUnits.map((unit) => unit._id),
            units: selectedUnits.map((unit) => ({
                _id: unit._id,
                unitCode: unit.unitCode,
                barcode: unit.barcode,
                bloodType: unit.bloodType,
                componentType: unit.componentType || "whole_blood",
                quantity: unit.quantity,
                expiryDate: unit.expiryDate || unit.expirationDate,
            })),
        };

        plan.push(planItem);

        if (allocatedVolume < item.requestedVolume) {
            missingItems.push({
                bloodType: item.bloodType,
                componentType: item.componentType,
                requestedVolume: item.requestedVolume,
                availableVolume: allocatedVolume,
                missingVolume: item.requestedVolume - allocatedVolume,
            });
        }
    }

    return {
        canIssue: missingItems.length === 0,
        plan,
        missingItems,
        totalUnits: plan.reduce((sum, item) => sum + item.units.length, 0),
        totalAllocatedVolume: plan.reduce((sum, item) => sum + item.allocatedVolume, 0),
    };
};

export const previewIssueBloodUnits = async (req, res) => {
    try {
        const labId = req.user._id;
        const { items, bloodType, requestedVolume, componentType } = req.body;

        const workItems = Array.isArray(items) && items.length > 0
            ? items
            : [{ bloodType, requestedVolume, componentType: componentType || "whole_blood" }];

        const result = await buildIssuePlan({ labId, items: workItems });

        res.json({
            success: true,
            message: result.canIssue ? "Có thể xuất máu" : "Không đủ tồn kho",
            data: result,
        });
    } catch (error) {
        console.error("Preview Issue Blood Units Error:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Không thể xem trước xuất máu",
        });
    }
};

export const issueBloodUnits = async (req, res) => {
    try {
        const labId = req.user._id;
        const {
            items,
            bloodType,
            requestedVolume,
            componentType,
            hospitalId,
            hospitalName,
            reason,
            requestId,
        } = req.body;

        if (!hospitalId && !hospitalName) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn bệnh viện nhận máu",
            });
        }

        let resolvedHospitalId = hospitalId || null;
        let resolvedHospitalName = hospitalName || "";

        if (resolvedHospitalId) {
            const hospital = await Facility.findOne({
                _id: resolvedHospitalId,
                facilityType: "hospital",
                status: "approved",
            }).select("name");

            if (!hospital) {
                return res.status(404).json({
                    success: false,
                    message: "KhÃ´ng tÃ¬m tháº¥y bá»‡nh viá»‡n nháº­n mÃ¡u",
                });
            }

            resolvedHospitalName = hospital.name;
        } else if (resolvedHospitalName) {
            const hospital = await Facility.findOne({
                name: resolvedHospitalName,
                facilityType: "hospital",
                status: "approved",
            }).select("name");

            if (hospital) {
                resolvedHospitalId = hospital._id;
                resolvedHospitalName = hospital.name;
            }
        }

        const workItems = Array.isArray(items) && items.length > 0
            ? items
            : [{ bloodType, requestedVolume, componentType: componentType || "whole_blood" }];

        const normalizedWorkItems = normalizeIssueItems(workItems);
        let syncedRequest = null;

        if (requestId) {
            syncedRequest = await BloodRequest.findOne({
                _id: requestId,
                ...requestLabFilter(labId),
            });

            if (!syncedRequest) {
                return res.status(404).json({
                    success: false,
                    message: "KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u mÃ¡u cáº§n Ä‘á»“ng bá»™",
                });
            }

            if (["rejected", "completed"].includes(syncedRequest.status)) {
                return res.status(400).json({
                    success: false,
                    message: "YÃªu cáº§u nÃ y Ä‘Ã£ káº¿t thÃºc, khÃ´ng thá»ƒ xuáº¥t kho",
                });
            }

            resolvedHospitalId = syncedRequest.hospitalId;
            if (!resolvedHospitalName && resolvedHospitalId) {
                const hospital = await Facility.findById(resolvedHospitalId).select("name");
                resolvedHospitalName = hospital?.name || "";
            }
        } else if (resolvedHospitalId && normalizedWorkItems.length === 1) {
            const item = normalizedWorkItems[0];

            syncedRequest =
                (await BloodRequest.findOne({
                    ...requestLabFilter(labId),
                    hospitalId: resolvedHospitalId,
                    bloodType: item.bloodType,
                    status: "accepted",
                }).sort({ createdAt: 1 })) ||
                (await BloodRequest.findOne({
                    ...requestLabFilter(labId),
                    hospitalId: resolvedHospitalId,
                    bloodType: item.bloodType,
                    status: "pending",
                }).sort({ createdAt: 1 }));
        }

        const issuePlan = await buildIssuePlan({ labId, items: workItems });

        if (!issuePlan.canIssue) {
            return res.status(400).json({
                success: false,
                message: "Không đủ tồn kho để xuất máu",
                data: issuePlan,
            });
        }

        const issueCode = getIssueCode();
        const allUnitIds = issuePlan.plan.flatMap((item) => item.unitIds);

        const updateResult = await Blood.updateMany(
            {
                _id: { $in: allUnitIds },
                ...labFilter(labId),
                status: "available",
            },
            {
                $set: {
                    status: "issued",
                    issuedTo: resolvedHospitalId || resolvedHospitalName,
                    issuedToName: resolvedHospitalName || "",
                    issueReason: reason || "Cấp máu theo yêu cầu",
                    issuedAt: new Date(),
                    issueCode,
                    issueRequestId: syncedRequest?._id || null,
                },
            }
        );

        const modifiedCount =
            updateResult.modifiedCount ??
            updateResult.nModified ??
            updateResult.matchedCount ??
            0;

        if (modifiedCount !== allUnitIds.length) {
            return res.status(409).json({
                success: false,
                message: "Kho máu vừa thay đổi, vui lòng thử xuất lại",
            });
        }

        const issuedUnits = await Blood.find({
            _id: { $in: allUnitIds },
            ...labFilter(labId),
        });

        if (syncedRequest) {
            syncedRequest.status = "accepted";
            syncedRequest.handoverStatus = "shipping";
            syncedRequest.processedAt = syncedRequest.processedAt || new Date();
            syncedRequest.processedBy = labId;
            syncedRequest.issuedAt = new Date();
            syncedRequest.issueCode = issueCode;
            syncedRequest.fulfilledVolume = issuePlan.totalAllocatedVolume;
            syncedRequest.fulfilledUnits = issuedUnits.length;
            syncedRequest.fulfilledUnitIds = issuedUnits.map((unit) => unit._id);

            ["received", "preparing", "packed", "shipping"].forEach((status) => {
                pushTimeline(syncedRequest, status, labId, `Synced from issue ${issueCode}`);
            });

            await syncedRequest.save();
        }

        await Promise.all([
            Facility.findByIdAndUpdate(labId, {
                $push: {
                    history: {
                        eventType: "Issue",
                        description: `Issued to ${resolvedHospitalName || resolvedHospitalId}: ${issuePlan.plan
                            .map(
                                (item) =>
                                    `${item.allocatedVolume}ml ${item.bloodType} (${item.componentType})`
                            )
                            .join(", ")}`,
                        date: new Date(),
                        referenceId: syncedRequest?._id || null,
                    },
                },
            }),
            resolvedHospitalId
                ? Facility.findByIdAndUpdate(resolvedHospitalId, {
                    $push: {
                        history: {
                            eventType: "Stock Update",
                            description: `Blood shipment ${issueCode} is on the way`,
                            date: new Date(),
                            referenceId: syncedRequest?._id || null,
                        },
                    },
                })
                : Promise.resolve(),
        ]);

        res.json({
            success: true,
            message: "Xuất máu thành công",
            data: {
                issueCode,
                hospitalId: resolvedHospitalId,
                hospitalName: resolvedHospitalName,
                reason,
                items: issuePlan.plan,
                issuedUnits,
                request: syncedRequest,
            },
        });
    } catch (error) {
        console.error("Issue Blood Units Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Không thể xuất máu",
        });
    }
};
// Yêu cầu xét nghiệm máu
export const getLabBloodRequests = async (req, res) => {
    try {
        const labId = req.user._id;

        const requests = await BloodRequest.find(requestLabFilter(labId))
            .populate({
                path: "hospitalId",
                select: "name email phone address",
                strictPopulate: false,
            })
            .populate({
                path: "hospital",
                select: "name email phone address",
                strictPopulate: false,
            })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: requests,
            requests,
        });
    } catch (error) {
        console.error("Get Lab Blood Requests Error:", error);
        res.status(500).json({
            success: false,
            message: "Không thể tải danh sách yêu cầu từ bệnh viện",
        });
    }
};
// Cập nhật trạng thái yêu cầu
export const updateBloodRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const labId = req.user._id;

        const actionMap = {
            accept: "accepted",
            accepted: "accepted",
            reject: "rejected",
            rejected: "rejected",
        };

        const nextStatus = actionMap[action];

        if (!nextStatus) {
            return res.status(400).json({
                success: false,
                message: "Action không hợp lệ. Chỉ nhận accept hoặc reject",
            });
        }

        const request = await BloodRequest.findOne({
            _id: id,
            ...requestLabFilter(labId),
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy yêu cầu từ bệnh viện",
            });
        }

        if (request.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Yêu cầu này đã được xử lý trước đó",
            });
        }

        request.status = nextStatus;
        request.processedAt = new Date();
        request.processedBy = labId;
        request.handoverStatus = nextStatus === "accepted" ? "received" : "requested";

        pushTimeline(
            request,
            nextStatus === "accepted" ? "received" : "rejected",
            labId,
            nextStatus === "accepted" ? "Accepted by blood lab" : "Rejected by blood lab"
        );

        await request.save();

        await Promise.all([
            Facility.findByIdAndUpdate(labId, {
                $push: {
                    history: {
                        eventType: "Issue",
                        description: `${nextStatus === "accepted" ? "Accepted" : "Rejected"} blood request ${request._id}`,
                        date: new Date(),
                        referenceId: request._id,
                    },
                },
            }),
            Facility.findByIdAndUpdate(request.hospitalId, {
                $push: {
                    history: {
                        eventType: nextStatus === "accepted" ? "Request Approved" : "Stock Update",
                        description: `${nextStatus === "accepted" ? "Blood request accepted" : "Blood request rejected"} by lab ${labId}`,
                        date: new Date(),
                        referenceId: request._id,
                    },
                },
            }),
        ]);

        res.json({
            success: true,
            message: nextStatus === "accepted"
                ? "Đã chấp nhận yêu cầu"
                : "Đã từ chối yêu cầu",
            data: request,
            request,
        });
    } catch (error) {
        console.error("Update Request Status Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Không thể xử lý yêu cầu",
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

        const request = await BloodRequest.findOne({ _id: id, ...requestLabFilter(labId) });
        if (!request) {
            return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
        }
        if (request.status !== "accepted") {
            return res.status(400).json({ success: false, message: "Yêu cầu chưa được chấp nhận" });
        }

        request.handoverStatus = handoverStatus;
        pushTimeline(request, handoverStatus, labId, `Blood lab updated handover to ${handoverStatus}`);
        await request.save();

        await Promise.all([
            Facility.findByIdAndUpdate(labId, {
                $push: {
                    history: {
                        eventType: "Issue",
                        description: `Updated handover ${handoverStatus} for request ${request._id}`,
                        date: new Date(),
                        referenceId: request._id,
                    },
                },
            }),
            Facility.findByIdAndUpdate(request.hospitalId, {
                $push: {
                    history: {
                        eventType: "Stock Update",
                        description: `Blood request ${request._id} moved to ${handoverStatus}`,
                        date: new Date(),
                        referenceId: request._id,
                    },
                },
            }),
        ]);

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

// Trả về danh sách bệnh viện, đặt các bệnh viện có yêu cầu đang chờ (đến lab này) lên đầu
export const getHospitalsForIssue = async (req, res) => {
    try {
        const labId = req.user._id;

        // Lấy danh sách hospital đã được phê duyệt
        const hospitals = await Facility.find({ facilityType: "hospital", status: "approved" })
            .select("name email phone address")
            .lean();

        // Danh sách hospitalId có yêu cầu pending gửi tới lab này
        const openRequests = await BloodRequest.find({
            ...requestLabFilter(labId),
            status: { $in: ["pending", "accepted"] },
        })
            .select("hospitalId bloodType units status handoverStatus createdAt")
            .sort({ status: 1, createdAt: 1 })
            .lean();

        const requestsByHospital = openRequests.reduce((acc, request) => {
            const key = String(request.hospitalId);
            if (!acc.has(key)) acc.set(key, []);
            acc.get(key).push({
                _id: request._id,
                bloodType: request.bloodType,
                units: request.units,
                requestedVolume: Number(request.units || 0) * DEFAULT_UNIT_VOLUME_ML,
                status: request.status,
                handoverStatus: request.handoverStatus,
                createdAt: request.createdAt,
            });
            return acc;
        }, new Map());

        const mapped = hospitals.map((h) => ({
            _id: h._id,
            name: h.name,
            email: h.email,
            phone: h.phone,
            address: h.address,
            hasPendingRequest: requestsByHospital.has(String(h._id)),
            openRequests: requestsByHospital.get(String(h._id)) || [],
            nextRequest: requestsByHospital.get(String(h._id))?.[0] || null,
        }));

        // Sắp xếp: hospital có yêu cầu pending lên trước, rồi theo tên
        mapped.sort((a, b) => {
            if (a.hasPendingRequest && !b.hasPendingRequest) return -1;
            if (!a.hasPendingRequest && b.hasPendingRequest) return 1;
            return (a.name || "").localeCompare(b.name || "");
        });

        res.json({ success: true, hospitals: mapped });
    } catch (error) {
        console.error("Get Hospitals For Issue Error:", error);
        res.status(500).json({ success: false, message: "Không thể tải danh sách bệnh viện" });
    }
};
