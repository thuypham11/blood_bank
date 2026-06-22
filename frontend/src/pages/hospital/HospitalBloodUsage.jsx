import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Calendar, Clock, Droplet, FileText, Phone, User } from "lucide-react";

const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const HospitalBloodUsage = () => {
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({
		usageDate: new Date().toISOString().split("T")[0],
		usageTime: "",
		patientName: "",
		patientPhone: "",
		relativeName: "",
		relativePhone: "",
		bloodType: "",
		units: "",
		reason: "",
	});

	const updateField = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const submitUsage = async (event) => {
		event.preventDefault();
		setLoading(true);

		try {
			const token = localStorage.getItem("token");
			await axios.post(
				"http://localhost:5000/api/hospital/blood/usage",
				{ ...form, units: Number(form.units) },
				{ headers: { Authorization: `Bearer ${token}` } },
			);

			toast.success("Đã ghi nhận thủ tục sử dụng máu");
			setForm({
				usageDate: new Date().toISOString().split("T")[0],
				usageTime: "",
				patientName: "",
				patientPhone: "",
				relativeName: "",
				relativePhone: "",
				bloodType: "",
				units: "",
				reason: "",
			});
		} catch (error) {
			console.error("Blood usage error:", error);
			toast.error(error.response?.data?.message || "Không thể ghi nhận");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-4xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
						<span className="p-2 bg-red-100 rounded-xl">
							<Droplet className="w-6 h-6 text-red-600" />
						</span>
						Thủ Tục Sử Dụng Máu
					</h1>
					<p className="text-gray-600 mt-2">Ghi nhận việc xuất kho máu để truyền cho bệnh nhân.</p>
				</div>

				<form
					onSubmit={submitUsage}
					className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label="Ngay su dung" icon={<Calendar size={16} />}>
							<input
								type="date"
								value={form.usageDate}
								onChange={(e) => updateField("usageDate", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								required
							/>
						</Field>
						<Field label="Thời gian sử dụng" icon={<Clock size={16} />}>
							<input
								type="time"
								value={form.usageTime}
								onChange={(e) => updateField("usageTime", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								required
							/>
						</Field>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label="Bệnh nhân cần máu" icon={<User size={16} />}>
							<input
								type="text"
								value={form.patientName}
								onChange={(e) => updateField("patientName", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="Họ tên bệnh nhân"
								required
							/>
						</Field>
						<Field label="Số điện thoại bệnh nhân" icon={<Phone size={16} />}>
							<input
								type="tel"
								value={form.patientPhone}
								onChange={(e) => updateField("patientPhone", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="Số điện thoại"
							/>
						</Field>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label="Thân nhân của bệnh nhân" icon={<User size={16} />}>
							<input
								type="text"
								value={form.relativeName}
								onChange={(e) => updateField("relativeName", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="Họ tên thân nhân"
							/>
						</Field>
						<Field label="Số điện thoại thân nhân" icon={<Phone size={16} />}>
							<input
								type="tel"
								value={form.relativePhone}
								onChange={(e) => updateField("relativePhone", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="Số điện thoại"
							/>
						</Field>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label="Nhóm máu sử dụng" icon={<Droplet size={16} />}>
							<select
								value={form.bloodType}
								onChange={(e) => updateField("bloodType", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								required>
								<option value="">-- Chọn nhóm máu --</option>
								{bloodTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</Field>
						<Field label="Số đơn vị máu sử dụng" icon={<Droplet size={16} />}>
							<input
								type="number"
								min="1"
								value={form.units}
								onChange={(e) => updateField("units", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="Số đơn vị"
								required
							/>
						</Field>
					</div>

					<Field label="Lý do sử dụng" icon={<FileText size={16} />}>
						<textarea
							value={form.reason}
							onChange={(e) => updateField("reason", e.target.value)}
							className="w-full min-h-28 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
							placeholder="Mô tả lý do truyền máu"
							required
						/>
					</Field>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-3 rounded-xl font-semibold transition-colors">
						{loading ? "Đang ghi nhận..." : "Hoàn tất thủ tục sử dụng máu"}
					</button>
				</form>
			</div>
		</div>
	);
};

const Field = ({ label, icon, children }) => (
	<label className="block">
		<span className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
			<span className="text-red-600">{icon}</span>
			{label}
		</span>
		{children}
	</label>
);

export default HospitalBloodUsage;
