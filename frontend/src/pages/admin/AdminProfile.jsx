import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
	Shield,
	User,
	Mail,
	Key,
	RefreshCw,
	Save,
	Eye,
	EyeOff,
	CheckCircle,
	Calendar,
	Activity,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/admin";

export default function AdminProfile() {
	const [admin, setAdmin] = useState(null);
	const [loading, setLoading] = useState(true);
	const [profileForm, setProfileForm] = useState({ name: "", email: "" });
	const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
	const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
	const [saving, setSaving] = useState(false);
	const [changingPass, setChangingPass] = useState(false);

	const token = localStorage.getItem("token");

	const fetchProfile = async () => {
		try {
			const res = await fetch(`${API_URL}/profile`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Không thể tải hồ sơ");
			const data = await res.json();
			setAdmin(data.admin);
			setProfileForm({ name: data.admin.name, email: data.admin.email });
		} catch (err) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchProfile(); }, []);

	const handleSaveProfile = async (e) => {
		e.preventDefault();
		if (!profileForm.name.trim() || !profileForm.email.trim()) {
			toast.error("Tên và email không được để trống");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch(`${API_URL}/profile`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify(profileForm),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Lưu thất bại");
			setAdmin(data.admin);
			toast.success("Cập nhật hồ sơ thành công!");
		} catch (err) {
			toast.error(err.message);
		} finally {
			setSaving(false);
		}
	};

	const handleChangePassword = async (e) => {
		e.preventDefault();
		const { currentPassword, newPassword, confirmPassword } = passwordForm;
		if (!currentPassword || !newPassword || !confirmPassword) {
			toast.error("Vui lòng điền đầy đủ các trường mật khẩu");
			return;
		}
		if (newPassword.length < 6) {
			toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("Mật khẩu xác nhận không khớp");
			return;
		}
		setChangingPass(true);
		try {
			const res = await fetch(`${API_URL}/change-password`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ currentPassword, newPassword }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Đổi mật khẩu thất bại");
			toast.success("Đổi mật khẩu thành công!");
			setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
		} catch (err) {
			toast.error(err.message);
		} finally {
			setChangingPass(false);
		}
	};

	const toggleShow = (field) =>
		setShowPasswords((p) => ({ ...p, [field]: !p[field] }));

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-pulse mb-4">
						<Shield className="w-12 h-12 text-red-500 mx-auto" />
					</div>
					<p className="text-gray-500">Đang tải hồ sơ...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
			<div className="max-w-3xl mx-auto">
				{/* Tiêu đề */}
				<div className="mb-8 flex items-center gap-3">
					<div className="p-2 bg-red-100 rounded-xl">
						<Shield className="w-7 h-7 text-red-600" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-800">Hồ Sơ Quản Trị Viên</h1>
						<p className="text-gray-500 text-sm mt-0.5">Quản lý thông tin tài khoản và bảo mật</p>
					</div>
				</div>

				{/* Thẻ thông tin tóm tắt */}
				{admin && (
					<div className="bg-white rounded-2xl shadow-md border border-red-100 p-6 mb-6">
						<div className="flex items-center gap-5">
							<div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
								<span className="text-2xl font-bold text-white">
									{admin.name?.charAt(0).toUpperCase()}
								</span>
							</div>
							<div className="flex-1">
								<h2 className="text-xl font-bold text-gray-800">{admin.name}</h2>
								<p className="text-gray-500 text-sm">{admin.email}</p>
								<div className="flex gap-2 mt-2">
									<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
										admin.role === "superadmin"
											? "bg-purple-100 text-purple-700 border-purple-200"
											: "bg-red-100 text-red-700 border-red-200"
									}`}>
										<Shield size={10} />
										{admin.role === "superadmin" ? "Super Admin" : "Admin"}
									</span>
									<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
										admin.isActive
											? "bg-green-100 text-green-700 border-green-200"
											: "bg-gray-100 text-gray-600 border-gray-200"
									}`}>
										<CheckCircle size={10} />
										{admin.isActive ? "Đang hoạt động" : "Tạm khóa"}
									</span>
								</div>
							</div>
							<div className="text-right text-sm text-gray-400 space-y-1">
								{admin.lastLogin && (
									<div className="flex items-center gap-1.5 justify-end">
										<Activity size={12} />
										<span>Đăng nhập: {new Date(admin.lastLogin).toLocaleDateString("vi-VN")}</span>
									</div>
								)}
								{admin.createdAt && (
									<div className="flex items-center gap-1.5 justify-end">
										<Calendar size={12} />
										<span>Tạo: {new Date(admin.createdAt).toLocaleDateString("vi-VN")}</span>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Form cập nhật hồ sơ */}
				<div className="bg-white rounded-2xl shadow-md border border-red-100 p-6 mb-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
						<User className="w-5 h-5 text-red-500" /> Thông Tin Cá Nhân
					</h3>
					<form onSubmit={handleSaveProfile} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1.5">
								Họ và tên <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
								<input
									type="text"
									value={profileForm.name}
									onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
									className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm"
									placeholder="Nhập họ và tên"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1.5">
								Email <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
								<input
									type="email"
									value={profileForm.email}
									onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
									className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm"
									placeholder="Nhập địa chỉ email"
								/>
							</div>
						</div>
						<button
							type="submit"
							disabled={saving}
							className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium text-sm">
							{saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
							{saving ? "Đang lưu..." : "Lưu thay đổi"}
						</button>
					</form>
				</div>

				{/* Form đổi mật khẩu */}
				<div className="bg-white rounded-2xl shadow-md border border-red-100 p-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
						<Key className="w-5 h-5 text-red-500" /> Đổi Mật Khẩu
					</h3>
					<form onSubmit={handleChangePassword} className="space-y-4">
						{[
							{ key: "current", label: "Mật khẩu hiện tại", field: "currentPassword" },
							{ key: "new", label: "Mật khẩu mới", field: "newPassword" },
							{ key: "confirm", label: "Xác nhận mật khẩu mới", field: "confirmPassword" },
						].map(({ key, label, field }) => (
							<div key={key}>
								<label className="block text-sm font-medium text-gray-700 mb-1.5">
									{label} <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
									<input
										type={showPasswords[key] ? "text" : "password"}
										value={passwordForm[field]}
										onChange={(e) => setPasswordForm((p) => ({ ...p, [field]: e.target.value }))}
										className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm"
										placeholder={`Nhập ${label.toLowerCase()}`}
									/>
									<button
										type="button"
										onClick={() => toggleShow(key)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
										{showPasswords[key] ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
							</div>
						))}

						{passwordForm.newPassword && passwordForm.confirmPassword && (
							<div className={`flex items-center gap-2 text-sm ${
								passwordForm.newPassword === passwordForm.confirmPassword ? "text-green-600" : "text-red-600"
							}`}>
								{passwordForm.newPassword === passwordForm.confirmPassword
									? <><CheckCircle size={14} /> Mật khẩu khớp</>
									: <><Key size={14} /> Mật khẩu chưa khớp</>
								}
							</div>
						)}

						<div className="pt-1">
							<p className="text-xs text-gray-400 mb-3">Mật khẩu mới phải có ít nhất 6 ký tự.</p>
							<button
								type="submit"
								disabled={changingPass}
								className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition-colors disabled:opacity-50 font-medium text-sm">
								{changingPass ? <RefreshCw size={16} className="animate-spin" /> : <Key size={16} />}
								{changingPass ? "Đang đổi..." : "Đổi mật khẩu"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
