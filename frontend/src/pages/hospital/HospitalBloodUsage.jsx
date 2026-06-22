import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Calendar, Clock, Droplet, FileText, Phone, User } from "lucide-react";
import {
	BAG_VOLUMES,
	BLOOD_COMPONENTS,
	BLOOD_TYPES,
	buildBloodItems,
	buildComponentItems,
	validateProductItems,
} from "../../utils/bloodProducts";

const emptyVolumes = (items) => Object.fromEntries(items.map((item) => [typeof item === "string" ? item : item.value, ""]));

const initialForm = () => ({
	usageDate: new Date().toISOString().split("T")[0],
	usageTime: "",
	patientName: "",
	patientPhone: "",
	relativeName: "",
	relativePhone: "",
	bloodVolumes: emptyVolumes(BLOOD_TYPES),
	componentVolumes: emptyVolumes(BLOOD_COMPONENTS),
	reason: "",
});

const HospitalBloodUsage = () => {
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState(initialForm);

	const updateField = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const updateVolume = (section, key, value) => {
		setForm((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[key]: value,
			},
		}));
	};

	const submitUsage = async (event) => {
		event.preventDefault();
		const bloodItems = buildBloodItems(form.bloodVolumes);
		const componentItems = buildComponentItems(form.componentVolumes);

		if (!bloodItems.length && !componentItems.length) {
			toast.error("Vui long chon it nhat mot nhom mau hoac che pham mau");
			return;
		}

		if (!validateProductItems(bloodItems, componentItems)) {
			toast.error(`So luong phai ghep duoc tu tui ${BAG_VOLUMES.join("/")}ml`);
			return;
		}

		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			await axios.post(
				"http://localhost:5000/api/hospital/blood/usage",
				{
					usageDate: form.usageDate,
					usageTime: form.usageTime,
					patientName: form.patientName,
					patientPhone: form.patientPhone,
					relativeName: form.relativeName,
					relativePhone: form.relativePhone,
					bloodItems,
					componentItems,
					reason: form.reason,
				},
				{ headers: { Authorization: `Bearer ${token}` } },
			);

			toast.success("Da ghi nhan su dung mau");
			setForm(initialForm());
		} catch (error) {
			console.error("Blood usage error:", error);
			toast.error(error.response?.data?.message || "Khong the ghi nhan");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-5xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
						<span className="p-2 bg-red-100 rounded-xl">
							<Droplet className="w-6 h-6 text-red-600" />
						</span>
						Su dung mau
					</h1>
					<p className="text-gray-600 mt-2">Ghi nhan xuat kho mau toan phan, che pham mau, hoac ca hai.</p>
				</div>

				<form onSubmit={submitUsage} className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 space-y-6">
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
						<Field label="Thoi gian su dung" icon={<Clock size={16} />}>
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
						<Field label="Benh nhan can mau" icon={<User size={16} />}>
							<input
								type="text"
								value={form.patientName}
								onChange={(e) => updateField("patientName", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="Ho ten benh nhan"
								required
							/>
						</Field>
						<Field label="So dien thoai benh nhan" icon={<Phone size={16} />}>
							<input
								type="tel"
								value={form.patientPhone}
								onChange={(e) => updateField("patientPhone", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="So dien thoai"
							/>
						</Field>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label="Than nhan" icon={<User size={16} />}>
							<input
								type="text"
								value={form.relativeName}
								onChange={(e) => updateField("relativeName", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="Ho ten than nhan"
							/>
						</Field>
						<Field label="So dien thoai than nhan" icon={<Phone size={16} />}>
							<input
								type="tel"
								value={form.relativePhone}
								onChange={(e) => updateField("relativePhone", e.target.value)}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								placeholder="So dien thoai"
							/>
						</Field>
					</div>

					<ProductSection title="Mau toan phan" subtitle="Chon mot hoac nhieu nhom mau" icon={<Droplet size={18} />}>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							{BLOOD_TYPES.map((type) => (
								<VolumeInput
									key={type}
									label={type}
									value={form.bloodVolumes[type]}
									onChange={(value) => updateVolume("bloodVolumes", type, value)}
								/>
							))}
						</div>
					</ProductSection>

					<ProductSection title="Che pham mau" subtitle="Hong cau, tieu cau, bach cau" icon={<Droplet size={18} />}>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							{BLOOD_COMPONENTS.map((component) => (
								<VolumeInput
									key={component.value}
									label={component.label}
									value={form.componentVolumes[component.value]}
									onChange={(value) => updateVolume("componentVolumes", component.value, value)}
								/>
							))}
						</div>
					</ProductSection>

					<Field label="Ly do su dung" icon={<FileText size={16} />}>
						<textarea
							value={form.reason}
							onChange={(e) => updateField("reason", e.target.value)}
							className="w-full min-h-28 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
							placeholder="Mo ta ly do truyen mau"
							required
						/>
					</Field>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-3 rounded-xl font-semibold transition-colors">
						{loading ? "Dang ghi nhan..." : "Hoan tat su dung mau"}
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

const ProductSection = ({ title, subtitle, icon, children }) => (
	<section className="border border-gray-200 rounded-xl p-4">
		<div className="mb-4 flex items-center justify-between gap-3">
			<div>
				<h2 className="font-semibold text-gray-800 flex items-center gap-2">
					<span className="text-red-600">{icon}</span>
					{title}
				</h2>
				<p className="text-sm text-gray-500">{subtitle}</p>
			</div>
			<span className="text-xs font-medium text-gray-500">ml: tong boi so 250/350/450</span>
		</div>
		{children}
	</section>
);

const VolumeInput = ({ label, value, onChange }) => (
	<label className="block">
		<span className="text-sm font-medium text-gray-700">{label}</span>
		<input
			type="number"
			min="0"
			step="50"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder="0 ml"
			className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
		/>
	</label>
);

export default HospitalBloodUsage;
