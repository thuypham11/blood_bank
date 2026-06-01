import { useState, useEffect } from "react";
import {
	Users,
	Hospital,
	Droplet,
	Calendar,
	Heart,
	TrendingUp,
	Activity,
	Shield,
	Beaker,
	ArrowRight,
	RefreshCw,
	AlertTriangle,
	CheckCircle,
	Clock,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const BLOOD_COLORS = {
	"A+": "#ef4444", "A-": "#f97316", "B+": "#eab308",
	"B-": "#22c55e", "O+": "#3b82f6", "O-": "#8b5cf6",
	"AB+": "#ec4899", "AB-": "#14b8a6",
};

const AdminDashboard = () => {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const navigate = useNavigate();

	const fetchStats = async (showToast = false) => {
		try {
			if (showToast) setRefreshing(true);
			const token = localStorage.getItem("token");
			if (!token) { window.location.href = "/login"; return; }

			const res = await fetch("http://localhost:5000/api/admin/dashboard", {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!res.ok) throw new Error("Không thể tải thống kê");
			const data = await res.json();
			setStats(data);
			if (showToast) toast.success("Cập nhật thành công!");
		} catch (err) {
			toast.error("Không thể tải thống kê quản trị");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => { fetchStats(); }, []);

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Shield className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-1">Đang tải bảng điều khiển...</h2>
					<p className="text-gray-400 text-sm">Đang chuẩn bị dữ liệu hệ thống</p>
				</div>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
					<Shield className="w-14 h-14 text-red-400 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-800 mb-2">Tải thất bại</h3>
					<button onClick={() => fetchStats(true)} className="mt-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
						Thử lại
					</button>
				</div>
			</div>
		);
	}

	const bloodTypeStats = stats.bloodTypeStats || {};
	const totalForBloodChart = Object.values(bloodTypeStats).reduce((s, v) => s + v, 0) || 1;

	const StatCard = ({ icon, label, value, subtitle, color = "red" }) => {
		const colors = {
			red: { border: "border-l-red-400", bg: "bg-red-100", text: "text-red-600" },
			blue: { border: "border-l-blue-400", bg: "bg-blue-100", text: "text-blue-600" },
			green: { border: "border-l-green-400", bg: "bg-green-100", text: "text-green-600" },
			purple: { border: "border-l-purple-400", bg: "bg-purple-100", text: "text-purple-600" },
			amber: { border: "border-l-amber-400", bg: "bg-amber-100", text: "text-amber-600" },
		}[color];
		return (
			<div className={`bg-white rounded-2xl shadow-md border-l-4 ${colors.border} p-5 hover:shadow-lg transition-all`}>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-gray-500 mb-1">{label}</p>
						<p className="text-3xl font-bold text-gray-800">{value?.toLocaleString()}</p>
						{subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
					</div>
					<div className={`p-3 rounded-xl ${colors.bg} ${colors.text}`}>{icon}</div>
				</div>
			</div>
		);
	};

	const QuickActionCard = ({ title, description, icon, href }) => (
		<div
			onClick={() => navigate(href)}
			className="bg-white rounded-2xl shadow-md border border-red-100 p-5 cursor-pointer hover:shadow-lg hover:border-red-300 transition-all group">
			<div className="flex items-start justify-between mb-3">
				<div className="p-2 bg-red-100 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
					{icon}
				</div>
				<ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" />
			</div>
			<h3 className="font-semibold text-gray-800 mb-1 group-hover:text-red-600 transition-colors">{title}</h3>
			<p className="text-gray-500 text-sm leading-relaxed">{description}</p>
		</div>
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">

				{/* Tiêu đề */}
				<div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-red-100 rounded-xl">
							<Shield className="w-7 h-7 text-red-600" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-800">Bảng Điều Khiển Quản Trị</h1>
							<p className="text-gray-500 text-sm mt-0.5">Tổng quan hệ thống quản lý ngân hàng máu</p>
						</div>
					</div>
					<button
						onClick={() => fetchStats(true)}
						disabled={refreshing}
						className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
						<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
						{refreshing ? "Đang làm mới..." : "Làm mới"}
					</button>
				</div>

				{/* Cảnh báo hệ thống */}
				{(stats.pendingFacilities > 0 || stats.upcomingCamps > 0) && (
					<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
						{stats.pendingFacilities > 0 && (
							<div
								onClick={() => navigate("/admin/verification")}
								className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
								<div className="p-2 bg-amber-100 rounded-lg">
									<Clock className="w-5 h-5 text-amber-600" />
								</div>
								<div>
									<p className="font-semibold text-amber-800">{stats.pendingFacilities} cơ sở chờ duyệt</p>
									<p className="text-amber-600 text-xs">Nhấn để xem xét ngay</p>
								</div>
								<ArrowRight className="ml-auto w-4 h-4 text-amber-400" />
							</div>
						)}
						{stats.upcomingCamps > 0 && (
							<div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
								<div className="p-2 bg-blue-100 rounded-lg">
									<Calendar className="w-5 h-5 text-blue-600" />
								</div>
								<div>
									<p className="font-semibold text-blue-800">{stats.upcomingCamps} chiến dịch đang hoạt động</p>
									<p className="text-blue-600 text-xs">Sắp tới & đang diễn ra</p>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Thống kê tổng quan */}
				<div className="mb-8">
					<h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
						<Activity className="w-5 h-5 text-red-500" /> Tổng Quan Hệ Thống
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
						<StatCard icon={<Users className="w-6 h-6" />} label="Tổng người hiến máu" value={stats.totalDonors} subtitle="Đã đăng ký" color="red" />
						<StatCard icon={<Hospital className="w-6 h-6" />} label="Cơ sở y tế" value={stats.totalFacilities} subtitle={`${stats.approvedFacilities} đã duyệt`} color="blue" />
						<StatCard icon={<Droplet className="w-6 h-6" />} label="Tổng lần hiến máu" value={stats.totalDonations} subtitle="Đơn vị đã thu" color="green" />
						<StatCard icon={<Calendar className="w-6 h-6" />} label="Chiến dịch máu" value={stats.upcomingCamps} subtitle="Sắp tới & đang diễn ra" color="purple" />
						<StatCard icon={<Heart className="w-6 h-6" />} label="Người đủ điều kiện" value={stats.activeDonors} subtitle="Sẵn sàng hiến máu" color="amber" />
					</div>
				</div>

				{/* Phân bố nhóm máu */}
				<div className="mb-8">
					<h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
						<Droplet className="w-5 h-5 text-red-500" /> Phân Bố Nhóm Máu Người Hiến
					</h2>
					<div className="bg-white rounded-2xl shadow-md border border-red-100 p-6">
						{Object.values(bloodTypeStats).every((v) => v === 0) ? (
							<p className="text-center text-gray-400 py-6">Chưa có dữ liệu nhóm máu</p>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
								{Object.entries(bloodTypeStats).map(([group, count]) => {
									const pct = Math.round((count / totalForBloodChart) * 100);
									const color = BLOOD_COLORS[group] || "#ef4444";
									return (
										<div key={group} className="flex flex-col items-center gap-2">
											<div className="relative w-full">
												<div className="w-full bg-gray-100 rounded-lg overflow-hidden" style={{ height: "80px" }}>
													<div
														className="w-full rounded-lg transition-all duration-700"
														style={{
															height: `${Math.max(pct, 4)}%`,
															backgroundColor: color,
															marginTop: `${100 - Math.max(pct, 4)}%`,
															opacity: 0.85,
														}}
													/>
												</div>
											</div>
											<div className="text-center">
												<div className="font-bold text-gray-800" style={{ color }}>{group}</div>
												<div className="text-lg font-bold text-gray-700">{count}</div>
												<div className="text-xs text-gray-400">{pct}%</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* Thao tác nhanh */}
				<div className="mb-8">
					<h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
						<Beaker className="w-5 h-5 text-red-500" /> Thao Tác Nhanh
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
						<QuickActionCard
							icon={<Shield className="w-5 h-5" />}
							title="Xác Minh Cơ Sở"
							description={`${stats.pendingFacilities} cơ sở đang chờ xét duyệt`}
							href="/admin/verification"
						/>
						<QuickActionCard
							icon={<Hospital className="w-5 h-5" />}
							title="Quản Lý Cơ Sở"
							description="Xem tất cả bệnh viện và trung tâm máu"
							href="/admin/facilities"
						/>
						<QuickActionCard
							icon={<Users className="w-5 h-5" />}
							title="Người Hiến Máu"
							description={`${stats.totalDonors} người hiến đã đăng ký`}
							href="/admin/donors"
						/>
						<QuickActionCard
							icon={<TrendingUp className="w-5 h-5" />}
							title="Hồ Sơ Quản Trị"
							description="Cập nhật thông tin và đổi mật khẩu"
							href="/admin/profile"
						/>
					</div>
				</div>

				{/* Trạng thái cơ sở */}
				<div className="bg-white rounded-2xl shadow-md border border-red-100 p-6">
					<h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
						<CheckCircle className="w-5 h-5 text-green-500" /> Trạng Thái Cơ Sở Y Tế
					</h2>
					<div className="grid grid-cols-3 gap-4">
						{[
							{ label: "Đã phê duyệt", value: stats.approvedFacilities, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
							{ label: "Chờ duyệt", value: stats.pendingFacilities, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
							{ label: "Đã từ chối", value: stats.totalFacilities - stats.approvedFacilities - stats.pendingFacilities, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
						].map((item) => (
							<div key={item.label} className={`${item.bg} border ${item.border} rounded-xl p-4 text-center`}>
								<div className={`text-2xl font-bold ${item.color}`}>{Math.max(0, item.value)}</div>
								<div className="text-sm text-gray-600 mt-1">{item.label}</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AdminDashboard;
