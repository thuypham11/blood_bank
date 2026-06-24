import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Activity, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Clock, Send } from "lucide-react";

const HospitalActivityLog = () => {
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadHistory = async () => {
			try {
				setLoading(true);
				const token = localStorage.getItem("token");
				const res = await axios.get("http://localhost:5000/api/hospital/blood/stock/history", {
					headers: { Authorization: `Bearer ${token}` },
				});
				setHistory(res.data.history || []);
			} catch (error) {
				console.error("Activity log error:", error);
				toast.error("Không thể tải nhật ký hoạt động");
			} finally {
				setLoading(false);
			}
		};
		loadHistory();
	}, []);

	const getLogMeta = (description = "") => {
		const text = description
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "");
		if (text.includes("het han") || text.includes("expired")) {
			return { icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-100", label: "Hết hạn" };
		}
		if (text.includes("su dung") || text.includes("xuat") || text.includes("fifo") || text.includes("removed")) {
			return {
				icon: ArrowUpFromLine,
				color: "text-orange-600 bg-orange-50 border-orange-100",
				label: "Sử dụng máu",
			};
		}
		if (text.includes("nhan") || text.includes("received") || text.includes("added")) {
			return {
				icon: ArrowDownToLine,
				color: "text-green-600 bg-green-50 border-green-100",
				label: "Nhập kho",
			};
		}
		if (text.includes("yeu cau") || text.includes("request")) {
			return {
				icon: Send,
				color: "text-blue-600 bg-blue-50 border-blue-100",
				label: "Yêu cầu máu",
			};
		}
		return { icon: Activity, color: "text-slate-600 bg-slate-50 border-slate-100", label: "Hoạt động" };
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-5xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
						<span className="p-2 bg-red-100 rounded-xl">
							<Activity className="w-6 h-6 text-red-600" />
						</span>
						Nhật Ký Hoạt Động Bệnh Viện
					</h1>
					<p className="text-gray-600 mt-2">
						Theo dõi yêu cầu máu, nhập kho, sử dụng máu theo FIFO và cảnh báo túi hết hạn.
					</p>
				</div>

				<div className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden">
					{loading ? (
						<div className="p-10 text-center text-gray-500">Đang tải nhật ký...</div>
					) : history.length === 0 ? (
						<div className="p-10 text-center text-gray-500">Chưa có log hoạt động kho máu.</div>
					) : (
						<div className="divide-y divide-gray-100">
							{history.map((item, index) => {
								const meta = getLogMeta(item.description);
								const Icon = meta.icon;
								return (
									<div key={item._id || index} className="p-4 flex gap-4">
										<div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${meta.color}`}>
											<Icon size={20} />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
												<span className={`w-fit px-2 py-1 rounded-full border text-xs font-semibold ${meta.color}`}>
													{meta.label}
												</span>
												<div className="text-xs text-gray-500 flex items-center gap-1">
													<Clock size={13} />
													{new Date(item.date).toLocaleString("vi-VN")}
												</div>
											</div>
											<p className="mt-2 text-sm text-gray-800">{item.description}</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default HospitalActivityLog;
