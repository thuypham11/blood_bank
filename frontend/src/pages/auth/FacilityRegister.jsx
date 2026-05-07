"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import VIETNAM_WARDS from "../../data/location.js";

const FACILITY_TYPES = ["Bệnh viện", "Phòng xét nghiệm máu"];
const FACILITY_CATEGORIES = ["Nhà nước", "Tư nhân", "Tổ chức từ thiện", "Phi lợi nhuận", "Khác"];

const WORKING_DAYS = [
	{ value: "Mon", label: "T2" },
	{ value: "Tue", label: "T3" },
	{ value: "Wed", label: "T4" },
	{ value: "Thu", label: "T5" },
	{ value: "Fri", label: "T6" },
	{ value: "Sat", label: "T7" },
	{ value: "Sun", label: "CN" },
];

const ALL_DAYS = WORKING_DAYS.map((d) => d.value);

const validators = {
	name: (value) => (!value.trim() ? "Tên cơ sở y tế là bắt buộc" : ""),
	email: (value) => {
		if (!value.trim()) return "Email là bắt buộc";
		if (!/^\S+@\S+\.\S+$/.test(value)) return "Địa chỉ email không hợp lệ";
		return "";
	},
	password: (value) => {
		if (!value) return "Mật khẩu là bắt buộc";
		if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
		return "";
	},
	phone: (value) => {
		if (!value) return "Số điện thoại là bắt buộc";
		const digits = value.replace(/\D/g, "");
		if (digits.length > 10) return "Số điện thoại không được vượt quá 10 chữ số";
		if (digits.length < 1) return "Số điện thoại không hợp lệ";
		return "";
	},
	emergencyContact: (value) => {
		if (!value) return "Liên hệ khẩn cấp là bắt buộc";
		const digits = value.replace(/\D/g, "");
		if (digits.length > 10) return "Số liên hệ khẩn cấp không được vượt quá 10 chữ số";
		if (digits.length < 1) return "Số liên hệ khẩn cấp không hợp lệ";
		return "";
	},
	registrationNumber: (value) => (!value.trim() ? "Số đăng ký là bắt buộc" : ""),
	"address.street": (value) => (!value.trim() ? "Địa chỉ đường là bắt buộc" : ""),
	"address.ward": (value) => (!value.trim() ? "Phường/Xã là bắt buộc" : ""),
	"address.state": (value) => (!value.trim() ? "Tỉnh/Thành phố là bắt buộc" : ""),
};

export default function FacilityRegisterForm() {
	// ── Eye icon component ───────────────────────────────────────────────────────
	const EyeIcon = ({ show, onClick }) => (
		<button
			type="button"
			onClick={onClick}
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

	const navigate = useNavigate();
	const [step, setStep] = useState(1);
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		phone: "",
		emergencyContact: "",
		address: { street: "", ward: "", state: "" },
		registrationNumber: "",
		facilityType: "Bệnh viện",
		facilityCategory: "Tư nhân",
		operatingHours: {
			open: "09:00",
			close: "18:00",
			workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
		},
		is24x7: false,
		emergencyServices: false,
	});

	const [errors, setErrors] = useState({});
	const [showPassword, setShowPassword] = useState(false);
	const [wardSearch, setWardSearch] = useState("");
	const [wardOpen, setWardOpen] = useState(false);
	const wardRef = useRef(null);

	// Đóng dropdown phường/xã khi click ra ngoài
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (wardRef.current && !wardRef.current.contains(e.target)) {
				setWardOpen(false);
				setWardSearch("");
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [touched, setTouched] = useState({});

	// ── Toggle working day chip ──────────────────────────────────────────────
	const toggleWorkingDay = (dayValue) => {
		if (formData.is24x7) return; // locked khi 24/7
		setFormData((prev) => {
			const current = prev.operatingHours.workingDays;
			const next = current.includes(dayValue)
				? current.filter((d) => d !== dayValue)
				: [...current, dayValue];
			return {
				...prev,
				operatingHours: { ...prev.operatingHours, workingDays: next },
			};
		});
	};

	// ── Handle 24/7 toggle ───────────────────────────────────────────────────
	const handle24x7Change = (checked) => {
		setFormData((prev) => ({
			...prev,
			is24x7: checked,
			operatingHours: {
				...prev.operatingHours,
				workingDays: checked ? ALL_DAYS : ["Mon", "Tue", "Wed", "Thu", "Fri"],
				open: checked ? "00:00" : "09:00",
				close: checked ? "23:59" : "18:00",
			},
		}));
	};

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (name === "is24x7") {
			handle24x7Change(checked);
			return;
		}

		setFormData((prev) => {
			if (name.startsWith("address.")) {
				const field = name.split(".")[1];
				return { ...prev, address: { ...prev.address, [field]: value } };
			} else if (name.startsWith("operatingHours.")) {
				const field = name.split(".")[1];
				return { ...prev, operatingHours: { ...prev.operatingHours, [field]: value } };
			}
			return { ...prev, [name]: type === "checkbox" ? checked : value };
		});

		setTouched((prev) => ({ ...prev, [name]: true }));
		if (errors[name]) {
			setErrors((prev) => {
				const n = { ...prev };
				delete n[name];
				return n;
			});
		}
	};

	const handleBlur = (e) => {
		const { name } = e.target;
		setTouched((prev) => ({ ...prev, [name]: true }));
		validateField(name);
	};

	const validateField = (fieldName) => {
		let value;
		if (fieldName.startsWith("address.")) {
			const child = fieldName.split(".")[1];
			value = formData.address[child];
		} else {
			value = formData[fieldName];
		}
		const error = validators[fieldName]?.(value);
		setErrors((prev) => {
			if (error) return { ...prev, [fieldName]: error };
			const n = { ...prev };
			delete n[fieldName];
			return n;
		});
	};

	const validateStep = () => {
		const newErrors = {};
		const stepValidations = {
			1: ["name", "email"],
			2: ["password", "facilityType"],
			3: [
				"phone",
				"emergencyContact",
				"registrationNumber",
				"address.street",
				"address.ward",
				"address.state",
			],
		};

		stepValidations[step].forEach((field) => {
			let value;
			if (field.startsWith("address.")) {
				value = formData.address[field.split(".")[1]];
			} else {
				value = formData[field];
			}
			const error = validators[field]?.(value);
			if (error) newErrors[field] = error;
		});

		setErrors(newErrors);
		const newTouched = { ...touched };
		stepValidations[step].forEach((f) => {
			newTouched[f] = true;
		});
		setTouched(newTouched);
		return Object.keys(newErrors).length === 0;
	};

	const handleNext = () => {
		if (validateStep()) {
			setStep(step + 1);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} else {
			const firstErrorField = Object.keys(errors)[0];
			const element = document.querySelector(`[name="${firstErrorField}"]`);
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "center" });
				element.focus();
			}
		}
	};

	const handleBack = () => {
		setStep(step - 1);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleSubmit = async (e) => {
		if (e && typeof e.preventDefault === "function") e.preventDefault();
		if (!validateStep()) return;

		setIsSubmitting(true);

		const facilityTypeMap = { "Bệnh viện": "hospital", "Phòng xét nghiệm máu": "blood-lab" };
		const roleSlug =
			facilityTypeMap[formData.facilityType] ||
			formData.facilityType.toLowerCase().replace(/\s+/g, "-");

		const facilityCategoryMap = {
			"Nhà nước": "Government",
			"Tư nhân": "Private",
			"Tổ chức từ thiện": "Trust",
			"Phi lợi nhuận": "Charity",
			Khác: "Other",
		};

		const submissionPayload = {
			...formData,
			facilityType: roleSlug,
			role: roleSlug,
			facilityCategory: facilityCategoryMap[formData.facilityCategory] || formData.facilityCategory,
			address: {
				...formData.address,
				city: formData.address.ward, // model dùng 'city', frontend dùng 'ward'
				ward: formData.address.ward,
			},
		};
		const API_URL = "http://localhost:5000/api/auth/register";

		try {
			const response = await fetch(API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(submissionPayload),
			});

			if (response.ok) {
				const result = await response.json();
				console.log("Facility Registered:", result);
				toast.success("✅ Đăng ký cơ sở y tế thành công!");
				navigate("/");
			} else {
				const errorData = await response.json();
				toast.error(`❌ Đăng ký thất bại: ${errorData.message || "Vui lòng kiểm tra lại."}`);
			}
		} catch (error) {
			console.error("Network error:", error);
			toast.error("❌ Lỗi mạng. Vui lòng đảm bảo máy chủ đang hoạt động.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const shouldShowError = (fieldName) => touched[fieldName] && errors[fieldName];
	const progressPercentage = (step / 3) * 100;

	return (
		<div className="min-h-screen bg-red-50 flex items-center justify-center py-8 px-4">
			<div className="w-full max-w-3xl bg-white rounded-xl shadow-lg overflow-hidden">
				{/* Header */}
				<div className="bg-red-700 text-white p-6">
					<h1 className="text-2xl font-bold text-center mb-2">Đăng Ký Cơ Sở Y Tế</h1>
					<p className="text-center mb-4 opacity-90">Đăng ký cơ sở y tế trong 3 bước đơn giản</p>
					<div className="mb-2 flex justify-between items-center text-sm">
						<span>Bước {step} / 3</span>
						<span>Hoàn thành {progressPercentage.toFixed(0)}%</span>
					</div>
					<div className="w-full bg-red-300 rounded-full h-2.5">
						<div
							className="bg-white h-2.5 rounded-full transition-all duration-300"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
					<div className="flex justify-between mt-2 text-sm">
						<span className={step >= 1 ? "font-semibold" : "opacity-75"}>Thông tin cơ bản</span>
						<span className={step >= 2 ? "font-semibold" : "opacity-75"}>Tài khoản</span>
						<span className={step >= 3 ? "font-semibold" : "opacity-75"}>Chi tiết</span>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
					{/* ── Bước 1: Thông tin cơ bản ── */}
					{step === 1 && (
						<div className="space-y-6">
							<div>
								<label htmlFor="name" className="block font-medium mb-2">
									Tên cơ sở y tế <span className="text-red-500">*</span>
								</label>
								<input
									id="name"
									type="text"
									name="name"
									value={formData.name}
									onChange={handleChange}
									onBlur={handleBlur}
									placeholder="Nhập tên cơ sở y tế"
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("name") ? "border-red-500" : "border-gray-300"}`}
								/>
								{shouldShowError("name") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span>
										{errors.name}
									</p>
								)}
							</div>

							<div>
								<label htmlFor="email" className="block font-medium mb-2">
									Email <span className="text-red-500">*</span>
								</label>
								<input
									id="email"
									type="email"
									name="email"
									value={formData.email}
									onChange={handleChange}
									onBlur={handleBlur}
									placeholder="Nhập địa chỉ email"
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("email") ? "border-red-500" : "border-gray-300"}`}
								/>
								{shouldShowError("email") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span>
										{errors.email}
									</p>
								)}
							</div>
						</div>
					)}

					{/* ── Bước 2: Tài khoản ── */}
					{step === 2 && (
						<div className="space-y-6">
							<div>
								<label htmlFor="password" className="block font-medium mb-2">
									Mật khẩu <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										value={formData.password}
										onChange={handleChange}
										onBlur={handleBlur}
										placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
										className={`w-full px-4 py-3 pr-11 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("password") ? "border-red-500" : "border-gray-300"}`}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
										aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}>
										{showPassword ? (
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
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
												/>
											</svg>
										)}
									</button>
								</div>
								{shouldShowError("password") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span>
										{errors.password}
									</p>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="facilityType" className="block font-medium mb-2">
										Loại cơ sở <span className="text-red-500">*</span>
									</label>
									<select
										id="facilityType"
										name="facilityType"
										value={formData.facilityType}
										onChange={handleChange}
										onBlur={handleBlur}
										className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
										{FACILITY_TYPES.map((ft) => (
											<option key={ft} value={ft}>
												{ft}
											</option>
										))}
									</select>
								</div>
								<div>
									<label htmlFor="facilityCategory" className="block font-medium mb-2">
										Phân loại cơ sở
									</label>
									<select
										id="facilityCategory"
										name="facilityCategory"
										value={formData.facilityCategory}
										onChange={handleChange}
										className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
										{FACILITY_CATEGORIES.map((fc) => (
											<option key={fc} value={fc}>
												{fc}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					)}

					{/* ── Bước 3: Chi tiết ── */}
					{step === 3 && (
						<div className="space-y-6">
							{/* Điện thoại + liên hệ khẩn cấp */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="phone" className="block font-medium mb-2">
										Số điện thoại <span className="text-red-500">*</span>
									</label>
									<input
										id="phone"
										type="tel"
										name="phone"
										value={formData.phone}
										onChange={handleChange}
										onBlur={handleBlur}
										placeholder="Số điện thoại (tối đa 10 chữ số)"
										maxLength="10"
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("phone") ? "border-red-500" : "border-gray-300"}`}
									/>
									{shouldShowError("phone") && (
										<p className="text-red-500 text-sm mt-1 flex items-center">
											<span className="mr-1">⚠</span>
											{errors.phone}
										</p>
									)}
								</div>
								<div>
									<label htmlFor="emergencyContact" className="block font-medium mb-2">
										Liên hệ khẩn cấp <span className="text-red-500">*</span>
									</label>
									<input
										id="emergencyContact"
										type="tel"
										name="emergencyContact"
										value={formData.emergencyContact}
										onChange={handleChange}
										onBlur={handleBlur}
										placeholder="Số liên hệ khẩn cấp (tối đa 10 chữ số)"
										maxLength="10"
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("emergencyContact") ? "border-red-500" : "border-gray-300"}`}
									/>
									{shouldShowError("emergencyContact") && (
										<p className="text-red-500 text-sm mt-1 flex items-center">
											<span className="mr-1">⚠</span>
											{errors.emergencyContact}
										</p>
									)}
								</div>
							</div>

							{/* Địa chỉ */}
							<div className="space-y-4">
								<label className="block font-medium">
									Địa chỉ <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="address.street"
									placeholder="Địa chỉ đường"
									value={formData.address.street}
									onChange={handleChange}
									onBlur={handleBlur}
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("address.street") ? "border-red-500" : "border-gray-300"}`}
								/>
								{shouldShowError("address.street") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span>
										{errors["address.street"]}
									</p>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{/* Tỉnh / Thành phố */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Tỉnh / Thành phố <span className="text-red-500">*</span>
										</label>
										<select
											name="address.state"
											value={formData.address.state}
											onChange={(e) => {
												handleChange(e);
												setFormData((prev) => ({ ...prev, address: { ...prev.address, ward: "" } }));
												setWardSearch("");
												setWardOpen(false);
											}}
											onBlur={handleBlur}
											className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("address.state") ? "border-red-500" : "border-gray-300"}`}>
											<option value="">-- Chọn tỉnh/thành phố --</option>
											{Object.keys(VIETNAM_WARDS).map((s) => (
												<option key={s} value={s}>
													{s}
												</option>
											))}
										</select>
										{shouldShowError("address.state") && (
											<p className="text-red-500 text-sm mt-1 flex items-center">
												<span className="mr-1">⚠</span>
												{errors["address.state"]}
											</p>
										)}
									</div>

									{/* Phường / Xã — searchable dropdown */}
									<div className="relative" ref={wardRef}>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Phường / Xã <span className="text-red-500">*</span>
										</label>
										<div
											className={`w-full px-4 py-3 border rounded-lg cursor-pointer flex items-center justify-between transition ${
												!formData.address.state
													? "bg-gray-100 text-gray-400 cursor-not-allowed"
													: shouldShowError("address.ward")
														? "border-red-500 bg-white"
														: "border-gray-300 bg-white"
											}`}
											onClick={() => {
												if (formData.address.state) setWardOpen((o) => !o);
											}}>
											<span className={formData.address.ward ? "text-gray-900" : "text-gray-400"}>
												{formData.address.ward ||
													(formData.address.state ? "-- Tìm phường/xã --" : "-- Chọn tỉnh trước --")}
											</span>
											<svg
												className={`w-4 h-4 text-gray-400 transition-transform ${wardOpen ? "rotate-180" : ""}`}
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={2}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
											</svg>
										</div>

										{/* Hidden input để trigger validation */}
										<input type="hidden" name="address.ward" value={formData.address.ward} />

										{/* Dropdown panel */}
										{wardOpen && formData.address.state && (
											<div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
												{/* Search box */}
												<div className="p-2 border-b border-gray-100">
													<div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
														<svg
															className="w-4 h-4 text-gray-400 shrink-0"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
															strokeWidth={2}>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"
															/>
														</svg>
														<input
															type="text"
															placeholder="Tìm phường/xã..."
															value={wardSearch}
															onChange={(e) => setWardSearch(e.target.value)}
															className="flex-1 bg-transparent text-sm outline-none"
															autoFocus
														/>
														{wardSearch && (
															<button
																type="button"
																onClick={() => setWardSearch("")}
																className="text-gray-400 hover:text-gray-600">
																<svg
																	className="w-3.5 h-3.5"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																	strokeWidth={2}>
																	<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
																</svg>
															</button>
														)}
													</div>
												</div>

												{/* List */}
												<ul className="max-h-52 overflow-y-auto">
													{(VIETNAM_WARDS[formData.address.state] || [])
														.filter((w) => w.toLowerCase().includes(wardSearch.toLowerCase()))
														.map((ward) => (
															<li
																key={ward}
																onClick={() => {
																	setFormData((prev) => ({ ...prev, address: { ...prev.address, ward } }));
																	setWardOpen(false);
																	setWardSearch("");
																}}
																className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-red-50 hover:text-red-700 transition flex items-center justify-between ${
																	formData.address.ward === ward
																		? "bg-red-50 text-red-700 font-medium"
																		: "text-gray-700"
																}`}>
																{ward}
																{formData.address.ward === ward && (
																	<svg
																		className="w-4 h-4 text-red-500"
																		fill="none"
																		viewBox="0 0 24 24"
																		stroke="currentColor"
																		strokeWidth={2.5}>
																		<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
																	</svg>
																)}
															</li>
														))}
													{(VIETNAM_WARDS[formData.address.state] || []).filter((w) =>
														w.toLowerCase().includes(wardSearch.toLowerCase()),
													).length === 0 && (
														<li className="px-4 py-3 text-sm text-gray-400 text-center">
															Không tìm thấy phường/xã
														</li>
													)}
												</ul>
											</div>
										)}

										{shouldShowError("address.ward") && (
											<p className="text-red-500 text-sm mt-1 flex items-center">
												<span className="mr-1">⚠</span>
												{errors["address.ward"]}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Số đăng ký */}
							<div>
								<label htmlFor="registrationNumber" className="block font-medium mb-2">
									Số đăng ký <span className="text-red-500">*</span>
								</label>
								<input
									id="registrationNumber"
									type="text"
									name="registrationNumber"
									value={formData.registrationNumber}
									onChange={handleChange}
									onBlur={handleBlur}
									placeholder="Nhập số đăng ký"
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("registrationNumber") ? "border-red-500" : "border-gray-300"}`}
								/>
								{shouldShowError("registrationNumber") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span>
										{errors.registrationNumber}
									</p>
								)}
							</div>

							{/* ── Dịch vụ 24/7 + Cấp cứu ── */}
							<div className="flex flex-wrap gap-4">
								{/* 24/7 Toggle */}
								<label
									className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
										formData.is24x7
											? "border-red-500 bg-red-50 text-red-700"
											: "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
									}`}>
									<div
										className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${formData.is24x7 ? "bg-red-500" : "bg-gray-300"}`}>
										<div
											className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${formData.is24x7 ? "translate-x-5" : "translate-x-0.5"}`}
										/>
									</div>
									<input
										type="checkbox"
										name="is24x7"
										checked={formData.is24x7}
										onChange={handleChange}
										className="sr-only"
									/>
									<div>
										<p className="font-semibold text-sm">Hoạt động 24/7</p>
										<p className="text-xs opacity-70">Tự động chọn toàn bộ giờ & ngày</p>
									</div>
								</label>

								{/* Emergency Services Toggle */}
								<label
									className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
										formData.emergencyServices
											? "border-orange-500 bg-orange-50 text-orange-700"
											: "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
									}`}>
									<div
										className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${formData.emergencyServices ? "bg-orange-500" : "bg-gray-300"}`}>
										<div
											className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${formData.emergencyServices ? "translate-x-5" : "translate-x-0.5"}`}
										/>
									</div>
									<input
										type="checkbox"
										name="emergencyServices"
										checked={formData.emergencyServices}
										onChange={handleChange}
										className="sr-only"
									/>
									<div>
										<p className="font-semibold text-sm">Dịch vụ cấp cứu</p>
										<p className="text-xs opacity-70">Có hỗ trợ khẩn cấp 24h</p>
									</div>
								</label>
							</div>

							{/* ── Giờ hoạt động ── */}
							<div
								className={`space-y-4 rounded-xl border-2 p-4 transition-all duration-200 ${formData.is24x7 ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
								<div className="flex items-center justify-between">
									<p className="font-medium text-sm text-gray-700">Giờ hoạt động</p>
									{formData.is24x7 && (
										<span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
											🕐 Hoạt động 24/7
										</span>
									)}
								</div>

								{/* Giờ mở / đóng */}
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">Giờ mở cửa</label>
										<input
											type="time"
											name="operatingHours.open"
											value={formData.operatingHours.open}
											onChange={handleChange}
											disabled={formData.is24x7}
											className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition text-sm disabled:opacity-50 disabled:bg-gray-100"
										/>
									</div>
									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">Giờ đóng cửa</label>
										<input
											type="time"
											name="operatingHours.close"
											value={formData.operatingHours.close}
											onChange={handleChange}
											disabled={formData.is24x7}
											className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition text-sm disabled:opacity-50 disabled:bg-gray-100"
										/>
									</div>
								</div>

								{/* ── Ngày làm việc — chip buttons ── */}
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-2">
										Ngày làm việc
										<span className="ml-2 text-gray-400 font-normal">
											({formData.operatingHours.workingDays.length}/7 ngày)
										</span>
									</label>
									<div className="flex gap-2 flex-wrap">
										{WORKING_DAYS.map((day) => {
											const isSelected = formData.operatingHours.workingDays.includes(day.value);
											return (
												<button
													key={day.value}
													type="button"
													onClick={() => toggleWorkingDay(day.value)}
													disabled={formData.is24x7}
													className={`w-10 h-10 rounded-full text-sm font-semibold border-2 transition-all duration-150 select-none
														${
															isSelected
																? "bg-red-500 border-red-500 text-white shadow-sm scale-105"
																: "bg-white border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500"
														}
														${formData.is24x7 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
													`}>
													{day.label}
												</button>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Navigation */}
					<div className={`flex ${step > 1 ? "justify-between" : "justify-end"} pt-6 border-t`}>
						{step > 1 && (
							<button
								type="button"
								onClick={handleBack}
								disabled={isSubmitting}
								className="px-6 py-2.5 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
								Quay lại
							</button>
						)}
						{step < 3 ? (
							<button
								type="button"
								onClick={handleNext}
								className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
								Bước tiếp theo
							</button>
						) : (
							<button
								type="button"
								onClick={handleSubmit}
								disabled={isSubmitting}
								className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
								{isSubmitting ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
										Đang đăng ký...
									</>
								) : (
									"Đăng ký cơ sở y tế"
								)}
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	);
}
