import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
	Search,
	User,
	Phone,
	Mail,
	MapPin,
	Droplet,
	Calendar,
	Filter,
	Heart,
	Shield,
	ChevronDown,
	ChevronUp,
	PhoneCall,
	MessageCircle,
	Mail as MailIcon,
} from "lucide-react";

// Danh sách tỉnh/thành phố Việt Nam (lấy từ location.js)
const VIETNAM_PROVINCES = [
	"Thành phố Hà Nội",
	"Tỉnh Bắc Ninh",
	"Tỉnh Quảng Ninh",
	"Tp Hải Phòng",
	"Tỉnh Hưng Yên",
	"Tỉnh Ninh Bình",
	"Tỉnh Cao Bằng",
	"Tỉnh Tuyên Quang",
	"Tỉnh Lào Cai",
	"Tỉnh Thái Nguyên",
	"Tỉnh Lạng Sơn",
	"Tỉnh Phú Thọ",
	"Tỉnh Điện Biên",
	"Tỉnh Lai Châu",
	"Tỉnh Sơn La",
	"Tỉnh Thanh Hóa",
	"Tỉnh Nghệ An",
	"Tỉnh Hà Tĩnh",
	"Tỉnh Quảng Trị",
	"Thành phố Huế",
	"Tp Đà Nẵng",
	"Tỉnh Quảng Ngãi",
	"Tỉnh Khánh Hòa",
	"Tỉnh Gia Lai",
	"Tỉnh Đắk Lắk",
	"Tỉnh Lâm Đồng",
	"Tỉnh Tây Ninh",
	"Tỉnh Đồng Nai",
	"Tp Hồ Chí Minh",
	"Tỉnh Vĩnh Long",
	"Tỉnh Đồng Tháp",
	"Tỉnh An Giang",
	"Tp Cần Thơ",
	"Tỉnh Cà Mau",
];

const DonorDirectory = () => {
	const [donors, setDonors] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		bloodGroup: "all",
		city: "all",
		availability: "all",
		sortBy: "lastDonation",
	});
	const [showFilters, setShowFilters] = useState(false);
	const [selectedDonor, setSelectedDonor] = useState(null);
	const [showContactModal, setShowContactModal] = useState(false);
	const [citySearch, setCitySearch] = useState("");
	const [showCityDropdown, setShowCityDropdown] = useState(false);
	const [stats, setStats] = useState({
		total: 0,
		available: 0,
		rareBlood: 0,
	});

	// Danh sách tỉnh được lọc theo từ khóa
	const filteredProvinces = VIETNAM_PROVINCES.filter((p) =>
		p.toLowerCase().includes(citySearch.toLowerCase()),
	);

	const fetchDonors = async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const queryParams = new URLSearchParams({
				search: searchTerm,
				bloodGroup: filters.bloodGroup,
				city: filters.city,
				availability: filters.availability,
				sortBy: filters.sortBy,
			});

			const res = await axios.get(`http://localhost:5000/api/hospital/donors?${queryParams}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			setDonors(res.data.donors || []);
			setStats(res.data.stats || { total: 0, available: 0, rareBlood: 0 });
		} catch (err) {
			console.error("Lỗi khi lấy danh sách người hiến:", err);
			toast.error("Không thể tải danh sách người hiến máu");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDonors();
	}, [filters, searchTerm]);

	const contactDonor = (donor) => {
		setSelectedDonor(donor);
		setShowContactModal(true);
		logContactAttempt(donor._id);
	};

	const logContactAttempt = async (donorId) => {
		try {
			const token = localStorage.getItem("token");
			await axios.post(
				`http://localhost:5000/api/hospital/donors/${donorId}/contact`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } },
			);
		} catch (err) {
			console.error("Lỗi ghi log liên hệ:", err);
		}
	};

	const getAvailabilityStatus = (lastDonationDate) => {
		if (!lastDonationDate)
			return { status: "available", text: "Sẵn sàng", color: "bg-green-100 text-green-800" };

		const lastDonation = new Date(lastDonationDate);
		const threeMonthsAgo = new Date();
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

		if (lastDonation < threeMonthsAgo)
			return { status: "available", text: "Sẵn sàng", color: "bg-green-100 text-green-800" };

		const nextDonationDate = new Date(lastDonation);
		nextDonationDate.setMonth(nextDonationDate.getMonth() + 3);
		const daysUntilAvailable = Math.ceil((nextDonationDate - new Date()) / (1000 * 60 * 60 * 24));

		if (daysUntilAvailable <= 7)
			return {
				status: "soon",
				text: `Sẵn sàng sau ${daysUntilAvailable} ngày`,
				color: "bg-yellow-100 text-yellow-800",
			};

		return { status: "unavailable", text: "Vừa hiến gần đây", color: "bg-red-100 text-red-800" };
	};

	const getTimeSinceLastDonation = (lastDonationDate) => {
		if (!lastDonationDate) return "Chưa từng hiến";
		const lastDonation = new Date(lastDonationDate);
		const diffDays = Math.ceil(Math.abs(new Date() - lastDonation) / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return "Hôm nay";
		if (diffDays === 1) return "Hôm qua";
		if (diffDays < 30) return `${diffDays} ngày trước`;
		return `${Math.floor(diffDays / 30)} tháng trước`;
	};

	const isRareBloodGroup = (bloodGroup) => bloodGroup.endsWith("-");
	const bloodGroups = ["all", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
								<div className="p-2 bg-red-100 rounded-xl">
									<Heart className="w-6 h-6 text-red-600" />
								</div>
								Danh bạ Người hiến máu
							</h1>
							<p className="text-gray-600 mt-1">
								Tìm kiếm và liên hệ người hiến máu trong trường hợp khẩn cấp
							</p>
						</div>
					</div>

					{/* Thẻ thống kê */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-gray-800">{stats.total}</div>
							<div className="text-sm text-gray-600">Tổng người hiến</div>
						</div>
						<div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-l-green-400">
							<div className="text-2xl font-bold text-green-600">{stats.available}</div>
							<div className="text-sm text-gray-600">Sẵn sàng hiến ngay</div>
						</div>
						<div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-l-purple-400">
							<div className="text-2xl font-bold text-purple-600">{stats.rareBlood}</div>
							<div className="text-sm text-gray-600">Nhóm máu hiếm</div>
						</div>
					</div>
				</div>

				{/* Tìm kiếm & Bộ lọc */}
				<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
					<div className="flex flex-col lg:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search
									className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
									size={20}
								/>
								<input
									type="text"
									placeholder="Tìm theo họ tên, số điện thoại, email hoặc thành phố..."
									className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
						</div>
						<button
							onClick={() => setShowFilters(!showFilters)}
							className="lg:w-48 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
							<Filter size={18} />
							Bộ lọc
							{showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
						</button>
					</div>

					{/* Bộ lọc mở rộng */}
					{showFilters && (
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
							{/* Nhóm máu */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Nhóm máu</label>
								<select
									value={filters.bloodGroup}
									onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500">
									<option value="all">Tất cả nhóm máu</option>
									{bloodGroups
										.filter((bg) => bg !== "all")
										.map((bg) => (
											<option key={bg} value={bg}>
												{bg}
											</option>
										))}
								</select>
							</div>

							{/* Tỉnh / Thành phố — ô tìm kiếm */}
							<div className="relative">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tỉnh / Thành phố
									{filters.city !== "all" && (
										<button
											onClick={() => {
												setFilters({ ...filters, city: "all" });
												setCitySearch("");
											}}
											className="ml-2 text-xs text-red-500 hover:text-red-700 font-normal">
											✕ Xóa
										</button>
									)}
								</label>
								<input
									type="text"
									value={citySearch}
									onChange={(e) => {
										setCitySearch(e.target.value);
										setShowCityDropdown(true);
										if (e.target.value === "") setFilters({ ...filters, city: "all" });
									}}
									onFocus={() => setShowCityDropdown(true)}
									onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
									placeholder="Tìm tỉnh/thành phố..."
									className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
										filters.city !== "all" ? "border-red-400 bg-red-50 text-red-700" : "border-gray-300"
									}`}
								/>
								{showCityDropdown && (
									<ul className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto mt-1">
										<li
											onMouseDown={() => {
												setFilters({ ...filters, city: "all" });
												setCitySearch("");
												setShowCityDropdown(false);
											}}
											className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-400 border-b border-gray-100">
											Tất cả tỉnh/thành
										</li>
										{filteredProvinces.length > 0 ? (
											filteredProvinces.map((province) => (
												<li
													key={province}
													onMouseDown={() => {
														setFilters({ ...filters, city: province });
														setCitySearch(province);
														setShowCityDropdown(false);
													}}
													className={`px-3 py-2 hover:bg-red-50 cursor-pointer text-sm ${
														filters.city === province ? "bg-red-50 text-red-700 font-medium" : "text-gray-700"
													}`}>
													{province}
												</li>
											))
										) : (
											<li className="px-3 py-2 text-sm text-gray-400 text-center">
												Không tìm thấy tỉnh/thành
											</li>
										)}
									</ul>
								)}
							</div>

							{/* Tình trạng sẵn sàng */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng sẵn sàng</label>
								<select
									value={filters.availability}
									onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500">
									<option value="all">Tất cả</option>
									<option value="available">Sẵn sàng ngay</option>
									<option value="soon">Sắp sẵn sàng</option>
								</select>
							</div>

							{/* Sắp xếp theo */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Sắp xếp theo</label>
								<select
									value={filters.sortBy}
									onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500">
									<option value="lastDonation">Lần hiến gần nhất</option>
									<option value="name">Họ tên</option>
									<option value="bloodGroup">Nhóm máu</option>
									<option value="city">Thành phố</option>
								</select>
							</div>
						</div>
					)}
				</div>

				{/* Danh sách người hiến */}
				{loading ? (
					<div className="flex justify-center items-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
						<span className="ml-3 text-gray-600">Đang tải danh sách người hiến...</span>
					</div>
				) : donors.length === 0 ? (
					<div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-red-100">
						<div className="text-gray-400 mb-4">
							<User size={48} className="mx-auto" />
						</div>
						<h3 className="text-lg font-medium text-gray-800 mb-2">Không tìm thấy người hiến nào</h3>
						<p className="text-gray-600">
							{searchTerm || filters.bloodGroup !== "all" || filters.city !== "all"
								? "Vui lòng thử điều chỉnh bộ lọc tìm kiếm"
								: "Hiện chưa có người hiến nào trong hệ thống"}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{donors.map((donor) => {
							const availability = getAvailabilityStatus(donor.lastDonationDate);
							const isRare = isRareBloodGroup(donor.bloodGroup);

							return (
								<div
									key={donor._id}
									className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 hover:shadow-xl transition-all duration-300">
									<div className="flex justify-between items-start mb-4">
										<div className="flex items-center gap-3">
											<div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
												<User className="w-6 h-6 text-red-600" />
											</div>
											<div>
												<h3 className="font-semibold text-gray-800 text-lg">{donor.fullName}</h3>
												<div className="flex items-center gap-2 mt-1">
													<span
														className={`px-2 py-1 rounded-full text-xs font-medium ${
															donor.bloodGroup === "O-"
																? "bg-red-100 text-red-800 border border-red-200"
																: donor.bloodGroup === "O+"
																	? "bg-orange-100 text-orange-800 border border-orange-200"
																	: donor.bloodGroup === "A-"
																		? "bg-blue-100 text-blue-800 border border-blue-200"
																		: donor.bloodGroup === "A+"
																			? "bg-green-100 text-green-800 border border-green-200"
																			: donor.bloodGroup === "B-"
																				? "bg-purple-100 text-purple-800 border border-purple-200"
																				: donor.bloodGroup === "B+"
																					? "bg-indigo-100 text-indigo-800 border border-indigo-200"
																					: donor.bloodGroup === "AB-"
																						? "bg-pink-100 text-pink-800 border border-pink-200"
																						: "bg-gray-100 text-gray-800 border border-gray-200"
														}`}>
														{donor.bloodGroup}
													</span>
													{isRare && <Shield size={14} className="text-purple-500" title="Nhóm máu hiếm" />}
												</div>
											</div>
										</div>
										<span className={`px-3 py-1 rounded-full text-xs font-medium ${availability.color}`}>
											{availability.text}
										</span>
									</div>

									<div className="space-y-3 mb-4">
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Phone size={14} className="text-red-500 flex-shrink-0" />
											<span className="font-medium">{donor.phone}</span>
										</div>
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Mail size={14} className="text-red-500 flex-shrink-0" />
											<span>{donor.email}</span>
										</div>
										{donor.address?.city && (
											<div className="flex items-center gap-2 text-sm text-gray-600">
												<MapPin size={14} className="text-red-500 flex-shrink-0" />
												<span>
													{donor.address.city}
													{donor.address.state ? `, ${donor.address.state}` : ""}
												</span>
											</div>
										)}
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Calendar size={14} className="text-red-500 flex-shrink-0" />
											<span>Lần hiến gần nhất: {getTimeSinceLastDonation(donor.lastDonationDate)}</span>
										</div>
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Droplet size={14} className="text-red-500 flex-shrink-0" />
											<span>Tổng số lần hiến: {donor.donationHistory?.length || 0}</span>
										</div>
									</div>

									<button
										onClick={() => contactDonor(donor)}
										disabled={availability.status === "unavailable"}
										className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
										<PhoneCall size={16} />
										Liên hệ ngay
									</button>
								</div>
							);
						})}
					</div>
				)}

				{/* Modal liên hệ */}
				{showContactModal && selectedDonor && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
						<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
							<h3 className="text-xl font-semibold text-gray-800 mb-2">Liên hệ người hiến máu</h3>
							<p className="text-gray-600 mb-6">Chọn cách liên hệ với {selectedDonor.fullName}</p>

							<div className="space-y-3">
								<a
									href={`tel:${selectedDonor.phone}`}
									className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3">
									<PhoneCall size={20} />
									<div className="text-left">
										<div className="font-semibold">Gọi ngay</div>
										<div className="text-sm opacity-90">{selectedDonor.phone}</div>
									</div>
								</a>
								<a
									href={`sms:${selectedDonor.phone}`}
									className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3">
									<MessageCircle size={20} />
									<div className="text-left">
										<div className="font-semibold">Gửi tin nhắn</div>
										<div className="text-sm opacity-90">Nhắn tin nhanh</div>
									</div>
								</a>
								<a
									href={`mailto:${selectedDonor.email}`}
									className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3">
									<MailIcon size={20} />
									<div className="text-left">
										<div className="font-semibold">Gửi email</div>
										<div className="text-sm opacity-90">{selectedDonor.email}</div>
									</div>
								</a>
							</div>

							<div className="mt-6 p-4 bg-gray-50 rounded-lg">
								<h4 className="font-semibold text-gray-800 mb-2">Thông tin người hiến</h4>
								<div className="text-sm text-gray-600 space-y-1">
									<div>
										<strong>Nhóm máu:</strong> {selectedDonor.bloodGroup}
									</div>
									<div>
										<strong>Lần hiến gần nhất:</strong>{" "}
										{getTimeSinceLastDonation(selectedDonor.lastDonationDate)}
									</div>
									{selectedDonor.address?.city && (
										<div>
											<strong>Khu vực:</strong> {selectedDonor.address.city}
											{selectedDonor.address.state ? `, ${selectedDonor.address.state}` : ""}
										</div>
									)}
								</div>
							</div>

							<button
								onClick={() => setShowContactModal(false)}
								className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors">
								Đóng
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default DonorDirectory;
