import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import { BadgeCheck, CircleOff, KeyRound, Loader2, Plus, ShieldCheck, UserRound, Users } from "lucide-react";

const API_URL = "http://localhost:5000/api/blood-lab/staff";
const PERMISSIONS = [
	["view_samples", "Xem danh sách mẫu"],
	["receive_samples", "Tiếp nhận mẫu"],
	["enter_results", "Nhập kết quả"],
	["submit_results", "Gửi duyệt kết quả"],
	["approve_results", "Phê duyệt kết quả"],
	["view_basic_reports", "Xem báo cáo cơ bản"],
];
const EMPTY_FORM = {
	fullName: "", employeeCode: "", email: "", phone: "", password: "",
	permissions: ["view_samples", "receive_samples", "enter_results", "submit_results"],
};

export default function LabStaffManagement() {
	const [staff, setStaff] = useState([]);
	const [form, setForm] = useState(EMPTY_FORM);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

	const loadStaff = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(API_URL, { headers });
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Không thể tải danh sách nhân viên");
			setStaff(data.data || []);
		} catch (error) { toast.error(error.message); }
		finally { setLoading(false); }
	// Token chỉ thay đổi khi đăng nhập lại.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => { loadStaff(); }, [loadStaff]);

	const togglePermission = (permission) => setForm((current) => ({
		...current,
		permissions: current.permissions.includes(permission)
			? current.permissions.filter((item) => item !== permission)
			: [...current.permissions, permission],
	}));

	const submit = async (event) => {
		event.preventDefault();
		if (!/^\d{10}$/.test(form.phone)) return toast.error("Số điện thoại phải có đúng 10 chữ số");
		if (form.password.length < 6) return toast.error("Mật khẩu phải có ít nhất 6 ký tự");
		try {
			setSubmitting(true);
			const response = await fetch(API_URL, {
				method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(form),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Không thể tạo nhân viên");
			setStaff((current) => [data.data, ...current]);
			setForm(EMPTY_FORM);
			toast.success("Đã tạo tài khoản nhân viên xét nghiệm");
		} catch (error) { toast.error(error.message); }
		finally { setSubmitting(false); }
	};

	const toggleActive = async (member) => {
		try {
			const response = await fetch(`${API_URL}/${member._id}`, {
				method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
				body: JSON.stringify({ isActive: !member.isActive }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Không thể cập nhật tài khoản");
			setStaff((current) => current.map((item) => item._id === member._id ? data.data : item));
			toast.success(data.data.isActive ? "Đã mở lại tài khoản" : "Đã khóa tài khoản");
		} catch (error) { toast.error(error.message); }
	};

	const fieldClass = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";
	return (
		<div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
			<Toaster position="top-right" />
			<div className="mx-auto max-w-7xl">
				<header className="mb-6">
					<h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900"><span className="rounded-xl bg-red-100 p-2 text-red-600"><Users /></span>Nhân viên xét nghiệm</h1>
					<p className="mt-2 text-sm text-slate-500">Tạo tài khoản riêng và giới hạn đúng nghiệp vụ của từng nhân viên.</p>
				</header>
				<div className="grid gap-6 xl:grid-cols-[420px_1fr]">
					<form onSubmit={submit} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<h2 className="mb-5 flex items-center gap-2 font-semibold text-slate-800"><Plus size={19} className="text-red-600" />Thêm nhân viên</h2>
						<div className="space-y-4">
							<label className="block text-sm font-medium text-slate-700">Họ và tên *<input className={fieldClass} name="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required maxLength={120} placeholder="Nguyễn Văn An" /></label>
							<label className="block text-sm font-medium text-slate-700">Mã nhân viên *<input className={`${fieldClass} uppercase`} name="employeeCode" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} required placeholder="XN001" /></label>
							<label className="block text-sm font-medium text-slate-700">Email đăng nhập *<input className={fieldClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="nhanvien@trungtam.vn" /></label>
							<div className="grid grid-cols-2 gap-3">
								<label className="text-sm font-medium text-slate-700">Số điện thoại *<input className={fieldClass} inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} required maxLength={10} /></label>
								<label className="text-sm font-medium text-slate-700">Mật khẩu tạm *<div className="relative"><KeyRound className="absolute left-3 top-4 text-slate-400" size={16} /><input className={`${fieldClass} pl-9`} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div></label>
							</div>
							<fieldset><legend className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><ShieldCheck size={17} />Quyền nghiệp vụ</legend><div className="grid grid-cols-2 gap-2">{PERMISSIONS.map(([value, label]) => <label key={value} className="flex cursor-pointer gap-2 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={form.permissions.includes(value)} onChange={() => togglePermission(value)} className="accent-red-600" />{label}</label>)}</div></fieldset>
							<button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60">{submitting ? <Loader2 className="animate-spin" size={19} /> : <Plus size={19} />}Tạo tài khoản</button>
						</div>
					</form>

					<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-800">Danh sách nhân viên</h2><p className="text-xs text-slate-500">{staff.filter((item) => item.isActive).length} tài khoản đang hoạt động</p></div>
						{loading ? <div className="flex justify-center p-16 text-red-600"><Loader2 className="animate-spin" /></div> : staff.length === 0 ? <div className="p-16 text-center text-sm text-slate-500">Trung tâm chưa có nhân viên xét nghiệm.</div> : <div className="divide-y divide-slate-100">{staff.map((member) => (
							<article key={member._id} className="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${member.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><UserRound size={20} /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{member.fullName}</h3><span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{member.employeeCode}</span></div><p className="mt-1 text-sm text-slate-500">Nhân viên xét nghiệm · {member.email}</p><div className="mt-3 flex flex-wrap gap-1.5">{member.permissions.map((permission) => <span key={permission} className="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-700">{PERMISSIONS.find(([value]) => value === permission)?.[1] || permission}</span>)}</div></div></div><button type="button" onClick={() => toggleActive(member)} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${member.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{member.isActive ? <CircleOff size={15} /> : <BadgeCheck size={15} />}{member.isActive ? "Khóa tài khoản" : "Mở tài khoản"}</button></div></article>
						))}</div>}
					</section>
				</div>
			</div>
		</div>
	);
}
