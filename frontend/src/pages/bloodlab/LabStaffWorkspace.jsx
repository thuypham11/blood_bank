import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Beaker, CheckCircle2, ClipboardCheck, Loader2, LogOut, Save, Send, ShieldCheck, UserRound } from "lucide-react";

const API_URL = "http://localhost:5000/api/lab-staff";
const TESTS = [["hiv", "HIV"], ["hbv", "HBV"], ["hcv", "HCV"], ["hepatitis", "Viêm gan"], ["syphilis", "Giang mai"]];
const EMPTY_RESULTS = { hiv: "pending", hbv: "pending", hcv: "pending", hepatitis: "pending", syphilis: "pending" };

const statusInfo = {
	draft: ["Bản nháp", "bg-slate-100 text-slate-700"],
	submitted: ["Chờ phê duyệt", "bg-amber-100 text-amber-700"],
	approved: ["Đã phê duyệt", "bg-emerald-100 text-emerald-700"],
};

export default function LabStaffWorkspace() {
	const [profile, setProfile] = useState(null);
	const [units, setUnits] = useState([]);
	const [selected, setSelected] = useState(null);
	const [results, setResults] = useState(EMPTY_RESULTS);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const navigate = useNavigate();
	const token = localStorage.getItem("token");
	const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
	const can = (permission) => profile?.permissions?.includes(permission);

	const request = useCallback(async (path, options = {}) => {
		const response = await fetch(`${API_URL}${path}`, {
			...options,
			headers: { ...headers, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
		});
		const data = await response.json();
		if (!response.ok) throw new Error(data.message || "Không thể thực hiện thao tác");
		return data;
	}, [headers]);

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const [me, worklist] = await Promise.all([request("/me"), request("/worklist")]);
			setProfile(me.data);
			setUnits(worklist.data || []);
		} catch (error) {
			toast.error(error.message);
			if (/token|quyền|khóa/i.test(error.message)) {
				localStorage.removeItem("token");
				navigate("/login", { replace: true });
			}
		} finally { setLoading(false); }
	}, [navigate, request]);

	useEffect(() => { loadData(); }, [loadData]);

	const openResult = (unit) => {
		setSelected(unit);
		setResults(unit.testRecord?.results || unit.screeningResult || EMPTY_RESULTS);
	};

	const saveDraft = async () => {
		try {
			setSaving(true);
			await request(`/results/${selected._id}/draft`, { method: "PUT", body: JSON.stringify({ results }) });
			toast.success("Đã lưu bản nháp kết quả");
			setSelected(null);
			await loadData();
		} catch (error) { toast.error(error.message); }
		finally { setSaving(false); }
	};

	const runAction = async (recordId, action) => {
		try {
			setSaving(true);
			const data = await request(`/results/${recordId}/${action}`, { method: "POST" });
			toast.success(data.message);
			await loadData();
		} catch (error) { toast.error(error.message); }
		finally { setSaving(false); }
	};

	const logout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("role");
		navigate("/login", { replace: true });
	};

	if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-red-600"><Loader2 className="animate-spin" size={32} /></div>;

	return (
		<div className="min-h-screen bg-slate-50">
			<Toaster position="top-right" />
			<header className="border-b border-red-100 bg-white shadow-sm">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
					<div className="flex items-center gap-3"><span className="rounded-xl bg-red-100 p-2 text-red-600"><Beaker /></span><div><h1 className="font-bold text-slate-900">Khu vực nhân viên xét nghiệm</h1><p className="text-xs text-slate-500">Nhập và kiểm soát kết quả sàng lọc</p></div></div>
					<div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{profile?.fullName}</p><p className="text-xs text-slate-500">{profile?.employeeCode} · Nhân viên xét nghiệm</p></div><button onClick={logout} title="Đăng xuất" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><LogOut size={20} /></button></div>
				</div>
			</header>

			<main className="mx-auto max-w-7xl p-4 sm:p-6">
				<section className="mb-6 grid gap-3 sm:grid-cols-3">
					<div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Mẫu đang hiển thị</p><p className="mt-1 text-2xl font-bold text-slate-900">{units.length}</p></div>
					<div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Chờ phê duyệt</p><p className="mt-1 text-2xl font-bold text-amber-600">{units.filter((unit) => unit.testRecord?.status === "submitted").length}</p></div>
					<div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Quyền được cấp</p><p className="mt-1 text-2xl font-bold text-blue-600">{profile?.permissions?.length || 0}</p></div>
				</section>

				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="flex items-center gap-2 border-b border-slate-100 p-5"><ClipboardCheck className="text-red-600" size={20} /><h2 className="font-semibold text-slate-800">Danh sách mẫu xét nghiệm</h2></div>
					{units.length === 0 ? <div className="p-16 text-center text-sm text-slate-500">Không có mẫu phù hợp với quyền của bạn.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Mã mẫu</th><th className="px-5 py-3">Nhóm máu</th><th className="px-5 py-3">Ngày lấy</th><th className="px-5 py-3">Kết quả</th><th className="px-5 py-3">Người thực hiện</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{units.map((unit) => {
						const record = unit.testRecord;
						const ownDraft = record?.status === "draft" && record.enteredBy?._id === profile.id;
						return <tr key={unit._id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">{unit.unitCode || unit.barcode}</td><td className="px-5 py-4"><span className="rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-700">{unit.bloodType || unit.bloodGroup}</span></td><td className="px-5 py-4 text-slate-600">{new Date(unit.collectionDate).toLocaleDateString("vi-VN")}</td><td className="px-5 py-4">{record ? <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo[record.status][1]}`}>{statusInfo[record.status][0]}</span> : <span className="text-slate-400">Chưa nhập</span>}</td><td className="px-5 py-4 text-slate-600">{record?.enteredBy?.fullName || "—"}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{can("enter_results") && (!record || ownDraft) && <button onClick={() => openResult(unit)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50">{record ? "Sửa bản nháp" : "Nhập kết quả"}</button>}{can("submit_results") && ownDraft && <button disabled={saving} onClick={() => runAction(record._id, "submit")} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"><Send size={14} />Gửi duyệt</button>}{can("approve_results") && record?.status === "submitted" && <button disabled={saving} onClick={() => runAction(record._id, "approve")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"><CheckCircle2 size={14} />Phê duyệt</button>}</div></td></tr>;
					})}</tbody></table></div>}
				</section>
			</main>

			{selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ShieldCheck className="text-red-600" />Nhập kết quả sàng lọc</h2><p className="mt-1 text-sm text-slate-500">Mẫu {selected.unitCode || selected.barcode}</p></div><button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">✕</button></div><div className="space-y-3">{TESTS.map(([key, label]) => <label key={key} className="grid grid-cols-[1fr_180px] items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="font-medium text-slate-700">{label}</span><select value={results[key]} onChange={(e) => setResults({ ...results, [key]: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-red-500"><option value="pending">Chưa có</option><option value="negative">Âm tính</option><option value="positive">Dương tính</option></select></label>)}</div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setSelected(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Hủy</button><button disabled={saving} onClick={saveDraft} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}Lưu bản nháp</button></div></div></div>}
		</div>
	);
}
