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
	Users,
	Search,
	ChevronDown,
	ChevronUp,
	X,
	Eye,
	Activity,
	Weight,
	Info,
	FileText,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/admin";

function GetAllDonors() {
	const [donors, setDonors] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedDonor, setSelectedDonor] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [filters, setFilters] = useState({
		search: "",
		bloodGroup: "all",
		eligibility: "all",
		sortBy: "name",
		sortOrder: "asc",
	});

	const token = localStorage.getItem("token");
	const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

	const fetchAllDonors = async (showToast = false) => {
		try {
			if (showToast) setRefreshing(true);
			else setLoading(true);

			const res = await fetch(`${API_URL}/donors`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Lỗi ${res.status}`);
			const data = await res.json();
			setDonors(data.donors || []);
			if (showToast) toast.success(`Đã tải ${data.donors?.length || 0} người hiến máu`);
		} catch (error) {
			toast.error(error.message || "Không thể tải dữ liệu người hiến máu.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const fetchDonorDetail = async (donorId) => {
		setDetailLoading(true);
		try {
			const res = await fetch(`${API_URL}/donor/${donorId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Không thể tải chi tiết người hiến máu");
			const data = await res.json();
			setSelectedDonor(data.donor);
		} catch (error) {
			toast.error(error.message);
		} finally {
			setDetailLoading(false);
		}
	};

	useEffect(() => { fetchAllDonors(); }, []);

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
			let aVal, bVal;
			if (filters.sortBy === "donations") {
				aVal = a.donationHistory?.length || 0;
				bVal = b.donationHistory?.length || 0;
			} else if (filters.sortBy === "age") {
				aVal = a.age || 0;
				bVal = b.age || 0;
			} else {
				aVal = a.fullName?.toLowerCase() || "";
				bVal = b.fullName?.toLowerCase() || "";
			}
			if (filters.sortOrder === "desc") return aVal < bVal ? 1 : -1;
			return aVal > bVal ? 1 : -1;
		});

	const getEligibilityBadge = (isEligible) => {
		if (isEligible === undefined)
			return (
				<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
					<Clock size={11} /> Chưa rõ
				</span>
			);
		return (
			<span
				className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
					isEligible
						? "bg-green-100 text-green-800 border-green-200"
						: "bg-red-100 text-red-800 border-red-200"
				}`}>
				{isEligible ? <CheckCircle size={11} /> : <XCircle size={11} />}
				{isEligible ? "Đủ điều kiện" : "Chưa đủ điều kiện"}
			</span>
		);
	};

	const getBloodGroupBadge = (bloodGroup) => (
		<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
			<Droplet size={10} />
			{bloodGroup || "N/A"}
		</span>
	);

	const formatDate = (dateStr) =>
		dateStr ? new Date(dateStr).toLocaleDateString("vi-VN") : "—";

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Users className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-2">Đang tải danh sách người hiến máu...</h2>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-red-100 rounded-xl">
							<Users className="w-6 h-6 text-red-600" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-800">Người Hiến Máu</h1>
							<p className="text-gray-500 text-sm mt-0.5">Quản lý tất cả người hiến máu đã đăng ký</p>
						</div>
					</div>
					<button
						onClick={() => fetchAllDonors(true)}
						disabled={refreshing}
						className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
						<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
						{refreshing ? "Đang làm mới..." : "Làm mới"}
					</button>
				</div>

				{/* Thẻ thống kê */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					{[
						{ label: "Tổng người hiến", value: donors.length, color: "text-gray-800" },
						{ label: "Đủ điều kiện", value: donors.filter((d) => d.eligibleToDonate).length, color: "text-green-600" },
						{ label: "Chưa đủ điều kiện", value: donors.filter((d) => !d.eligibleToDonate).length, color: "text-red-600" },
						{ label: "Tổng lần hiến", value: donors.reduce((s, d) => s + (d.donationHistory?.length || 0), 0), color: "text-blue-600" },
					].map((stat) => (
						<div key={stat.label} className="bg-white rounded-xl border border-red-100 shadow p-4 text-center">
							<div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
							<div className="text-sm text-gray-500 mt-1">{stat.label}</div>
						</div>
					))}
				</div>

				{/* Bộ lọc */}
				<div className="bg-white rounded-2xl shadow border border-red-100 p-4 mb-5">
					<div className="flex flex-col lg:flex-row gap-3">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
							<input
								type="text"
								placeholder="Tìm theo tên, email, số điện thoại..."
								value={filters.search}
								onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
								className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm"
							/>
						</div>
						<select
							value={filters.bloodGroup}
							onChange={(e) => setFilters((p) => ({ ...p, bloodGroup: e.target.value }))}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400">
							<option value="all">Tất cả nhóm máu</option>
							{bloodGroups.map((g) => <option key={g} value={g}>{g}</option>)}
						</select>
						<select
							value={filters.eligibility}
							onChange={(e) => setFilters((p) => ({ ...p, eligibility: e.target.value }))}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400">
							<option value="all">Tất cả trạng thái</option>
							<option value="eligible">Đủ điều kiện</option>
							<option value="ineligible">Chưa đủ điều kiện</option>
						</select>
						<select
							value={filters.sortBy}
							onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400">
							<option value="name">Sắp xếp: Tên</option>
							<option value="donations">Sắp xếp: Số lần hiến</option>
							<option value="age">Sắp xếp: Tuổi</option>
						</select>
						<button
							onClick={() => setFilters((p) => ({ ...p, sortOrder: p.sortOrder === "asc" ? "desc" : "asc" }))}
							className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
							{filters.sortOrder === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
						</button>
					</div>
				</div>

				<p className="text-sm text-gray-500 mb-4">
					Hiển thị <span className="font-semibold text-gray-700">{filteredDonors.length}</span> / {donors.length} người hiến máu
				</p>

				{/* Danh sách donor */}
				{filteredDonors.length === 0 ? (
					<div className="text-center py-16 bg-white rounded-2xl shadow border border-red-100">
						<User className="w-14 h-14 text-gray-300 mx-auto mb-3" />
						<h3 className="text-lg font-semibold text-gray-700">Không có kết quả phù hợp</h3>
						{filters.search && (
							<button onClick={() => setFilters((p) => ({ ...p, search: "" }))} className="mt-3 text-red-600 hover:underline text-sm">
								Xóa tìm kiếm
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
						{filteredDonors.map((donor) => (
							<div
								key={donor._id}
								className="bg-white rounded-2xl shadow border border-red-100 p-5 hover:shadow-lg hover:border-red-300 transition-all duration-200 group">
								<div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
									<div className="flex-1 min-w-0 pr-2">
										<h3 className="font-bold text-gray-800 truncate group-hover:text-red-600 transition-colors">
											{donor.fullName}
										</h3>
										<p className="text-xs text-gray-500 truncate mt-0.5">{donor.email}</p>
									</div>
									<div className="flex flex-col gap-1 items-end shrink-0">
										{getEligibilityBadge(donor.eligibleToDonate)}
										{getBloodGroupBadge(donor.bloodGroup)}
									</div>
								</div>
								<div className="space-y-2 text-sm text-gray-600 mb-4">
									<div className="flex items-center gap-2">
										<Phone size={13} className="text-red-400 shrink-0" />
										<span>{donor.phone || "Chưa có"}</span>
									</div>
									<div className="flex items-center gap-2">
										<Calendar size={13} className="text-red-400 shrink-0" />
										<span>{donor.age} tuổi • {donor.gender === "Male" ? "Nam" : "Nữ"}</span>
									</div>
									<div className="flex items-center gap-2">
										<Heart size={13} className="text-red-400 shrink-0" />
										<span>{donor.donationHistory?.length || 0} lần hiến máu</span>
									</div>
									<div className="flex items-start gap-2">
										<MapPin size={13} className="text-red-400 shrink-0 mt-0.5" />
										<span className="line-clamp-1">{donor.address?.city || donor.address?.state || "Chưa có địa chỉ"}</span>
									</div>
								</div>
								<button
									onClick={() => fetchDonorDetail(donor._id)}
									className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-colors text-sm font-medium border border-red-200 hover:border-red-600">
									<Eye size={14} />
									Xem chi tiết
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Modal chi tiết donor */}
			{(selectedDonor || detailLoading) && (
				<div
					className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
					onClick={(e) => e.target === e.currentTarget && setSelectedDonor(null)}>
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
						{detailLoading ? (
							<div className="flex items-center justify-center py-20">
								<RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
							</div>
						) : (
							<>
								{/* Header modal */}
								<div className="flex items-center justify-between p-6 border-b border-gray-100">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-red-100 rounded-xl">
											<User className="w-5 h-5 text-red-600" />
										</div>
										<div>
											<h2 className="text-xl font-bold text-gray-800">{selectedDonor.fullName}</h2>
											<p className="text-sm text-gray-500">{selectedDonor.email}</p>
										</div>
									</div>
									<button
										onClick={() => setSelectedDonor(null)}
										className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
										<X size={20} className="text-gray-500" />
									</button>
								</div>

								<div className="p-6 space-y-6">
									{/* Badges trạng thái */}
									<div className="flex gap-2 flex-wrap">
										{getBloodGroupBadge(selectedDonor.bloodGroup)}
										{getEligibilityBadge(selectedDonor.eligibleToDonate)}
										{selectedDonor.gender && (
											<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
												{selectedDonor.gender === "Male" ? "Nam" : "Nữ"}
											</span>
										)}
									</div>

									{/* Thông tin cá nhân */}
									<div>
										<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
											<Info size={14} /> Thông tin cá nhân
										</h3>
										<div className="grid grid-cols-2 gap-4">
											<InfoRow icon={<Phone size={14} />} label="Điện thoại" value={selectedDonor.phone} />
											<InfoRow icon={<Calendar size={14} />} label="Tuổi" value={`${selectedDonor.age} tuổi`} />
											<InfoRow icon={<Weight size={14} />} label="Cân nặng" value={selectedDonor.weight ? `${selectedDonor.weight} kg` : "—"} />
											<InfoRow icon={<Activity size={14} />} label="Ngày hiến gần nhất" value={formatDate(selectedDonor.lastDonationDate)} />
										</div>
										<div className="mt-3">
											<InfoRow
												icon={<MapPin size={14} />}
												label="Địa chỉ"
												value={[
													selectedDonor.address?.street,
													selectedDonor.address?.ward,
													selectedDonor.address?.city,
													selectedDonor.address?.state,
												].filter(Boolean).join(", ") || "Chưa có"}
											/>
										</div>
									</div>

									{/* Lịch sử hiến máu */}
									<div>
										<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
											<FileText size={14} /> Lịch sử hiến máu
											<span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
												{selectedDonor.donationHistory?.length || 0}
											</span>
										</h3>
										{!selectedDonor.donationHistory || selectedDonor.donationHistory.length === 0 ? (
											<div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
												<Heart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
												<p className="text-sm text-gray-500">Chưa có lần hiến máu nào</p>
											</div>
										) : (
											<div className="space-y-2 max-h-60 overflow-y-auto pr-1">
												{selectedDonor.donationHistory.map((item, idx) => (
													<div
														key={idx}
														className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
														<div className="flex items-center gap-2">
															<div className="w-6 h-6 bg-red-200 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
																{selectedDonor.donationHistory.length - idx}
															</div>
															<div>
																<p className="text-sm font-medium text-gray-800">
																	{formatDate(item.date || item.donatedAt)}
																</p>
																{item.facility && (
																	<p className="text-xs text-gray-500">{item.facility}</p>
																)}
															</div>
														</div>
														<div className="text-right">
															{item.units && (
																<p className="text-xs font-semibold text-red-700">{item.units} đơn vị</p>
															)}
															{item.bloodGroup && getBloodGroupBadge(item.bloodGroup)}
														</div>
													</div>
												))}
											</div>
										)}
									</div>

									{/* Kết quả xét nghiệm gần nhất */}
									{selectedDonor.testResults && selectedDonor.testResults.length > 0 && (
										<div>
											<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
												<Activity size={14} /> Kết quả xét nghiệm
											</h3>
											<div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
												{Object.entries(selectedDonor.testResults[selectedDonor.testResults.length - 1])
													.filter(([k]) => k !== "_id")
													.map(([key, val]) => (
														<div key={key} className="flex justify-between text-sm py-1 border-b border-blue-100 last:border-0">
															<span className="text-gray-600 capitalize">{key}</span>
															<span className={`font-medium ${val === "Negative" || val === "Normal" ? "text-green-600" : "text-red-600"}`}>
																{val}
															</span>
														</div>
													))}
											</div>
										</div>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function InfoRow({ icon, label, value }) {
	return (
		<div className="flex items-start gap-2">
			<span className="text-red-400 mt-0.5 shrink-0">{icon}</span>
			<div>
				<p className="text-xs text-gray-400">{label}</p>
				<p className="text-sm font-medium text-gray-800">{value || "—"}</p>
			</div>
		</div>
	);
}

export default GetAllDonors;
