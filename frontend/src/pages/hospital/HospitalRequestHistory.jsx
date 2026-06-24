import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Calendar, CheckCircle, Clock, MapPin, PackageCheck, Truck, XCircle } from "lucide-react";
import { formatRequestProducts } from "../../utils/bloodProducts";

const handoverSteps = [
	{ key: "requested", label: "Gửi yêu cầu" },
	{ key: "received", label: "Tiếp nhận" },
	{ key: "preparing", label: "Chuẩn bị" },
	{ key: "packed", label: "Đóng gói" },
	{ key: "shipping", label: "Vận chuyển" },
	{ key: "confirmed", label: "Xác nhận" },
];

<<<<<<< Updated upstream
=======
const formatDateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "N/A");
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "N/A");

>>>>>>> Stashed changes
const getHandoverIndex = (status) =>
	Math.max(
		0,
		handoverSteps.findIndex((step) => step.key === status),
	);

<<<<<<< Updated upstream
const HandoverProgress = ({ status }) => {
	const activeIndex = getHandoverIndex(status);
	return (
		<>
=======
const HandoverProgress = ({ request }) => {
	const activeIndex = getHandoverIndex(request.handoverStatus || "requested");
	return (
		<div>
>>>>>>> Stashed changes
			<div className="flex items-center gap-1">
				{handoverSteps.map((step, index) => (
					<div key={step.key} className="flex items-center">
						<div
							title={step.label}
							className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
								index <= activeIndex ? "bg-red-600 text-white" : "bg-gray-100 text-gray-400"
							}`}>
							{index + 1}
						</div>
						{index < handoverSteps.length - 1 && (
							<div className={`h-0.5 w-4 ${index < activeIndex ? "bg-red-500" : "bg-gray-200"}`} />
						)}
					</div>
				))}
			</div>
			<div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
				<Truck size={12} />
				{handoverSteps[activeIndex]?.label || "Gửi yêu cầu"}
			</div>
<<<<<<< Updated upstream
		</>
=======
			{request.handoverTimeline?.length > 0 && (
				<div className="mt-2 space-y-1">
					{request.handoverTimeline.slice(-3).map((item, index) => (
						<div key={`${item.status}-${index}`} className="text-xs text-gray-500">
							{item.label || item.status} - {formatDateTime(item.date)}
						</div>
					))}
				</div>
			)}
		</div>
>>>>>>> Stashed changes
	);
};

const getStatusConfig = (status) => {
	const config = {
		pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Chờ xử lý" },
		accepted: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Đã chấp nhận" },
		rejected: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Bị từ chối" },
		completed: { color: "bg-blue-100 text-blue-800", icon: PackageCheck, label: "Đã nhận" },
		cancelled: { color: "bg-gray-100 text-gray-700", icon: XCircle, label: "Đã hủy" },
	};
	return config[status] || config.pending;
};

const StatCard = ({ value, label, color }) => (
	<div className={`bg-white p-4 rounded-xl shadow-lg border-l-4 ${color}`}>
		<div className="text-2xl font-bold text-gray-800">{value}</div>
		<div className="text-sm text-gray-600">{label}</div>
	</div>
);

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
				console.error("Load request history error:", err);
				toast.error("Không thể tải lịch sử yêu cầu");
			} finally {
				setLoading(false);
			}
		};
		loadHistory();
	}, []);

	const confirmHandover = async (id) => {
		try {
			const token = localStorage.getItem("token");
			await axios.patch(
				`http://localhost:5000/api/hospital/blood/requests/${id}/confirm`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } },
			);
<<<<<<< Updated upstream
			toast.success("Đã xác nhận bàn giao máu");
=======
			toast.success("Đã xác nhận nhận máu");
>>>>>>> Stashed changes
			setRequests((prev) =>
				prev.map((request) =>
					request._id === id
						? {
								...request,
								status: "completed",
								handoverStatus: "confirmed",
								confirmedAt: new Date().toISOString(),
<<<<<<< Updated upstream
=======
								handoverTimeline: [
									...(request.handoverTimeline || []),
									{
										status: "confirmed",
										label: "Bệnh viện xác nhận nhận máu",
										date: new Date().toISOString(),
									},
								],
>>>>>>> Stashed changes
							}
						: request,
				),
			);
		} catch (err) {
			console.error("Confirm handover error:", err);
			toast.error(err.response?.data?.message || "Không thể xác nhận bàn giao");
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
				<div className="max-w-6xl mx-auto flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
					<span className="ml-3 text-gray-600">Đang tải lịch sử...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
						<span className="p-2 bg-red-100 rounded-xl">
							<Calendar className="w-6 h-6 text-red-600" />
						</span>
<<<<<<< Updated upstream
						Lịch sử yêu cầu
					</h1>
					<p className="text-gray-600 mt-2">Theo dõi yêu cầu máu toàn phần và chế phẩm máu.</p>
=======
						Theo Dõi Yêu Cầu Máu
					</h1>
					<p className="text-gray-600 mt-2">
						Theo dõi yêu cầu máu toàn phần, hồng cầu, tiểu cầu và huyết tương từ lúc gửi đến khi xác nhận nhận máu.
					</p>
>>>>>>> Stashed changes
				</div>

				<div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
					<StatCard value={requests.length} label="Tổng yêu cầu" color="border-l-blue-400" />
<<<<<<< Updated upstream
					<StatCard
						value={requests.filter((r) => r.status === "pending").length}
						label="Chờ xử lý"
						color="border-l-yellow-400"
					/>
					<StatCard
						value={requests.filter((r) => r.status === "accepted").length}
						label="Đã chấp nhận"
						color="border-l-green-400"
					/>
					<StatCard
						value={requests.filter((r) => r.status === "completed").length}
						label="Đã nhận"
						color="border-l-green-400"
					/>
					<StatCard
						value={requests.filter((r) => r.status === "cancelled").length}
						label="Đã hủy"
						color="border-l-green-400"
					/>
					<StatCard
						value={requests.filter((r) => r.status === "rejected").length}
						label="Bị từ chối"
						color="border-l-red-400"
					/>
=======
					<StatCard value={requests.filter((r) => r.status === "pending").length} label="Chờ xử lý" color="border-l-yellow-400" />
					<StatCard value={requests.filter((r) => r.status === "accepted").length} label="Đã chấp nhận" color="border-l-green-400" />
					<StatCard value={requests.filter((r) => r.status === "rejected").length} label="Bị từ chối" color="border-l-red-400" />
					<StatCard value={requests.filter((r) => r.status === "completed").length} label="Đã nhận" color="border-l-blue-400" />
					<StatCard value={requests.filter((r) => r.status === "cancelled").length} label="Đã hủy" color="border-l-gray-400" />
>>>>>>> Stashed changes
				</div>

				<div className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden">
					{requests.length === 0 ? (
						<div className="text-center py-12">
							<Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
<<<<<<< Updated upstream
							<h3 className="text-lg font-medium text-gray-800 mb-2">Chưa có lịch sử yêu cầu</h3>
=======
							<h3 className="text-lg font-medium text-gray-800 mb-2">Chưa có lịch sử yêu cầu.</h3>
>>>>>>> Stashed changes
							<p className="text-gray-600">Các yêu cầu máu sẽ xuất hiện tại đây sau khi gửi.</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-max min-w-full">
								<thead>
									<tr className="bg-gray-50 border-b">
										<th className="p-4 text-left font-semibold text-gray-700">Ngân hàng máu</th>
										<th className="p-4 text-left font-semibold text-gray-700">Nội dung yêu cầu</th>
										<th className="p-4 text-left font-semibold text-gray-700">Tổng ml</th>
<<<<<<< Updated upstream
										<th className="p-4 text-left font-semibold text-gray-700">Trạng thái</th>
										<th className="p-4 text-left font-semibold text-gray-700">Bàn giao</th>
										<th className="p-4 text-left font-semibold text-gray-700">Ngày yêu cầu</th>
										<th className="p-4 text-left font-semibold text-gray-700">Ngày xử lý</th>
=======
										<th className="p-4 text-left font-semibold text-gray-700">Ngày cần nhận</th>
										<th className="p-4 text-left font-semibold text-gray-700">Trạng thái</th>
										<th className="p-4 text-left font-semibold text-gray-700">Theo dõi bàn giao</th>
										<th className="p-4 text-left font-semibold text-gray-700">Tạo / hết hạn</th>
>>>>>>> Stashed changes
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
															<div className="font-medium text-gray-800">{request.labId?.name || "N/A"}</div>
															<div className="flex items-center gap-1 text-sm text-gray-500">
																<MapPin size={12} />
																{request.labId?.address?.city || request.labId?.address?.state || "N/A"}
															</div>
														</div>
													</div>
												</td>
<<<<<<< Updated upstream
												<td className="p-4 max-w-xs">
													<div className="text-sm text-gray-800 whitespace-normal">
														{formatRequestProducts(request)}
													</div>
=======
												<td className="p-4 max-w-sm">
													<div className="text-sm text-gray-800 whitespace-normal">{formatRequestProducts(request)}</div>
>>>>>>> Stashed changes
												</td>
												<td className="p-4">
													<span className="text-lg font-semibold text-gray-800">{request.units || 0}</span>
													<span className="text-sm text-gray-500 ml-1">ml</span>
												</td>
												<td className="p-4 text-sm text-gray-600">{formatDate(request.requestedDeliveryDate)}</td>
												<td className="p-4">
													<span
														className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit ${statusConfig.color}`}>
														<IconComponent size={14} />
														{statusConfig.label}
													</span>
												</td>
												<td className="p-4 min-w-[320px]">
													<HandoverProgress request={request} />
													{request.handoverStatus === "shipping" && (
														<button
															onClick={() => confirmHandover(request._id)}
															className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
															Xác nhận đã nhận
														</button>
													)}
												</td>
												<td className="p-4 text-sm text-gray-600">
<<<<<<< Updated upstream
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
														<span className="text-gray-400">Chua xu ly</span>
													)}
=======
													<div>{formatDateTime(request.createdAt)}</div>
													<div className="text-xs text-gray-400">Tự hủy: {formatDateTime(request.expiresAt)}</div>
>>>>>>> Stashed changes
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
