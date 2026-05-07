import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
	User,
	Heart,
	Calendar,
	Phone,
	Mail,
	MapPin,
	RefreshCw,
	CheckCircle,
	XCircle,
	Clock,
	Droplet,
	Weight,
	Users,
	Filter,
	Search,
	ChevronDown,
	ChevronUp,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/admin";

function GetAllDonors() {
	const [donors, setDonors] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [filters, setFilters] = useState({
		search: "",
		bloodGroup: "all",
		eligibility: "all",
		sortBy: "name",
		sortOrder: "asc",
	});

	const token = localStorage.getItem("token");

	// Các nhóm máu để lọc
	const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

	// Hàm tải danh sách người hiến máu
	const fetchAllDonors = async (showToast = false) => {
		try {
			if (showToast) setRefreshing(true);
			else setLoading(true);

			console.log("🔄 Đang tải danh sách người hiến máu...");

			const res = await fetch(`${API_URL}/donors`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			console.log("📨 Trạng thái phản hồi:", res.status);

			if (!res.ok) {
				const errorText = await res.text();
				console.error("❌ Lỗi API:", errorText);
				throw new Error(`Không thể tải danh sách người hiến máu: ${res.status}`);
			}

			const data = await res.json();
			console.log("✅ Dữ liệu người hiến máu:", data);
			setDonors(data.donors || []);

			if (showToast) {
				toast.success(`Đã tải ${data.donors?.length || 0} người hiến máu`);
			}
		} catch (error) {
			console.error("🚨 Lỗi tải người hiến máu:", error);
			toast.error(error.message || "Không thể tải dữ liệu người hiến máu.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchAllDonors();
	}, []);

	// Lọc và sắp xếp danh sách người hiến máu
	const filteredDonors = donors
		.filter((donor) => {
			const matchesSearch =
				!filters.search ||
				donor.fullName?.toLowerCase().includes(filters.search.toLowerCase()) ||
				donor.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
				donor.phone?.includes(filters.search);

			const matchesBloodGroup =
				filters.bloodGroup === "all" || donor.bloodGroup === filters.bloodGroup;

			const matchesEligibility =
				filters.eligibility === "all" ||
				(filters.eligibility === "eligible" && donor.eligibleToDonate) ||
				(filters.eligibility === "ineligible" && !donor.eligibleToDonate);

			return matchesSearch && matchesBloodGroup && matchesEligibility;
		})
		.sort((a, b) => {
			let aValue, bValue;

			switch (filters.sortBy) {
				case "name":
					aValue = a.fullName?.toLowerCase();
					bValue = b.fullName?.toLowerCase();
					break;
				case "donations":
					aValue = a.donationHistory?.length || 0;
					bValue = b.donationHistory?.length || 0;
					break;
				case "age":
					aValue = a.age || 0;
					bValue = b.age || 0;
					break;
				default:
					aValue = a.fullName?.toLowerCase();
					bValue = b.fullName?.toLowerCase();
			}

			if (filters.sortOrder === "desc") {
				return aValue < bValue ? 1 : -1;
			}
			return aValue > bValue ? 1 : -1;
		});

	// Hàm hiển thị trạng thái đủ điều kiện hiến máu (dùng trường eligibleToDonate)
	const getEligibilityBadge = (isEligible) => {
		if (isEligible === undefined) {
			return (
				<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
					<Clock size={12} /> Chưa rõ
				</span>
			);
		}
		return (
			<span
				className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
					isEligible
						? "bg-green-100 text-green-800 border-green-200"
						: "bg-red-100 text-red-800 border-red-200"
				}`}>
				{isEligible ? <CheckCircle size={12} /> : <XCircle size={12} />}
				{isEligible ? "Đủ điều kiện" : "Không đủ điều kiện"}
			</span>
		);
	};

	const getBloodGroupBadge = (bloodGroup) => {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
				<Droplet size={10} />
				{bloodGroup}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Users className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-2">
						Đang Tải Cơ Sở Dữ Liệu Người Hiến Máu
					</h2>
					<p className="text-gray-500">Đang lấy danh sách tất cả người hiến máu đã đăng ký...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8">
					<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
						<div className="flex items-center gap-4">
							<div className="p-2 bg-red-100 rounded-xl">
								<Users className="w-6 h-6 text-red-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-800">Người Hiến Máu</h1>
								<p className="text-gray-600 mt-1">
									Quản lý và xem tất cả người hiến máu đã đăng ký trong hệ thống
								</p>
							</div>
						</div>

						<button
							onClick={() => fetchAllDonors(true)}
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
								<div className="text-2xl font-bold text-gray-800">{donors.length}</div>
								<div className="text-sm text-gray-600">Tổng Người Hiến Máu</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">
									{donors.filter((d) => d.eligibleToDonate).length}
								</div>
								<div className="text-sm text-gray-600">Đủ Điều Kiện</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-red-600">
									{donors.filter((d) => !d.eligibleToDonate).length}
								</div>
								<div className="text-sm text-gray-600">Không Đủ Điều Kiện</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">
									{donors.reduce((sum, donor) => sum + (donor.donationHistory?.length || 0), 0)}
								</div>
								<div className="text-sm text-gray-600">Tổng Lần Hiến Máu</div>
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
									placeholder="Tìm kiếm người hiến máu theo tên, email hoặc số điện thoại..."
									value={filters.search}
									onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
								/>
							</div>
						</div>

						<select
							value={filters.bloodGroup}
							onChange={(e) => setFilters((prev) => ({ ...prev, bloodGroup: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="all">Tất Cả Nhóm Máu</option>
							{bloodGroups.map((group) => (
								<option key={group} value={group}>
									{group}
								</option>
							))}
						</select>

						<select
							value={filters.eligibility}
							onChange={(e) => setFilters((prev) => ({ ...prev, eligibility: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="all">Tất Cả Trạng Thái</option>
							<option value="eligible">Chỉ Đủ Điều Kiện</option>
							<option value="ineligible">Chỉ Không Đủ Điều Kiện</option>
						</select>

						<select
							value={filters.sortBy}
							onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
							<option value="name">Sắp xếp theo Tên</option>
							<option value="donations">Sắp xếp theo Số lần hiến</option>
							<option value="age">Sắp xếp theo Tuổi</option>
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
						Hiển thị {filteredDonors.length} / {donors.length} người hiến máu
					</p>
					{filters.search && <p className="text-sm text-red-600">Lọc theo: "{filters.search}"</p>}
				</div>

				{/* Lưới người hiến máu */}
				{filteredDonors.length === 0 ? (
					<div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-red-100">
						<User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							{donors.length === 0 ? "Không Tìm Thấy Người Hiến Máu" : "Không Có Kết Quả Phù Hợp"}
						</h3>
						<p className="text-gray-600">
							{donors.length === 0
								? "Cơ sở dữ liệu người hiến máu hiện đang trống."
								: "Không có người hiến máu nào phù hợp với bộ lọc hiện tại."}
						</p>
						{filters.search && (
							<button
								onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
								className="mt-4 text-red-600 hover:text-red-700 underline">
								Xóa tìm kiếm
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{filteredDonors.map((donor) => (
							<div
								key={donor._id}
								className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
								{/* Tiêu đề với Tên và Nhãn trạng thái */}
								<div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-bold text-gray-800 line-clamp-1 group-hover:text-red-600 transition-colors">
											{donor.fullName}
										</h3>
										<p className="text-sm text-gray-500 mt-1">{donor.email}</p>
									</div>
									<div className="flex flex-col gap-2 items-end">
										{getEligibilityBadge(donor.eligibleToDonate)}
										{getBloodGroupBadge(donor.bloodGroup)}
									</div>
								</div>

								{/* Thông tin chi tiết người hiến máu */}
								<div className="space-y-3">
									<div className="flex items-center gap-3 text-sm">
										<Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
										<span className="text-gray-700">{donor.phone || "Chưa cung cấp"}</span>
									</div>

									<div className="flex items-center gap-3 text-sm">
										<Calendar className="w-4 h-4 text-red-500 flex-shrink-0" />
										<span className="text-gray-700">{donor.age} tuổi</span>
									</div>

									<div className="flex items-center gap-3 text-sm">
										<Weight className="w-4 h-4 text-red-500 flex-shrink-0" />
										<span className="text-gray-700">{donor.weight || "N/A"} kg</span>
									</div>

									<div className="flex items-center gap-3 text-sm">
										<Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
										<span className="text-gray-700">{donor.donationHistory?.length || 0} lần hiến máu</span>
									</div>

									{/* Địa chỉ */}
									<div className="flex items-start gap-3 text-sm pt-2 border-t border-gray-100">
										<MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
										<div className="text-gray-700 line-clamp-2">
											{donor.address?.street && `${donor.address.street}, `}
											{donor.address?.city}, {donor.address?.state}
											{donor.address?.pincode && ` - ${donor.address.pincode}`}
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

export default GetAllDonors;
