import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
	Droplet,
	Plus,
	Minus,
	AlertTriangle,
	CheckCircle,
	Calendar,
	RefreshCw,
} from "lucide-react";

const HospitalBloodStock = () => {
	const [stock, setStock] = useState([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		totalUnits: 0,
		lowStock: 0,
		expiringSoon: 0,
		bloodTypes: 0,
	});

	const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

	const loadStock = async () => {
		try {
			setLoading(true);
			const token = localStorage.getItem("token");
			const res = await axios.get("http://localhost:5000/api/hospital/blood/stock", {
				headers: { Authorization: `Bearer ${token}` },
			});

			const stockData = res.data.data || [];
			setStock(stockData);
			calculateStats(stockData);
		} catch (err) {
			console.error("Lỗi tải kho máu:", err);
			toast.error("Không thể tải dữ liệu kho máu");
		} finally {
			setLoading(false);
		}
	};

	const calculateStats = (stockData) => {
		const totalUnits = stockData.reduce((sum, item) => sum + item.quantity, 0);
		const lowStock = stockData.filter((item) => item.quantity < 10).length;

		const today = new Date();
		const nextWeek = new Date(today);
		nextWeek.setDate(today.getDate() + 7);
		const expiringSoon = stockData.filter((item) => {
			const expiryDate = new Date(item.expiryDate);
			return expiryDate <= nextWeek && expiryDate > today;
		}).length;

		const bloodTypes = stockData.length;

		setStats({ totalUnits, lowStock, expiringSoon, bloodTypes });
	};

	useEffect(() => {
		loadStock();
	}, []);

	const getBloodTypeColor = (bloodType) => {
		const colors = {
			"A+": "bg-red-100 text-red-800 border-red-300",
			"A-": "bg-red-50 text-red-700 border-red-200",
			"B+": "bg-blue-100 text-blue-800 border-blue-300",
			"B-": "bg-blue-50 text-blue-700 border-blue-200",
			"O+": "bg-green-100 text-green-800 border-green-300",
			"O-": "bg-green-50 text-green-700 border-green-200",
			"AB+": "bg-purple-100 text-purple-800 border-purple-300",
			"AB-": "bg-purple-50 text-purple-700 border-purple-200",
		};
		return colors[bloodType] || "bg-gray-100 text-gray-800 border-gray-300";
	};

	const getStockStatus = (quantity, expiryDate) => {
		const today = new Date();
		const expiry = new Date(expiryDate);

		if (expiry <= today) {
			return { status: "Hết hạn", color: "bg-red-100 text-red-800", icon: AlertTriangle };
		}

		const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

		if (daysUntilExpiry <= 3) {
			return { status: "Nguy cấp", color: "bg-red-100 text-red-800", icon: AlertTriangle };
		} else if (daysUntilExpiry <= 7) {
			return { status: "Cảnh báo", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle };
		} else if (quantity < 5) {
			return { status: "Tồn kho thấp", color: "bg-orange-100 text-orange-800", icon: AlertTriangle };
		} else {
			return { status: "Tốt", color: "bg-green-100 text-green-800", icon: CheckCircle };
		}
	};

	const getStockForType = (bloodType) => {
		return (
			stock.find((item) => item.bloodGroup === bloodType) || {
				bloodGroup: bloodType,
				quantity: 0,
				expiryDate: null,
			}
		);
	};

	const isExpired = (expiryDate) => {
		if (!expiryDate) return false;
		return new Date(expiryDate) <= new Date();
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
				<div className="max-w-7xl mx-auto">
					<div className="flex justify-center items-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
						<span className="ml-3 text-gray-600">Đang tải kho máu...</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
								<div className="p-2 bg-red-100 rounded-xl">
									<Droplet className="w-6 h-6 text-red-600" />
								</div>
								Kho Máu Dự Trữ
							</h1>
							<p className="text-gray-600 mt-1">Quản lý và theo dõi nguồn máu của bệnh viện</p>
						</div>
						<button
							onClick={loadStock}
							className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors">
							<RefreshCw size={18} />
							Làm Mới
						</button>
					</div>

					{/* Thẻ thống kê */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-gray-800">{stats.totalUnits}</div>
							<div className="text-sm text-gray-600">Tổng Đơn Vị</div>
						</div>
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-green-400">
							<div className="text-2xl font-bold text-green-600">{stats.bloodTypes}</div>
							<div className="text-sm text-gray-600">Nhóm Máu</div>
						</div>
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-yellow-400">
							<div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
							<div className="text-sm text-gray-600">Tồn Kho Thấp</div>
						</div>
						<div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-red-600">{stats.expiringSoon}</div>
							<div className="text-sm text-gray-600">Sắp Hết Hạn</div>
						</div>
					</div>
				</div>

				{/* Tổng quan nhóm máu */}
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-gray-800 mb-4">Tổng Quan Nhóm Máu</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
						{bloodTypes.map((bloodType) => {
							const stockItem = getStockForType(bloodType);
							const status = getStockStatus(stockItem.quantity, stockItem.expiryDate);
							const StatusIcon = status.icon;
							const isExpiredItem = isExpired(stockItem.expiryDate);

							return (
								<div
									key={bloodType}
									className={`bg-white rounded-xl shadow-lg border-2 p-4 text-center transition-all hover:shadow-xl ${getBloodTypeColor(
										bloodType,
									)} ${isExpiredItem ? "opacity-60" : ""}`}>
									<div className="text-lg font-bold mb-1">{bloodType}</div>
									<div className="text-2xl font-bold mb-2">{stockItem.quantity}</div>
									<div className="flex items-center justify-center gap-1 text-xs">
										<StatusIcon size={12} />
										<span>{status.status}</span>
									</div>
									{stockItem.expiryDate && (
										<div className="text-xs mt-2 opacity-75">
											{isExpiredItem ? "Đã hết hạn" : "HH:"}{" "}
											{new Date(stockItem.expiryDate).toLocaleDateString("vi-VN")}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Bảng kho máu chi tiết */}
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden">
					<div className="p-6 border-b border-gray-200">
						<h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
							<Droplet className="w-5 h-5 text-red-600" />
							Kho Máu Chi Tiết
						</h2>
					</div>

					{stock.length === 0 ? (
						<div className="text-center py-12">
							<Droplet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-800 mb-2">Chưa có dữ liệu kho máu</h3>
							<p className="text-gray-600 mb-4">Yêu cầu máu từ ngân hàng máu để xây dựng kho dự trữ</p>
							<button
								onClick={() => (window.location.href = "/hospital/blood-request-create")}
								className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
								Yêu Cầu Máu
							</button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50 border-b">
										<th className="p-4 text-left font-semibold text-gray-700">Nhóm Máu</th>
										<th className="p-4 text-left font-semibold text-gray-700">Số Lượng</th>
										<th className="p-4 text-left font-semibold text-gray-700">Trạng Thái</th>
										<th className="p-4 text-left font-semibold text-gray-700">Ngày Hết Hạn</th>
										<th className="p-4 text-left font-semibold text-gray-700">Số Ngày Còn Lại</th>
										<th className="p-4 text-left font-semibold text-gray-700">Cập Nhật Lần Cuối</th>
									</tr>
								</thead>
								<tbody>
									{stock.map((item) => {
										const status = getStockStatus(item.quantity, item.expiryDate);
										const StatusIcon = status.icon;
										const today = new Date();
										const expiryDate = new Date(item.expiryDate);
										const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
										const isExpiredItem = isExpired(item.expiryDate);

										return (
											<tr
												key={item._id}
												className={`border-b hover:bg-gray-50 transition-colors ${
													isExpiredItem ? "bg-red-50" : ""
												}`}>
												<td className="p-4">
													<span
														className={`px-3 py-1 rounded-full text-sm font-medium ${getBloodTypeColor(item.bloodGroup)}`}>
														{item.bloodGroup}
													</span>
												</td>
												<td className="p-4">
													<div className="flex items-center gap-2">
														<span className="text-xl font-bold text-gray-800">{item.quantity}</span>
														<span className="text-sm text-gray-500">đơn vị</span>
														{item.quantity < 5 && <Minus size={16} className="text-red-500" />}
													</div>
												</td>
												<td className="p-4">
													<span
														className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit ${status.color}`}>
														<StatusIcon size={14} />
														{status.status}
													</span>
												</td>
												<td className="p-4">
													<div className="flex items-center gap-2">
														<Calendar size={16} className="text-gray-400" />
														<span className={isExpiredItem ? "text-red-600 font-medium" : "text-gray-700"}>
															{new Date(item.expiryDate).toLocaleDateString("vi-VN")}
														</span>
													</div>
												</td>
												<td className="p-4">
													<span
														className={
															daysLeft <= 0
																? "text-red-600 font-bold"
																: daysLeft <= 3
																	? "text-red-600 font-medium"
																	: daysLeft <= 7
																		? "text-yellow-600 font-medium"
																		: "text-green-600"
														}>
														{daysLeft <= 0 ? "ĐÃ HẾT HẠN" : `${daysLeft} ngày`}
													</span>
												</td>
												<td className="p-4 text-sm text-gray-600">
													{new Date(item.updatedAt || item.createdAt).toLocaleDateString("vi-VN")}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* Phần cảnh báo */}
				{stock.some((item) => {
					const status = getStockStatus(item.quantity, item.expiryDate);
					return status.status === "Nguy cấp" || status.status === "Hết hạn" || item.quantity < 3;
				}) && (
					<div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-6">
						<h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
							<AlertTriangle size={20} />
							Cảnh Báo Quan Trọng
						</h3>
						<div className="space-y-2">
							{stock.map((item) => {
								const status = getStockStatus(item.quantity, item.expiryDate);
								const isExpiredItem = isExpired(item.expiryDate);

								if (status.status === "Nguy cấp" || status.status === "Hết hạn" || item.quantity < 3) {
									return (
										<div
											key={item._id}
											className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
											<div className="flex items-center gap-3">
												<AlertTriangle size={16} className="text-red-600" />
												<span className="font-medium text-red-800">{item.bloodGroup}</span>
												<span className="text-sm text-red-600">
													{isExpiredItem
														? "Đơn vị máu đã hết hạn"
														: status.status === "Nguy cấp"
															? "Máu sắp hết hạn trong vòng 3 ngày"
															: "Tồn kho ở mức rất thấp"}
												</span>
											</div>
											<div className="text-sm text-red-600">
												{item.quantity} đơn vị • Hết hạn {new Date(item.expiryDate).toLocaleDateString("vi-VN")}
											</div>
										</div>
									);
								}
								return null;
							})}
						</div>
					</div>
				)}

				{/* Thao tác nhanh */}
				<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
						<h3 className="text-lg font-semibold text-gray-800 mb-4">Thao Tác Nhanh</h3>
						<div className="space-y-3">
							<button
								onClick={() => (window.location.href = "/hospital/blood-request-create")}
								className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
								<Plus size={18} />
								Yêu Cầu Thêm Máu
							</button>
							<button
								onClick={loadStock}
								className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
								<RefreshCw size={18} />
								Làm Mới Kho Máu
							</button>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
						<h3 className="text-lg font-semibold text-gray-800 mb-4">Hướng Dẫn Trạng Thái Kho</h3>
						<div className="space-y-2 text-sm">
							<div className="flex items-center gap-2">
								<CheckCircle size={16} className="text-green-600" />
								<span>
									<strong>Tốt:</strong> Đủ tồn kho, chưa sắp hết hạn
								</span>
							</div>
							<div className="flex items-center gap-2">
								<AlertTriangle size={16} className="text-yellow-600" />
								<span>
									<strong>Tồn kho thấp:</strong> Còn dưới 5 đơn vị
								</span>
							</div>
							<div className="flex items-center gap-2">
								<AlertTriangle size={16} className="text-orange-600" />
								<span>
									<strong>Cảnh báo:</strong> Hết hạn trong vòng 7 ngày
								</span>
							</div>
							<div className="flex items-center gap-2">
								<AlertTriangle size={16} className="text-red-600" />
								<span>
									<strong>Nguy cấp:</strong> Hết hạn trong vòng 3 ngày
								</span>
							</div>
							<div className="flex items-center gap-2">
								<AlertTriangle size={16} className="text-red-600" />
								<span>
									<strong>Hết hạn:</strong> Đơn vị máu đã hết hạn sử dụng
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default HospitalBloodStock;
