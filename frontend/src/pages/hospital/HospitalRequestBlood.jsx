import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Droplet, MapPin, Phone, Clock, Send } from "lucide-react";

const HospitalRequestBlood = () => {
	const [labs, setLabs] = useState([]);
	const [form, setForm] = useState({
		labId: "",
		bloodType: "",
		units: "",
	});
	const [loading, setLoading] = useState(false);
	const [labsLoading, setLabsLoading] = useState(true);

	const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

	useEffect(() => {
		const loadLabs = async () => {
			try {
				setLabsLoading(true);
				const token = localStorage.getItem("token");
				const res = await axios.get("http://localhost:5000/api/facility/labs", {
					headers: { Authorization: `Bearer ${token}` },
				});
				setLabs(res.data.labs || []);
				console.log("Đã tải danh sách ngân hàng máu:", res.data.labs);
			} catch (err) {
				console.error("Lỗi tải ngân hàng máu:", err);
				toast.error("Không thể tải danh sách ngân hàng máu");
			} finally {
				setLabsLoading(false);
			}
		};
		loadLabs();
	}, []);

	const submitRequest = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			const token = localStorage.getItem("token");

			const response = await axios.post("http://localhost:5000/api/hospital/blood/request", form, {
				headers: { Authorization: `Bearer ${token}` },
			});

			toast.success("Yêu cầu máu đã được gửi thành công!");
			setForm({ labId: "", bloodType: "", units: "" });
			console.log("Yêu cầu đã gửi:", response.data);
		} catch (err) {
			console.error("Lỗi gửi yêu cầu:", err);
			toast.error(err.response?.data?.message || "Không thể gửi yêu cầu máu");
		}
		setLoading(false);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-2xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8 text-center">
					<div className="flex justify-center items-center gap-3 mb-4">
						<div className="p-3 bg-red-100 rounded-xl">
							<Droplet className="w-8 h-8 text-red-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-800">Yêu Cầu Máu</h1>
					</div>
					<p className="text-gray-600">Gửi yêu cầu đơn vị máu từ các ngân hàng máu được phê duyệt</p>
				</div>

				{/* Form yêu cầu */}
				<div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-8">
					<form onSubmit={submitRequest} className="space-y-6">
						{/* Chọn ngân hàng máu */}
						<div>
							<label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
								<MapPin size={16} className="text-red-600" />
								Chọn Ngân Hàng Máu
							</label>
							{labsLoading ? (
								<div className="flex items-center gap-2 text-gray-500">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
									Đang tải danh sách...
								</div>
							) : (
								<select
									value={form.labId}
									onChange={(e) => setForm({ ...form, labId: e.target.value })}
									className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
									required
									disabled={labs.length === 0}>
									<option value="">-- Chọn Ngân Hàng Máu --</option>
									{labs.map((lab) => (
										<option key={lab._id} value={lab._id}>
											{lab.name} — {lab.address?.city}
											{lab.operatingHours && ` (${lab.operatingHours.open} - ${lab.operatingHours.close})`}
										</option>
									))}
								</select>
							)}
							{labs.length === 0 && !labsLoading && (
								<p className="text-sm text-red-600 mt-1">Không có ngân hàng máu nào được phê duyệt</p>
							)}
						</div>

						{/* Nhóm máu */}
						<div>
							<label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
								<Droplet size={16} className="text-red-600" />
								Nhóm Máu
							</label>
							<select
								value={form.bloodType}
								onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-purple-500 transition-colors"
								required>
								<option value="">-- Chọn Nhóm Máu --</option>
								{bloodTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>

						{/* Số đơn vị */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">Số Đơn Vị Cần</label>
							<input
								type="number"
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-purple-500 transition-colors"
								value={form.units}
								min="1"
								max="100"
								onChange={(e) => setForm({ ...form, units: e.target.value })}
								placeholder="Nhập số đơn vị máu cần"
								required
							/>
							<p className="text-sm text-gray-500 mt-1">Tối thiểu 1 đơn vị, tối đa 100 đơn vị</p>
						</div>

						{/* Nút gửi */}
						<button
							type="submit"
							disabled={loading || labs.length === 0}
							className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
							{loading ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									Đang Gửi Yêu Cầu...
								</>
							) : (
								<>
									<Send size={18} />
									Gửi Yêu Cầu Máu
								</>
							)}
						</button>
					</form>
				</div>

				{/* Thông tin các ngân hàng máu */}
				{labs.length > 0 && (
					<div className="mt-8 bg-white rounded-2xl shadow-lg border border-red-100 p-6">
						<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<MapPin size={20} className="text-red-600" />
							Ngân Hàng Máu Hiện Có ({labs.length})
						</h3>
						<div className="grid gap-3">
							{labs.map((lab) => (
								<div
									key={lab._id}
									className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
									<div>
										<div className="font-medium text-gray-800">{lab.name}</div>
										<div className="text-sm text-gray-600 flex items-center gap-1">
											<MapPin size={12} />
											{lab.address?.street}, {lab.address?.city}, {lab.address?.state} - {lab.address?.pincode}
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-gray-600 flex items-center gap-1">
											<Clock size={12} />
											{lab.operatingHours?.open} - {lab.operatingHours?.close}
										</div>
										<div className="text-sm text-gray-600 flex items-center gap-1">
											<Phone size={12} />
											{lab.phone}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default HospitalRequestBlood;
