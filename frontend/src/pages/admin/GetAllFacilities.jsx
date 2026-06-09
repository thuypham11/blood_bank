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
	Search,
	ChevronDown,
	ChevronUp,
	Shield,
	AlertTriangle,
	Building2,
	X,
	Eye,
	Tag,
	Briefcase,
	FileText,
	Download,
	Info,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/admin";

function GetAllFacilities() {
	const [facilities, setFacilities] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedFacility, setSelectedFacility] = useState(null);
	const [rejectionReason, setRejectionReason] = useState("");
	const [actionLoading, setActionLoading] = useState(false);
	const [filters, setFilters] = useState({
		search: "",
		facilityType: "all",
		status: "all",
		sortBy: "name",
		sortOrder: "asc",
	});

	// CRUD States
	const [showFormModal, setShowFormModal] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		name: "", email: "", phone: "", facilityType: "hospital",
		registrationNumber: "", facilityCategory: "General", password: ""
	});

	const token = localStorage.getItem("token");

	const facilityTypeLabels = { hospital: "Bệnh Viện", "blood-lab": "Trung Tâm Máu" };
	const statusLabels = { pending: "Chờ Duyệt", approved: "Đã Phê Duyệt", rejected: "Đã Từ Chối" };

	const fetchAllFacilities = async (showToast = false) => {
		try {
			if (showToast) setRefreshing(true);
			else setLoading(true);
			const res = await fetch(`${API_URL}/facilities`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Lỗi ${res.status}`);
			const data = await res.json();
			setFacilities(data.facilities || []);
			if (showToast) toast.success(`Đã tải ${data.facilities?.length || 0} cơ sở y tế`);
		} catch (error) {
			toast.error(error.message || "Không thể tải dữ liệu cơ sở y tế.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const handleApprove = async (facilityId) => {
		setActionLoading(true);
		try {
			const res = await fetch(`${API_URL}/facility/approve/${facilityId}`, {
				method: "PUT",
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Phê duyệt thất bại");
			toast.success("Phê duyệt cơ sở y tế thành công!");
			setFacilities((prev) => prev.map((f) => (f._id === facilityId ? { ...f, status: "approved" } : f)));
			setSelectedFacility((prev) => prev ? { ...prev, status: "approved" } : null);
		} catch (error) {
			toast.error(error.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleReject = async (facilityId) => {
		if (!rejectionReason.trim()) {
			toast.error("Vui lòng nhập lý do từ chối");
			return;
		}
		setActionLoading(true);
		try {
			const res = await fetch(`${API_URL}/facility/reject/${facilityId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ rejectionReason }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Từ chối thất bại");
			toast.success("Đã từ chối cơ sở y tế");
			setFacilities((prev) => prev.map((f) => (f._id === facilityId ? { ...f, status: "rejected", rejectionReason } : f)));
			setSelectedFacility((prev) => prev ? { ...prev, status: "rejected", rejectionReason } : null);
			setRejectionReason("");
		} catch (error) {
			toast.error(error.message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Bạn có chắc chắn muốn xóa cơ sở y tế này?")) return;
		try {
			const res = await fetch(`${API_URL}/facility/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!res.ok) throw new Error("Xóa thất bại (Chỉ Superadmin mới có quyền)");
			toast.success("Đã xóa thành công");
			fetchAllFacilities();
		} catch (err) {
			toast.error(err.message);
		}
	};

	const handleSubmitForm = async (e) => {
		e.preventDefault();
		try {
			const url = isEditing ? `${API_URL}/facility/${formData._id}` : `${API_URL}/facilities`;
			const method = isEditing ? "PUT" : "POST";
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify(formData)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Lỗi lưu dữ liệu");
			toast.success(isEditing ? "Cập nhật thành công" : "Thêm mới thành công");
			setShowFormModal(false);
			fetchAllFacilities();
		} catch (err) {
			toast.error(err.message);
		}
	};

	const openAddForm = () => {
		setIsEditing(false);
		setFormData({ name: "", email: "", phone: "", facilityType: "hospital", registrationNumber: "", facilityCategory: "General", password: "" });
		setShowFormModal(true);
	};

	const openEditForm = (facility) => {
		setIsEditing(true);
		setFormData({ ...facility, password: "" });
		setShowFormModal(true);
	};

	useEffect(() => { fetchAllFacilities(); }, []);

	const filteredFacilities = facilities
		.filter((f) => {
			const matchesSearch =
				!filters.search ||
				f.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				f.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
				f.registrationNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
				f.phone?.includes(filters.search);
			const matchesType = filters.facilityType === "all" || f.facilityType === filters.facilityType;
			const matchesStatus = filters.status === "all" || f.status === filters.status;
			return matchesSearch && matchesType && matchesStatus;
		})
		.sort((a, b) => {
			let aVal = "", bVal = "";
			if (filters.sortBy === "status") { aVal = a.status; bVal = b.status; }
			else if (filters.sortBy === "type") { aVal = a.facilityType; bVal = b.facilityType; }
			else { aVal = a.name?.toLowerCase() || ""; bVal = b.name?.toLowerCase() || ""; }
			if (filters.sortOrder === "desc") return aVal < bVal ? 1 : -1;
			return aVal > bVal ? 1 : -1;
		});

	const getStatusBadge = (status) => {
		const cfg = {
			approved: { cls: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle size={11} />, label: "Đã Phê Duyệt" },
			rejected: { cls: "bg-red-100 text-red-800 border-red-200", icon: <XCircle size={11} />, label: "Đã Từ Chối" },
			pending: { cls: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock size={11} />, label: "Chờ Duyệt" },
		};
		const c = cfg[status] || cfg.pending;
		return (
			<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${c.cls}`}>
				{c.icon} {c.label}
			</span>
		);
	};

	const getTypeBadge = (type) => {
		const isHospital = type === "hospital";
		return (
			<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${
				isHospital ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
			}`}>
				<Building2 size={10} />
				{facilityTypeLabels[type] || type}
			</span>
		);
	};

	const approvedCount = facilities.filter((f) => f.status === "approved").length;
	const pendingCount = facilities.filter((f) => f.status === "pending").length;
	const rejectedCount = facilities.filter((f) => f.status === "rejected").length;

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Hospital className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700">Đang tải danh sách cơ sở y tế...</h2>
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
							<Hospital className="w-6 h-6 text-red-600" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-800">Cơ Sở Y Tế</h1>
							<p className="text-gray-500 text-sm mt-0.5">Quản lý tất cả cơ sở y tế đã đăng ký</p>
						</div>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => fetchAllFacilities(true)}
							disabled={refreshing}
							className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
							<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
							{refreshing ? "Đang làm mới..." : "Làm mới"}
						</button>
						<button
							onClick={openAddForm}
							className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition-colors">
							<span>+ Thêm mới</span>
						</button>
					</div>
				</div>

				{/* Thẻ thống kê */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					{[
						{ label: "Tổng cơ sở", value: facilities.length, color: "text-gray-800" },
						{ label: "Đã phê duyệt", value: approvedCount, color: "text-green-600" },
						{ label: "Chờ duyệt", value: pendingCount, color: "text-yellow-600" },
						{ label: "Đã từ chối", value: rejectedCount, color: "text-red-600" },
					].map((stat) => (
						<div key={stat.label} className="bg-white rounded-xl border border-red-100 shadow p-4 text-center">
							<div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
							<div className="text-sm text-gray-500 mt-1">{stat.label}</div>
						</div>
					))}
				</div>

				{/* Cảnh báo pending */}
				{pendingCount > 0 && (
					<div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
						<AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
						<div>
							<p className="font-semibold text-amber-800">{pendingCount} cơ sở đang chờ phê duyệt</p>
							<p className="text-amber-700 text-sm">Nhấn "Xem chi tiết" để xem xét và phê duyệt</p>
						</div>
					</div>
				)}

				{/* Bộ lọc */}
				<div className="bg-white rounded-2xl shadow border border-red-100 p-4 mb-5">
					<div className="flex flex-col lg:flex-row gap-3">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
							<input
								type="text"
								placeholder="Tìm theo tên, email, mã đăng ký..."
								value={filters.search}
								onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
								className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400"
							/>
						</div>
						<select
							value={filters.facilityType}
							onChange={(e) => setFilters((p) => ({ ...p, facilityType: e.target.value }))}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400">
							<option value="all">Tất cả loại</option>
							<option value="hospital">Bệnh Viện</option>
							<option value="blood-lab">Trung Tâm Máu</option>
						</select>
						<select
							value={filters.status}
							onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400">
							<option value="all">Tất cả trạng thái</option>
							{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
						</select>
						<select
							value={filters.sortBy}
							onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400">
							<option value="name">Sắp xếp: Tên</option>
							<option value="status">Sắp xếp: Trạng thái</option>
							<option value="type">Sắp xếp: Loại</option>
						</select>
						<button
							onClick={() => setFilters((p) => ({ ...p, sortOrder: p.sortOrder === "asc" ? "desc" : "asc" }))}
							className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
							{filters.sortOrder === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
						</button>
					</div>
				</div>

				<p className="text-sm text-gray-500 mb-4">
					Hiển thị <span className="font-semibold text-gray-700">{filteredFacilities.length}</span> / {facilities.length} cơ sở y tế
				</p>

				{/* Danh sách cơ sở */}
				{filteredFacilities.length === 0 ? (
					<div className="text-center py-16 bg-white rounded-2xl shadow border border-red-100">
						<Hospital className="w-14 h-14 text-gray-300 mx-auto mb-3" />
						<h3 className="text-lg font-semibold text-gray-700">Không có kết quả phù hợp</h3>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
						{filteredFacilities.map((facility) => (
							<div
								key={facility._id}
								className="bg-white rounded-2xl shadow border border-red-100 p-5 hover:shadow-lg hover:border-red-300 transition-all duration-200 group">
								<div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
									<div className="flex-1 min-w-0 pr-2">
										<h3 className="font-bold text-gray-800 truncate group-hover:text-red-600 transition-colors">
											{facility.name}
										</h3>
										<p className="text-xs text-gray-500 truncate mt-0.5">{facility.email}</p>
									</div>
									<div className="flex flex-col gap-1 items-end shrink-0">
										{getStatusBadge(facility.status)}
										{getTypeBadge(facility.facilityType)}
									</div>
								</div>
								<div className="space-y-2 text-sm text-gray-600 mb-4">
									<div className="flex items-center gap-2">
										<Tag size={13} className="text-red-400 shrink-0" />
										<span className="truncate">Mã ĐK: {facility.registrationNumber || "—"}</span>
									</div>
									<div className="flex items-center gap-2">
										<Phone size={13} className="text-red-400 shrink-0" />
										<span>{facility.phone || "Chưa có"}</span>
									</div>
									<div className="flex items-center gap-2">
										<Briefcase size={13} className="text-red-400 shrink-0" />
										<span className="capitalize">{facility.facilityCategory || "Tổng hợp"}</span>
									</div>
									<div className="flex items-start gap-2">
										<MapPin size={13} className="text-red-400 shrink-0 mt-0.5" />
										<span className="line-clamp-1">{facility.address?.city || facility.address?.state || "—"}</span>
									</div>
								</div>
								<div className="flex gap-2 mt-4">
									<button
										onClick={() => openEditForm(facility)}
										className="w-1/2 flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium border border-gray-200">
										Sửa
									</button>
									<button
										onClick={() => { setSelectedFacility(facility); setRejectionReason(""); }}
										className="w-1/2 flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-colors text-sm font-medium border border-red-200 hover:border-red-600">
										<Eye size={14} />
										Chi tiết
									</button>
									<button
										onClick={() => handleDelete(facility._id)}
										className="px-3 flex items-center justify-center py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100" title="Xóa">
										<X size={14} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Modal chi tiết cơ sở y tế */}
			{selectedFacility && (
				<div
					className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
					onClick={(e) => e.target === e.currentTarget && setSelectedFacility(null)}>
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-red-100 rounded-xl">
									<Hospital className="w-5 h-5 text-red-600" />
								</div>
								<div>
									<h2 className="text-xl font-bold text-gray-800">{selectedFacility.name}</h2>
									<p className="text-sm text-gray-500">{selectedFacility.email}</p>
								</div>
							</div>
							<button onClick={() => setSelectedFacility(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={20} className="text-gray-500" />
							</button>
						</div>

						<div className="p-6 space-y-5">
							{/* Badges */}
							<div className="flex gap-2 flex-wrap">
								{getStatusBadge(selectedFacility.status)}
								{getTypeBadge(selectedFacility.facilityType)}
								{selectedFacility.emergencyServices && (
									<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
										<Shield size={11} /> Dịch vụ cấp cứu
									</span>
								)}
							</div>

							{/* Thông tin cơ sở */}
							<div>
								<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
									<Info size={13} /> Thông tin cơ sở
								</h3>
								<div className="grid grid-cols-2 gap-3">
									<InfoRow icon={<Tag size={13} />} label="Mã đăng ký" value={selectedFacility.registrationNumber} />
									<InfoRow icon={<Phone size={13} />} label="Điện thoại" value={selectedFacility.phone} />
									<InfoRow icon={<Phone size={13} />} label="Liên hệ khẩn cấp" value={selectedFacility.emergencyContact} />
									<InfoRow icon={<Briefcase size={13} />} label="Danh mục" value={selectedFacility.facilityCategory || "Tổng hợp"} />
								</div>
								{selectedFacility.operatingHours && (
									<div className="mt-3">
										<InfoRow
											icon={<Clock size={13} />}
											label="Giờ làm việc"
											value={
												selectedFacility.is24x7
													? "24/7"
													: `${selectedFacility.operatingHours.open || "?"} - ${selectedFacility.operatingHours.close || "?"}`
											}
										/>
									</div>
								)}
								<div className="mt-3">
									<InfoRow
										icon={<MapPin size={13} />}
										label="Địa chỉ"
										value={[
											selectedFacility.address?.street,
											selectedFacility.address?.ward,
											selectedFacility.address?.city,
											selectedFacility.address?.state,
										].filter(Boolean).join(", ") || "Chưa có"}
									/>
								</div>
								<div className="mt-3">
									<InfoRow
										icon={<Mail size={13} />}
										label="Ngày đăng ký"
										value={new Date(selectedFacility.createdAt).toLocaleDateString("vi-VN")}
									/>
								</div>
							</div>

							{/* Lý do từ chối (nếu có) */}
							{selectedFacility.status === "rejected" && selectedFacility.rejectionReason && (
								<div className="p-3 bg-red-50 rounded-lg border border-red-200">
									<p className="text-xs font-semibold text-red-700 mb-1">Lý do từ chối:</p>
									<p className="text-sm text-red-800">{selectedFacility.rejectionReason}</p>
								</div>
							)}

							{/* Tài liệu đăng ký */}
							{selectedFacility.documents?.registrationProof && (
								<div>
									<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
										<FileText size={13} /> Tài liệu đăng ký
									</h3>
									<div className="flex gap-2">
										<a
											href={selectedFacility.documents.registrationProof.url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-200">
											<Eye size={13} /> Xem
										</a>
										<a
											href={selectedFacility.documents.registrationProof.url}
											download
											className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200">
											<Download size={13} /> Tải xuống
										</a>
									</div>
								</div>
							)}

							{/* Hành động duyệt/từ chối — chỉ hiện với trạng thái pending */}
							{selectedFacility.status === "pending" && (
								<div className="border-t border-gray-100 pt-5 space-y-3">
									<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
										Hành động xét duyệt
									</h3>
									<button
										onClick={() => handleApprove(selectedFacility._id)}
										disabled={actionLoading}
										className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 font-semibold">
										{actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle size={18} />}
										{actionLoading ? "Đang xử lý..." : "Phê Duyệt"}
									</button>
									<div className="space-y-2">
										<textarea
											value={rejectionReason}
											onChange={(e) => setRejectionReason(e.target.value)}
											placeholder="Nhập lý do từ chối (bắt buộc)..."
											className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-red-400 resize-none text-sm"
											rows={3}
										/>
										<button
											onClick={() => handleReject(selectedFacility._id)}
											disabled={actionLoading || !rejectionReason.trim()}
											className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 font-semibold">
											{actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle size={18} />}
											{actionLoading ? "Đang xử lý..." : "Từ Chối"}
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Modal Thêm/Sửa CSYT */}
			{showFormModal && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-4 border-b pb-2">
							<h3 className="text-xl font-bold">{isEditing ? "Sửa cơ sở y tế" : "Thêm cơ sở y tế"}</h3>
							<button onClick={() => setShowFormModal(false)}><X className="text-gray-500" /></button>
						</div>
						<form onSubmit={handleSubmitForm} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2">
									<label className="block text-sm font-medium mb-1">Tên cơ sở *</label>
									<input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded" />
								</div>
								<div className="col-span-2">
									<label className="block text-sm font-medium mb-1">Email *</label>
									<input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded" />
								</div>
								{!isEditing && (
									<div className="col-span-2">
										<label className="block text-sm font-medium mb-1">Mật khẩu</label>
										<input type="text" placeholder="Mặc định: 123456" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border p-2 rounded" />
									</div>
								)}
								<div>
									<label className="block text-sm font-medium mb-1">Điện thoại *</label>
									<input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border p-2 rounded" />
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Mã đăng ký</label>
									<input type="text" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} className="w-full border p-2 rounded" />
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Loại hình</label>
									<select value={formData.facilityType} onChange={e => setFormData({...formData, facilityType: e.target.value})} className="w-full border p-2 rounded">
										<option value="hospital">Bệnh viện</option>
										<option value="blood-lab">Trung tâm máu</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Chuyên khoa</label>
									<input type="text" value={formData.facilityCategory} onChange={e => setFormData({...formData, facilityCategory: e.target.value})} className="w-full border p-2 rounded" placeholder="VD: Đa khoa, Sản nhi..." />
								</div>
							</div>
							<div className="flex justify-end gap-2 mt-6">
								<button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Hủy</button>
								<button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Lưu</button>
							</div>
						</form>
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
				<p className="text-sm font-medium text-gray-800 break-words">{value || "—"}</p>
			</div>
		</div>
	);
}

export default GetAllFacilities;
