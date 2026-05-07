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

const AdminDashboard = () => {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchStats = async (showToast = false) => {
		try {
			if (showToast) setRefreshing(true);

			const token = localStorage.getItem("token");
			if (!token) {
				window.location.href = "/login";
				return;
			}

			console.log("🔄 Đang tải thống kê bảng điều khiển quản trị...");

			const res = await fetch("http://localhost:5000/api/admin/dashboard", {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			console.log("📨 Trạng thái phản hồi:", res.status);

			if (!res.ok) {
				const errorText = await res.text();
				console.error("❌ Lỗi API Dashboard:", errorText);
				throw new Error("Không thể tải thống kê");
			}

			const data = await res.json();
			console.log("✅ Thống kê Dashboard:", data);
			setStats(data);

			if (showToast) {
				toast.success("Cập nhật bảng điều khiển thành công!");
			}
		} catch (err) {
			console.error("🚨 Lỗi Dashboard:", err);
			toast.error("Không thể tải thống kê quản trị");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchStats();
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Shield className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<h2 className="text-xl font-semibold text-gray-700 mb-2">Đang tải Bảng Điều Khiển Quản Trị</h2>
					<p className="text-gray-500">Đang chuẩn bị tổng quan hệ thống...</p>
				</div>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center bg-white rounded-2xl shadow-lg border border-red-100 p-8">
					<Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-800 mb-2">Tải bảng điều khiển thất bại</h3>
					<p className="text-gray-600 mb-4">Không thể lấy thống kê hệ thống. Vui lòng thử lại.</p>
					<button
						onClick={() => fetchStats(true)}
						className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
						Thử lại
					</button>
				</div>
			</div>
		);
	}

	const StatCard = ({ icon, label, value, subtitle, trend, color = "red" }) => {
		const colorClasses = {
			red: { border: "border-l-red-400", bg: "bg-red-100", text: "text-red-600" },
			blue: { border: "border-l-blue-400", bg: "bg-blue-100", text: "text-blue-600" },
			green: { border: "border-l-green-400", bg: "bg-green-100", text: "text-green-600" },
			purple: { border: "border-l-purple-400", bg: "bg-purple-100", text: "text-purple-600" },
			amber: { border: "border-l-amber-400", bg: "bg-amber-100", text: "text-amber-600" },
		};

		const colors = colorClasses[color] || colorClasses.red;

		return (
			<div
				className={`bg-white rounded-2xl shadow-lg border-l-4 ${colors.border} p-6 hover:shadow-xl transition-all duration-300`}>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
						<p className="text-3xl font-bold text-gray-800">{value?.toLocaleString()}</p>
						{subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
					</div>
					<div className={`p-3 rounded-xl ${colors.bg} ${colors.text}`}>{icon}</div>
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

	const QuickActionCard = ({ title, description, icon, href, buttonText = "Quản lý" }) => (
		<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 hover:shadow-xl transition-all duration-300 group">
			<div className="flex items-start justify-between mb-4">
				<div className="p-2 bg-red-100 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
					{icon}
				</div>
				<ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
			</div>

			<h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-red-600 transition-colors">
				{title}
			</h3>
			<p className="text-gray-600 text-sm mb-4 leading-relaxed">{description}</p>

			<button
				onClick={() => (window.location.href = href)}
				className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium">
				{buttonText}
				<ArrowRight className="w-4 h-4" />
			</button>
		</div>
	);

	const AlertCard = ({ type, title, description, count, icon }) => {
		const alertConfig = {
			warning: {
				bg: "bg-amber-50",
				border: "border-amber-200",
				text: "text-amber-800",
				iconBg: "bg-amber-100",
				iconColor: "text-amber-600",
			},
			critical: {
				bg: "bg-red-50",
				border: "border-red-200",
				text: "text-red-800",
				iconBg: "bg-red-100",
				iconColor: "text-red-600",
			},
			info: {
				bg: "bg-blue-50",
				border: "border-blue-200",
				text: "text-blue-800",
				iconBg: "bg-blue-100",
				iconColor: "text-blue-600",
			},
		};

		const config = alertConfig[type] || alertConfig.info;

		return (
			<div className={`${config.bg} border ${config.border} rounded-2xl p-6`}>
				<div className="flex items-center gap-4">
					<div className={`p-3 rounded-xl ${config.iconBg} ${config.iconColor}`}>{icon}</div>
					<div>
						<h3 className={`text-lg font-semibold ${config.text}`}>{title}</h3>
						<p className={config.text}>
							{count} {description}
						</p>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8">
					<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
						<div className="flex items-center gap-4">
							<div className="p-2 bg-red-100 rounded-xl">
								<Shield className="w-8 h-8 text-red-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-800">Bảng Điều Khiển Quản Trị</h1>
								<p className="text-gray-600 mt-1">Tổng quan toàn diện về hệ thống quản lý ngân hàng máu</p>
							</div>
						</div>

						<button
							onClick={() => fetchStats(true)}
							disabled={refreshing}
							className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
							<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
							{refreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}
						</button>
					</div>

					{/* Thống kê nhanh */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
						<div className="bg-white rounded-xl p-4 text-center border border-red-100">
							<div className="text-2xl font-bold text-red-600">{stats.totalDonors}</div>
							<div className="text-sm text-gray-600">Người hiến máu</div>
						</div>
						<div className="bg-white rounded-xl p-4 text-center border border-red-100">
							<div className="text-2xl font-bold text-blue-600">{stats.totalFacilities}</div>
							<div className="text-sm text-gray-600">Cơ sở y tế</div>
						</div>
						<div className="bg-white rounded-xl p-4 text-center border border-red-100">
							<div className="text-2xl font-bold text-green-600">{stats.totalDonations}</div>
							<div className="text-sm text-gray-600">Lần hiến máu</div>
						</div>
						<div className="bg-white rounded-xl p-4 text-center border border-red-100">
							<div className="text-2xl font-bold text-purple-600">{stats.upcomingCamps}</div>
							<div className="text-sm text-gray-600">Chiến dịch</div>
						</div>
					</div>
				</div>

				{/* Lưới thống kê chính */}
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<Activity className="w-5 h-5 text-red-600" />
						Tổng Quan Hệ Thống
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
						<StatCard
							icon={<Users className="w-6 h-6" />}
							label="Tổng Người Hiến Máu"
							value={stats.totalDonors}
							subtitle="Người hiến máu đã đăng ký"
							color="red"
						/>

						<StatCard
							icon={<Hospital className="w-6 h-6" />}
							label="Cơ Sở Y Tế"
							value={stats.totalFacilities}
							subtitle="Bệnh viện & Phòng xét nghiệm"
							color="blue"
						/>

						<StatCard
							icon={<Droplet className="w-6 h-6" />}
							label="Tổng Lần Hiến Máu"
							value={stats.totalDonations}
							subtitle="Đơn vị máu đã thu thập"
							color="green"
						/>

						<StatCard
							icon={<Calendar className="w-6 h-6" />}
							label="Chiến Dịch Sắp Tới"
							value={stats.upcomingCamps}
							subtitle="Chiến dịch hiến máu đã lên lịch"
							color="purple"
						/>

						<StatCard
							icon={<Heart className="w-6 h-6" />}
							label="Người Hiến Máu Đang Hoạt Động"
							value={stats.activeDonors}
							subtitle="Mới hiến máu gần đây"
							color="amber"
						/>
					</div>
				</div>

				{/* Cảnh báo hệ thống */}
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<AlertTriangle className="w-5 h-5 text-red-600" />
						Cảnh Báo Hệ Thống
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{stats.pendingApprovals > 0 && (
							<AlertCard
								type="warning"
								title="Chờ Phê Duyệt"
								description="đăng ký cơ sở y tế đang chờ xem xét"
								count={stats.pendingApprovals}
								icon={<Clock className="w-6 h-6" />}
							/>
						)}

						{stats.criticalStock > 0 && (
							<AlertCard
								type="critical"
								title="Cảnh Báo Tồn Kho Nguy Cấp"
								description="nhóm máu có tồn kho thấp"
								count={stats.criticalStock}
								icon={<Droplet className="w-6 h-6" />}
							/>
						)}

						{stats.pendingFacilities > 0 && (
							<AlertCard
								type="info"
								title="Đơn Đăng Ký Cơ Sở Y Tế"
								description="đơn đăng ký cơ sở y tế đang chờ duyệt"
								count={stats.pendingFacilities}
								icon={<Hospital className="w-6 h-6" />}
							/>
						)}
					</div>
				</div>

				{/* Thao tác nhanh */}
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<Beaker className="w-5 h-5 text-red-600" />
						Thao Tác Nhanh
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<QuickActionCard
							icon={<Users className="w-5 h-5" />}
							title="Quản Lý Người Hiến Máu"
							description="Xem, chỉnh sửa hoặc xóa người hiến máu khỏi hệ thống ngân hàng máu"
							href="/admin/donors"
						/>

						<QuickActionCard
							icon={<Hospital className="w-5 h-5" />}
							title="Quản Lý Cơ Sở Y Tế"
							description="Phê duyệt, chỉnh sửa hoặc quản lý bệnh viện và phòng xét nghiệm máu"
							href="/admin/facilities"
						/>

						<QuickActionCard
							icon={<Droplet className="w-5 h-5" />}
							title="Lịch Sử Hiến Máu"
							description="Xem tất cả hồ sơ hiến máu, phân tích và báo cáo"
							href="/admin/donations"
						/>

						<QuickActionCard
							icon={<Calendar className="w-5 h-5" />}
							title="Chiến Dịch Hiến Máu"
							description="Theo dõi và quản lý các chiến dịch hiến máu sắp tới"
							href="/admin/camps"
							buttonText="Xem Chiến Dịch"
						/>
					</div>
				</div>

				{/* Hoạt động gần đây */}
				{stats.recentActivity && stats.recentActivity.length > 0 && (
					<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<Activity className="w-5 h-5 text-red-600" />
							Hoạt Động Gần Đây
						</h2>
						<div className="space-y-3">
							{stats.recentActivity.slice(0, 5).map((activity, index) => (
								<div
									key={index}
									className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-red-50 rounded-lg px-3 transition-colors">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-red-100 rounded-lg text-red-600">
											<Activity className="w-3 h-3" />
										</div>
										<span className="text-sm text-gray-700">{activity.description}</span>
									</div>
									<span className="text-xs text-gray-500">
										{new Date(activity.timestamp).toLocaleDateString("vi-VN")}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default AdminDashboard;
