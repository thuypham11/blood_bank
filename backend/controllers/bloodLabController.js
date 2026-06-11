import mongoose from "mongoose";
import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import BloodCamp from "../models/bloodCampModel.js";

const generateUnitcode = async () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const prefix = `BU-${yyyy}${mm}${dd}`;

    const countToday = await Blood.countDocuments({
        unitCode: { $regex: `^${prefix}` },
    });

    return `${prefix}-${String(countToday + 1).padStart(4, "0")}`;
};
const calculatesStatusAfterScreening = (screeningResult) => {
    const values = Object.values(screeningResult);
    if (values.includes("positive")) return "rejected";
    if (values.every((value) => value == "negative")) return "qualified";

    return "pending_screening";
};

export const getBloodLabDashboard = async (req, res) => {
    try {
        const labId = req.user._id;
        const [units, facility] = await Promise.all([
            Blood.find({ hospital: labId }),
            Facility.findById(labId).select(
                "history name email phone addess operatingHours status lastLogin"
            ),
        ]);
        const stats = {  // thống kê từng đơn vị trạng thái máu 
            totalUnits: units.length,
            pendingScreening: units.filter((u) => u.status === "pending-screening").length,
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
        const units = await Blood.find({ hospital: labId }).sort({
            createAt: -1,
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

        if (!bloodType || !quantity || !collectionDate) {
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
        const unitCode = await generateUnitcode();

        const unit = await Blood.create({
            unitCode,
            bloodType,
            quantity: Number(quantity),
            collectionDate,
            expiryDate,
            hospital: labId,
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

export const updateBloodUnitScreening = async (req, res) => {
    try {
        const labId = req.user._id;
        const { id } = req.params;
        const { hiv, hbv, hcv, hepatitis, syphilis } = req.body;

        const blood = await Blood.findOne({
            _id: id,
            hospital: labId,
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
            hospital: labId,
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
                hospital: labId,
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
            hospital: labId,
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
                message: "Không đủ máu trong kho . Hiện có ${totalVolume}ml .cần ${VolumeNeed}ml ",
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
                hospital: labId,
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
            hospital: labId,
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

        const requests = await BloodRequest.find({ labId })
            .populate("hospitalId", "name email phone address")
            .sort({ createAt: -1 });

        res.json({
            success: true,
            request,
        });
    } catch (error) {
        console.error("Get Lab Requests Error :", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch blood requests",
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
        request, processedAt = new Date();

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
console.log("bloodLabcontroller active");

export const getAllLabs = async (req, res) => {
    try {
        const labs = await Facility.find({
            facilityType: "blood-lab",
            status: "approved",
        }).selected("name email phone address operatingHours");
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