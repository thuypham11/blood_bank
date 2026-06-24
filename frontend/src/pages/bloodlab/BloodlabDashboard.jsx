import React, { useEffect, useState } from "react";
import axios from "axios"; // gui request tu frontend den backend
import {
	Droplet,
	Calendar,
	Users,
	Activity,
	Clock,
	MapPin,
	Phone,
	Mail,
	Building2,
	Shield,
	Timer,
	LogIn,
	AlertCircle,
	RefreshCw,
	Beaker,
	Stethoscope,
	Heart,
	TrendingUp,
} from "lucide-react";
import { toast } from "react-hot-toast";


const API_URL = "http://localhost:5000/api/blood-lab"; // day la dia chi backend cua blood lab

const BloodLabDashboard = () => {
	const [dashboard, setDashboard] = useState(null);
	const [stock, setStock] = useState([]);
	const [lab, setLab] = useState(null);
	const [consumptionReport, setConsumptionReport] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);


	const fetchDashboardData = async () => { // lấy dữ liệu từ backend
		try {
			const token = localStorage.getItem("token"); // lấy token từ localStorage để xác thực

			if (!token) {
				toast.error("Yêu cầu xác thực");
				return;
			}

			const [dashboardRes, stockRes, profileRes, consumptionRes] = await Promise.all([ // thực hiện các request song song để lấy dữ liệu dashboard
				axios
					.get(`${API_URL}/dashboard`, {
						headers: { Authorization: `Bearer ${token}` },
					})
					.catch((err) => {
						throw err;
					}),
				axios
					.get(`${API_URL}/blood/stock`, {
						headers: { Authorization: `Bearer ${token}` },
					})
					.catch((err) => {
						throw err;
					}),
				axios
					.get(`${API_URL}/history`, {
						headers: { Authorization: `Bearer ${token}` },
					})
					.catch(() =>
						axios.get(`${API_URL}/dashboard`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
					),
				axios.get(`${API_URL}/reports/blood-consumption?rangeDays=90&forecastDays=30`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);

			setDashboard(dashboardRes.data);
			setConsumptionReport(consumptionRes.data);

			let stockData = [];
			if (stockRes.data.data) {
				stockData = stockRes.data.data;
			} else if (stockRes.data.stock) {
				stockData = stockRes.data.stock;
			} else if (Array.isArray(stockRes.data)) {
				stockData = stockRes.data;
			}
			setStock(stockData);

			const facilityProfile = dashboardRes.data.facility || {};
			let historyData = [];
			if (profileRes.data.activity) {
				historyData = profileRes.data.activity;
			} else {
				historyData = facilityProfile.history || [];
			}

			setLab({
				...facilityProfile,
				history: historyData,
			});
		} catch (error) {
			console.error("Lỗi Dashboard:", error);
			const message = error.response?.data?.message || "Không thể tải dữ liệu bảng điều khiển";
			toast.error(message);
		}
	};
	const handleRefresh = async () => { // làm mới dữ liệu trên bảng điều khiển
		setRefreshing(true); // bật trạng thái làm mới
		await fetchDashboardData(); // gọi lại hàm fetchDashboardData để lấy dữ liệu mới nhất từ backend
		setRefreshing(false); // tắt trạng thái làm mới sau khi dữ liệu đã được cập nhật
		toast.success("Đã cập nhật bảng điều khiển");
	};

	useEffect(() => { // khi component được mount, gọi hàm fetchDashboardData để lấy dữ liệu ban đầu cho bảng điều khiển
		const loadData = async () => { // tạo một hàm bất đồng bộ để tải dữ liệu
			setLoading(true); // bật trạng thái loading trước khi bắt đầu tải dữ liệu
			await fetchDashboardData();
			setLoading(false);
		};
		loadData(); // gọi hàm loadData để bắt đầu quá trình tải dữ liệu khi component được render lần đầu tiên
	}, []);

	if (loading) { // nếu đang trong trạng thái loading, hiển thị một giao diện đơn giản để thông báo người dùng rằng dữ liệu đang được tải
		return ( // giao diện loading đơn giản với biểu tượng và thông báo
			<div className="min-h-screen bg-linear-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Beaker className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-2">Đang Tải Bảng Điều Khiển</h2>
					<p className="text-gray-500">Đang chuẩn bị thông tin xét nghiệm...</p>
				</div>
			</div>
		);
	}



	const totalUnits = stock.reduce((sum, blood) => sum + (blood.quantity || 0), 0);  // tính tổng số đơn vị máu bằng cách cộng dồn số lượng của từng nhóm máu trong tồn kho
	const criticalStock = stock.filter((blood) => (blood.quantity || 0) < 10).length; // đếm số nhóm máu có tồn kho thấp bằng cách lọc các nhóm máu có số lượng nhỏ hơn 10 và lấy độ dài của mảng kết quả

	const loginHistory = lab?.history?.filter((h) => h.eventType === "Login") || []; // lọc lịch sử hoạt động của phòng xét nghiệm để chỉ lấy các sự kiện có loại "Login", nếu không có lịch sử hoặc không có sự kiện nào là "Login", trả về một mảng rỗng

	return (//` giao diện chính của bảng điều khiển phòng xét nghiệm, hiển thị thông tin tổng quan, tồn kho máu, chiến dịch gần đây, lịch sử truy cập và hoạt động của phòng xét nghiệm
		<div className="min-h-screen bg-linear-to-br from-red-50 to-white p-6">
			{/* Tiêu đề */}
			<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
						<div className="p-2 bg-red-100 rounded-xl">
							<Beaker className="w-6 h-6 text-red-600" />
						</div>
						Bảng Điều Khiển Phòng Xét Nghiệm
					</h1>
					<p className="text-gray-600 mt-2">Tổng quan toàn diện về hoạt động phòng xét nghiệm máu</p>
				</div>

				<button
					onClick={handleRefresh}
					disabled={refreshing}
					className="mt-4 lg:mt-0 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
				>
					<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
					{refreshing ? "Đang làm mới..." : "Làm Mới Dữ Liệu"}
				</button>
			</div>

			{/* Banner cảnh báo tồn kho nguy cấp */}
			{criticalStock > 0 && (
				<div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
					<div>
						<p className="font-medium text-red-800">Cảnh Báo Tồn Kho Thấp</p>
						<p className="text-red-600 text-sm">{criticalStock} nhóm máu đang ở mức tồn kho nguy cấp</p>
					</div>
				</div>
			)}

			{/* Thẻ thông tin phòng xét nghiệm */}
			{lab && (
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-8">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
							<Building2 className="w-5 h-5 text-red-600" />
							Tổng Quan Phòng Xét Nghiệm
						</h2>
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${lab.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
								}`}>
							{lab.status === "approved"
								? "Đã Duyệt"
								: lab.status?.charAt(0).toUpperCase() + lab.status?.slice(1)}
						</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<LabInfo icon={<Mail className="w-4 h-4" />} label="Email" value={lab.email} />
						<LabInfo icon={<Phone className="w-4 h-4" />} label="Điện Thoại" value={lab.phone} />
						<LabInfo
							icon={<Clock className="w-4 h-4" />}
							label="Giờ Hoạt Động"
							value={`${lab.operatingHours?.open || "--"} - ${lab.operatingHours?.close || "--"}`}
						/>
						<LabInfo
							icon={<MapPin className="w-4 h-4" />}
							label="Địa Điểm"
							value={`${lab.address?.city}, ${lab.address?.state}`}
							truncate
						/>
					</div>
				</div>
			)}

			{/* Lưới chỉ số chính */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<MetricCard
					icon={<Calendar className="w-6 h-6" />}
					label="Tổng Chiến Dịch"
					value={dashboard?.stats?.totalCamps || 0}
					trend={dashboard?.stats?.campsTrend} // hiển thị xu hướng tăng giảm của tổng chiến dịch so với tháng trước nếu có dữ liệu
					color="blue"
				/>
				<MetricCard
					icon={<Users className="w-6 h-6" />}
					label="Tổng Người Hiến"
					value={dashboard?.stats?.totalDonors || 0}
					trend={dashboard?.stats?.donorsTrend} // hiển thị xu hướng tăng giảm của tổng người hiến so với tháng trước nếu có dữ liệu
					color="green"
				/>
				<MetricCard
					icon={<Droplet className="w-6 h-6" />}
					label="Đơn Vị Máu"
					value={totalUnits}
					subtitle={`${criticalStock} nguy cấp`}
					color="red"
					alert={criticalStock > 0}
				/>
				<MetricCard
					icon={<Activity className="w-6 h-6" />}
					label="Chiến Dịch Đang Hoạt Động"
					value={dashboard?.stats?.upcomingCamps || 0}
					color="purple"
				/>
			</div>

			{consumptionReport && (
				<Section
					title="Dự Báo Tiêu Thụ Máu"
					icon={<TrendingUp className="w-5 h-5 text-red-600" />}
					subtitle={`Dựa trên ${consumptionReport.filters?.rangeDays || 90} ngày gần nhất, dự báo ${consumptionReport.filters?.forecastDays || 30} ngày tới`}
					className="mb-8">
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<ReportMetric label="Tồn kho" value={consumptionReport.summary?.currentStockMl} suffix="ml" />
						<ReportMetric label="Nhu cầu dự báo" value={consumptionReport.summary?.forecastDemandMl} suffix="ml" />
						<ReportMetric label="Cần bổ sung" value={consumptionReport.summary?.reorderSuggestionMl} suffix="ml" alert />
						<ReportMetric label="Sắp hết hạn" value={consumptionReport.summary?.expiringSoonMl} suffix="ml" />
					</div>

					<div className="overflow-x-auto">
						<table className="w-full min-w-175 text-sm">
							<thead>
								<tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
									<th className="pb-3">Nhóm máu</th>
									<th className="pb-3 text-right">Tồn kho</th>
									<th className="pb-3 text-right">Trung bình/ngày</th>
									<th className="pb-3 text-right">Dự báo</th>
									<th className="pb-3 text-right">Cần bổ sung</th>
									<th className="pb-3 text-right">Rủi ro</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{consumptionReport.byBloodType
									?.filter((item) => item.currentStockMl > 0 || item.forecastDemandMl > 0 || item.openDemandMl > 0)
									.map((item) => (
										<tr key={item.bloodType}>
											<td className="py-3 font-bold text-red-600">{item.bloodType}</td>
											<td className="py-3 text-right">{Number(item.currentStockMl || 0).toLocaleString("vi-VN")} ml</td>
											<td className="py-3 text-right">{Number(item.averageDailyDemandMl || 0).toLocaleString("vi-VN")} ml</td>
											<td className="py-3 text-right">{Number(item.forecastDemandMl || 0).toLocaleString("vi-VN")} ml</td>
											<td className="py-3 text-right font-semibold">{Number(item.reorderSuggestionMl || 0).toLocaleString("vi-VN")} ml</td>
											<td className="py-3 text-right"><RiskBadge level={item.riskLevel} /></td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				</Section>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Phần kho máu */}
				<Section
					title="Tồn Kho Máu"
					icon={<Droplet className="w-5 h-5" />}
					subtitle="Mức tồn kho máu hiện tại">
					{stock.length > 0 ? (
						<div className="space-y-3">
							{stock.map((blood) => {
								const bloodType = blood.bloodGroup || blood.bloodType;
								const quantity = blood.quantity || 0;
								return ( // hiển thị từng nhóm máu trong tồn kho với thông tin về nhóm máu, số lượng và cảnh báo nếu tồn kho thấp, sử dụng component BloodStockItem để hiển thị thông tin chi tiết của từng nhóm máu
									<BloodStockItem
										key={blood.bloodType || blood.bloodGroup}
										bloodType={bloodType}
										quantity={quantity}
										critical={quantity < 10}
									/>
								);
							})}
						</div>
					) : (
						<EmptyState icon={<Droplet className="w-8 h-8" />} message="Chưa có dữ liệu tồn kho máu" />
					)}
				</Section>


				<Section
					title="Chiến Dịch Hiến Máu Gần Đây"
					icon={<Calendar className="w-5 h-5" />}
					subtitle="Các chiến dịch được tổ chức gần đây">
					{dashboard?.recentCamps?.length > 0 ? (
						<div className="space-y-4">
							{dashboard.recentCamps.slice(0, 4).map((camp) => (
								<CampCard key={camp._id} camp={camp} />
							))}
						</div>
					) : (
						<EmptyState
							icon={<Calendar className="w-8 h-8" />}
							message="Chưa có chiến dịch nào được tổ chức"
						/>
					)}
				</Section>
			</div>

			{/* Phần lịch sử truy cập */}
			<Section
				title="Lịch Sử Truy Cập"
				icon={<Shield className="w-5 h-5" />}
				subtitle="Hoạt động đăng nhập gần đây"
				className="mt-8">
				{loginHistory.length > 0 ? (
					<div className="space-y-3">
						{loginHistory
							.slice(-5)
							.reverse()
							.map((h, idx) => (
								<LoginHistoryItem key={h._id || idx} history={h} />
							))}
					</div>
				) : (
					<EmptyState icon={<LogIn className="w-8 h-8" />} message="Chưa có lịch sử truy cập" />
				)}
			</Section>

			{/* Phần lịch sử hoạt động */}
			{lab?.history?.length > 0 && (
				<Section
					title="Hoạt Động Gần Đây"
					icon={<Activity className="w-5 h-5" />}
					subtitle="Tất cả hoạt động của phòng xét nghiệm"
					className="mt-8">
					<div className="space-y-3">
						{lab.history
							.slice(-5)
							.reverse()
							.map((h, idx) => (
								<ActivityHistoryItem key={h._id || idx} history={h} />
							))}
					</div>
				</Section>
			)}
		</div>
	);
};

// Các component dùng chung
// MetricCard: hiển thị một thẻ chỉ số với biểu tượng, nhãn, giá trị, phụ đề và xu hướng tăng giảm nếu có dữ liệu
const MetricCard = ({ icon, label, value, subtitle, trend, color, alert = false }) => {
	const colorClasses = {
		blue: { border: "border-l-blue-400", bg: "bg-blue-100", text: "text-blue-600" },
		green: { border: "border-l-green-400", bg: "bg-green-100", text: "text-green-600" },
		red: { border: "border-l-red-400", bg: "bg-red-100", text: "text-red-600" },
		purple: { border: "border-l-purple-400", bg: "bg-purple-100", text: "text-purple-600" },
	};

	const colors = colorClasses[color] || colorClasses.blue;

	return (
		<div
			className={`bg-white rounded-xl shadow-lg border-l-4 ${alert ? "border-l-red-400" : colors.border
				} p-5 relative overflow-hidden`}>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
					<p className="text-2xl font-bold text-gray-800">{value.toLocaleString("vi-VN")}</p>
					{subtitle && (
						<p className={`text-xs ${alert ? "text-red-600" : "text-gray-500"} mt-1`}>{subtitle}</p>
					)}
				</div>
				<div
					className={`p-3 rounded-lg ${alert ? "bg-red-100 text-red-600" : `${colors.bg} ${colors.text}`
						}`}>
					{icon}
				</div>
			</div>
			{trend && (
				<div className="flex items-center gap-1 mt-3 text-xs">
					<TrendingUp className="w-3 h-3 text-green-500" />
					<span className="text-green-600 font-medium">{trend}%</span>
					<span className="text-gray-500">so với tháng trước</span>
				</div>
			)}
		</div>
	);
};

const Section = ({ title, icon, subtitle, children, className = "" }) => (
	<div className={`bg-white rounded-2xl shadow-lg border border-red-50 p-6 ${className}`}>
		<div className="flex items-center justify-between mb-4">
			<div>
				<h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
					{icon} {title}
				</h3>
				{subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
			</div>
		</div>
		{children}
	</div>
);

const ReportMetric = ({ label, value = 0, suffix = "", alert = false }) => (
	<div className={`rounded-xl border p-4 ${alert && value > 0 ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
		<p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
		<p className={`mt-1 text-xl font-bold ${alert && value > 0 ? "text-red-600" : "text-gray-800"}`}>
			{Number(value || 0).toLocaleString("vi-VN")} {suffix}
		</p>
	</div>
);

const RiskBadge = ({ level }) => {
	const config = {
		critical: { label: "Nguy cấp", className: "bg-red-100 text-red-700" },
		high: { label: "Cao", className: "bg-orange-100 text-orange-700" },
		medium: { label: "Trung bình", className: "bg-yellow-100 text-yellow-700" },
		low: { label: "Thấp", className: "bg-green-100 text-green-700" },
	};
	const current = config[level] || config.low;
	return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${current.className}`}>{current.label}</span>;
};

const LabInfo = ({ icon, label, value, truncate = false }) => (
	<div className="flex items-start gap-3">
		<div className="p-2 bg-red-100 rounded-lg text-red-600 mt-1">{icon}</div>
		<div>
			<p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
			<p className={`font-medium text-gray-800 ${truncate ? "truncate" : ""}`}>{value || "—"}</p>
		</div>
	</div>
);

const BloodStockItem = ({ bloodType, quantity, critical = false }) => (
	<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
		<div className="flex items-center gap-3">
			<div
				className={`p-2 rounded-lg ${critical ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
				<Droplet className="w-4 h-4" />
			</div>
			<span className="font-medium text-gray-800">{bloodType}</span>
		</div>
		<div className="text-right">
			<span className={`font-bold ${critical ? "text-red-600" : "text-gray-800"}`}>
				{quantity} đơn vị
			</span>
			{critical && <p className="text-xs text-red-500 mt-1">Tồn kho thấp</p>}
		</div>
	</div>
);

const CampCard = ({ camp }) => (
	<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
		<div className="flex-1">
			<h4 className="font-medium text-gray-800 mb-1">{camp.title}</h4>
			<p className="text-sm text-gray-600">{new Date(camp.date).toLocaleDateString("vi-VN")}</p>
		</div>
		<div className="text-right">
			<span
				className={`px-3 py-1 rounded-full text-xs font-medium ${camp.status === "Upcoming"
					? "bg-yellow-100 text-yellow-700"
					: camp.status === "Completed"
						? "bg-green-100 text-green-700"
						: "bg-gray-100 text-gray-600"
					}`}>
				{camp.status === "Upcoming"
					? "Sắp Diễn Ra"
					: camp.status === "Completed"
						? "Đã Hoàn Thành"
						: camp.status === "Ongoing"
							? "Đang Diễn Ra"
							: camp.status === "Cancelled"
								? "Đã Hủy"
								: camp.status}
			</span>
			{camp.expectedDonors && (
				<p className="text-xs text-gray-500 mt-1">{camp.expectedDonors} người hiến</p>
			)}
		</div>
	</div>
);

const LoginHistoryItem = ({ history }) => (
	<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
		<div className="flex items-center gap-3">
			<div className="p-2 bg-blue-100 rounded-lg text-blue-600">
				<LogIn className="w-3 h-3" />
			</div>
			<div>
				<p className="text-sm font-medium text-gray-800">Truy Cập Hệ Thống</p>
				<p className="text-xs text-gray-500">{history.description || "Đăng nhập thành công"}</p>
			</div>
		</div>
		<span className="text-xs text-gray-500">{new Date(history.date).toLocaleString("vi-VN")}</span>
	</div>
);

const ActivityHistoryItem = ({ history }) => {
	const getIcon = (eventType) => {
		switch (eventType) {
			case "Login":
				return <LogIn className="w-3 h-3" />;
			case "Stock Update":
				return <Droplet className="w-3 h-3" />;
			case "Blood Camp":
				return <Calendar className="w-3 h-3" />;
			default:
				return <Activity className="w-3 h-3" />;
		}
	};

	const getColor = (eventType) => {
		switch (eventType) {
			case "Login":
				return "bg-blue-100 text-blue-600";
			case "Stock Update":
				return "bg-green-100 text-green-600";
			case "Blood Camp":
				return "bg-purple-100 text-purple-600";
			default:
				return "bg-gray-100 text-gray-600";
		}
	};

	const getLabel = (eventType) => {
		switch (eventType) {
			case "Login":
				return "Đăng Nhập";
			case "Stock Update":
				return "Cập Nhật Kho";
			case "Blood Camp":
				return "Chiến Dịch Máu";
			default:
				return eventType;
		}
	};

	return (
		<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
			<div className="flex items-center gap-3">
				<div className={`p-2 rounded-lg ${getColor(history.eventType)}`}>
					{getIcon(history.eventType)}
				</div>
				<div>
					<p className="text-sm font-medium text-gray-800">{getLabel(history.eventType)}</p>
					<p className="text-xs text-gray-500">{history.description || "Hoạt động đã ghi nhận"}</p>
				</div>
			</div>
			<span className="text-xs text-gray-500">{new Date(history.date).toLocaleString("vi-VN")}</span>
		</div>
	);
};

const EmptyState = ({ icon, message }) => (
	<div className="text-center py-8 text-gray-500">
		<div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
			{icon}
		</div>
		<p className="text-sm">{message}</p>
	</div>
);

export default BloodLabDashboard;
