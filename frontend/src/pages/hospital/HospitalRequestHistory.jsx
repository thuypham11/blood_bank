import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { CheckCircle, XCircle, Clock, MapPin, Calendar, Truck, PackageCheck } from "lucide-react";

const HospitalRequestHistory = () => {
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadHistory = async () => {
			try {
				setLoading(true);
				const token = localStorage.getItem("token");
				const res = await axios.get("http://localhost:5000/api/hospital/blood/requests", {
					headers: { Authorization: `Bearer ${token}` },
				});

				setRequests(res.data.data || []);
			} catch (err) {
				console.error("Lỗi tải lịch sử:", err);
				toast.error("Không thể tải lịch sử yêu cầu");
			} finally {
				setLoading(false);
			}
		};
		loadHistory();
	}, []);

	const getStatusConfig = (status) => {
		const config = {
			pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Chờ Xử Lý" },
			accepted: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Đã Chấp Nhận" },
			rejected: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Bị Từ Chối" },
			completed: { color: "bg-blue-100 text-blue-800", icon: PackageCheck, label: "Đã Nhận Máu" },
		};
		return config[status] || config.pending;
	};

	const handoverSteps = [
		{ key: "requested", label: "Gửi yêu cầu" },
		{ key: "received", label: "Tiếp nhận" },
		{ key: "preparing", label: "Chuẩn bị" },
		{ key: "packed", label: "Đóng gói" },
		{ key: "shipping", label: "Vận chuyển" },
		{ key: "confirmed", label: "Xác nhận" },
	];

	const getHandoverIndex = (status) => handoverSteps.findIndex((step) => step.key === status);

	const confirmHandover = async (id) => {
		try {
			const token = localStorage.getItem("token");
			await axios.patch(
				`http://localhost:5000/api/hospital/blood/requests/${id}/confirm`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			toast.success("Đã xác nhận bàn giao máu");
			setRequests((prev) =>
				prev.map((request) =>
					request._id === id
						? { ...request, status: "completed", handoverStatus: "confirmed", confirmedAt: new Date().toISOString() }
						: request,
				),
			);
		} catch (err) {
			console.error("Lỗi xác nhận bàn giao:", err);
			toast.error(err.response?.data?.message || "Không thể xác nhận bàn giao");
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
				<div className="max-w-6xl mx-auto">
					<div className="flex justify-center items-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
						<span className="ml-3 text-gray-600">Đang tải lịch sử...</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-6xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-red-100 rounded-xl">
							<Calendar className="w-6 h-6 text-red-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-800">Lịch Sử Yêu Cầu</h1>
					</div>
					<p className="text-gray-600">Theo dõi trạng thái và lịch sử các yêu cầu máu của bạn</p>
				</div>

				{/* Thống kê */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
					<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-green-400">
						<div className="text-2xl font-bold text-gray-800">{requests.length}</div>
						<div className="text-sm text-gray-600">Tổng Yêu Cầu</div>
					</div>
					<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-yellow-400">
						<div className="text-2xl font-bold text-yellow-600">
							{requests.filter((r) => r.status === "pending").length}
						</div>
						<div className="text-sm text-gray-600">Chờ Xử Lý</div>
					</div>
					<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-green-400">
						<div className="text-2xl font-bold text-green-600">
							{requests.filter((r) => r.status === "accepted").length}
						</div>
						<div className="text-sm text-gray-600">Đã Chấp Nhận</div>
					</div>
					<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-red-400">
						<div className="text-2xl font-bold text-red-600">
							{requests.filter((r) => r.status === "rejected").length}
						</div>
						<div className="text-sm text-gray-600">Bị Từ Chối</div>
					</div>
				</div>

				{/* Bảng yêu cầu */}
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden">
					{requests.length === 0 ? (
						<div className="text-center py-12">
							<Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-800 mb-2">Chưa có lịch sử yêu cầu</h3>
							<p className="text-gray-600">Các yêu cầu máu của bạn sẽ xuất hiện ở đây sau khi gửi.</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50 border-b">
										<th className="p-4 text-left font-semibold text-gray-700">Ngân Hàng Máu</th>
										<th className="p-4 text-left font-semibold text-gray-700">Nhóm Máu</th>
										<th className="p-4 text-left font-semibold text-gray-700">Số Đơn Vị</th>
										<th className="p-4 text-left font-semibold text-gray-700">Trạng Thái</th>
										<th className="p-4 text-left font-semibold text-gray-700">Bàn Giao</th>
										<th className="p-4 text-left font-semibold text-gray-700">Ngày Yêu Cầu</th>
										<th className="p-4 text-left font-semibold text-gray-700">Ngày Xử Lý</th>
									</tr>
								</thead>
								<tbody>
									{requests.map((request) => {
										const statusConfig = getStatusConfig(request.status);
										const IconComponent = statusConfig.icon;

										return (
											<tr key={request._id} className="border-b hover:bg-gray-50 transition-colors">
												<td className="p-4">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
															<span className="font-semibold text-red-600">
																{request.labId?.name?.charAt(0) || "N"}
															</span>
														</div>
														<div>
															<div className="font-medium text-gray-800">
																{request.labId?.name || "Ngân hàng không xác định"}
															</div>
															<div className="flex items-center gap-1 text-sm text-gray-500">
																<MapPin size={12} />
																{request.labId?.address?.city || "Thành phố không xác định"}
															</div>
														</div>
													</div>
												</td>
												<td className="p-4">
													<span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
														{request.bloodType}
													</span>
												</td>
												<td className="p-4">
													<span className="text-lg font-semibold text-gray-800">{request.units}</span>
													<span className="text-sm text-gray-500 ml-1">đơn vị</span>
												</td>
												<td className="p-4">
													<span
														className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit ${statusConfig.color}`}>
														<IconComponent size={14} />
														{statusConfig.label}
													</span>
												</td>
												<td className="p-4 min-w-[280px]">
													<div className="flex items-center gap-1">
														{handoverSteps.map((step, index) => {
															const activeIndex = getHandoverIndex(request.handoverStatus || "requested");
															const isDone = index <= activeIndex;
															return (
																<div key={step.key} className="flex items-center">
																	<div
																		title={step.label}
																		className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
																			isDone ? "bg-red-600 text-white" : "bg-gray-100 text-gray-400"
																		}`}>
																		{index + 1}
																	</div>
																	{index < handoverSteps.length - 1 && (
																		<div className={`h-0.5 w-4 ${index < activeIndex ? "bg-red-500" : "bg-gray-200"}`} />
																	)}
																</div>
															);
														})}
													</div>
													<div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
														<Truck size={12} />
														{handoverSteps[getHandoverIndex(request.handoverStatus || "requested")]?.label || "Gửi yêu cầu"}
													</div>
													{request.handoverStatus === "shipping" && (
														<button
															onClick={() => confirmHandover(request._id)}
															className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
															Ký xác nhận
														</button>
													)}
												</td>
												<td className="p-4 text-sm text-gray-600">
													{new Date(request.createdAt).toLocaleDateString("vi-VN")}
													<br />
													<span className="text-xs text-gray-400">
														{new Date(request.createdAt).toLocaleTimeString("vi-VN")}
													</span>
												</td>
												<td className="p-4 text-sm text-gray-600">
													{request.processedAt ? (
														<>
															{new Date(request.processedAt).toLocaleDateString("vi-VN")}
															<br />
															<span className="text-xs text-gray-400">
																{new Date(request.processedAt).toLocaleTimeString("vi-VN")}
															</span>
														</>
													) : (
														<span className="text-gray-400">Chưa xử lý</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default HospitalRequestHistory;
