import React, { useEffect, useState } from "react";
import axios from "axios";
import {
	Droplet,
	Calendar,
	Search,
	Filter,
	Download,
	MapPin,
	AlertCircle,
	Award,
	TrendingUp,
	Heart,
	Shield,
	Star,
	Share2,
	FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_URL = "http://localhost:5000/api/donor";

const DonorDonationHistory = () => {
	const [history, setHistory] = useState([]);
	const [filtered, setFiltered] = useState([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		totalDonations: 0,
		totalUnits: 0,
		lifeImpact: 0,
		lastDonation: null,
		favoriteFacility: "",
	});

	const [searchTerm, setSearchTerm] = useState("");
	const [filterType, setFilterType] = useState("all");
	const [sortBy, setSortBy] = useState("date-desc");

	// Tải lịch sử hiến máu
	const fetchHistory = async () => {
		try {
			const token = localStorage.getItem("token");

			if (!token) {
				toast.error("Vui lòng đăng nhập để xem lịch sử hiến máu");
				setLoading(false);
				return;
			}

			const res = await axios.get(`${API_URL}/history`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			let data = res.data.history || res.data.donations || (Array.isArray(res.data) ? res.data : []);
			console.log("Đã tải lịch sử hiến máu:", data);

			data.sort((a, b) => new Date(b.donationDate || b.date) - new Date(a.donationDate || a.date));

			setHistory(data);
			setFiltered(data);
			calculateStats(data);
		} catch (err) {
			console.error(err);
			if (err.response?.status === 401) {
				toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
			} else {
				toast.error("Không thể tải lịch sử hiến máu");
			}
		}
		setLoading(false);
	};

	// Tính toán thống kê
	const calculateStats = (data) => {
		const totalDonations = data.length;
		const totalUnits = data.reduce((sum, item) => sum + (item.quantity || 1), 0);
		const lifeImpact = totalUnits * 3;
		const lastDonation = data.length > 0 ? data[0].donationDate || data[0].date : null;

		const facilityCount = data.reduce((acc, item) => {
			const facility = item.facility || item.city || "Không xác định";
			acc[facility] = (acc[facility] || 0) + 1;
			return acc;
		}, {});

		const favoriteFacility = Object.keys(facilityCount).reduce(
			(a, b) => (facilityCount[a] > facilityCount[b] ? a : b),
			"Chưa có",
		);

		setStats({
			totalDonations,
			totalUnits,
			lifeImpact,
			lastDonation,
			favoriteFacility,
		});
	};

	// Xác định cấp độ người hiến máu
	const getDonorLevel = (count) => {
		if (count >= 10)
			return {
				level: "Anh Hùng",
				color: "from-purple-500 to-pink-500",
				icon: <Award className="w-5 h-5" />,
			};
		if (count >= 5)
			return {
				level: "Nhà Vô Địch",
				color: "from-red-500 to-orange-500",
				icon: <Star className="w-5 h-5" />,
			};
		if (count >= 3)
			return {
				level: "Người Ủng Hộ",
				color: "from-green-500 to-teal-500",
				icon: <TrendingUp className="w-5 h-5" />,
			};
		return {
			level: "Người Mới",
			color: "from-blue-500 to-cyan-500",
			icon: <Heart className="w-5 h-5" />,
		};
	};

	// Lọc và sắp xếp dữ liệu
	const applyFilter = () => {
		let filteredData = [...history];

		if (filterType !== "all") {
			const months = {
				last3: 3,
				last6: 6,
				last12: 12,
			}[filterType];

			const cutoff = new Date();
			cutoff.setMonth(cutoff.getMonth() - months);

			filteredData = filteredData.filter((item) => {
				const donationDate = new Date(item.donationDate || item.date);
				return donationDate >= cutoff;
			});
		}

		if (searchTerm.trim()) {
			filteredData = filteredData.filter(
				(item) =>
					item.facility?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.bloodGroup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.city?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		filteredData.sort((a, b) => {
			const dateA = new Date(a.donationDate || a.date);
			const dateB = new Date(b.donationDate || b.date);

			switch (sortBy) {
				case "date-asc":
					return dateA - dateB;
				case "date-desc":
					return dateB - dateA;
				case "units-desc":
					return (b.quantity || 1) - (a.quantity || 1);
				default:
					return dateB - dateA;
			}
		});

		setFiltered(filteredData);
	};

	// Xuất dữ liệu CSV
	const exportToCSV = () => {
		const headers = ["Ngày", "Cơ Sở", "Thành Phố", "Nhóm Máu", "Đơn Vị", "Trạng Thái"];
		const csvData = filtered.map((item) =>
			[
				new Date(item.donationDate || item.date).toLocaleDateString("vi-VN"),
				item.facility || "Điểm Hiến Máu",
				item.city || "Không có",
				item.bloodGroup || "Không có",
				item.quantity || 1,
				"Hoàn Thành",
			].join(","),
		);

		const csv = [headers.join(","), ...csvData].join("\n");
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "lich-su-hien-mau.csv";
		a.click();
		URL.revokeObjectURL(url);

		toast.success("Xuất dữ liệu thành công!");
	};

	useEffect(() => {
		fetchHistory();
	}, []);

	useEffect(() => {
		applyFilter();
	}, [searchTerm, filterType, sortBy, history]);

	const donorLevel = getDonorLevel(stats.totalDonations);

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-6xl mx-auto">
				{/* Tiêu đề */}
				<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
							<div className="p-2 bg-red-100 rounded-xl">
								<Heart className="w-6 h-6 text-red-600" />
							</div>
							Lịch Sử Hiến Máu
						</h1>
						<p className="text-gray-600 mt-2">Theo dõi hành trình cứu người của bạn</p>
					</div>

					{/* Huy hiệu cấp độ */}
					<div
						className={`mt-4 lg:mt-0 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r ${donorLevel.color} text-white shadow-lg`}>
						{donorLevel.icon}
						<div>
							<p className="text-xs opacity-90">Cấp Độ Của Bạn</p>
							<p className="font-bold text-lg">{donorLevel.level}</p>
						</div>
					</div>
				</div>

				{/* Thẻ thống kê */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-l-red-400">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Tổng Lần Hiến</p>
								<p className="text-2xl font-bold text-gray-900">{stats.totalDonations}</p>
							</div>
							<div className="p-3 bg-red-100 rounded-xl">
								<Droplet className="w-6 h-6 text-red-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-l-green-400">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Đơn Vị Đã Hiến</p>
								<p className="text-2xl font-bold text-gray-900">{stats.totalUnits}</p>
							</div>
							<div className="p-3 bg-green-100 rounded-xl">
								<TrendingUp className="w-6 h-6 text-green-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-l-blue-400">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Cuộc Sống Được Cứu</p>
								<p className="text-2xl font-bold text-gray-900">{stats.lifeImpact}+</p>
							</div>
							<div className="p-3 bg-blue-100 rounded-xl">
								<Heart className="w-6 h-6 text-blue-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-l-purple-400">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Cấp Độ</p>
								<p className="text-xl font-bold text-gray-900">{donorLevel.level}</p>
							</div>
							<div className={`p-3 bg-gradient-to-r ${donorLevel.color} rounded-xl text-white`}>
								{donorLevel.icon}
							</div>
						</div>
					</div>
				</div>

				{/* Phần điều khiển */}
				<div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
						<div className="flex-1">
							<div className="relative max-w-md">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
								<input
									type="text"
									placeholder="Tìm theo cơ sở, thành phố hoặc nhóm máu..."
									className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
						</div>

						<div className="flex flex-wrap gap-3">
							<div className="flex items-center gap-2">
								<Filter className="w-5 h-5 text-gray-600" />
								<select
									value={filterType}
									onChange={(e) => setFilterType(e.target.value)}
									className="border border-gray-300 bg-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500">
									<option value="all">Tất Cả Thời Gian</option>
									<option value="last3">3 Tháng Gần Đây</option>
									<option value="last6">6 Tháng Gần Đây</option>
									<option value="last12">12 Tháng Gần Đây</option>
								</select>
							</div>

							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								className="border border-gray-300 bg-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500">
								<option value="date-desc">Mới Nhất Trước</option>
								<option value="date-asc">Cũ Nhất Trước</option>
								<option value="units-desc">Nhiều Đơn Vị Nhất</option>
							</select>

							<button
								onClick={exportToCSV}
								className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
								<Download className="w-5 h-5" />
								Xuất File
							</button>
						</div>
					</div>
				</div>

				{/* Trạng thái đang tải */}
				{loading && (
					<div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-lg">
						<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
						<p className="text-lg font-semibold text-gray-700">Đang tải hành trình của bạn...</p>
						<p className="text-gray-500">Đang lấy những đóng góp cứu người của bạn</p>
					</div>
				)}

				{/* Trạng thái trống */}
				{!loading && filtered.length === 0 && (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<div className="max-w-md mx-auto">
							<div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
								<AlertCircle className="w-12 h-12 text-yellow-600" />
							</div>
							<h3 className="text-2xl font-bold text-gray-900 mb-3">
								{history.length === 0 ? "Chưa Có Lần Hiến Máu Nào" : "Không Tìm Thấy Kết Quả"}
							</h3>
							<p className="text-gray-600 mb-6">
								{history.length === 0
									? "Bắt đầu hành trình cứu người bằng lần hiến máu đầu tiên."
									: "Hãy thử điều chỉnh tìm kiếm hoặc bộ lọc để tìm kết quả."}
							</p>
							{history.length === 0 && (
								<button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
									Đặt Lịch Hiến Máu Đầu Tiên
								</button>
							)}
						</div>
					</div>
				)}

				{/* Thẻ lịch sử hiến máu */}
				{!loading && filtered.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<p className="text-gray-600">
								Đang hiển thị <span className="font-semibold">{filtered.length}</span> lần hiến máu
							</p>
						</div>

						<div className="grid gap-4">
							{filtered.map((item, index) => {
								const date = new Date(item.donationDate || item.date);
								const isRecent = new Date() - date < 30 * 24 * 60 * 60 * 1000;

								return (
									<div
										key={item._id || index}
										className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
										<div className="flex flex-row lg:items-center justify-between gap-4">
											<div className="flex items-start gap-4 flex-1">
												<div
													className={`p-3 rounded-xl ${
														isRecent ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
													}`}>
													<Droplet className="w-6 h-6" />
												</div>

												<div className="flex-1">
													<div className="flex flex-wrap items-center gap-3 mb-2">
														<h3 className="text-lg font-semibold text-gray-900">
															Hiến Máu {item.bloodGroup || ""}
														</h3>
														<span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
															Hoàn Thành
														</span>
														{isRecent && (
															<span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
																Gần Đây
															</span>
														)}
													</div>

													<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
														<div className="flex items-center gap-2">
															<Calendar className="w-4 h-4 text-red-500" />
															<span>
																{date.toLocaleDateString("vi-VN", {
																	weekday: "short",
																	day: "numeric",
																	month: "short",
																	year: "numeric",
																})}
															</span>
														</div>
													</div>

													{(item.facility || item.city) && (
														<p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
															<MapPin className="w-3 h-3" />
															{item.facility && <span>{item.facility}</span>}
															{item.city && <span>{item.facility ? ` - ${item.city}` : item.city}</span>}
															{item.state && `, ${item.state}`}
														</p>
													)}
												</div>
											</div>

											<div className="flex flex-col items-center gap-2">
												<div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
													+{item.quantity || 1}
												</div>
												<p className="text-xs text-gray-500 mt-1">Đơn Vị</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default DonorDonationHistory;
