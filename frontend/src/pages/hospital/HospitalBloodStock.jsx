import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { AlertTriangle, Calendar, CheckCircle, Droplet, Plus, RefreshCw } from "lucide-react";
import {
	BLOOD_COMPONENTS,
	BLOOD_TYPES,
	componentLabel,
	productLabel,
} from "../../utils/bloodProducts";

const summarizeStock = (stock, predicate, label) => {
	const items = stock.filter(predicate);
	const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
	const expiryDates = items
		.map((item) => item.expiryDate || item.expirationDate)
		.filter(Boolean)
		.sort((a, b) => new Date(a) - new Date(b));
	return { label, quantity, expiryDate: expiryDates[0] || null };
};

const getDaysLeft = (expiryDate) => {
	if (!expiryDate) return Number.POSITIVE_INFINITY;
	return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
};

const getStockStatus = (quantity, expiryDate) => {
	const daysLeft = getDaysLeft(expiryDate);
	if (daysLeft <= 0)
		return { label: "Hết hạn", color: "bg-red-100 text-red-800", icon: AlertTriangle };
	if (daysLeft <= 7)
		return { label: "Sắp hết hạn", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle };
	if (quantity > 0 && quantity < 1000)
		return { label: "Tồn kho thấp", color: "bg-orange-100 text-orange-800", icon: AlertTriangle };
	return { label: "Tốt", color: "bg-green-100 text-green-800", icon: CheckCircle };
};

const StatCard = ({ value, label, color }) => (
	<div className={`bg-white p-4 rounded-xl shadow-lg border-l-4 ${color}`}>
		<div className="text-2xl font-bold text-gray-800">{value}</div>
		<div className="text-sm text-gray-600">{label}</div>
	</div>
);

const Section = ({ title, subtitle, children }) => (
	<section className="mb-8">
		<div className="mb-4">
			<h2 className="text-xl font-semibold text-gray-800">{title}</h2>
			<p className="text-sm text-gray-500">{subtitle}</p>
		</div>
		{children}
	</section>
);

const StockTile = ({ item }) => {
	const status = getStockStatus(item.quantity, item.expiryDate);
	const StatusIcon = status.icon;
	return (
		<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-center">
			<div className="text-lg font-bold text-gray-800 mb-1">{item.label}</div>
			<div className="text-2xl font-bold text-red-700 mb-2">{item.quantity}ml</div>
			<div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
				<StatusIcon size={12} />
				{status.label}
			</div>
			{item.expiryDate && (
				<div className="text-xs text-gray-500 mt-2">
					HH: {new Date(item.expiryDate).toLocaleDateString("vi-VN")}
				</div>
			)}
		</div>
	);
};

const HospitalBloodStock = () => {
	const [stock, setStock] = useState([]);
	const [loading, setLoading] = useState(true);

	const loadStock = async () => {
		try {
			setLoading(true);
			const token = localStorage.getItem("token");
			const res = await axios.get("http://localhost:5000/api/hospital/blood/stock", {
				headers: { Authorization: `Bearer ${token}` },
			});
			setStock(res.data.data || []);
		} catch (err) {
			console.error("Load hospital stock error:", err);
			toast.error("Không thể tải dữ liệu kho máu");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadStock();
	}, []);

	const summary = useMemo(() => {
		const whole = BLOOD_TYPES.map((type) =>
			summarizeStock(
				stock,
				(item) =>
					item.productType !== "blood_component" && (item.bloodGroup || item.bloodType) === type,
				type,
			),
		);
		const components = BLOOD_COMPONENTS.map((component) =>
			summarizeStock(
				stock,
				(item) => item.productType === "blood_component" && item.componentType === component.value,
				component.label,
			),
		);
		const totalMl = stock.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
		const expiringSoon = stock.filter(
			(item) => getDaysLeft(item.expiryDate || item.expirationDate) <= 7,
		).length;
		const lowStock = [...whole, ...components].filter(
			(item) => item.quantity > 0 && item.quantity < 1000,
		).length;
		return { whole, components, totalMl, expiringSoon, lowStock };
	}, [stock]);

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
				<div className="max-w-7xl mx-auto flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
					<span className="ml-3 text-gray-600">Đang tải kho máu...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				<div className="mb-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
								<span className="p-2 bg-red-100 rounded-xl">
									<Droplet className="w-6 h-6 text-red-600" />
								</span>
								Kho Máu Của Bệnh Viện
							</h1>
							<p className="text-gray-600 mt-1">Bảo quản máu toàn phần và chế phẩm máu.</p>
						</div>
						<button
							onClick={loadStock}
							className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors">
							<RefreshCw size={18} />
							Lam moi
						</button>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
						<StatCard value={`${summary.totalMl}ml`} label="Tổng kho" color="border-l-red-400" />
						<StatCard
							value={summary.whole.filter((item) => item.quantity > 0).length}
							label="Nhóm máu"
							color="border-l-blue-400"
						/>
						<StatCard
							value={summary.components.filter((item) => item.quantity > 0).length}
							label="Loại chế phẩm"
							color="border-l-green-400"
						/>
						<StatCard
							value={summary.lowStock + summary.expiringSoon}
							label="Cần theo dõi"
							color="border-l-yellow-400"
						/>
					</div>
				</div>

				<Section title="Máu toàn phần" subtitle="A, B, O, AB +/-">
					<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
						{summary.whole.map((item) => (
							<StockTile key={item.label} item={item} />
						))}
					</div>
				</Section>

				<Section title="Chế phẩm máu" subtitle="Hồng cầu, tiểu cầu, huyết tương">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{summary.components.map((item) => (
							<StockTile key={item.label} item={item} />
						))}
					</div>
				</Section>

				<div className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden mt-8">
					<div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
							<Droplet className="w-5 h-5 text-red-600" />
							Chi tiết kho
						</h2>
						<button
							onClick={() => (window.location.href = "/hospital/request-blood")}
							className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2">
							<Plus size={18} />
							Yêu cầu thêm
						</button>
					</div>

					{stock.length === 0 ? (
						<div className="text-center py-12">
							<Droplet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-800 mb-2">Chưa có dữ liệu kho máu</h3>
							<p className="text-gray-600 mb-4">Gửi yêu cầu máu từ ngân hàng máu để bồ sung kho.</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50 border-b">
										<th className="p-4 text-left font-semibold text-gray-700">Phân loại</th>
										<th className="p-4 text-left font-semibold text-gray-700">Mục</th>
										<th className="p-4 text-left font-semibold text-gray-700">Số lượng</th>
										<th className="p-4 text-left font-semibold text-gray-700">Trạng thái</th>
										<th className="p-4 text-left font-semibold text-gray-700">Hết hạn</th>
										<th className="p-4 text-left font-semibold text-gray-700">Cập nhật</th>
									</tr>
								</thead>
								<tbody>
									{stock.map((item) => {
										const expiryDate = item.expiryDate || item.expirationDate;
										const status = getStockStatus(item.quantity, expiryDate);
										const StatusIcon = status.icon;

										return (
											<tr key={item._id} className="border-b hover:bg-gray-50 transition-colors">
												<td className="p-4 text-sm text-gray-600">
													{item.productType === "blood_component" ? "Chế phẩm máu" : "Máu toàn phần"}
												</td>
												<td className="p-4">
													<span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
														{productLabel(item)}
													</span>
												</td>
												<td className="p-4 font-semibold text-gray-800">{item.quantity || 0}ml</td>
												<td className="p-4">
													<span
														className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit ${status.color}`}>
														<StatusIcon size={14} />
														{status.label}
													</span>
												</td>
												<td className="p-4 text-sm text-gray-600">
													{expiryDate ? (
														<span className="flex items-center gap-2">
															<Calendar size={16} className="text-gray-400" />
															{new Date(expiryDate).toLocaleDateString("vi-VN")}
														</span>
													) : (
														"N/A"
													)}
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
