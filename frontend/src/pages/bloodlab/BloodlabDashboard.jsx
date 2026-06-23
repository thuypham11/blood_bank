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
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchDashboardData = async () => { // lấy dữ liệu từ backend
		try {
			const token = localStorage.getItem("token"); // lấy token từ localStorage để xác thực

			if (!token) {
				toast.error("Yêu cầu xác thực");
				return;
			}

			const [dashboardRes, stockRes, profileRes] = await Promise.all([ // thực hiện 3 request song song để lấy dữ liệu dashboard, tồn kho máu và thông tin phòng xét nghiệm
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
			]);

			setDashboard(dashboardRes.data);

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
		// await fetchDashboardData(); // gọi lại hàm fetchDashboardData để lấy dữ liệu mới nhất từ backend
		setRefreshing(false);
		toast.success("Đã cập nhật bảng điều khiển");
	};

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			await fetchDashboardData();
			setLoading(false);
		};
		loadData();
	}, []);

	if (loading) {
		return (
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

	const totalUnits = stock.reduce((sum, blood) => sum + (blood.quantity || 0), 0);
	const criticalStock = stock.filter((blood) => (blood.quantity || 0) < 10).length;

	const loginHistory = lab?.history?.filter((h) => h.eventType === "Login") || [];

	return (
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
					className="mt-4 lg:mt-0 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
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
							className={`px-3 py-1 rounded-full text-sm font-medium ${
								lab.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
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
					trend={dashboard?.stats?.campsTrend}
					color="blue"
				/>
				<MetricCard
					icon={<Users className="w-6 h-6" />}
					label="Tổng Người Hiến"
					value={dashboard?.stats?.totalDonors || 0}
					trend={dashboard?.stats?.donorsTrend}
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
								return (
									<BloodStockItem
										key={blood._id}
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

				{/* Phần chiến dịch gần đây */}
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
			className={`bg-white rounded-xl shadow-lg border-l-4 ${
				alert ? "border-l-red-400" : colors.border
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
					className={`p-3 rounded-lg ${
						alert ? "bg-red-100 text-red-600" : `${colors.bg} ${colors.text}`
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
				className={`px-3 py-1 rounded-full text-xs font-medium ${
					camp.status === "Upcoming"
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
