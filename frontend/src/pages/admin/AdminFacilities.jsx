import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
	Building,
	MapPin,
	Phone,
	Mail,
	Calendar,
	FileText,
	CheckCircle,
	XCircle,
	Clock,
	Shield,
	Download,
	Eye,
	RefreshCw,
	AlertCircle,
} from "lucide-react";

const FacilityApproval = () => {
	const [facilities, setFacilities] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedFacility, setSelectedFacility] = useState(null);
	const [rejectionReason, setRejectionReason] = useState("");
	const [actionLoading, setActionLoading] = useState(null);
	const [refreshing, setRefreshing] = useState(false);

	const token = localStorage.getItem("token");
	const API_URL = "http://localhost:5000/api/admin";

	// Tải danh sách cơ sở y tế đang chờ duyệt
	const fetchPendingFacilities = async (showToast = false) => {
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

			// Chỉ hiển thị các cơ sở y tế đang chờ phê duyệt
			const pendingFacilities = data.facilities?.filter((f) => f.status === "pending") || [];
			setFacilities(pendingFacilities);

			if (showToast) {
				toast.success(`Tìm thấy ${pendingFacilities.length} cơ sở y tế đang chờ duyệt`);
			}
		} catch (error) {
			console.error("🚨 Lỗi tải cơ sở y tế:", error);
			toast.error("Không thể tải danh sách cơ sở y tế. Vui lòng kiểm tra kết nối.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchPendingFacilities();
	}, []);

	const handleApprove = async (facilityId) => {
		if (!facilityId) {
			toast.error("ID cơ sở y tế không hợp lệ");
			return;
		}

		setActionLoading(facilityId);
		console.log("✅ Đang phê duyệt cơ sở y tế:", facilityId);

		try {
			const res = await fetch(`${API_URL}/facility/approve/${facilityId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			const data = await res.json();
			console.log("📨 Phản hồi phê duyệt:", data);

			if (res.ok && data.message) {
				toast.success("Phê duyệt cơ sở y tế thành công!");
				// Xóa cơ sở y tế đã được phê duyệt khỏi danh sách
				setFacilities((prev) => prev.filter((f) => f._id !== facilityId));
				setSelectedFacility(null);
			} else {
				throw new Error(data.message || "Phê duyệt thất bại");
			}
		} catch (error) {
			console.error("🚨 Lỗi phê duyệt:", error);
			toast.error(error.message || "Lỗi khi phê duyệt cơ sở y tế");
		} finally {
			setActionLoading(null);
		}
	};

	const handleReject = async (facilityId) => {
		if (!facilityId) {
			toast.error("ID cơ sở y tế không hợp lệ");
			return;
		}

		if (!rejectionReason.trim()) {
			toast.error("Vui lòng cung cấp lý do từ chối");
			return;
		}

		setActionLoading(facilityId);
		console.log("❌ Đang từ chối cơ sở y tế:", facilityId, "Lý do:", rejectionReason);

		try {
			const res = await fetch(`${API_URL}/facility/reject/${facilityId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ rejectionReason }),
			});

			const data = await res.json();
			console.log("📨 Phản hồi từ chối:", data);

			if (res.ok && data.message) {
				toast.success("Từ chối cơ sở y tế thành công!");
				// Xóa cơ sở y tế đã bị từ chối khỏi danh sách
				setFacilities((prev) => prev.filter((f) => f._id !== facilityId));
				setSelectedFacility(null);
				setRejectionReason("");
			} else {
				throw new Error(data.message || "Từ chối thất bại");
			}
		} catch (error) {
			console.error("🚨 Lỗi từ chối:", error);
			toast.error(error.message || "Lỗi khi từ chối cơ sở y tế");
		} finally {
			setActionLoading(null);
		}
	};

	const handleViewDocument = (documentUrl, filename = "tài liệu") => {
		if (!documentUrl) {
			toast.error("Tài liệu không khả dụng");
			return;
		}

		console.log("📄 Đang mở tài liệu:", documentUrl);
		window.open(documentUrl, "_blank", "noopener,noreferrer");
	};

	const handleDownloadDocument = (documentUrl, filename = "tài liệu") => {
		if (!documentUrl) {
			toast.error("Tài liệu không khả dụng để tải xuống");
			return;
		}

		console.log("💾 Đang tải xuống tài liệu:", documentUrl);
		const link = document.createElement("a");
		link.href = documentUrl;
		link.download = filename;
		link.target = "_blank";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const getStatusBadge = (status) => {
		const statusConfig = {
			pending: {
				color: "bg-yellow-100 text-yellow-800 border-yellow-200",
				icon: Clock,
				label: "Chờ Xem Xét",
			},
			approved: {
				color: "bg-green-100 text-green-800 border-green-200",
				icon: CheckCircle,
				label: "Đã Phê Duyệt",
			},
			rejected: {
				color: "bg-red-100 text-red-800 border-red-200",
				icon: XCircle,
				label: "Đã Từ Chối",
			},
		};

		const config = statusConfig[status] || statusConfig.pending;
		const Icon = config.icon;

		return (
			<span
				className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
				<Icon size={12} />
				{config.label}
			</span>
		);
	};

	const getFacilityTypeBadge = (type) => {
		const isHospital = type === "Hospital";
		const typeLabel = isHospital ? "Bệnh Viện" : type || "Cơ Sở Y Tế";
		return (
			<span
				className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
					isHospital
						? "bg-blue-100 text-blue-800 border-blue-200"
						: "bg-purple-100 text-purple-800 border-purple-200"
				}`}>
				<Building size={12} />
				{typeLabel}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Shield className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-2">
						Đang Tải Danh Sách Phê Duyệt Cơ Sở Y Tế
					</h2>
					<p className="text-gray-500">Đang lấy các yêu cầu đăng ký đang chờ xử lý...</p>
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
						<div>
							<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
								<div className="p-2 bg-red-100 rounded-xl">
									<Shield className="w-6 h-6 text-red-600" />
								</div>
								Xác Minh Cơ Sở Y Tế
							</h1>
							<p className="text-gray-600 mt-2">
								Xem xét và xác minh các yêu cầu đăng ký của bệnh viện và phòng xét nghiệm máu
							</p>
						</div>

						<button
							onClick={() => fetchPendingFacilities(true)}
							disabled={refreshing}
							className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
							<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
							{refreshing ? "Đang làm mới..." : "Làm Mới"}
						</button>
					</div>

					{/* Thẻ thống kê */}
					<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-red-100 rounded-xl text-red-600">
								<AlertCircle className="w-6 h-6" />
							</div>
							<div>
								<p className="font-semibold text-red-800 text-lg">
									{facilities.length} Cơ Sở Y Tế Đang Chờ Xác Minh
								</p>
								<p className="text-red-600 text-sm">
									Các cơ sở y tế đang chờ phê duyệt của quản trị viên để truy cập hệ thống
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Danh sách cơ sở y tế */}
					<div className="space-y-4">
						<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<Building className="w-5 h-5 text-red-600" />
							Yêu Cầu Đang Chờ Duyệt ({facilities.length})
						</h2>

						{facilities.length === 0 ? (
							<div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-red-100">
								<CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
								<h3 className="text-lg font-semibold text-gray-800 mb-2">Đã Xử Lý Hết!</h3>
								<p className="text-gray-600">Không có yêu cầu cơ sở y tế nào đang chờ</p>
								<p className="text-sm text-gray-500 mt-1">Tất cả cơ sở y tế đã được xử lý và phê duyệt</p>
							</div>
						) : (
							facilities.map((facility) => (
								<div
									key={facility._id}
									className={`bg-white rounded-2xl shadow-lg border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-xl ${
										selectedFacility?._id === facility._id
											? "border-red-300 bg-red-50"
											: "border-red-100 hover:border-red-300"
									}`}
									onClick={() => {
										console.log("🎯 Đang chọn cơ sở y tế:", facility._id);
										setSelectedFacility(facility);
									}}>
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{facility.name}</h3>
												{getFacilityTypeBadge(facility.facilityType)}
											</div>
											<p className="text-gray-600 text-sm flex items-center gap-1 mb-1">
												<Mail size={14} />
												{facility.email}
											</p>
											<p className="text-gray-600 text-sm flex items-center gap-1">
												<Phone size={14} />
												{facility.phone || "Chưa có số điện thoại"}
											</p>
										</div>
										{getStatusBadge(facility.status)}
									</div>

									<div className="space-y-2 text-sm text-gray-600">
										<p className="flex items-center gap-1">
											<MapPin size={14} />
											{facility.address?.street || "Chưa có địa chỉ"}, {facility.address?.city},{" "}
											{facility.address?.state} - {facility.address?.pincode}
										</p>
										<p className="flex items-center gap-1">
											<FileText size={14} />
											Mã đăng ký: {facility.registrationNumber || "Chưa cung cấp"}
										</p>
										<p className="flex items-center gap-1">
											<Calendar size={14} />
											Ngày đăng ký: {new Date(facility.createdAt).toLocaleDateString("vi-VN")}
										</p>
									</div>

									{facility.documents?.registrationProof && (
										<div className="mt-4 flex gap-2">
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleViewDocument(
														facility.documents.registrationProof.url,
														facility.documents.registrationProof.filename,
													);
												}}
												className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300">
												<Eye size={14} />
												Xem Tài Liệu
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleDownloadDocument(
														facility.documents.registrationProof.url,
														facility.documents.registrationProof.filename,
													);
												}}
												className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-300">
												<Download size={14} />
												Tải Xuống
											</button>
										</div>
									)}
								</div>
							))
						)}
					</div>

					{/* Chi tiết & Thao tác với cơ sở y tế */}
					<div className="lg:sticky lg:top-6 lg:h-fit">
						{selectedFacility ? (
							<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
								<h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
									<Building className="w-5 h-5 text-red-600" />
									Xem Xét Cơ Sở Y Tế
								</h2>

								{/* Chi tiết cơ sở y tế */}
								<div className="space-y-6">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Tên Cơ Sở Y Tế</label>
											<p className="text-gray-900 font-semibold">{selectedFacility.name}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
											{getFacilityTypeBadge(selectedFacility.facilityType)}
										</div>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
										<p className="text-gray-900">{selectedFacility.email}</p>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Số Điện Thoại</label>
											<p className="text-gray-900">{selectedFacility.phone || "Chưa cung cấp"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Liên Hệ Khẩn Cấp</label>
											<p className="text-gray-900">{selectedFacility.emergencyContact || "Chưa cung cấp"}</p>
										</div>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Địa Chỉ</label>
										<p className="text-gray-900">
											{selectedFacility.address?.street || "Chưa có tên đường"},{" "}
											{selectedFacility.address?.city}
											<br />
											{selectedFacility.address?.state} - {selectedFacility.address?.pincode}
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Mã Đăng Ký</label>
										<p className="text-gray-900 font-mono">
											{selectedFacility.registrationNumber || "Chưa cung cấp"}
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Danh Mục</label>
										<p className="text-gray-900 capitalize">
											{selectedFacility.facilityCategory || "Chưa xác định"}
										</p>
									</div>

									{selectedFacility.operatingHours && (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Giờ Làm Việc</label>
											<p className="text-gray-900">
												{selectedFacility.operatingHours.open} - {selectedFacility.operatingHours.close}
											</p>
											<p className="text-sm text-gray-600">
												{selectedFacility.operatingHours.workingDays?.join(", ") || "Chưa xác định"}
												{selectedFacility.is24x7 && " • Phục vụ 24/7"}
											</p>
										</div>
									)}

									{selectedFacility.emergencyServices && (
										<div className="p-3 bg-red-50 rounded-lg border border-red-200">
											<p className="text-red-700 font-semibold flex items-center gap-2">
												<Shield size={16} />
												Có Dịch Vụ Cấp Cứu
											</p>
										</div>
									)}
								</div>

								{/* Các nút thao tác */}
								<div className="mt-8 space-y-4">
									<button
										onClick={() => handleApprove(selectedFacility._id)}
										disabled={actionLoading === selectedFacility._id}
										className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg">
										{actionLoading === selectedFacility._id ? (
											<RefreshCw className="w-4 h-4 animate-spin" />
										) : (
											<CheckCircle size={20} />
										)}
										{actionLoading === selectedFacility._id ? "Đang phê duyệt..." : "Phê Duyệt Cơ Sở Y Tế"}
									</button>

									<div className="space-y-2">
										<label className="block text-sm font-medium text-gray-700">
											Lý Do Từ Chối (bắt buộc)
										</label>
										<textarea
											value={rejectionReason}
											onChange={(e) => setRejectionReason(e.target.value)}
											placeholder="Cung cấp lý do cụ thể để từ chối. Thông tin này sẽ được gửi đến cơ sở y tế..."
											className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 resize-none transition-colors"
											rows="3"
										/>
										<button
											onClick={() => handleReject(selectedFacility._id)}
											disabled={actionLoading === selectedFacility._id || !rejectionReason.trim()}
											className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg">
											{actionLoading === selectedFacility._id ? (
												<RefreshCw className="w-4 h-4 animate-spin" />
											) : (
												<XCircle size={20} />
											)}
											{actionLoading === selectedFacility._id ? "Đang từ chối..." : "Từ Chối Cơ Sở Y Tế"}
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-12 text-center">
								<Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<h3 className="text-lg font-semibold text-gray-600 mb-2">Chọn Một Cơ Sở Y Tế</h3>
								<p className="text-gray-500">
									Nhấp vào bất kỳ cơ sở y tế nào trong danh sách để xem chi tiết và thực hiện thao tác
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default FacilityApproval;
