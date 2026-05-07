import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
	Hospital,
	Mail,
	Phone,
	MapPin,
	RefreshCw,
	CheckCircle,
	XCircle,
	Clock,
	Users,
	Search,
	ChevronDown,
	ChevronUp,
	Tag,
	Briefcase,
	Shield,
	AlertTriangle,
	Building2,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/admin";

function GetAllFacilities() {
	const [facilities, setFacilities] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [filters, setFilters] = useState({
		search: "",
		facilityType: "all",
		status: "all",
		sortBy: "name",
		sortOrder: "asc",
	});

	const token = localStorage.getItem("token");

	// Loại cơ sở y tế và trạng thái để lọc
	const facilityTypes = ["hospital", "blood-lab"];
	const statuses = ["pending", "approved", "rejected"];

	// Nhãn tiếng Việt cho loại cơ sở
	const facilityTypeLabels = {
		hospital: "Bệnh Viện",
		"blood-lab": "Phòng Xét Nghiệm Máu",
	};

	// Nhãn tiếng Việt cho trạng thái
	const statusLabels = {
		pending: "Chờ Duyệt",
		approved: "Đã Phê Duyệt",
		rejected: "Đã Từ Chối",
	};

	// Hàm tải danh sách cơ sở y tế
	const fetchAllFacilities = async (showToast = false) => {
		try {
			if (showToast) setRefreshing(true);
			else setLoading(true);

			console.log("🔄 Đang tải danh sách cơ sở y tế...");

			const res = await fetch(`${API_URL}/facilities`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			console.log("📨 Trạng thái phản hồi:", res.status);

			if (!res.ok) {
				const errorText = await res.text();
				console.error("❌ Lỗi API:", errorText);
				throw new Error(`Không thể tải danh sách cơ sở y tế: ${res.status}`);
			}

			const data = await res.json();
			console.log("✅ Dữ liệu cơ sở y tế:", data);
			setFacilities(data.facilities || []);

			if (showToast) {
				toast.success(`Đã tải ${data.facilities?.length || 0} cơ sở y tế`);
			}
		} catch (error) {
			console.error("🚨 Lỗi tải cơ sở y tế:", error);
			toast.error(error.message || "Không thể tải dữ liệu cơ sở y tế.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchAllFacilities();
	}, []);

	// Lọc và sắp xếp danh sách cơ sở y tế
	const filteredFacilities = facilities
		.filter((facility) => {
			const matchesSearch =
				!filters.search ||
				facility.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				facility.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
				facility.registrationNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
				facility.phone?.includes(filters.search);

			const matchesType =
				filters.facilityType === "all" || facility.facilityType === filters.facilityType;

			const matchesStatus = filters.status === "all" || facility.status === filters.status;

			return matchesSearch && matchesType && matchesStatus;
		})
		.sort((a, b) => {
			let aValue, bValue;

			switch (filters.sortBy) {
				case "name":
					aValue = a.name?.toLowerCase();
					bValue = b.name?.toLowerCase();
					break;
				case "status":
					aValue = a.status?.toLowerCase();
					bValue = b.status?.toLowerCase();
					break;
				case "type":
					aValue = a.facilityType?.toLowerCase();
					bValue = b.facilityType?.toLowerCase();
					break;
				default:
					aValue = a.name?.toLowerCase();
					bValue = b.name?.toLowerCase();
			}

			if (filters.sortOrder === "desc") {
				return aValue < bValue ? 1 : -1;
			}
			return aValue > bValue ? 1 : -1;
		});

	// Hàm hiển thị nhãn trạng thái
	const getStatusBadge = (status) => {
		const statusConfig = {
			approved: {
				color: "bg-green-100 text-green-800 border-green-200",
				icon: <CheckCircle size={12} />,
				label: "Đã Phê Duyệt",
			},
			rejected: {
				color: "bg-red-100 text-red-800 border-red-200",
				icon: <XCircle size={12} />,
				label: "Đã Từ Chối",
			},
			pending: {
				color: "bg-yellow-100 text-yellow-800 border-yellow-200",
				icon: <Clock size={12} />,
				label: "Chờ Xem Xét",
			},
		};

		const config = statusConfig[status] || statusConfig.pending;

		return (
			<span
				className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
				{config.icon}
				{config.label}
			</span>
		);
	};

	const getTypeBadge = (type) => {
		const typeDisplay =
			facilityTypeLabels[type] ||
			type
				.split("-")
				.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
				.join(" ");
		const isHospital = type === "hospital";

		return (
			<span
				className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${
					isHospital
						? "bg-blue-50 text-blue-700 border-blue-200"
						: "bg-purple-50 text-purple-700 border-purple-200"
				}`}>
				<Building2 size={10} />
				{typeDisplay}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Hospital className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-2">Đang Tải Cơ Sở Dữ Liệu Cơ Sở Y Tế</h2>
					<p className="text-gray-500">Đang lấy danh sách tất cả cơ sở y tế đã đăng ký...</p>
				</div>
			</div>
		);
	}

	// Thống kê cho thẻ tóm tắt
	const approvedCount = facilities.filter((f) => f.status === "approved").length;
	const pendingCount = facilities.filter((f) => f.status === "pending").length;
	const rejectedCount = facilities.filter((f) => f.status === "rejected").length;
	const hospitalCount = facilities.filter((f) => f.facilityType === "hospital").length;
	const labCount = facilities.filter((f) => f.facilityType === "blood-lab").length;

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8">
					<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
						<div className="flex items-center gap-4">
							<div className="p-2 bg-red-100 rounded-xl">
								<Hospital className="w-6 h-6 text-red-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-800">Cơ Sở Y Tế</h1>
								<p className="text-gray-600 mt-1">
									Quản lý và xem tất cả cơ sở y tế đã đăng ký trong hệ thống
								</p>
							</div>
						</div>

						<button
							onClick={() => fetchAllFacilities(true)}
							disabled={refreshing}
							className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
							<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
							{refreshing ? "Đang làm mới..." : "Làm Mới Dữ Liệu"}
						</button>
					</div>

					{/* Thẻ thống kê */}
					<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-gray-800">{facilities.length}</div>
								<div className="text-sm text-gray-600">Tổng Cơ Sở Y Tế</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">{approvedCount}</div>
								<div className="text-sm text-gray-600">Đã Phê Duyệt</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
								<div className="text-sm text-gray-600">Đang Chờ Duyệt</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
								<div className="text-sm text-gray-600">Đã Từ Chối</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">
									{hospitalCount}BV {labCount}PXN
								</div>
								<div className="text-sm text-gray-600">Bệnh Viện & Phòng Xét Nghiệm</div>
							</div>
						</div>
					</div>
				</div>

				{/* Bộ lọc */}
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
					<div className="flex flex-col lg:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search
									className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
									size={18}
								/>
								<input
									type="text"
									placeholder="Tìm kiếm cơ sở y tế theo tên, email hoặc mã đăng ký..."
									value={filters.search}
									onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
								/>
							</div>
						</div>

						<select
							value={filters.facilityType}
							onChange={(e) => setFilters((prev) => ({ ...prev, facilityType: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="all">Tất Cả Loại</option>
							{facilityTypes.map((type) => (
								<option key={type} value={type}>
									{facilityTypeLabels[type] || type}
								</option>
							))}
						</select>

						<select
							value={filters.status}
							onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="all">Tất Cả Trạng Thái</option>
							{statuses.map((status) => (
								<option key={status} value={status}>
									{statusLabels[status] || status}
								</option>
							))}
						</select>

						<select
							value={filters.sortBy}
							onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="name">Sắp xếp theo Tên</option>
							<option value="status">Sắp xếp theo Trạng Thái</option>
							<option value="type">Sắp xếp theo Loại</option>
						</select>

						<button
							onClick={() =>
								setFilters((prev) => ({
									...prev,
									sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
								}))
							}
							className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
							{filters.sortOrder === "asc" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
						</button>
					</div>
				</div>

				{/* Thông tin kết quả */}
				<div className="mb-4 flex justify-between items-center">
					<p className="text-gray-600">
						Hiển thị <span className="font-semibold">{filteredFacilities.length}</span> /{" "}
						<span className="font-semibold">{facilities.length}</span> cơ sở y tế
					</p>
					{filters.search && <p className="text-sm text-red-600">Lọc theo: "{filters.search}"</p>}
				</div>

				{/* Cảnh báo cơ sở y tế đang chờ duyệt */}
				{pendingCount > 0 && (
					<div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
						<div className="flex items-center gap-3">
							<AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
							<div>
								<p className="font-semibold text-amber-800">{pendingCount} Cơ Sở Y Tế Đang Chờ Phê Duyệt</p>
								<p className="text-amber-700 text-sm">
									{pendingCount} cơ sở y tế đang chờ xem xét và phê duyệt của quản trị viên
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Lưới cơ sở y tế */}
				{filteredFacilities.length === 0 ? (
					<div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-red-100">
						<Hospital className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							{facilities.length === 0 ? "Không Tìm Thấy Cơ Sở Y Tế" : "Không Có Kết Quả Phù Hợp"}
						</h3>
						<p className="text-gray-600">
							{facilities.length === 0
								? "Cơ sở dữ liệu cơ sở y tế hiện đang trống."
								: "Không có cơ sở y tế nào phù hợp với tiêu chí tìm kiếm hiện tại."}
						</p>
						{filters.search && (
							<button
								onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
								className="mt-4 text-red-600 hover:text-red-700 underline transition-colors">
								Xóa bộ lọc tìm kiếm
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{filteredFacilities.map((facility) => (
							<div
								key={facility._id}
								className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
								{/* Tiêu đề với Tên và Nhãn trạng thái */}
								<div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-bold text-gray-800 line-clamp-1 group-hover:text-red-600 transition-colors">
											{facility.name}
										</h3>
										<p className="text-sm text-gray-500 mt-1 line-clamp-1">{facility.email}</p>
									</div>
									<div className="flex flex-col gap-2 items-end">
										{getStatusBadge(facility.status)}
										{getTypeBadge(facility.facilityType)}
									</div>
								</div>

								{/* Thông tin chi tiết cơ sở y tế */}
								<div className="space-y-3">
									<div className="flex items-center gap-3 text-sm">
										<Tag className="w-4 h-4 text-red-500 flex-shrink-0" />
										<span className="text-gray-700 font-medium">Mã ĐK: {facility.registrationNumber}</span>
									</div>

									<div className="flex items-center gap-3 text-sm">
										<Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
										<span className="text-gray-700">{facility.phone || "Chưa cung cấp"}</span>
									</div>

									<div className="flex items-center gap-3 text-sm">
										<Briefcase className="w-4 h-4 text-red-500 flex-shrink-0" />
										<span className="text-gray-700 capitalize">
											{facility.facilityCategory || "Tổng hợp"}
										</span>
									</div>

									{/* Trạng thái hoạt động */}
									<div className="flex items-center gap-3 text-sm">
										<Clock
											className={`w-4 h-4 flex-shrink-0 ${
												facility.is24x7 ? "text-green-500" : "text-gray-500"
											}`}
										/>
										<span className="text-gray-700 font-medium">
											{facility.is24x7
												? "Phục vụ 24/7"
												: `Giờ làm việc: ${facility.operatingHours?.open || "N/A"} - ${facility.operatingHours?.close || "N/A"}`}
										</span>
									</div>

									{facility.emergencyServices && (
										<div className="flex items-center gap-3 text-sm">
											<Shield className="w-4 h-4 text-red-500 flex-shrink-0" />
											<span className="text-red-600 font-medium">Dịch Vụ Cấp Cứu</span>
										</div>
									)}

									{/* Địa chỉ */}
									<div className="flex items-start gap-3 text-sm pt-2 border-t border-gray-100">
										<MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
										<div className="text-gray-700 line-clamp-2">
											{facility.address?.street && `${facility.address.street}, `}
											{facility.address?.city}, {facility.address?.state}
											{facility.address?.pincode && ` - ${facility.address.pincode}`}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export default GetAllFacilities;
