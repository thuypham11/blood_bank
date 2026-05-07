import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import {
	Loader2,
	Save,
	Edit3,
	X,
	MapPin,
	Mail,
	FlaskConical,
	Phone,
	User,
	Shield,
	Heart,
	Droplet,
	Clock,
	Tag,
	Building,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const defaultOperatingHours = {
	weekdays: "",
	weekends: "",
	notes: "",
};

const LabProfile = () => {
	const [facility, setFacility] = useState(null);
	const [formData, setFormData] = useState({
		name: "",
		phone: "",
		emergencyContact: "",
		facilityCategory: "",
		address: {
			street: "",
			city: "",
			state: "",
			pincode: "",
		},
		contactPerson: "",
		operatingHours: defaultOperatingHours,
	});
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState({});

	const initializeOperatingHours = (hoursData) => {
		if (hoursData && typeof hoursData === "object" && !Array.isArray(hoursData)) {
			return {
				weekdays: hoursData.weekdays || "",
				weekends: hoursData.weekends || "",
				notes: hoursData.notes || "",
			};
		}
		return defaultOperatingHours;
	};

	const validateField = (name, value) => {
		const newErrors = { ...errors };
		const path = name.includes(".") ? name : name;

		switch (path) {
			case "phone":
			case "emergencyContact":
				if (value && !/^\d{10}$/.test(value)) {
					newErrors[path] = "Phải là số điện thoại hợp lệ 10 chữ số";
				} else {
					delete newErrors[path];
				}
				break;
			case "address.pincode":
				if (value && !/^\d{6}$/.test(value)) {
					newErrors["address.pincode"] = "Phải là mã bưu chính hợp lệ 6 chữ số";
				} else {
					delete newErrors["address.pincode"];
				}
				break;
			default:
				break;
		}

		if (value === "" && !["phone", "emergencyContact", "address.pincode"].includes(path)) {
			delete newErrors[path];
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const fetchProfile = useCallback(async () => {
		try {
			setLoading(true);
			const token = localStorage.getItem("token");
			if (!token) {
				throw new Error("Không tìm thấy token xác thực.");
			}

			const { data } = await axios.get(`${API_BASE_URL}/facility/profile`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (data.success) {
				setFacility(data.facility);
				setFormData({
					name: data.facility.name || "",
					phone: data.facility.phone || "",
					emergencyContact: data.facility.emergencyContact || "",
					facilityCategory: data.facility.facilityCategory || "",
					address: {
						street: data.facility.address?.street || "",
						city: data.facility.address?.city || "",
						state: data.facility.address?.state || "",
						pincode: data.facility.address?.pincode || "",
					},
					contactPerson: data.facility.contactPerson || "",
					operatingHours: initializeOperatingHours(data.facility.operatingHours),
				});
			} else {
				throw new Error(data.message);
			}
		} catch (error) {
			console.error("❌ Lỗi tải hồ sơ:", error);
			let message;

			if (error.message.includes("Không tìm thấy token") || error.response?.status === 401) {
				message = "Phiên đăng nhập hết hạn hoặc không được phép. Vui lòng đăng nhập lại.";
				localStorage.removeItem("token");
				setFacility(null);
				toast.error(message);
				return;
			}

			message = error.response?.data?.message || "Không thể tải hồ sơ";
			toast.error(message);
			setFacility(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	const handleChange = (e) => {
		const { name, value } = e.target;

		if (name.startsWith("address.")) {
			const key = name.split(".")[1];
			setFormData((prev) => {
				const updatedData = {
					...prev,
					address: { ...prev.address, [key]: value },
				};
				validateField(name, value);
				return updatedData;
			});
		} else if (name.startsWith("operatingHours.")) {
			const key = name.split(".")[1];
			setFormData((prev) => ({
				...prev,
				operatingHours: { ...prev.operatingHours, [key]: value },
			}));
		} else {
			setFormData((prev) => {
				const updatedData = { ...prev, [name]: value };
				validateField(name, value);
				return updatedData;
			});
		}
	};

	const handleSave = async () => {
		const currentErrors = Object.values(errors).filter((e) => e).length > 0;

		if (currentErrors) {
			toast.error("Vui lòng sửa các lỗi xác thực trước khi lưu");
			return;
		}

		const payload = formData;

		try {
			setSaving(true);
			const token = localStorage.getItem("token");
			if (!token) {
				toast.error("Yêu cầu xác thực để lưu thay đổi.");
				setSaving(false);
				return;
			}

			const { data } = await axios.put(`${API_BASE_URL}/facility/profile`, payload, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (data.success) {
				toast.success("Đã cập nhật hồ sơ thành công!");
				setFacility(data.facility);
				setIsEditing(false);
				setErrors({});
			} else {
				throw new Error(data.message);
			}
		} catch (error) {
			console.error("❌ Lỗi cập nhật hồ sơ:", error);
			let message = error.response?.data?.message || "Cập nhật thất bại";
			toast.error(message);

			if (error.response?.data?.errors) {
				setErrors(error.response.data.errors);
			}
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		setErrors({});
		if (facility) {
			setFormData({
				name: facility.name || "",
				phone: facility.phone || "",
				emergencyContact: facility.emergencyContact || "",
				facilityCategory: facility.facilityCategory || "",
				address: {
					street: facility.address?.street || "",
					city: facility.address?.city || "",
					state: facility.address?.state || "",
					pincode: facility.address?.pincode || "",
				},
				contactPerson: facility.contactPerson || "",
				operatingHours: initializeOperatingHours(facility.operatingHours),
			});
		}
	};

	if (loading && !facility) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Droplet className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-2">Đang Tải Hồ Sơ Phòng Xét Nghiệm</h2>
					<p className="text-gray-500">Đang chuẩn bị thông tin cơ sở...</p>
				</div>
			</div>
		);
	}

	if (!facility) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center bg-white rounded-2xl shadow-lg border border-red-100 p-8">
					<Droplet className="w-16 h-16 text-red-500 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-800 mb-2">Lỗi Hồ Sơ Cơ Sở</h3>
					<p className="text-gray-600 mb-4">Không thể tải hồ sơ. Vui lòng đảm bảo bạn đã đăng nhập.</p>
					<button
						onClick={fetchProfile}
						className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
						Thử Lại
					</button>
				</div>
			</div>
		);
	}

	const hasErrors = Object.keys(errors).length > 0;

	const addressFieldLabels = {
		street: "Địa Chỉ",
		city: "Thành Phố",
		state: "Tỉnh/Thành",
		pincode: "Mã Bưu Chính",
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<Toaster />
			<div className="max-w-6xl mx-auto">
				{/* Tiêu đề */}
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
					<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-red-100 rounded-xl">
								<Droplet className="w-8 h-8 text-red-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-800">
									{facility.name || "Hồ Sơ Phòng Xét Nghiệm"}
								</h1>
								<p className="text-gray-600 mt-1 flex items-center gap-2">
									<FlaskConical size={16} className="text-red-500" />
									{facility.facilityCategory?.toUpperCase() || "PHÒNG XÉT NGHIỆM MÁU"} •
									<span className="font-mono text-sm">{facility.registrationNumber}</span>
								</p>
							</div>
						</div>

						<div className="flex gap-3">
							{isEditing ? (
								<>
									<button
										onClick={handleCancel}
										className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-300">
										<X size={18} /> Hủy
									</button>
									<button
										onClick={handleSave}
										disabled={saving || hasErrors}
										className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition-colors">
										{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
										Lưu Thay Đổi
									</button>
								</>
							) : (
								<button
									onClick={() => setIsEditing(true)}
									className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
									<Edit3 size={18} /> Chỉnh Sửa Hồ Sơ
								</button>
							)}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Thanh bên trái - Trạng thái xác minh và liên hệ nhanh */}
					<div className="lg:col-span-1 space-y-6">
						{/* Thẻ trạng thái */}
						<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
							<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Shield className="w-5 h-5 text-red-600" />
								Trạng Thái Xác Minh
							</h3>
							<div className="space-y-4">
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">Trạng Thái</span>
									<span
										className={`px-3 py-1 rounded-full text-xs font-bold ${
											facility.status === "approved"
												? "bg-green-100 text-green-700"
												: facility.status === "pending"
													? "bg-yellow-100 text-yellow-700"
													: "bg-red-100 text-red-700"
										}`}>
										{facility.status === "approved"
											? "Đã Duyệt"
											: facility.status === "pending"
												? "Chờ Duyệt"
												: facility.status === "rejected"
													? "Từ Chối"
													: facility.status?.charAt(0).toUpperCase() + facility.status?.slice(1)}
									</span>
								</div>

								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">Danh Mục</span>
									<span className="text-sm font-medium text-gray-800">
										{facility.facilityCategory || "Chưa xác định"}
									</span>
								</div>

								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">Số Đăng Ký</span>
									<span className="text-sm font-mono text-gray-800">{facility.registrationNumber}</span>
								</div>

								{facility.approvedAt && (
									<div className="flex justify-between items-center">
										<span className="text-sm text-gray-600">Ngày Duyệt</span>
										<span className="text-sm text-gray-800">
											{new Date(facility.approvedAt).toLocaleDateString("vi-VN")}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Thông tin liên hệ nhanh */}
						<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
							<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Heart className="w-5 h-5 text-red-600" />
								Liên Hệ Nhanh
							</h3>
							<div className="space-y-3">
								<div className="flex items-center gap-3 text-sm">
									<Mail className="w-4 h-4 text-red-500" />
									<span className="text-gray-600">{facility.email}</span>
								</div>
								{facility.phone && (
									<div className="flex items-center gap-3 text-sm">
										<Phone className="w-4 h-4 text-red-500" />
										<span className="text-gray-600">{facility.phone}</span>
									</div>
								)}
								{facility.emergencyContact && (
									<div className="flex items-center gap-3 text-sm">
										<Phone className="w-4 h-4 text-red-500" />
										<span className="text-gray-600">Khẩn cấp: {facility.emergencyContact}</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Nội dung chính - Form chỉnh sửa */}
					<div className="lg:col-span-2">
						<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
							{/* Thông tin chung (Tên, Danh mục) */}
							<div className="mb-8">
								<h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<Building className="w-5 h-5 text-red-600" />
									Hồ Sơ Cơ Sở
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">Tên Cơ Sở</label>
										<input
											type="text"
											name="name"
											value={formData.name}
											onChange={handleChange}
											disabled={!isEditing}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											}`}
											placeholder="Vd: Trung Tâm Xét Nghiệm Trung Ương"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">Danh Mục Cơ Sở</label>
										<input
											type="text"
											name="facilityCategory"
											value={formData.facilityCategory}
											onChange={handleChange}
											disabled={!isEditing}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											}`}
											placeholder="Vd: Phòng Xét Nghiệm Máu, Trung Tâm Chẩn Đoán"
										/>
									</div>
								</div>
							</div>

							{/* Thông tin liên hệ */}
							<div className="mb-8">
								<h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<User className="w-5 h-5 text-red-600" />
									Thông Tin Liên Hệ
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">Số Điện Thoại</label>
										<input
											type="tel"
											name="phone"
											value={formData.phone}
											onChange={handleChange}
											disabled={!isEditing}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											} ${errors.phone ? "border-red-500" : ""}`}
											placeholder="Số điện thoại 10 chữ số"
										/>
										{errors.phone && <p className="text-red-500 text-xs mt-2">{errors.phone}</p>}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">Liên Hệ Khẩn Cấp</label>
										<input
											type="tel"
											name="emergencyContact"
											value={formData.emergencyContact}
											onChange={handleChange}
											disabled={!isEditing}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											} ${errors.emergencyContact ? "border-red-500" : ""}`}
											placeholder="Số liên hệ khẩn cấp"
										/>
										{errors.emergencyContact && (
											<p className="text-red-500 text-xs mt-2">{errors.emergencyContact}</p>
										)}
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 mb-2">Người Liên Hệ</label>
										<input
											type="text"
											name="contactPerson"
											value={formData.contactPerson}
											onChange={handleChange}
											disabled={!isEditing}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											}`}
											placeholder="Tên người liên hệ chính"
										/>
									</div>
								</div>
							</div>

							{/* Địa chỉ */}
							<div className="mb-8">
								<h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<MapPin className="w-5 h-5 text-red-600" />
									Địa Chỉ Cơ Sở
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{["street", "city", "state", "pincode"].map((field) => (
										<div key={field} className={field === "street" ? "md:col-span-2" : ""}>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												{addressFieldLabels[field]}
											</label>
											<input
												type={field === "pincode" ? "number" : "text"}
												name={`address.${field}`}
												value={formData.address?.[field] || ""}
												onChange={handleChange}
												disabled={!isEditing}
												className={`w-full px-4 py-3 rounded-xl border ${
													isEditing
														? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
														: "bg-gray-50 border-gray-200"
												} ${field === "pincode" && errors["address.pincode"] ? "border-red-500" : ""}`}
												placeholder={`Nhập ${addressFieldLabels[field].toLowerCase()}`}
											/>
											{field === "pincode" && errors["address.pincode"] && (
												<p className="text-red-500 text-xs mt-2">{errors["address.pincode"]}</p>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Giờ hoạt động */}
							<div className="mb-8">
								<h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<Clock className="w-5 h-5 text-red-600" />
									Giờ Hoạt Động
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Ngày Trong Tuần (Vd: Thứ 2 - Thứ 6)
										</label>
										<input
											type="text"
											name="operatingHours.weekdays"
											value={formData.operatingHours.weekdays}
											onChange={handleChange}
											disabled={!isEditing}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											}`}
											placeholder="Vd: 8:00 SA đến 17:00 CH"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Cuối Tuần (Vd: Thứ 7 - CN)
										</label>
										<input
											type="text"
											name="operatingHours.weekends"
											value={formData.operatingHours.weekends}
											onChange={handleChange}
											disabled={!isEditing}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											}`}
											placeholder="Vd: 8:00 SA đến 12:00 TT hoặc Đóng cửa"
										/>
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Ghi Chú Thêm (Vd: Dịch vụ khẩn cấp)
										</label>
										<textarea
											name="operatingHours.notes"
											value={formData.operatingHours.notes}
											onChange={handleChange}
											disabled={!isEditing}
											rows={2}
											className={`w-full px-4 py-3 rounded-xl border ${
												isEditing
													? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
													: "bg-gray-50 border-gray-200"
											}`}
											placeholder="Vd: Dịch vụ khẩn cấp hoạt động 24/7."
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LabProfile;
