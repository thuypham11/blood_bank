import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
	Bell,
	LogOut,
	Menu,
	X,
	User,
	BarChart3,
	CheckCircle,
	Droplet,
	ClipboardList,
	Activity,
	History,
	Building,
	Shield,
	Calendar,
	AlertTriangle,
	ClipboardPlus,
	Ambulance,
	TestTube,
	ChevronLeft,
	ChevronRight,
	Search,
	Settings,
	Loader2,
	Clock,        // 🆕 THÊM DÒNG NÀY
	MapPin,       // 🆕 THÊM (nếu dùng cho camps)
	Beaker, 
} from "lucide-react";
import BloodChatbot from "../Chatbot/BloodChatbot";
const DashboardLayout = ({ userRole = "donor" }) => {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [userData, setUserData] = useState(null);
	const [isScrolled, setIsScrolled] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const navigate = useNavigate();
	const location = useLocation();

	// Bảng màu chủ đề Ngân hàng Máu
	const theme = {
		primary: {
			50: "#fef2f2",
			100: "#fee2e2",
			200: "#fecaca",
			300: "#fca5a5",
			400: "#f87171",
			500: "#ef4444",
			600: "#dc2626",
			700: "#b91c1c",
			800: "#991b1b",
			900: "#7f1d1d",
		},
		secondary: {
			50: "#f8fafc",
			100: "#f1f5f9",
			200: "#e2e8f0",
			300: "#cbd5e1",
			400: "#94a3b8",
			500: "#64748b",
			600: "#475569",
			700: "#334155",
			800: "#1e293b",
			900: "#0f172a",
		},
		accent: {
			50: "#f0f9ff",
			100: "#e0f2fe",
			200: "#bae6fd",
			300: "#7dd3fc",
			400: "#38bdf8",
			500: "#0ea5e9",
			600: "#0284c7",
			700: "#0369a1",
			800: "#075985",
			900: "#0c4a6e",
		},
	};

	// Cấu hình menu theo vai trò người dùng
	const menuConfig = {
		donor: {
			title: "Người Hiến Máu",
			subtitle: "Hãy Là Anh Hùng, Cứu Sống Nhiều Người",
			shortTitle: "Người Hiến Máu",
			icon: Droplet,
			items: [
				{ path: "/donor", label: "Bảng Điều Khiển", icon: BarChart3, badge: null },
				{ path: "/donor/book", label: "Đăng Ký Hiến Máu", icon: Calendar },  // 🆕 THÊM
    { path: "/donor/my-appointments", label: "Lịch Hẹn Của Tôi", icon: Clock }, 
				{ path: "/donor/profile", label: "Hồ Sơ Của Tôi", icon: User, badge: null },
				{ path: "/donor/history", label: "Lịch Sử Hiến Máu", icon: History, badge: null },
				{ path: "/donor/camps", label: "Điểm Hiến Máu", icon: Calendar, badge: null },
				{ path: "/donor/test-results", label: "Kết Quả Xét Nghiệm", icon: Beaker, badge: null }
			],
		},
		hospital: {
			title: "Bệnh Viện",
			subtitle: "Yêu Cầu Máu & Quản Lý Kho",
			shortTitle: "Bệnh Viện",
			icon: Building,
			items: [
				{ path: "/hospital", label: "Bảng Điều Khiển", icon: BarChart3, badge: null },
				{
					path: "/hospital/blood-request-create",
					label: "Yêu Cầu Máu",
					icon: ClipboardList,
					badge: null,
				},
				{ path: "/hospital/inventory", label: "Kho Máu", icon: Droplet, badge: null },
				{ path: "/hospital/donors", label: "Người Hiến Máu", icon: User, badge: null },
				{ path: "/hospital/blood-request-history", label: "Lịch Sử", icon: Ambulance, badge: null },
			],
		},
		blood_lab: {
			title: "Trung Tâm Xét Nghiệm Máu",
			subtitle: "Kiểm Tra & Kiểm Soát Chất Lượng",
			shortTitle: "Phòng Lab",
			icon: TestTube,
			items: [
				{ path: "/lab", label: "Bảng Điều Khiển", icon: BarChart3, badge: null },
				{ path: "/lab/inventory", label: "Kho Máu", icon: Droplet, badge: null },
				{ path: "/lab/Donor", label: "Người Hiến Máu", icon: User, badge: null },
				{ path: "/lab/camps", label: "Điểm Hiến Máu", icon: Calendar, badge: null },
				{ path: "/lab/requests", label: "Yêu Cầu", icon: ClipboardList, badge: null },
				{ path: "/lab/profile", label: "Hồ Sơ", icon: CheckCircle, badge: null },
			],
		},
		admin: {
			title: "Quản Trị Viên",
			subtitle: "Quản Trị Hệ Thống",
			shortTitle: "Quản Trị",
			icon: Shield,
			items: [
				{ path: "/admin", label: "Tổng Quan", icon: BarChart3, badge: null },
				{ path: "/admin/verification", label: "Xác Minh", icon: Shield, badge: null },
				{ path: "/admin/facilities", label: "Cơ Sở Y Tế", icon: Building, badge: null },
				{ path: "/admin/donors", label: "Người Hiến Máu", icon: User, badge: null },
				{ path: "/admin/profile", label: "Hồ Sơ", icon: Settings, badge: null },
			],
		},
	};

	useEffect(() => {
		const fetchUserData = async () => {
			setIsLoading(true);
			const token = localStorage.getItem("token");
			if (!token) {
				navigate("/login");
				return;
			}

			const maxRetries = 3;
			let attempt = 0;

			while (attempt < maxRetries) {
				try {
					const res = await fetch("http://localhost:5000/api/auth/profile", {
						headers: { Authorization: `Bearer ${token}` },
					});

					if (res.ok) {
						const data = await res.json();
						const user = data.user;

						if (!user) {
							throw new Error("Cấu trúc dữ liệu người dùng không hợp lệ.");
						}

						if (user.role.toLowerCase() !== userRole.toLowerCase()) {
							console.error(`Vai trò không khớp: mong đợi ${userRole}, nhận được ${user.role}`);
							localStorage.removeItem("token");
							navigate("/login");
							return;
						}

						setUserData(user);
						setIsLoading(false);
						return;
					} else if (res.status === 401 || res.status === 403) {
						console.error("Xác thực thất bại hoặc phiên đăng nhập hết hạn.");
						localStorage.removeItem("token");
						navigate("/login");
						setIsLoading(false);
						return;
					}
				} catch (error) {
					console.error(`Lần thử ${attempt + 1}: Không thể tải dữ liệu người dùng.`, error);
				}

				attempt++;
				if (attempt < maxRetries) {
					await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
				}
			}

			console.error("Tất cả các lần thử đều thất bại.");
			localStorage.removeItem("token");
			navigate("/login");
			setIsLoading(false);
		};

		fetchUserData();
	}, [userRole, navigate]);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const normalizedRole = userRole?.toLowerCase().replace("-", "_");
	const config = menuConfig[normalizedRole] || {
		title: "Bảng Điều Khiển",
		subtitle: "Chào mừng đến với Hệ thống Quản lý Ngân hàng Máu",
		shortTitle: "Ứng Dụng",
		icon: BarChart3,
		items: [],
	};

	const handleLogout = () => {
		localStorage.removeItem("token");
		navigate("/login");
	};

	const getBadgeColor = (badge) => {
		if (badge === "Mới") return "bg-green-500 text-white";
		if (badge === "Thấp") return "bg-red-500 text-white";
		if (badge === "Cao") return "bg-orange-500 text-white";
		return "bg-blue-500 text-white";
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="flex flex-col items-center">
					<Loader2 className="w-8 h-8 animate-spin text-red-600" />
					<p className="mt-4 text-gray-600 font-semibold">Đang tải bảng điều khiển...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-red-50 to-white">
			{/* HEADER */}
			<header
				className={`flex justify-between items-center bg-white/95 backdrop-blur-md shadow-sm border-b border-red-100 px-4 sm:px-6 py-3 sticky top-0 z-50 transition-all duration-300 ${
					isScrolled ? "shadow-lg" : "shadow-sm"
				}`}
				style={{
					background: `linear-gradient(135deg, ${theme.primary[50]} 0%, white 50%, ${theme.primary[50]} 100%)`,
				}}>
				{/* Phần bên trái */}
				<div className="flex items-center gap-3">
					<button
						onClick={() => setSidebarOpen(!sidebarOpen)}
						className="lg:hidden p-2 rounded-lg hover:bg-red-100 transition-all duration-200"
						style={{ color: theme.primary[600] }}>
						{sidebarOpen ? <X size={20} /> : <Menu size={20} />}
					</button>

					{/* Logo và tiêu đề */}
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-red-100 shadow-sm">
							<ClipboardPlus size={20} className="text-red-600" />
						</div>
						<div className="hidden sm:block">
							<h1 className="text-lg sm:text-xl font-bold" style={{ color: theme.primary[700] }}>
								{config.title}
							</h1>
							<p className="text-xs sm:text-sm" style={{ color: theme.secondary[500] }}>
								{config.subtitle}
							</p>
						</div>
						<div className="sm:hidden">
							<h1 className="text-lg font-bold" style={{ color: theme.primary[700] }}>
								{config.shortTitle}
							</h1>
						</div>
					</div>
				</div>

				{/* Phần bên phải */}
				<div className="flex items-center gap-2 sm:gap-4">
					<div className="flex items-center gap-2 sm:gap-3">
						<div
							className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white"
							style={{
								background: `linear-gradient(135deg, ${theme.primary[500]}, ${theme.primary[600]})`,
							}}>
							{userData?.name?.charAt(0)?.toUpperCase() ||
								userData?.fullName?.charAt(0)?.toUpperCase() ||
								"U"}
						</div>
						<div className="hidden sm:block text-right">
							<span className="font-medium block text-sm" style={{ color: theme.primary[700] }}>
								{userData?.name || userData?.fullName || "Người Dùng"}
							</span>
							<span className="text-xs capitalize" style={{ color: theme.secondary[500] }}>
								{userRole === "donor"
									? "Người Hiến Máu"
									: userRole === "hospital"
										? "Bệnh Viện"
										: userRole === "blood_lab"
											? "Phòng Nghiên Cứu"
											: userRole === "admin"
												? "Quản Trị Viên"
												: userRole}
							</span>
						</div>
					</div>

					{/* Nút đăng xuất */}
					<button
						onClick={handleLogout}
						className="p-2 rounded-lg hover:bg-red-100 transition-all duration-200 hidden sm:block"
						style={{ color: theme.primary[600] }}
						title="Đăng Xuất">
						<LogOut size={20} />
					</button>
				</div>
			</header>

			{/* KHU VỰC NỘI DUNG CHÍNH */}
			<div className="flex flex-1 relative">
				{/* THANH BÊN */}
				<aside
					className={`${
						sidebarOpen ? "translate-x-0" : "-translate-x-full"
					} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 ${
						sidebarCollapsed ? "w-16" : "w-64"
					} bg-white shadow-xl border-r border-red-100 transition-all duration-300 flex flex-col transform lg:transform-none`}
					style={{
						background: `linear-gradient(to bottom, ${theme.primary[50]}, white)`,
					}}>
					{/* Tiêu đề thanh bên */}
					<div
						className={`flex items-center border-b border-red-100 h-16 ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
						{!sidebarCollapsed && (
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-red-100">
									{config.icon ? (
										<config.icon size={20} className="text-red-600" />
									) : (
										<Droplet size={20} className="text-red-600" />
									)}
								</div>
								<div>
									<h2 className="font-bold text-sm" style={{ color: theme.primary[700] }}>
										{config.shortTitle}
									</h2>
									<p className="text-xs" style={{ color: theme.secondary[500] }}>
										Cổng thông tin
									</p>
								</div>
							</div>
						)}
						<button
							onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
							className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
							style={{ color: theme.primary[600] }}>
							{sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
						</button>
					</div>

					{/* Menu điều hướng */}
					<nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? "px-2 py-4" : "p-4"}`}>
						<div className="flex flex-col gap-1">
							{config.items.map((item) => {
								const Icon = item.icon;
								const isActive = location.pathname === item.path;
								return (
									<button
										key={item.path}
										onClick={() => {
											navigate(item.path);
											setSidebarOpen(false);
										}}
										className={`flex items-center w-full rounded-xl transition-all duration-200 relative group ${
											sidebarCollapsed ? "justify-center p-3" : "gap-3 p-3"
										} ${
											isActive ? "shadow-md font-semibold" : "hover:shadow-sm hover:bg-red-50"
										} ${isActive ? "text-white" : "text-gray-700 hover:text-red-700"}`}
										style={{
											background: isActive
												? `linear-gradient(135deg, ${theme.primary[500]}, ${theme.primary[600]})`
												: "transparent",
										}}
										title={sidebarCollapsed ? item.label : ""}>
										{/* Icon container - luôn hiển thị, căn giữa khi collapsed */}
										<div
											className={`flex items-center justify-center flex-shrink-0 ${
												sidebarCollapsed
													? "w-9 h-9 rounded-xl " +
														(isActive ? "bg-white/20" : "bg-red-50 group-hover:bg-red-100")
													: ""
											}`}>
											<Icon
												size={20}
												style={{
													color: isActive ? "white" : theme.primary[600],
												}}
											/>
										</div>

										{!sidebarCollapsed && (
											<>
												<span className="flex-1 text-left whitespace-nowrap text-sm">{item.label}</span>
												{item.badge && (
													<span className={`px-2 py-1 text-xs rounded-full ${getBadgeColor(item.badge)}`}>
														{item.badge}
													</span>
												)}
											</>
										)}

										{sidebarCollapsed && item.badge && (
											<span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
										)}

										{/* Tooltip khi collapsed */}
										{sidebarCollapsed && (
											<div
												className="absolute left-full ml-3 px-3 py-2 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl"
												style={{
													background: `linear-gradient(135deg, ${theme.primary[600]}, ${theme.primary[700]})`,
												}}>
												{item.label}
												{item.badge && (
													<span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">{item.badge}</span>
												)}
												{/* Mũi tên tooltip */}
												<div
													className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
													style={{ borderRightColor: theme.primary[600] }}
												/>
											</div>
										)}
									</button>
								);
							})}
						</div>
					</nav>

					{/* Phần chân thanh bên */}
					<div className="p-3 border-t border-red-100">
						{sidebarCollapsed ? (
							<div className="flex justify-center">
								<div
									className="w-9 h-9 rounded-xl flex items-center justify-center"
									style={{ background: theme.primary[100] }}
									title="Hệ Thống Ngân Hàng Máu">
									<Droplet size={18} style={{ color: theme.primary[600] }} />
								</div>
							</div>
						) : (
							<div
								className="p-3 rounded-lg text-center"
								style={{
									background: theme.primary[100],
									color: theme.primary[700],
								}}>
								<p className="text-sm font-semibold bg-gradient-to-r from-red-500 to-red-900 bg-clip-text text-transparent">
									Hệ Thống Quản Lý
								</p>
								<p className="text-sm font-semibold bg-gradient-to-r from-red-500 to-red-900 bg-clip-text text-transparent">
									Ngân Hàng Máu
								</p>
								<p className="text-xs mt-1 opacity-75">Blood Bank Management System</p>
							</div>
						)}
					</div>
				</aside>

				{/* NỘI DUNG CHÍNH */}
				<main
					className={`flex-1 transition-all duration-300 min-h-[calc(100vh-80px)] ${
						sidebarCollapsed ? "lg:ml-0" : "lg:ml-0"
					}`}>
					<div className="h-full overflow-auto p-4 sm:p-6">
						<Outlet context={{ userData, theme }} />
					</div>
				</main>
			</div>

			{/* LỚP PHỦ MOBILE */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Thanh điều hướng dưới cùng trên mobile */}
			<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-red-100 shadow-lg z-40">
				<div className="flex justify-around items-center p-2">
					{config.items.slice(0, 4).map((item) => {
						const Icon = item.icon;
						const isActive = location.pathname === item.path;
						return (
							<button
								key={item.path}
								onClick={() => navigate(item.path)}
								className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 flex-1 mx-1 ${
									isActive ? "bg-red-50 text-red-600" : "text-gray-600"
								}`}>
								<Icon size={20} />
								<span className="text-xs mt-1">{item.label.split(" ")[0]}</span>
							</button>
						);
					})}
				</div>
			</div>
			 {userRole === "donor" && <BloodChatbot />}
		</div>
	);
};

export default DashboardLayout;
