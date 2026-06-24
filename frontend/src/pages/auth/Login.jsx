"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";

// ─── Validation helpers ───────────────────────────────────────────────────────

const DANGEROUS_WORDS = [
	"select",
	"insert",
	"update",
	"delete",
	"drop",
	"create",
	"alter",
	"exec",
	"execute",
	"script",
	"javascript",
	"onerror",
	"onload",
	"<script",
	"</script",
	"alert(",
	"eval(",
	"document.",
	"window.",
	"union",
	"truncate",
	"++",
	"==",
	"//",
	"+-",
	"--",
	"/*",
	"*/",
	"xp_",
	"';",
	'";',
];

function containsDangerousContent(value) {
	return DANGEROUS_WORDS.some((word) => value.toLowerCase().includes(word));
}

function isValidEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateIdentifier(value) {
	if (!value) return "Vui lòng nhập email hoặc số điện thoại.";
	if (containsDangerousContent(value)) return "Thông tin nhập vào chứa ký tự không hợp lệ.";
	const looksLikePhone = /^\+?[\d\s\-().]+$/.test(value);
	if (looksLikePhone) {
		const digits = value.replace(/\D/g, "");
		if (digits.length > 10) return "Số điện thoại không được vượt quá 10 chữ số.";
		return "";
	}
	if (!isValidEmail(value)) return "Địa chỉ email không hợp lệ.";
	return "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Login() {
	const [mode, setMode] = useState("login"); // "login" | "forgot" | "otp" | "reset"
	const [formData, setFormData] = useState({ identifier: "", password: "" });
	const [fieldErrors, setFieldErrors] = useState({ identifier: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [successMsg, setSuccessMsg] = useState("");

	// Forgot password state
	const [forgotEmail, setForgotEmail] = useState("");
	const [forgotError, setForgotError] = useState("");
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetError, setResetError] = useState("");

	const navigate = useNavigate();

	// ── Login handlers ───────────────────────────────────────────────────────────

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (error) setError("");
		if (name === "identifier")
			setFieldErrors((prev) => ({ ...prev, identifier: validateIdentifier(value) }));
		if (name === "password")
			setFieldErrors((prev) => ({ ...prev, password: value ? "" : "Vui lòng nhập mật khẩu." }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const identifierErr = validateIdentifier(formData.identifier);
		const passwordErr = formData.password ? "" : "Vui lòng nhập mật khẩu.";
		setFieldErrors({ identifier: identifierErr, password: passwordErr });
		if (identifierErr || passwordErr) return;

		setLoading(true);
		setError("");

		const looksLikePhone = /^\+?[\d\s\-().]+$/.test(formData.identifier);
		const payload = looksLikePhone
			? { phone: formData.identifier.replace(/\D/g, ""), password: formData.password }
			: { email: formData.identifier, password: formData.password };

		try {
			const res = await fetch("http://localhost:5000/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await res.json();

			if (!res.ok && data.message?.includes("not found")) {
      const staffRes = await fetch("http://localhost:5000/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.identifier, password: formData.password }),
      });
      const staffData = await staffRes.json();
      if (staffRes.ok && staffData.success) {
        // Lưu token staff
        localStorage.setItem("token", staffData.token);
        localStorage.setItem("role", "staff");
        localStorage.setItem("staffInfo", JSON.stringify(staffData.staff));
        navigate("/staff", { replace: true });
        return;
      } else {
        throw new Error(staffData.message || "Đăng nhập thất bại");
      }
    }
			if (!res.ok) {
				if (data.message?.includes("awaiting admin approval"))
					return setError("Tài khoản đang chờ quản trị viên phê duyệt.");
				if (data.message?.includes("rejected"))
					return setError("Tài khoản đã bị từ chối bởi quản trị viên.");
				if (res.status === 404 || data.message?.toLowerCase().includes("not found"))
					return setError("Tài khoản không tồn tại. Vui lòng kiểm tra lại email hoặc số điện thoại.");
				if (res.status === 401 || data.message?.toLowerCase().includes("invalid"))
					return setError("Mật khẩu không chính xác. Vui lòng thử lại.");
				return setError(data.message || "Đăng nhập thất bại. Vui lòng thử lại.");
			}

			const role = data.user?.role || "unknown";
			localStorage.setItem("token", data.token);
			localStorage.setItem("role", role);

			const targetPath =
				data.redirect ||
				(role === "donor"
					? "/donor"
					: role === "hospital"
						? "/hospital"
						: role === "blood-lab"
							? "/lab"
							: role === "admin"
								? "/admin"
								: role === "donation_staff"
								? "/donation_staff"
								: "/");
			navigate(targetPath, { replace: true });
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// ── Forgot password handlers ─────────────────────────────────────────────────

	const handleSendOtp = async () => {
		if (!forgotEmail.trim()) return setForgotError("Vui lòng nhập email.");
		if (!isValidEmail(forgotEmail)) return setForgotError("Email không hợp lệ.");
		setForgotError("");
		setLoading(true);
		try {
			const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: forgotEmail }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Không thể gửi mã OTP.");
			setMode("otp");
			setSuccessMsg("Mã OTP đã được gửi đến email của bạn.");
		} catch (err) {
			setForgotError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleOtpChange = (index, value) => {
		if (!/^\d*$/.test(value)) return;
		const next = [...otp];
		next[index] = value.slice(-1);
		setOtp(next);
		if (value && index < 5) {
			document.getElementById(`otp-${index + 1}`)?.focus();
		}
	};

	const handleOtpKeyDown = (index, e) => {
		if (e.key === "Backspace" && !otp[index] && index > 0) {
			document.getElementById(`otp-${index - 1}`)?.focus();
		}
	};

	const handleVerifyOtp = async () => {
		const code = otp.join("");
		if (code.length < 6) return setResetError("Vui lòng nhập đủ 6 chữ số OTP.");
		setResetError("");
		setLoading(true);
		try {
			const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: forgotEmail, otp: code }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "OTP không hợp lệ.");
			setMode("reset");
			setSuccessMsg("");
		} catch (err) {
			setResetError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async () => {
		if (!newPassword) return setResetError("Vui lòng nhập mật khẩu mới.");
		if (newPassword.length < 6) return setResetError("Mật khẩu phải có ít nhất 6 ký tự.");
		if (newPassword !== confirmPassword) return setResetError("Mật khẩu xác nhận không khớp.");
		setResetError("");
		setLoading(true);
		try {
			const res = await fetch("http://localhost:5000/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: forgotEmail, otp: otp.join(""), newPassword }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Đặt lại mật khẩu thất bại.");
			setMode("login");
			setSuccessMsg("✅ Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
			setForgotEmail("");
			setOtp(["", "", "", "", "", ""]);
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			setResetError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const backToLogin = () => {
		setMode("login");
		setForgotEmail("");
		setForgotError("");
		setOtp(["", "", "", "", "", ""]);
		setNewPassword("");
		setConfirmPassword("");
		setResetError("");
		setError("");
		setSuccessMsg("");
	};

	// ── Shared UI helpers ────────────────────────────────────────────────────────

	const EyeIcon = ({ show, onClick }) => (
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition">
			{show ? (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-3.568M6.343 6.343A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.773 9.773 0 01-1.412 2.588M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3v.01M3 3l18 18"
					/>
				</svg>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
					/>
				</svg>
			)}
		</button>
	);

	// ── Render ──────────────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<Header />

			<div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md border border-gray-200">
				{/* ════════════════ LOGIN ════════════════ */}
				{mode === "login" && (
					<>
						<h2 className="text-2xl font-bold text-center mb-1">
							<span className="bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
								ĐĂNG NHẬP
							</span>
						</h2>
						<p className="text-center text-gray-500 mb-6 text-sm">
							Vui lòng nhập thông tin bên dưới để tiếp tục
						</p>

						{successMsg && (
							<div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
								{successMsg}
							</div>
						)}
						{error && (
							<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
								<span>⚠</span>
								{error}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-5" noValidate>
							<div>
								<label className="block text-sm font-medium text-gray-800 mb-1">
									Email / Số điện thoại
								</label>
								<input
									type="text"
									name="identifier"
									placeholder="Nhập email hoặc số điện thoại"
									value={formData.identifier}
									onChange={handleChange}
									disabled={loading}
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm ${fieldErrors.identifier ? "border-red-400 bg-red-50" : "border-gray-300"}`}
								/>
								{fieldErrors.identifier && (
									<p className="mt-1 text-xs text-red-600 flex items-center gap-1">
										<span>⚠</span>
										{fieldErrors.identifier}
									</p>
								)}
							</div>

							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="text-sm font-medium text-gray-800">Mật Khẩu</label>
									<button
										type="button"
										onClick={() => {
											setMode("forgot");
											setSuccessMsg("");
											setError("");
										}}
										className="text-xs text-red-600 hover:underline font-medium">
										Quên mật khẩu?
									</button>
								</div>
								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										name="password"
										placeholder="Nhập mật khẩu của bạn"
										value={formData.password}
										onChange={handleChange}
										disabled={loading}
										className={`w-full px-4 py-3 pr-11 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm ${fieldErrors.password ? "border-red-400 bg-red-50" : "border-gray-300"}`}
									/>
									<EyeIcon show={showPassword} onClick={() => setShowPassword((v) => !v)} />
								</div>
								{fieldErrors.password && (
									<p className="mt-1 text-xs text-red-600 flex items-center gap-1">
										<span>⚠</span>
										{fieldErrors.password}
									</p>
								)}
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center text-sm">
								{loading ? (
									<>
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
										Đang đăng nhập...
									</>
								) : (
									"Đăng nhập"
								)}
							</button>
						</form>

						<p className="mt-6 text-center text-gray-600 text-sm">
							Chưa có tài khoản?{" "}
							<a href="/" className="text-red-600 font-medium hover:underline">
								Đăng ký ngay
							</a>
						</p>
					</>
				)}

				{/* ════════════════ QUÊN MẬT KHẨU ════════════════ */}
				{mode === "forgot" && (
					<>
						{/* Back button */}
						<button
							type="button"
							onClick={backToLogin}
							className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5 transition">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
							</svg>
							Quay lại đăng nhập
						</button>

						<div className="text-center mb-6">
							<div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-7 w-7 text-red-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
									/>
								</svg>
							</div>
							<h2 className="text-xl font-bold text-gray-900">Quên mật khẩu?</h2>
							<p className="text-gray-500 text-sm mt-1">Nhập email để nhận mã OTP đặt lại mật khẩu</p>
						</div>

						{forgotError && (
							<div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
								<span>⚠</span>
								{forgotError}
							</div>
						)}

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-800 mb-1">Địa chỉ Email</label>
								<input
									type="email"
									placeholder="Nhập email đã đăng ký"
									value={forgotEmail}
									onChange={(e) => {
										setForgotEmail(e.target.value);
										setForgotError("");
									}}
									disabled={loading}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm"
								/>
							</div>
							<button
								type="button"
								onClick={handleSendOtp}
								disabled={loading}
								className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center text-sm">
								{loading ? (
									<>
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
										Đang gửi...
									</>
								) : (
									"Gửi mã OTP"
								)}
							</button>
						</div>
					</>
				)}

				{/* ════════════════ NHẬP OTP ════════════════ */}
				{mode === "otp" && (
					<>
						<button
							type="button"
							onClick={() => setMode("forgot")}
							className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5 transition">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
							</svg>
							Quay lại
						</button>

						<div className="text-center mb-6">
							<div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-7 w-7 text-blue-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<h2 className="text-xl font-bold text-gray-900">Xác minh OTP</h2>
							<p className="text-gray-500 text-sm mt-1">
								Mã OTP đã gửi đến <span className="font-medium text-gray-700">{forgotEmail}</span>
							</p>
						</div>

						{successMsg && (
							<div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
								{successMsg}
							</div>
						)}
						{resetError && (
							<div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
								<span>⚠</span>
								{resetError}
							</div>
						)}

						{/* OTP boxes */}
						<div className="flex justify-center gap-3 mb-6">
							{otp.map((digit, i) => (
								<input
									key={i}
									id={`otp-${i}`}
									type="text"
									inputMode="numeric"
									maxLength={1}
									value={digit}
									onChange={(e) => handleOtpChange(i, e.target.value)}
									onKeyDown={(e) => handleOtpKeyDown(i, e)}
									className="w-11 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition"
								/>
							))}
						</div>

						<button
							type="button"
							onClick={handleVerifyOtp}
							disabled={loading}
							className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center text-sm">
							{loading ? (
								<>
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
									Đang xác minh...
								</>
							) : (
								"Xác nhận OTP"
							)}
						</button>

						<p className="text-center text-sm text-gray-500 mt-4">
							Không nhận được mã?{" "}
							<button
								type="button"
								onClick={handleSendOtp}
								disabled={loading}
								className="text-red-600 hover:underline font-medium">
								Gửi lại
							</button>
						</p>
					</>
				)}

				{/* ════════════════ ĐẶT LẠI MẬT KHẨU ════════════════ */}
				{mode === "reset" && (
					<>
						<div className="text-center mb-6">
							<div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-7 w-7 text-green-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									/>
								</svg>
							</div>
							<h2 className="text-xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
							<p className="text-gray-500 text-sm mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
						</div>

						{resetError && (
							<div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
								<span>⚠</span>
								{resetError}
							</div>
						)}

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-800 mb-1">Mật khẩu mới</label>
								<div className="relative">
									<input
										type={showNewPassword ? "text" : "password"}
										placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
										value={newPassword}
										onChange={(e) => {
											setNewPassword(e.target.value);
											setResetError("");
										}}
										className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm"
									/>
									<EyeIcon show={showNewPassword} onClick={() => setShowNewPassword((v) => !v)} />
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-800 mb-1">Xác nhận mật khẩu</label>
								<input
									type="password"
									placeholder="Nhập lại mật khẩu mới"
									value={confirmPassword}
									onChange={(e) => {
										setConfirmPassword(e.target.value);
										setResetError("");
									}}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm"
								/>
								{confirmPassword && newPassword !== confirmPassword && (
									<p className="mt-1 text-xs text-red-600 flex items-center gap-1">
										<span>⚠</span>Mật khẩu không khớp
									</p>
								)}
							</div>

							<button
								type="button"
								onClick={handleResetPassword}
								disabled={loading}
								className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center text-sm">
								{loading ? (
									<>
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
										Đang đặt lại...
									</>
								) : (
									"Đặt lại mật khẩu"
								)}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
