import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import {
	MapPin,
	Calendar,
	Clock,
	Filter,
	Loader2,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	Droplet,
	Heart,
	Search,
	Users,
	Building2,
	ListPlus,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const STATUS_OPTIONS = [
	{ value: "all", label: "Tất Cả" },
	{ value: "Upcoming", label: "Sắp Tới" },
	{ value: "Ongoing", label: "Đang Diễn Ra" },
	{ value: "Completed", label: "Đã Hoàn Thành" },
	{ value: "Cancelled", label: "Đã Hủy" },
];

const STATUS_LABELS = {
	Upcoming: "Sắp Tới",
	Ongoing: "Đang Diễn Ra",
	Completed: "Đã Hoàn Thành",
	Cancelled: "Đã Hủy",
};

const CampCard = ({ camp }) => {
	const isCompleted = camp.status === "Completed";
	const isCancelled = camp.status === "Cancelled";
	const isUpcoming = camp.status === "Upcoming";

	const statusColor = isCancelled
		? "bg-red-100 text-red-600 border-red-200"
		: isCompleted
			? "bg-gray-100 text-gray-600 border-gray-200"
			: "bg-green-100 text-green-600 border-green-200";

	const campDate = new Date(camp.date);
	const dateStr = campDate.toLocaleDateString("vi-VN", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	const timeStr = `${camp.time?.start || "Chưa xác định"} - ${camp.time?.end || "Chưa xác định"}`;

	const expectedDonors = camp.expectedDonors || 0;
	const actualDonors = camp.actualDonors || 0;

	const slotsAvailable = expectedDonors > 0 ? expectedDonors - actualDonors : 0;
	const isFull = slotsAvailable <= 0 && expectedDonors > 0 && !isCompleted && !isCancelled;

	const { venue, city, state, pincode } = camp.location || {};
	const locationStr = [venue, city, state, pincode ? `- ${pincode}` : ""].filter(Boolean).join(", ");

	const hospitalName = camp.hospital?.name || "Cơ Sở Liên Kết Chưa Xác Định";

	const renderDonorCapacity = () => {
		if (isUpcoming) {
			return <span className="font-medium text-gray-600">{expectedDonors} người hiến dự kiến</span>;
		}

		return (
			<span className="font-medium text-gray-600">
				{actualDonors} đã đạt / {expectedDonors} dự kiến
			</span>
		);
	};

	return (
		<div
			className={`bg-white rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl p-6 border-2 overflow-hidden ${
				isCancelled ? "border-red-200 opacity-70" : "border-red-100"
			}`}>
			{/* Tiêu đề với huy hiệu trạng thái */}
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
				<h4
					className={`text-xl font-bold leading-tight ${
						isCancelled ? "text-gray-500" : "text-gray-800"
					}`}>
					{camp.title}
				</h4>
				<span
					className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusColor} self-start sm:self-auto`}>
					{STATUS_LABELS[camp.status] || camp.status}
				</span>
			</div>

			{/* Tên bệnh viện/cơ sở */}
			<div className="flex items-center gap-3 text-sm text-gray-700 mb-3 font-semibold">
				<Building2 className="w-4 h-4 text-red-500 flex-shrink-0" />
				<span className="truncate">{hospitalName}</span>
			</div>

			{/* Thông tin chính */}
			<div className="space-y-3 text-sm text-gray-600 mb-4">
				<div className="flex items-start gap-3">
					<MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
					<span className="leading-relaxed">{locationStr || "Địa chỉ chưa xác định"}</span>
				</div>
				<div className="flex items-center gap-3">
					<Calendar className="w-4 h-4 text-red-500 flex-shrink-0" />
					<span>{dateStr}</span>
				</div>
				<div className="flex items-center gap-3">
					<Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
					<span>{timeStr}</span>
				</div>
			</div>

			{/* Tóm tắt chỉ số người hiến máu */}
			<div className="pt-4 border-t border-gray-100 flex flex-col justify-between items-start gap-3">
				<div className="flex items-center gap-2 text-sm">
					<Users className="w-4 h-4 text-red-500" />
					<span className="font-semibold text-gray-700">Sức Chứa:</span>
					{renderDonorCapacity()}
				</div>

				{!isCompleted && !isCancelled && (
					<div className="flex items-center gap-2 text-sm">
						<ListPlus className="w-4 h-4 text-red-500" />
						<span className="font-semibold text-gray-700">Còn Trống:</span>
						<span className={`font-bold ${isFull ? "text-red-600" : "text-green-600"}`}>
							{isFull ? "Đã Đầy (Đã Đạt Sức Chứa)" : `Còn ${slotsAvailable} chỗ trống`}
						</span>
					</div>
				)}

				{/* Mô tả */}
				<div className="pt-4 border-t border-gray-100 w-full mt-3">
					<div>
						<h5 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
							<Droplet className="w-4 h-4" /> Mô Tả
						</h5>
						<p className="text-gray-600 text-sm italic whitespace-pre-wrap">
							{camp.description || "Chưa có mô tả chi tiết cho điểm hiến máu này."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export const DonorCampsList = () => {
	const [filter, setFilter] = useState("Upcoming");
	const [searchTerm, setSearchTerm] = useState("");
	const [camps, setCamps] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const [pagination, setPagination] = useState({
		page: 1,
		limit: 9,
		total: 0,
		totalPages: 1,
		currentPage: 1,
	});

	const fetchCamps = useCallback(async () => {
		const token = localStorage.getItem("token");
		if (!token) {
			setError("Yêu cầu xác thực. Vui lòng đăng nhập để xem các điểm hiến máu.");
			toast.error("Thiếu token xác thực.");
			setCamps([]);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const statusParam = filter === "all" ? "" : filter;
			const params = new URLSearchParams({
				...(statusParam && { status: statusParam }),
				page: pagination.page,
				limit: pagination.limit,
				...(searchTerm && { q: searchTerm }),
			}).toString();

			const apiUrl = `${API_BASE_URL}/donor/camps?${params}`;
			console.log("Đang tải danh sách điểm hiến máu từ:", apiUrl);

			const response = await axios.get(apiUrl, {
				headers: { Authorization: `Bearer ${token}` },
			});

			const { data: responseData } = response.data;

			console.log("✅ Tải điểm hiến máu thành công:", responseData);

			if (responseData && responseData.camps) {
				setCamps(responseData.camps);
				setPagination((prev) => ({
					...prev,
					total: responseData.pagination?.total || responseData.camps.length,
					totalPages: responseData.pagination?.totalPages || 1,
					currentPage: responseData.pagination?.currentPage || 1,
				}));
			} else {
				console.error("Phản hồi API thiếu dữ liệu:", response.data);
				throw new Error("Cấu trúc phản hồi không hợp lệ từ máy chủ.");
			}
		} catch (err) {
			console.error("❌ Lỗi tải điểm hiến máu:", err);
			let message =
				err.response?.data?.message || err.message || "Không thể tải danh sách điểm hiến máu.";

			if (err.response?.status === 401 || err.response?.status === 403) {
				message = "Xác thực thất bại. Vui lòng đăng nhập lại.";
			}

			toast.error(message);
			setError(message);
			setCamps([]);
			setPagination((prev) => ({
				...prev,
				total: 0,
				totalPages: 1,
				currentPage: 1,
			}));
		} finally {
			setLoading(false);
		}
	}, [filter, pagination.page, pagination.limit, searchTerm]);

	useEffect(() => {
		fetchCamps();
	}, [fetchCamps]);

	const displayedCamps = camps;

	const handleFilterChange = (newFilter) => {
		setFilter(newFilter);
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handlePageChange = (newPage) => {
		if (newPage > 0 && newPage <= pagination.totalPages) {
			setPagination((prev) => ({ ...prev, page: newPage }));
		}
	};

	const totalPages = useMemo(() => pagination.totalPages, [pagination.totalPages]);
	const currentPage = useMemo(() => pagination.currentPage, [pagination.currentPage]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-4 sm:p-6 font-sans">
			<Toaster />
			<div className="max-w-7xl mx-auto">
				{/* Tiêu đề */}
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
						<div className="p-3 bg-red-100 rounded-xl">
							<Heart className="w-8 h-8 text-red-600" />
						</div>
						<div className="flex-1">
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Điểm Hiến Máu</h1>
							<p className="text-gray-600 mt-1 text-sm sm:text-base">
								Tìm cơ hội hiến máu gần bạn và cứu sống nhiều người.
							</p>
						</div>
					</div>
				</div>

				{/* Bộ điều khiển và lọc */}
				<div className="bg-white rounded-2xl shadow-md border border-red-100 p-4 sm:p-6 mb-6">
					<div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
						<div className="flex flex-col sm:flex-row gap-4 flex-1">
							{/* Ô tìm kiếm */}
							<div className="relative flex-1 min-w-[200px]">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Tìm kiếm theo tên, địa điểm, bệnh viện..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
								/>
							</div>

							{/* Bộ lọc trạng thái */}
							<div className="flex items-center gap-2 min-w-[180px]">
								<Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
								<select
									value={filter}
									onChange={(e) => handleFilterChange(e.target.value)}
									className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
									disabled={loading}>
									{STATUS_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Nút làm mới */}
						<button
							onClick={() => fetchCamps()}
							disabled={loading}
							className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-xl transition-all duration-200 border border-red-200 font-medium min-w-[120px]">
							{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
							{loading ? "Đang Tải..." : "Làm Mới"}
						</button>
					</div>
				</div>

				{/* Tóm tắt kết quả */}
				{!loading && camps.length > 0 && (
					<div className="mb-4 px-2">
						<p className="text-sm text-gray-600">
							Đang hiển thị {displayedCamps.length} điểm hiến máu
							{searchTerm && (
								<span>
									{" "}
									khớp với "<span className="font-semibold">{searchTerm}</span>"
								</span>
							)}
							. Tổng số tìm thấy: {pagination.total}.
						</p>
					</div>
				)}

				{/* Trạng thái đang tải */}
				{loading && (
					<div className="text-center p-12 bg-white rounded-2xl shadow-lg border border-red-100">
						<Loader2 className="w-8 h-8 text-red-500 mx-auto animate-spin mb-4" />
						<p className="text-gray-600 font-medium">Đang tải danh sách...</p>
						<p className="text-sm text-gray-500 mt-1">Đang tìm kiếm cơ hội hiến máu tốt nhất cho bạn</p>
					</div>
				)}

				{/* Trạng thái lỗi */}
				{error && !loading && camps.length === 0 && (
					<div className="text-center p-8 sm:p-12 bg-red-50 rounded-2xl shadow-lg border border-red-300">
						<div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<Droplet className="w-6 h-6 text-red-500" />
						</div>
						<p className="text-red-700 font-semibold mb-2">Không Thể Tải Danh Sách</p>
						<p className="text-sm text-red-600 mb-6 max-w-md mx-auto">{error}</p>
						<button
							onClick={() => fetchCamps()}
							className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl transition-colors font-medium">
							Thử Lại
						</button>
					</div>
				)}

				{/* Danh sách điểm hiến máu */}
				{!loading && displayedCamps.length > 0 && (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
							{displayedCamps.map((camp) => (
								<CampCard key={camp._id} camp={camp} />
							))}
						</div>

						{/* Điều khiển phân trang */}
						<div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 bg-white p-4 rounded-2xl shadow-md border border-red-100">
							<div className="flex items-center gap-4">
								<button
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1 || loading}
									className="p-2.5 border border-red-300 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
									<ChevronLeft className="w-5 h-5" />
								</button>

								<span className="text-gray-700 text-sm font-medium min-w-[120px] text-center">
									Trang {currentPage} / {totalPages}
								</span>

								<button
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages || loading}
									className="p-2.5 border border-red-300 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
									<ChevronRight className="w-5 h-5" />
								</button>
							</div>

							<span className="text-sm text-gray-500 text-center sm:text-left">
								{pagination.total} Điểm Tổng Cộng • {pagination.limit} mỗi trang
							</span>
						</div>
					</>
				)}

				{/* Trạng thái không có kết quả */}
				{!loading && displayedCamps.length === 0 && !error && (
					<div className="text-center p-8 sm:p-12 bg-white rounded-2xl shadow-lg border border-red-100">
						<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<Droplet className="w-8 h-8 text-red-500" />
						</div>
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							{searchTerm ? "Không Tìm Thấy Điểm Hiến Máu Phù Hợp" : "Không Có Điểm Hiến Máu"}
						</h3>
						<p className="text-gray-500 max-w-md mx-auto">
							{searchTerm
								? `Không tìm thấy kết quả cho "${searchTerm}" với bộ lọc hiện tại.`
								: "Không có điểm hiến máu nào phù hợp với bộ lọc. Hãy thử điều chỉnh."}
						</p>
						{(searchTerm || filter !== "all") && (
							<button
								onClick={() => {
									setSearchTerm("");
									setFilter("all");
									setPagination((prev) => ({ ...prev, page: 1 }));
								}}
								className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl transition-colors font-medium">
								Hiển Thị Tất Cả
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default DonorCampsList;
