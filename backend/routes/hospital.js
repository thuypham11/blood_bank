import express from "express";
import Blood from "../models/BloodModel.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET all blood units for a hospital
router.get("/hospital/blood", authenticate, authorize("hospital", "admin"), async (req, res) => {
	try {
		const { page = 1, limit = 10, status, bloodType } = req.query;

		const filter = { hospital: req.user.id };
		if (status) filter.status = status;
		if (bloodType) filter.bloodType = bloodType;

		const bloodUnits = await Blood.find(filter)
			.sort({ collectionDate: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit);

		const total = await Blood.countDocuments(filter);

		res.json({
			success: true,
			bloodUnits,
			totalPages: Math.ceil(total / limit),
			currentPage: page,
			total,
		});
	} catch (error) {
		console.error("Get blood units error:", error);
		res.status(500).json({
			success: false,
			message: "Lỗi máy chủ khi lấy đơn vị máu",
		});
	}
});

// GET blood inventory summary for hospital
router.get(
	"/hospital/blood/inventory",
	authenticate,
	authorize("hospital", "admin"),
	async (req, res) => {
		try {
			const inventory = await Blood.aggregate([
				{
					$match: {
						hospital: req.user._id,
						status: "available",
						expirationDate: { $gt: new Date() },
					},
				},
				{
					$group: {
						_id: "$bloodType",
						totalQuantity: { $sum: "$quantity" },
						units: { $sum: 1 },
					},
				},
				{ $sort: { _id: 1 } },
			]);

			res.json({
				success: true,
				inventory,
			});
		} catch (error) {
			console.error("Get inventory error:", error);
			res.status(500).json({
				success: false,
				message: "Lỗi máy chủ khi lấy đơn vị máuy",
			});
		}
	},
);

// POST add new blood unit
router.post("/hospital/blood", authenticate, authorize("hospital", "admin"), async (req, res) => {
	try {
		const { bloodType, quantity, collectionDate } = req.body;

		// Validation
		if (!bloodType || !quantity) {
			return res.status(400).json({
				success: false,
				message: "Cần có nhóm máu và số lượng máu cần thiết.",
			});
		}

		if (quantity <= 0) {
			return res.status(400).json({
				success: false,
				message: "Số lượng phải lớn hơn 0",
			});
		}

		const bloodUnit = new Blood({
			bloodType,
			quantity,
			collectionDate: collectionDate || new Date(),
			hospital: req.user.id,
			status: "available",
		});

		await bloodUnit.save();

		res.status(201).json({
			success: true,
			message: "Đã thêm thành công đơn vị máu",
			bloodUnit,
		});
	} catch (error) {
		console.error("Add blood unit error:", error);

		if (error.name === "ValidationError") {
			const messages = Object.values(error.errors).map((val) => val.message);
			return res.status(400).json({
				success: false,
				message: messages.join(", "),
			});
		}

		res.status(500).json({
			success: false,
			message: "Lỗi máy chủ khi thêm đơn vị máu",
		});
	}
});

// PUT update blood unit
router.put(
	"/hospital/blood/:id",
	authenticate,
	authorize("hospital", "admin"),
	async (req, res) => {
		try {
			const { id } = req.params;
			const { bloodType, quantity, status, collectionDate } = req.body;

			const bloodUnit = await Blood.findOne({
				_id: id,
				hospital: req.user.id,
			});

			if (!bloodUnit) {
				return res.status(404).json({
					success: false,
					message: "Không tìm thấy đơn vị máu",
				});
			}

			// Update fields if provided
			if (bloodType) bloodUnit.bloodType = bloodType;
			if (quantity) bloodUnit.quantity = quantity;
			if (status) bloodUnit.status = status;
			if (collectionDate) {
				bloodUnit.collectionDate = collectionDate;
				// Reset expiration date (will be recalculated in pre-save)
				bloodUnit.expirationDate = undefined;
			}

			await bloodUnit.save();

			res.json({
				success: true,
				message: "Cập nhật đơn vị máu thành công",
				bloodUnit,
			});
		} catch (error) {
			console.error("Update blood unit error:", error);

			if (error.name === "ValidationError") {
				const messages = Object.values(error.errors).map((val) => val.message);
				return res.status(400).json({
					success: false,
					message: messages.join(", "),
				});
			}

			res.status(500).json({
				success: false,
				message: "Lỗi máy chủ khi cập nhật đơn vị máu",
			});
		}
	},
);

// DELETE remove blood unit
router.delete(
	"/hospital/blood/:id",
	authenticate,
	authorize("hospital", "admin"),
	async (req, res) => {
		try {
			const { id } = req.params;

			const bloodUnit = await Blood.findOneAndDelete({
				_id: id,
				hospital: req.user.id,
			});

			if (!bloodUnit) {
				return res.status(404).json({
					success: false,
					message: "Không tìm thấy đơn vị máu",
				});
			}

			res.json({
				success: true,
				message: "Đã xóa đơn vị máu thành công",
			});
		} catch (error) {
			console.error("Delete blood unit error:", error);
			res.status(500).json({
				success: false,
				message: "Lỗi máy chủ khi xóa đơn vị máu",
			});
		}
	},
);

// GET expired blood units
router.get(
	"/hospital/blood/expired",
	authenticate,
	authorize("hospital", "admin"),
	async (req, res) => {
		try {
			const expiredBlood = await Blood.find({
				hospital: req.user.id,
				expirationDate: { $lt: new Date() },
			}).sort({ expirationDate: 1 });

			res.json({
				success: true,
				expiredBlood,
				count: expiredBlood.length,
			});
		} catch (error) {
			console.error("Get expired blood error:", error);
			res.status(500).json({
				success: false,
				message: "Lỗi máy chủ khi tải máu đã hết hạn",
			});
		}
	},
);

// PATCH mark blood as used
router.patch(
	"/hospital/blood/:id/use",
	authenticate,
	authorize("hospital", "admin"),
	async (req, res) => {
		try {
			const { id } = req.params;
			const { usedQuantity } = req.body;

			const bloodUnit = await Blood.findOne({
				_id: id,
				hospital: req.user.id,
			});

			if (!bloodUnit) {
				return res.status(404).json({
					success: false,
					message: "Không tìm thấy đơn vị máu",
				});
			}

			if (bloodUnit.status !== "available") {
				return res.status(400).json({
					success: false,
					message: "Chỉ có thể sử dụng máu có sẵn.",
				});
			}

			if (bloodUnit.isExpired) {
				return res.status(400).json({
					success: false,
					message: "Máu đã hết hạn không thể sử dụng được.",
				});
			}

			if (usedQuantity) {
				if (usedQuantity > bloodUnit.quantity) {
					return res.status(400).json({
						success: false,
						message: "Số lượng đã sử dụng không được vượt quá số lượng có sẵn.",
					});
				}

				// Partial usage
				bloodUnit.quantity -= usedQuantity;

				if (bloodUnit.quantity === 0) {
					bloodUnit.status = "used";
				}
			} else {
				// Full usage
				bloodUnit.status = "used";
			}

			await bloodUnit.save();

			res.json({
				success: true,
				message: `Đơn vị máu đã được sử dụng ${usedQuantity ? "một phần" : "toàn bộ"} thành công.`,
				bloodUnit,
			});
		} catch (error) {
			console.error("Use blood error:", error);
			res.status(500).json({
				success: false,
				message: "Lỗi máy chủ khi sử dụng đơn vị máu",
			});
		}
	},
);

export default router;