import React, { useEffect, useState } from "react";
import {
	Calendar,
	Clock,
	MapPin,
	Users,
	Plus,
	Trash2,
	Edit3,
	Search,
	ChevronDown,
	ChevronUp,
	Droplet,
	CheckCircle,
	XCircle,
	MoreVertical,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

const BLOOD_LAB_API_URL = "http://localhost:5000/api/blood-lab";
const bloodLabGet = (path, config) => axios.get(`${BLOOD_LAB_API_URL}${path}`, config);
const bloodLabPost = (path, data, config) => axios.post(`${BLOOD_LAB_API_URL}${path}`, data, config);
const bloodLabPut = (path, data, config) => axios.put(`${BLOOD_LAB_API_URL}${path}`, data, config);
const bloodLabPatch = (path, data, config) => axios.patch(`${BLOOD_LAB_API_URL}${path}`, data, config);
const bloodLabDelete = (path, config) => axios.delete(`${BLOOD_LAB_API_URL}${path}`, config);

const BloodCamps = () => {
	const [camps, setCamps] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingCamp, setEditingCamp] = useState(null);
	const [filters, setFilters] = useState({
		status: "all",
		search: "",
		sortBy: "date",
		sortOrder: "desc",
	});
	const [pagination, setPagination] = useState({
		currentPage: 1,
		totalPages: 1,
		totalCamps: 0,
		hasNext: false,
		hasPrev: false,
	});
	const [stats, setStats] = useState({
		upcoming: 0,
		ongoing: 0,
		completed: 0,
		cancelled: 0,
		total: 0,
	});

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		date: "",
		startTime: "",
		endTime: "",
		venue: "",
		city: "",
		state: "",
		pincode: "",
		expectedDonors: "",
	});

	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [actionMenu, setActionMenu] = useState(null);

	const token = localStorage.getItem("token");

	// Tính toán thống kê từ dữ liệu chiến dịch
	const calculateStats = (campsData) => {
		return {
			upcoming: campsData.filter((camp) => camp.status === "Upcoming").length,
			ongoing: campsData.filter((camp) => camp.status === "Ongoing").length,
			completed: campsData.filter((camp) => camp.status === "Completed").length,
			cancelled: campsData.filter((camp) => camp.status === "Cancelled").length,
			total: campsData.length,
		};
	};

	// Hàm xác thực form
	const validateForm = (data) => {
		const newErrors = {};

		if (!data.title?.trim()) newErrors.title = "Tên chiến dịch là bắt buộc";
		if (!data.date) newErrors.date = "Ngày là bắt buộc";
		if (!data.startTime) newErrors.startTime = "Giờ bắt đầu là bắt buộc";
		if (!data.endTime) newErrors.endTime = "Giờ kết thúc là bắt buộc";
		if (!data.venue?.trim()) newErrors.venue = "Địa điểm là bắt buộc";
		if (!data.city?.trim()) newErrors.city = "Thành phố là bắt buộc";
		if (!data.state?.trim()) newErrors.state = "Tỉnh/Thành là bắt buộc";
		if (!data.pincode?.match(/^[1-9][0-9]{5}$/))
			newErrors.pincode = "Mã bưu chính 6 chữ số hợp lệ là bắt buộc";
		if (!data.expectedDonors || data.expectedDonors < 1)
			newErrors.expectedDonors = "Số người hiến dự kiến phải ít nhất là 1";

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const selectedDate = new Date(data.date);
		if (selectedDate < today) {
			newErrors.date = "Ngày không thể là ngày trong quá khứ";
		}

		if (data.startTime && data.endTime && data.startTime >= data.endTime) {
			newErrors.endTime = "Giờ kết thúc phải sau giờ bắt đầu";
		}

		return newErrors;
	};

	// Tải danh sách chiến dịch hiến máu với bộ lọc
	const fetchCamps = async (page = 1) => {
		try {
			setLoading(true);

			const queryParams = new URLSearchParams({
				status: filters.status,
				page: page.toString(),
				limit: "8",
				sortBy: filters.sortBy,
				sortOrder: filters.sortOrder,
				...(filters.search && { search: filters.search }),
			});

			const res = await bloodLabGet(`/camps?${queryParams}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			const data = res.data;

			if (data.success) {
				const campsData = data.data?.camps || data.camps || [];
				const calculatedStats = calculateStats(campsData);

				setCamps(campsData);
				setPagination(
					data.data?.pagination ||
					data.pagination || {
						currentPage: 1,
						totalPages: 1,
						totalCamps: 0,
						hasNext: false,
						hasPrev: false,
					},
				);
				setStats(calculatedStats);
			} else {
				throw new Error(data.message || "Không thể tải chiến dịch");
			}
		} catch (err) {
			console.error("Lỗi tải chiến dịch:", err);
			toast.error(err.message || "Không thể tải danh sách chiến dịch hiến máu");
			setCamps([]);
			setPagination({ currentPage: 1, totalPages: 1, totalCamps: 0, hasNext: false, hasPrev: false });
			setStats({ upcoming: 0, ongoing: 0, completed: 0, cancelled: 0, total: 0 });
		} finally {
			setLoading(false);
		}
	};

	// Cập nhật trạng thái chiến dịch
	const updateCampStatus = async (campId, newStatus) => {
		try {
			const payload = { status: newStatus };
			const res = await bloodLabPatch(`/camps/${campId}/status`, payload, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			const data = res.data;
			if (data.success) {
				const statusLabels = {
					Upcoming: "Sắp Diễn Ra",
					Ongoing: "Đang Diễn Ra",
					Completed: "Đã Hoàn Thành",
					Cancelled: "Đã Hủy",
				};
				toast.success(`Chiến dịch đã được đánh dấu là ${statusLabels[newStatus] || newStatus}!`);
				setActionMenu(null);
				fetchCamps();
			} else {
				throw new Error(data.message || "Không thể cập nhật trạng thái");
			}
		} catch (err) {
			console.error("Lỗi cập nhật trạng thái:", err);
			toast.error(err.message || "Lỗi khi cập nhật trạng thái chiến dịch");
		}
	};

	useEffect(() => {
		fetchCamps();
	}, [filters]);

	// Đặt lại form
	const resetForm = () => {
		setFormData({
			title: "",
			description: "",
			date: "",
			startTime: "",
			endTime: "",
			venue: "",
			city: "",
			state: "",
			pincode: "",
			expectedDonors: "",
		});
		setErrors({});
		setEditingCamp(null);
	};

	// Xử lý gửi form
	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);

		const formErrors = validateForm(formData);
		if (Object.keys(formErrors).length > 0) {
			setErrors(formErrors);
			setSubmitting(false);
			return;
		}

		try {
			const payload = {
				title: formData.title.trim(),
				description: formData.description.trim(),
				date: formData.date,
				time: {
					start: formData.startTime,
					end: formData.endTime,
				},
				location: {
					venue: formData.venue.trim(),
					city: formData.city.trim(),
					state: formData.state.trim(),
					pincode: formData.pincode,
				},
				expectedDonors: Number(formData.expectedDonors),
			};

			const res = editingCamp
				? await bloodLabPut(`/camps/${editingCamp._id}`, payload, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				})
				: await bloodLabPost("/camps", payload, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				});

			const data = res.data;
			if (data.success) {
				toast.success(
					`Chiến Dịch Hiến Máu ${editingCamp ? "Đã Được Cập Nhật" : "Đã Được Tạo"} Thành Công!`,
				);
				resetForm();
				setShowForm(false);
				fetchCamps();
				return;
			}
			throw new Error(data.message || `Không thể ${editingCamp ? "cập nhật" : "tạo"} chiến dịch`);
		} catch (err) {
			console.error("Lỗi gửi form:", err);
			toast.error(err.message || `Lỗi khi ${editingCamp ? "cập nhật" : "tạo"} chiến dịch`);
		} finally {
			setSubmitting(false);
		}
	};

	// Xử lý chỉnh sửa
	const handleEdit = (camp) => {
		setEditingCamp(camp);
		setFormData({
			title: camp.title,
			description: camp.description || "",
			date: new Date(camp.date).toISOString().split("T")[0],
			startTime: camp.time.start,
			endTime: camp.time.end,
			venue: camp.location.venue,
			city: camp.location.city,
			state: camp.location.state,
			pincode: camp.location.pincode,
			expectedDonors: camp.expectedDonors.toString(),
		});
		setShowForm(true);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// Xử lý xóa
	const handleDeleteCamp = async (id) => {
		if (
			!window.confirm("Bạn có chắc chắn muốn xóa chiến dịch này? Hành động này không thể hoàn tác.")
		)
			return;

		try {
			const res = await bloodLabDelete(`/camps/${id}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			const data = res.data;
			if (data.success) {
				toast.success("Đã xóa chiến dịch thành công!");
				fetchCamps();
				return;
			}
			throw new Error(data.message || "Không thể xóa chiến dịch");
		} catch (err) {
			console.error("Lỗi xóa chiến dịch:", err);
			toast.error(err.message || "Lỗi khi xóa chiến dịch");
		}
	};

	// Xử lý thay đổi input
	const handleInputChange = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: "" }));
		}
	};

	// Component badge trạng thái
	const StatusBadge = ({ status }) => {
		const statusConfig = {
			Upcoming: { color: "bg-blue-100 text-blue-800", label: "Sắp Diễn Ra", icon: Calendar },
			Ongoing: { color: "bg-green-100 text-green-800", label: "Đang Diễn Ra", icon: Clock },
			Completed: { color: "bg-gray-100 text-gray-800", label: "Đã Hoàn Thành", icon: CheckCircle },
			Cancelled: { color: "bg-red-100 text-red-800", label: "Đã Hủy", icon: XCircle },
		};

		const config = statusConfig[status] || statusConfig.Upcoming;
		const IconComponent = config.icon;

		return (
			<span
				className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
				<IconComponent size={12} />
				{config.label}
			</span>
		);
	};

	// Lấy các hành động có thể thực hiện cho một chiến dịch
	const getAvailableActions = (camp) => {
		const baseActions = [];

		switch (camp.status) {
			case "Upcoming":
				baseActions.push(
					{ label: "Đánh Dấu Đang Diễn Ra", value: "Ongoing", color: "text-green-600" },
					{ label: "Hủy Chiến Dịch", value: "Cancelled", color: "text-red-600" },
				);
				break;
			case "Ongoing":
				baseActions.push(
					{ label: "Đánh Dấu Đã Hoàn Thành", value: "Completed", color: "text-gray-600" },
					{ label: "Hủy Chiến Dịch", value: "Cancelled", color: "text-red-600" },
				);
				break;
			case "Completed":
				baseActions.push(
					{ label: "Mở Lại (Đang Diễn Ra)", value: "Ongoing", color: "text-green-600" },
					{ label: "Đánh Dấu Sắp Diễn Ra", value: "Upcoming", color: "text-blue-600" },
				);
				break;
			case "Cancelled":
				baseActions.push(
					{ label: "Lên Lịch Lại (Sắp Diễn Ra)", value: "Upcoming", color: "text-blue-600" },
					{ label: "Đánh Dấu Đang Diễn Ra", value: "Ongoing", color: "text-green-600" },
				);
				break;
			default:
				baseActions.push(
					{ label: "Đánh Dấu Sắp Diễn Ra", value: "Upcoming", color: "text-blue-600" },
					{ label: "Đánh Dấu Đang Diễn Ra", value: "Ongoing", color: "text-green-600" },
					{ label: "Đánh Dấu Đã Hoàn Thành", value: "Completed", color: "text-gray-600" },
					{ label: "Hủy Chiến Dịch", value: "Cancelled", color: "text-red-600" },
				);
		}

		return baseActions;
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				{/* Tiêu đề với thống kê */}
				<div className="mb-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
								<div className="p-2 bg-red-100 rounded-xl">
									<Droplet className="w-6 h-6 text-red-600" />
								</div>
								Chiến Dịch Hiến Máu
							</h1>
							<p className="text-gray-600 mt-1">Quản lý và tổ chức các chiến dịch hiến máu</p>
						</div>
						<button
							onClick={() => {
								resetForm();
								setShowForm(!showForm);
							}}
							className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors">
							<Plus size={18} className="mr-2" />
							{showForm ? "Hủy" : "Thêm Chiến Dịch"}
						</button>
					</div>

					{/* Thẻ thống kê */}
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-gray-800">{stats.total}</div>
							<div className="text-sm text-gray-600">Tổng Chiến Dịch</div>
						</div>
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-blue-400">
							<div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
							<div className="text-sm text-gray-600">Sắp Diễn Ra</div>
						</div>
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-green-400">
							<div className="text-2xl font-bold text-green-600">{stats.ongoing}</div>
							<div className="text-sm text-gray-600">Đang Diễn Ra</div>
						</div>
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-gray-400">
							<div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
							<div className="text-sm text-gray-600">Đã Hoàn Thành</div>
						</div>
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
							<div className="text-sm text-gray-600">Đã Hủy</div>
						</div>
					</div>
				</div>

				{/* Bộ lọc */}
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search
									className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
									size={18}
								/>
								<input
									type="text"
									placeholder="Tìm kiếm chiến dịch..."
									value={filters.search}
									onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
								/>
							</div>
						</div>
						<select
							value={filters.status}
							onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="all">Tất Cả Trạng Thái</option>
							<option value="Upcoming">Sắp Diễn Ra</option>
							<option value="Ongoing">Đang Diễn Ra</option>
							<option value="Completed">Đã Hoàn Thành</option>
							<option value="Cancelled">Đã Hủy</option>
						</select>
						<select
							value={filters.sortBy}
							onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="date">Sắp Xếp Theo Ngày</option>
							<option value="title">Sắp Xếp Theo Tên</option>
							<option value="expectedDonors">Sắp Xếp Theo Người Hiến</option>
						</select>
						<button
							onClick={() =>
								setFilters((prev) => ({
									...prev,
									sortOrder: prev.sortOrder === "desc" ? "asc" : "desc",
								}))
							}
							className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
							{filters.sortOrder === "desc" ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
						</button>
					</div>
				</div>

				{/* Form thêm/chỉnh sửa */}
				{showForm && (
					<form
						onSubmit={handleSubmit}
						className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-8">
						<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<Droplet className="w-5 h-5 text-red-600" />
							{editingCamp ? "Chỉnh Sửa Chiến Dịch Hiến Máu" : "Thêm Chiến Dịch Mới"}
						</h2>

						<div className="grid md:grid-cols-2 gap-4">
							{/* Tên chiến dịch */}
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Tên Chiến Dịch *</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) => handleInputChange("title", e.target.value)}
									className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.title ? "border-red-500" : ""
										}`}
									placeholder="Nhập tên chiến dịch"
								/>
								{errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
							</div>

							{/* Ngày */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Ngày *</label>
								<input
									type="date"
									value={formData.date}
									onChange={(e) => handleInputChange("date", e.target.value)}
									className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.date ? "border-red-500" : ""
										}`}
								/>
								{errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
							</div>

							{/* Giờ */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Giờ Bắt Đầu *</label>
									<input
										type="time"
										value={formData.startTime}
										onChange={(e) => handleInputChange("startTime", e.target.value)}
										className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.startTime ? "border-red-500" : ""
											}`}
									/>
									{errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Giờ Kết Thúc *</label>
									<input
										type="time"
										value={formData.endTime}
										onChange={(e) => handleInputChange("endTime", e.target.value)}
										className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.endTime ? "border-red-500" : ""
											}`}
									/>
									{errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>}
								</div>
							</div>

							{/* Địa điểm */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Địa Điểm *</label>
								<input
									type="text"
									value={formData.venue}
									onChange={(e) => handleInputChange("venue", e.target.value)}
									className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.venue ? "border-red-500" : ""
										}`}
									placeholder="Nhập tên địa điểm"
								/>
								{errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Thành Phố *</label>
								<input
									type="text"
									value={formData.city}
									onChange={(e) => handleInputChange("city", e.target.value)}
									className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.city ? "border-red-500" : ""
										}`}
									placeholder="Nhập thành phố"
								/>
								{errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành *</label>
								<input
									type="text"
									value={formData.state}
									onChange={(e) => handleInputChange("state", e.target.value)}
									className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.state ? "border-red-500" : ""
										}`}
									placeholder="Nhập tỉnh/thành"
								/>
								{errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Mã Bưu Chính *</label>
								<input
									type="text"
									value={formData.pincode}
									onChange={(e) => handleInputChange("pincode", e.target.value)}
									className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.pincode ? "border-red-500" : ""
										}`}
									placeholder="Mã bưu chính 6 chữ số"
									maxLength={6}
								/>
								{errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
							</div>

							{/* Số người hiến dự kiến */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Số Người Hiến Dự Kiến *
								</label>
								<input
									type="number"
									min="1"
									value={formData.expectedDonors}
									onChange={(e) => handleInputChange("expectedDonors", e.target.value)}
									className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.expectedDonors ? "border-red-500" : ""
										}`}
									placeholder="Số lượng người hiến dự kiến"
								/>
								{errors.expectedDonors && (
									<p className="text-red-500 text-sm mt-1">{errors.expectedDonors}</p>
								)}
							</div>

							{/* Mô tả */}
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Mô Tả</label>
								<textarea
									value={formData.description}
									onChange={(e) => handleInputChange("description", e.target.value)}
									rows={3}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
									placeholder="Nhập mô tả chiến dịch (tùy chọn)"
								/>
							</div>
						</div>

						{/* Nút thao tác form */}
						<div className="flex gap-3 mt-6">
							<button
								type="submit"
								disabled={submitting}
								className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-2 rounded-lg transition-colors">
								{submitting ? "Đang lưu..." : editingCamp ? "Cập Nhật Chiến Dịch" : "Tạo Chiến Dịch"}
							</button>
							<button
								type="button"
								onClick={() => {
									setShowForm(false);
									resetForm();
								}}
								className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors">
								Hủy
							</button>
						</div>
					</form>
				)}

				{/* Danh sách chiến dịch */}
				{loading ? (
					<div className="flex justify-center items-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
						<span className="ml-3 text-gray-600">Đang tải chiến dịch...</span>
					</div>
				) : camps.length === 0 ? (
					<div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-red-100">
						<div className="text-gray-400 mb-4">
							<Droplet size={48} className="mx-auto" />
						</div>
						<h3 className="text-lg font-medium text-gray-800 mb-2">Không tìm thấy chiến dịch hiến máu</h3>
						<p className="text-gray-600 mb-4">
							{filters.status !== "all" || filters.search
								? "Thử thay đổi bộ lọc của bạn"
								: "Bắt đầu bằng cách tạo chiến dịch hiến máu đầu tiên"}
						</p>
						{!filters.search && filters.status === "all" && (
							<button
								onClick={() => setShowForm(true)}
								className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
								Tạo Chiến Dịch Đầu Tiên
							</button>
						)}
					</div>
				) : (
					<>
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
							{camps.map((camp) => {
								const availableActions = getAvailableActions(camp);

								return (
									<div
										key={camp._id}
										className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 hover:shadow-xl transition-all duration-300">
										<div className="flex justify-between items-start mb-3">
											<h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{camp.title}</h3>
											<div className="flex gap-1">
												<button
													onClick={() => handleEdit(camp)}
													className="text-red-600 hover:text-red-700 p-1 transition-colors"
													title="Chỉnh sửa chiến dịch">
													<Edit3 size={16} />
												</button>
												{availableActions.length > 0 && (
													<div className="relative">
														<button
															onClick={() => setActionMenu(actionMenu === camp._id ? null : camp._id)}
															className="text-gray-600 hover:text-gray-700 p-1 transition-colors"
															title="Thêm thao tác">
															<MoreVertical size={16} />
														</button>
														{actionMenu === camp._id && (
															<div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-48">
																{availableActions.map((action) => (
																	<button
																		key={action.value}
																		onClick={() => updateCampStatus(camp._id, action.value)}
																		className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${action.color}`}>
																		{action.label}
																	</button>
																))}
															</div>
														)}
													</div>
												)}
												<button
													onClick={() => handleDeleteCamp(camp._id)}
													className="text-red-500 hover:text-red-600 p-1 transition-colors"
													title="Xóa chiến dịch">
													<Trash2 size={16} />
												</button>
											</div>
										</div>

										<div className="flex justify-between items-center mb-4">
											<StatusBadge status={camp.status} />
											<span className="text-sm text-gray-500">
												{new Date(camp.date).toLocaleDateString("vi-VN")}
											</span>
										</div>

										{camp.description && (
											<p className="text-sm text-gray-600 mb-4 line-clamp-2">{camp.description}</p>
										)}

										<div className="space-y-2 text-sm text-gray-600">
											<div className="flex items-center">
												<Clock size={16} className="mr-2 text-red-500 shrink-0" />
												<span>
													{camp.time.start} - {camp.time.end}
												</span>
											</div>
											<div className="flex items-start">
												<MapPin size={16} className="mr-2 text-red-500 shrink-0 mt-0.5" />
												<span className="line-clamp-2">
													{camp.location.venue}, {camp.location.city}, {camp.location.state} -{" "}
													{camp.location.pincode}
												</span>
											</div>
											<div className="flex items-center">
												<Users size={16} className="mr-2 text-red-500 shrink-0" />
												<span>Dự kiến: {camp.expectedDonors} người hiến</span>
											</div>
											{camp.actualDonors > 0 && (
												<div className="flex items-center text-green-600">
													<Users size={16} className="mr-2 shrink-0" />
													<span>Thực tế: {camp.actualDonors} người hiến</span>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>

						{/* Phân trang */}
						{pagination.totalPages > 1 && (
							<div className="flex justify-center items-center gap-4">
								<button
									onClick={() => fetchCamps(pagination.currentPage - 1)}
									disabled={!pagination.hasPrev}
									className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">
									Trước
								</button>
								<span className="text-sm text-gray-600">
									Trang {pagination.currentPage} / {pagination.totalPages}
								</span>
								<button
									onClick={() => fetchCamps(pagination.currentPage + 1)}
									disabled={!pagination.hasNext}
									className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">
									Tiếp
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default BloodCamps;
