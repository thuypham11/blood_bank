import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { CalendarDays, Clock, Droplet, MapPin, Phone, Send } from "lucide-react";
import {
	BAG_VOLUMES,
	BLOOD_COMPONENTS,
	BLOOD_TYPES,
	buildBloodItems,
	buildComponentItems,
	validateProductItems,
} from "../../utils/bloodProducts";

const emptyVolumes = (items) =>
	Object.fromEntries(items.map((item) => [typeof item === "string" ? item : item.value, ""]));

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
			<span className="text-xs font-medium text-gray-500">ml: tổng bội số 250/350/450 ml</span>
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

const HospitalRequestBlood = () => {
	const [labs, setLabs] = useState([]);
	const [loading, setLoading] = useState(false);
	const [labsLoading, setLabsLoading] = useState(true);
	const [form, setForm] = useState({
		labId: "",
		requestedDeliveryDate: new Date().toISOString().split("T")[0],
		bloodVolumes: emptyVolumes(BLOOD_TYPES),
		componentVolumes: emptyVolumes(BLOOD_COMPONENTS),
	});

	useEffect(() => {
		const loadLabs = async () => {
			try {
				setLabsLoading(true);
				const token = localStorage.getItem("token");
				const res = await axios.get("http://localhost:5000/api/facility/labs", {
					headers: { Authorization: `Bearer ${token}` },
				});
				setLabs(res.data.labs || []);
			} catch (err) {
				console.error("Load blood labs error:", err);
				toast.error("Không thể tải danh sách ngân hàng máu");
			} finally {
				setLabsLoading(false);
			}
		};
		loadLabs();
	}, []);

	const updateVolume = (section, key, value) => {
		setForm((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[key]: value,
			},
		}));
	};

	const resetProducts = () => {
		setForm((prev) => ({
			...prev,
			bloodVolumes: emptyVolumes(BLOOD_TYPES),
			componentVolumes: emptyVolumes(BLOOD_COMPONENTS),
		}));
	};

	const submitRequest = async (event) => {
		event.preventDefault();
		const bloodItems = buildBloodItems(form.bloodVolumes);
		const componentItems = buildComponentItems(form.componentVolumes);

		if (!bloodItems.length && !componentItems.length) {
			toast.error("Vui lòng chọn ít nhất một nhóm máu hoặc chế phẩm máu");
			return;
		}

		if (!validateProductItems(bloodItems, componentItems)) {
			toast.error(`Số lượng phải ghép được từ túi ${BAG_VOLUMES.join("/")}ml`);
			return;
		}

		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			await axios.post(
				"http://localhost:5000/api/hospital/blood/request",
				{
					labId: form.labId,
					requestedDeliveryDate: form.requestedDeliveryDate,
					bloodItems,
					componentItems,
				},
				{ headers: { Authorization: `Bearer ${token}` } },
			);

			toast.success("Đã gửi yêu cầu máu");
			setForm({
				labId: "",
				requestedDeliveryDate: new Date().toISOString().split("T")[0],
				bloodVolumes: emptyVolumes(BLOOD_TYPES),
				componentVolumes: emptyVolumes(BLOOD_COMPONENTS),
			});
		} catch (err) {
			console.error("Request blood error:", err);
			toast.error(err.response?.data?.message || "Không thể gửi yêu cầu máu");
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
						Yêu Cầu Máu
					</h1>
					<p className="text-gray-600 mt-2">
						Chọn máu toàn phần, chế phẩm máu, hoặc cả hai theo đơn vị ml.
					</p>
				</div>

				<form
					onSubmit={submitRequest}
					className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label="Ngân hàng máu" icon={<MapPin size={16} />}>
							<select
								value={form.labId}
								onChange={(e) => setForm((prev) => ({ ...prev, labId: e.target.value }))}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								required
								disabled={labsLoading || labs.length === 0}>
								<option value="">{labsLoading ? "Đang tải..." : "Chọn ngân hàng máu"}</option>
								{labs.map((lab) => (
									<option key={lab._id} value={lab._id}>
										{lab.name} - {lab.address?.city || lab.address?.state || "N/A"}
									</option>
								))}
							</select>
						</Field>
						<Field label="Ngày cần nhận" icon={<CalendarDays size={16} />}>
							<input
								type="date"
								value={form.requestedDeliveryDate}
								min={new Date().toISOString().split("T")[0]}
								onChange={(e) => setForm((prev) => ({ ...prev, requestedDeliveryDate: e.target.value }))}
								className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
								required
							/>
						</Field>
					</div>

					<ProductSection title="Máu toàn phần" subtitle="A, B, O, AB +/-" icon={<Droplet size={18} />}>
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

					<ProductSection
						title="Chế phẩm máu"
						subtitle="Hồng cầu, tiểu cầu, huyết tương"
						icon={<Droplet size={18} />}>
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

					<div className="flex flex-col sm:flex-row gap-3">
						<button
							type="submit"
							disabled={loading || labs.length === 0}
							className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
							{loading ? (
								"Dang gui..."
							) : (
								<>
									<Send size={18} /> Gửi yêu cầu
								</>
							)}
						</button>
						<button
							type="button"
							onClick={resetProducts}
							className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold">
							Xóa mục đã chọn
						</button>
					</div>
				</form>

				{labs.length > 0 && (
					<div className="mt-8 bg-white rounded-2xl shadow-lg border border-red-100 p-6">
						<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<MapPin size={20} className="text-red-600" />
							Ngân hàng máu hiện có ({labs.length})
						</h3>
						<div className="grid gap-3">
							{labs.map((lab) => (
								<div
									key={lab._id}
									className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 border border-gray-200 rounded-lg">
									<div>
										<div className="font-medium text-gray-800">{lab.name}</div>
										<div className="text-sm text-gray-600 flex items-center gap-1">
											<MapPin size={12} />
											{lab.address?.street}, {lab.address?.city}, {lab.address?.state}
										</div>
									</div>
									<div className="text-sm text-gray-600 flex flex-wrap gap-4">
										<span className="flex items-center gap-1">
											<Clock size={12} />
											{lab.operatingHours?.open} - {lab.operatingHours?.close}
										</span>
										<span className="flex items-center gap-1">
											<Phone size={12} />
											{lab.phone}
										</span>
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
