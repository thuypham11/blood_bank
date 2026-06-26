import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
	Search,
	User,
	Phone,
	Mail,
	Droplet,
	Calendar,
	CheckCircle,
	XCircle,
	History,
	Filter,
	Plus,
} from "lucide-react";

const BloodLabDonor = () => {
	const [term, setTerm] = useState("");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedDonor, setSelectedDonor] = useState(null);
	const [showDonationForm, setShowDonationForm] = useState(false);
	const [donationData, setDonationData] = useState({
		volumeMl: 350,
		remarks: "",
		bloodGroup: "",
	});
	const [recentDonations, setRecentDonations] = useState([]);
	const [stats, setStats] = useState({
		today: 0,
		thisWeek: 0,
		total: 0,
	});

	// Tìm kiếm người hiến máu
	const searchDonors = async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get(`http://localhost:5000/api/blood-lab/donors/search?term=${encodeURIComponent(term.trim())}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			setResults(res.data.donors || []);
			if (term.trim() && res.data.donors.length === 0) {
				toast.error("Không tìm thấy người hiến máu");
			}
		} catch (err) {
			console.error("Lỗi tìm kiếm:", err);
			toast.error("Tìm kiếm thất bại");
		} finally {
			setLoading(false);
		}
	};

	// Tải danh sách hiến máu gần đây và thống kê
	const loadRecentDonations = async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get("http://localhost:5000/api/blood-lab/donations/recent", {
				headers: { Authorization: `Bearer ${token}` },
			});
			setRecentDonations(res.data.donations || []);
			setStats(res.data.stats || { today: 0, thisWeek: 0, total: 0 });
		} catch (err) {
			console.error("Không thể tải danh sách hiến máu gần đây:", err);
		}
	};

	useEffect(() => {
		searchDonors();
		loadRecentDonations();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const openDonationForm = (donor) => {
		setSelectedDonor(donor);
		setDonationData({
			volumeMl: 350,
			remarks: "",
			bloodGroup: donor.bloodGroup,
		});
		setShowDonationForm(true);
	};

	// Ghi nhận hiến máu
	const markDonation = async () => {
		if (!selectedDonor) return;

		try {
			const token = localStorage.getItem("token");
			await axios.post(
				`http://localhost:5000/api/blood-lab/donors/donate/${selectedDonor._id}`,
				donationData,
				{ headers: { Authorization: `Bearer ${token}` } },
			);

			toast.success("Đã ghi nhận hiến máu thành công!");
			setShowDonationForm(false);
			setSelectedDonor(null);
			searchDonors();
			loadRecentDonations();
		} catch (err) {
			console.error("Lỗi ghi nhận hiến máu:", err);
			toast.error(err.response?.data?.message || "Không thể ghi nhận hiến máu");
		}
	};

	const canDonate = (lastDonationDate) => {
		if (!lastDonationDate) return true;
		const lastDonation = new Date(lastDonationDate);
		const threeMonthsAgo = new Date();
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
		return lastDonation < threeMonthsAgo;
	};

	const getTimeSinceLastDonation = (lastDonationDate) => {
		if (!lastDonationDate) return "Chưa từng hiến máu";

		const lastDonation = new Date(lastDonationDate);
		const now = new Date();
		const diffTime = Math.abs(now - lastDonation);
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 30) return `${diffDays} ngày trước`;
		const diffMonths = Math.floor(diffDays / 30);
		return `${diffMonths} tháng trước`;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-6xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
								<div className="p-2 bg-red-100 rounded-xl">
									<Droplet className="w-6 h-6 text-red-600" />
								</div>
								Quản Lý Người Hiến Máu
							</h1>
							<p className="text-gray-600 mt-1">Tìm kiếm và quản lý người hiến máu</p>
						</div>
					</div>

					{/* Thẻ thống kê */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-red-600">{stats.today}</div>
							<div className="text-sm text-gray-600">Hiến Máu Hôm Nay</div>
						</div>
						<div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-red-600">{stats.thisWeek}</div>
							<div className="text-sm text-gray-600">Tuần Này</div>
						</div>
						<div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-l-red-400">
							<div className="text-2xl font-bold text-red-600">{stats.total}</div>
							<div className="text-sm text-gray-600">Tổng Số Lần Hiến</div>
						</div>
					</div>
				</div>

				<div className="grid lg:grid-cols-3 gap-6">
					{/* Phần tìm kiếm */}
					<div className="lg:col-span-2">
						<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
							<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Search className="w-5 h-5 text-red-600" />
								Tìm Kiếm Người Hiến Máu
							</h2>

							<div className="flex gap-3 mb-4">
								<div className="flex-1 relative">
									<Search
										className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
										size={20}
									/>
									<input
										type="text"
										placeholder="Tìm theo tên, email, số điện thoại..."
										className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
										value={term}
										onChange={(e) => setTerm(e.target.value)}
										onKeyPress={(e) => e.key === "Enter" && searchDonors()}
									/>
								</div>
								<button
									onClick={searchDonors}
									disabled={loading}
									className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2">
									{loading ? (
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									) : (
										<Search size={18} />
									)}
									Tìm Kiếm
								</button>
							</div>

							{/* Kết quả tìm kiếm */}
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{results.map((donor) => (
									<div key={donor._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
										<div className="flex justify-between items-start">
											<div className="flex-1">
												<div className="flex items-center gap-3 mb-2">
													<h3 className="font-semibold text-gray-800 text-lg">{donor.fullName}</h3>
													<span
														className={`px-2 py-1 rounded-full text-xs font-medium ${
															donor.bloodGroup === "O-"
																? "bg-red-100 text-red-800"
																: donor.bloodGroup === "O+"
																	? "bg-orange-100 text-orange-800"
																	: donor.bloodGroup === "A-"
																		? "bg-blue-100 text-blue-800"
																		: donor.bloodGroup === "A+"
																			? "bg-green-100 text-green-800"
																			: donor.bloodGroup === "B-"
																				? "bg-purple-100 text-purple-800"
																				: donor.bloodGroup === "B+"
																					? "bg-indigo-100 text-indigo-800"
																					: donor.bloodGroup === "AB-"
																						? "bg-pink-100 text-pink-800"
																						: "bg-gray-100 text-gray-800"
														}`}>
														{donor.bloodGroup}
													</span>
													{!canDonate(donor.lastDonationDate) && (
														<span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
															Vừa Hiến Máu
														</span>
													)}
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
													<div className="flex items-center gap-2">
														<Mail size={14} className="text-red-500" />
														<span>{donor.email}</span>
													</div>
													<div className="flex items-center gap-2">
														<Phone size={14} className="text-red-500" />
														<span>{donor.phone}</span>
													</div>
													<div className="flex items-center gap-2">
														<Calendar size={14} className="text-red-500" />
														<span>Lần hiến gần nhất: {getTimeSinceLastDonation(donor.lastDonationDate)}</span>
													</div>
													<div className="flex items-center gap-2">
														<History size={14} className="text-red-500" />
														<span>Tổng số lần hiến: {donor.donationHistory?.length || 0}</span>
													</div>
												</div>
											</div>

											<div className="flex gap-2 ml-4">
												<button
													onClick={() => openDonationForm(donor)}
													disabled={!canDonate(donor.lastDonationDate)}
													className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm">
													<Plus size={16} />
													Ghi Nhận
												</button>
											</div>
										</div>
									</div>
								))}

								{results.length === 0 && !loading && term && (
									<div className="text-center py-8 text-gray-500">
										<User size={48} className="mx-auto mb-2 text-gray-400" />
										<p>Không tìm thấy người hiến máu phù hợp với "{term}"</p>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Thanh bên - Hiến máu gần đây */}
					<div className="lg:col-span-1">
						<div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
							<h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<History className="w-5 h-5 text-red-600" />
								Hiến Máu Gần Đây
							</h2>

							<div className="space-y-3 max-h-96 overflow-y-auto">
								{recentDonations.map((donation, index) => (
									<div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
										<div className="flex justify-between items-start mb-2">
											<span className="font-medium text-gray-800">{donation.donorName}</span>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													donation.bloodGroup === "O-" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
												}`}>
												{donation.bloodGroup}
											</span>
										</div>
										<div className="text-sm text-gray-600">
											<div className="flex justify-between">
												<span>{donation.quantity} ml</span>
												<span>{new Date(donation.date).toLocaleDateString("vi-VN")}</span>
											</div>
											{donation.remarks && (
												<p className="text-xs text-gray-500 mt-1">Ghi chú: {donation.remarks}</p>
											)}
										</div>
									</div>
								))}

								{recentDonations.length === 0 && (
									<div className="text-center py-8 text-gray-500">
										<p>Chưa có lần hiến máu nào</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Modal ghi nhận hiến máu */}
				{showDonationForm && selectedDonor && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
						<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
							<h3 className="text-xl font-semibold text-gray-800 mb-4">Ghi Nhận Hiến Máu</h3>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Người Hiến</label>
									<p className="font-semibold text-gray-800">{selectedDonor.fullName}</p>
									<p className="text-sm text-gray-600">
										{selectedDonor.email} | {selectedDonor.phone}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Nhóm Máu</label>
									<select
										value={donationData.bloodGroup}
										onChange={(e) => setDonationData({ ...donationData, bloodGroup: e.target.value })}
										className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500">
										<option value="A+">A+</option>
										<option value="A-">A-</option>
										<option value="B+">B+</option>
										<option value="B-">B-</option>
										<option value="AB+">AB+</option>
										<option value="AB-">AB-</option>
										<option value="O+">O+</option>
										<option value="O-">O-</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Dung Tích Túi Máu</label>
									<select
										value={donationData.volumeMl}
										onChange={(e) => setDonationData({ ...donationData, volumeMl: Number(e.target.value) })}
										className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
									>
										<option value={250}>250 ml</option>
										<option value={350}>350 ml</option>
										<option value={450}>450 ml</option>
										<option value={700}>700 ml</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Ghi Chú (Tùy Chọn)</label>
									<textarea
										value={donationData.remarks}
										onChange={(e) => setDonationData({ ...donationData, remarks: e.target.value })}
										rows={3}
										className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
										placeholder="Ghi chú thêm nếu có..."
									/>
								</div>
							</div>

							<div className="flex gap-3 mt-6">
								<button
									onClick={markDonation}
									className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors">
									Xác Nhận Hiến Máu
								</button>
								<button
									onClick={() => setShowDonationForm(false)}
									className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors">
									Hủy
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default BloodLabDonor;
