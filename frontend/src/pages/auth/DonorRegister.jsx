"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import VIETNAM_WARDS from "../../data/location.js";

// Constants for better maintainability
const GENDERS = [
	{ value: "Male", label: "Nam" },
	{ value: "Female", label: "Nữ" },
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Validation functions
const validators = {
	fullName: (value) => (!value.trim() ? "Họ và tên là bắt buộc" : ""),
	email: (value) => {
		if (!value.trim()) return "Email là bắt buộc";
		if (!/^\S+@\S+\.\S+$/.test(value)) return "Địa chỉ email không hợp lệ";
		return "";
	},
	password: (value) => {
		if (!value) return "Mật khẩu là bắt buộc";
		if (value.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
		return "";
	},
	phone: (value) => {
		if (!value) return "Số điện thoại là bắt buộc";
		if (!/^[0-9]{10}$/.test(value)) return "Số điện thoại phải đúng 10 chữ số";
		return "";
	},
	// emergencyContact: không có trong donorModel – bỏ validation
	dob: (value) => {
		if (!value) return "Ngày sinh là bắt buộc";
		const age = calculateAge(value);
		if (age < 18 || age > 65) return "Người hiến máu phải từ 18 đến 65 tuổi";
		return "";
	},
	gender: (value) => (!value ? "Giới tính là bắt buộc" : ""),
	bloodGroup: (value) => (!value ? "Nhóm máu là bắt buộc" : ""),
	"healthInfo.weight": (value) => {
		if (!value) return "Cân nặng là bắt buộc";
		if (parseFloat(value) < 45) return "Cân nặng tối thiểu là 45kg";
		return "";
	},
	"healthInfo.height": (value) => (!value ? "Chiều cao là bắt buộc" : ""),
	"address.street": (value) => (!value.trim() ? "Địa chỉ đường là bắt buộc" : ""),
	"address.ward": (value) => (!value.trim() ? "Phường/Xã là bắt buộc" : ""),
	"address.state": (value) => (!value.trim() ? "Tỉnh/Thành phố là bắt buộc" : ""),
};

// Helper function to calculate age
const calculateAge = (dobString) => {
	if (!dobString) return null;
	const birthDate = new Date(dobString);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}
	return age;
};

export default function DonorRegisterForm() {
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
		fullName: "",
		email: "",
		password: "",
		phone: "",
		dob: "",
		gender: "",
		bloodGroup: "",
		healthInfo: {
			weight: "",
			height: "",
			hasDiseases: false,
			diseaseDetails: "",
		},
		address: {
			street: "",
			ward: "",
			state: "",
		},
	});

	const [errors, setErrors] = useState({});
	const [showPassword, setShowPassword] = useState(false);
	const [wardSearch, setWardSearch] = useState("");
	const [wardOpen, setWardOpen] = useState(false);
	const wardRef = useRef(null);

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

	// Handle form field changes
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		setFormData((prev) => {
			if (name.startsWith("healthInfo.")) {
				const field = name.split(".")[1];
				return {
					...prev,
					healthInfo: {
						...prev.healthInfo,
						[field]: type === "checkbox" ? checked : value,
					},
				};
			} else if (name.startsWith("address.")) {
				const field = name.split(".")[1];
				return {
					...prev,
					address: { ...prev.address, [field]: value },
				};
			}

			return {
				...prev,
				[name]: type === "checkbox" ? checked : value,
			};
		});

		// Mark field as touched
		setTouched((prev) => ({ ...prev, [name]: true }));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[name];
				return newErrors;
			});
		}
	};

	// Handle blur events for validation
	const handleBlur = (e) => {
		const { name } = e.target;
		setTouched((prev) => ({ ...prev, [name]: true }));

		// Validate single field
		validateField(name);
	};

	// Validate single field
	const validateField = (fieldName) => {
		let value;

		if (fieldName.includes(".")) {
			const [parent, child] = fieldName.split(".");
			if (parent === "healthInfo") {
				value = formData.healthInfo[child];
			} else if (parent === "address") {
				value = formData.address[child];
			}
		} else {
			value = formData[fieldName];
		}

		const error = validators[fieldName]?.(value, formData);

		setErrors((prev) => {
			if (error) {
				return { ...prev, [fieldName]: error };
			} else {
				const newErrors = { ...prev };
				delete newErrors[fieldName];
				return newErrors;
			}
		});
	};

	// Validate current step
	const validateStep = () => {
		const newErrors = {};

		const stepValidations = {
			1: ["fullName", "email", "password", "phone"],
			2: ["dob", "gender", "bloodGroup", "healthInfo.weight", "healthInfo.height"],
			3: ["address.street", "address.ward", "address.state"],
		};

		stepValidations[step].forEach((field) => {
			let value;

			if (field.includes(".")) {
				const [parent, child] = field.split(".");
				if (parent === "healthInfo") {
					value = formData.healthInfo[child];
				} else if (parent === "address") {
					value = formData.address[child];
				}
			} else {
				value = formData[field];
			}

			const error = validators[field]?.(value, formData);
			if (error) newErrors[field] = error;
		});

		setErrors(newErrors);

		// Mark all step fields as touched to show errors
		const newTouched = { ...touched };
		stepValidations[step].forEach((field) => {
			newTouched[field] = true;
		});
		setTouched(newTouched);

		return Object.keys(newErrors).length === 0;
	};

	const handleNext = () => {
		if (validateStep()) {
			setStep(step + 1);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} else {
			// Scroll to first error
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
		if (e && typeof e.preventDefault === "function") {
			e.preventDefault();
		}

		if (!validateStep()) {
			console.log("Validation failed on step 3. Data not submitted.");
			return;
		}

		setIsSubmitting(true);

		const age = calculateAge(formData.dob);
		const submissionPayload = {
			fullName: formData.fullName, // ✅ donorModel dùng fullName
			email: formData.email,
			password: formData.password,
			phone: formData.phone, // ✅ donorModel dùng phone
			age: age,
			gender: formData.gender,
			bloodGroup: formData.bloodGroup, // ✅ donorModel dùng bloodGroup
			weight: parseFloat(formData.healthInfo.weight), // ✅ donorModel: weight ở root
			address: {
				...formData.address,
				city: formData.address.ward, // model dùng 'city'
				ward: formData.address.ward,
			},
			role: "donor",
		};

		const API_URL = "http://localhost:5000/api/auth/register";

		console.log("Submitting Donor Data:", submissionPayload);

		try {
			const response = await fetch(API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(submissionPayload),
			});

			if (response.ok) {
				const result = await response.json();
				console.log("Donor Registered Successfully:", result);
				toast.success("🎉 Đăng ký người hiến máu thành công!");
				navigate("/login");
			} else {
				const errorData = await response.json();
				console.error("Đăng ký thất bại:", response.status, errorData);
				toast.error(`Đăng ký thất bại: ${errorData.message || "Vui lòng thử lại."}`);
			}
		} catch (error) {
			console.error("Network or fetch error:", error);
			toast.error("❌ Đăng ký thất bại do lỗi mạng. Vui lòng thử lại.");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Helper to check if field should show error
	const shouldShowError = (fieldName) => {
		return touched[fieldName] && errors[fieldName];
	};

	const progressPercentage = (step / 3) * 100;

	return (
		<div className="min-h-screen bg-red-50 flex items-center justify-center py-8 px-4 outline-0">
			<div className="w-full max-w-3xl bg-white rounded-xl shadow-lg overflow-hidden">
				{/* Header Section */}
				<div className="bg-red-700 text-white p-6">
					<h1 className="text-2xl font-bold text-center mb-2">Đăng Ký Người Hiến Máu</h1>
					<p className="text-center mb-4 opacity-90">Tham gia sứ mệnh cứu người trong 3 bước đơn giản</p>

					{/* Progress Bar */}
					<div className="mb-2 flex justify-between items-center text-sm">
						<span>Bước {step} / 3</span>
						<span>Hoàn thành {progressPercentage.toFixed(0)}%</span>
					</div>
					<div className="w-full bg-red-300 rounded-full h-2.5">
						<div
							className="bg-white h-2.5 rounded-full transition-all duration-300"
							style={{ width: `${progressPercentage}%` }}></div>
					</div>
					<div className="flex justify-between mt-2 text-sm">
						<span className={step >= 1 ? "font-semibold" : "opacity-75"}>Thông tin cá nhân</span>
						<span className={step >= 2 ? "font-semibold" : "opacity-75"}>Sức khỏe</span>
						<span className={step >= 3 ? "font-semibold" : "opacity-75"}>Địa chỉ</span>
					</div>
				</div>

				{/* Form Section */}
				<form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
					{/* Step 1: Personal Information */}
					{step === 1 && (
						<div className="space-y-6">
							<div>
								<label htmlFor="fullName" className="block font-medium mb-2">
									Họ và Tên <span className="text-red-500">*</span>
								</label>
								<input
									id="fullName"
									type="text"
									name="fullName"
									value={formData.fullName}
									onChange={handleChange}
									onBlur={handleBlur}
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
										shouldShowError("fullName") ? "border-red-500" : "border-gray-300"
									}`}
									placeholder="Nhập họ và tên của bạn"
								/>
								{shouldShowError("fullName") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span> {errors.fullName}
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
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
										shouldShowError("email") ? "border-red-500" : "border-gray-300"
									}`}
									placeholder="Nhập địa chỉ email"
								/>
								{shouldShowError("email") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span> {errors.email}
									</p>
								)}
							</div>

							<div>
								<label htmlFor="password" className="block font-medium mb-2">
									Mật khẩu <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										id="password"
										type={showPassword ? "text" : "password"}
										name="password"
										value={formData.password}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
											shouldShowError("password") ? "border-red-500" : "border-gray-300"
										}`}
										placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
									/>
									<EyeIcon show={showPassword} onClick={() => setShowPassword((v) => !v)} />
								</div>
								{shouldShowError("password") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span> {errors.password}
									</p>
								)}
							</div>

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
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
											shouldShowError("phone") ? "border-red-500" : "border-gray-300"
										}`}
										placeholder="Số điện thoại (tối đa 10 chữ số)"
										maxLength="10"
									/>
									{shouldShowError("phone") && (
										<p className="text-red-500 text-sm mt-1 flex items-center">
											<span className="mr-1">⚠</span> {errors.phone}
										</p>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Step 2: Health Information */}
					{step === 2 && (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="dob" className="block font-medium mb-2">
										Ngày sinh <span className="text-red-500">*</span>
									</label>
									<input
										id="dob"
										type="date"
										name="dob"
										value={formData.dob}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
											shouldShowError("dob") ? "border-red-500" : "border-gray-300"
										}`}
									/>
									{shouldShowError("dob") && (
										<p className="text-red-500 text-sm mt-1 flex items-center">
											<span className="mr-1">⚠</span> {errors.dob}
										</p>
									)}
									{formData.dob && (
										<p className="text-sm text-gray-600 mt-1">Tuổi: {calculateAge(formData.dob)}</p>
									)}
								</div>

								<div>
									<label htmlFor="gender" className="block font-medium mb-2">
										Giới tính <span className="text-red-500">*</span>
									</label>
									<select
										id="gender"
										name="gender"
										value={formData.gender}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
											shouldShowError("gender") ? "border-red-500" : "border-gray-300"
										}`}>
										<option value="">Chọn giới tính</option>
										{GENDERS.map((g) => (
											<option key={g.value} value={g.value}>
												{g.label}
											</option>
										))}
									</select>
									{shouldShowError("gender") && (
										<p className="text-red-500 text-sm mt-1 flex items-center">
											<span className="mr-1">⚠</span> {errors.gender}
										</p>
									)}
								</div>
							</div>

							<div>
								<label htmlFor="bloodGroup" className="block font-medium mb-2">
									Nhóm máu <span className="text-red-500">*</span>
								</label>
								<select
									id="bloodGroup"
									name="bloodGroup"
									value={formData.bloodGroup}
									onChange={handleChange}
									onBlur={handleBlur}
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
										shouldShowError("bloodGroup") ? "border-red-500" : "border-gray-300"
									}`}>
									<option value="">Chọn nhóm máu</option>
									{BLOOD_GROUPS.map((group) => (
										<option key={group} value={group}>
											{group}
										</option>
									))}
								</select>
								{shouldShowError("bloodGroup") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span> {errors.bloodGroup}
									</p>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="weight" className="block font-medium mb-2">
										Cân nặng (kg) <span className="text-red-500">*</span>
									</label>
									<input
										id="weight"
										type="number"
										name="healthInfo.weight"
										value={formData.healthInfo.weight}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
											shouldShowError("healthInfo.weight") ? "border-red-500" : "border-gray-300"
										}`}
										placeholder="Tối thiểu 45kg"
										min="45"
										step="0.1"
									/>
									{shouldShowError("healthInfo.weight") && (
										<p className="text-red-500 text-sm mt-1 flex items-center">
											<span className="mr-1">⚠</span> {errors["healthInfo.weight"]}
										</p>
									)}
								</div>

								<div>
									<label htmlFor="height" className="block font-medium mb-2">
										Chiều cao (cm) <span className="text-red-500">*</span>
									</label>
									<input
										id="height"
										type="number"
										name="healthInfo.height"
										value={formData.healthInfo.height}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
											shouldShowError("healthInfo.height") ? "border-red-500" : "border-gray-300"
										}`}
										placeholder="Chiều cao tính bằng cm"
										min="100"
										step="0.1"
									/>
									{shouldShowError("healthInfo.height") && (
										<p className="text-red-500 text-sm mt-1 flex items-center">
											<span className="mr-1">⚠</span> {errors["healthInfo.height"]}
										</p>
									)}
								</div>
							</div>

							<div className="flex items-center space-x-3">
								<input
									type="checkbox"
									id="hasDiseases"
									name="healthInfo.hasDiseases"
									checked={formData.healthInfo.hasDiseases}
									onChange={handleChange}
									className="w-4 h-4 accent-red-500"
								/>
								<label htmlFor="hasDiseases" className="font-medium">
									Tôi có bệnh lý nền
								</label>
							</div>

							{formData.healthInfo.hasDiseases && (
								<div>
									<label htmlFor="diseaseDetails" className="block font-medium mb-2">
										Chi tiết bệnh lý
									</label>
									<textarea
										id="diseaseDetails"
										name="healthInfo.diseaseDetails"
										value={formData.healthInfo.diseaseDetails}
										onChange={handleChange}
										rows="3"
										className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
										placeholder="Mô tả các bệnh lý, dị ứng hoặc thuốc đang dùng..."
									/>
								</div>
							)}
						</div>
					)}

					{/* Step 3: Address Information */}
					{step === 3 && (
						<div className="space-y-6">
							{/* Địa chỉ đường */}
							<div>
								<label htmlFor="street" className="block font-medium mb-2">
									Địa chỉ đường <span className="text-red-500">*</span>
								</label>
								<input
									id="street"
									type="text"
									name="address.street"
									value={formData.address.street}
									onChange={handleChange}
									onBlur={handleBlur}
									placeholder="Nhập địa chỉ đường"
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${shouldShowError("address.street") ? "border-red-500" : "border-gray-300"}`}
								/>
								{shouldShowError("address.street") && (
									<p className="text-red-500 text-sm mt-1 flex items-center">
										<span className="mr-1">⚠</span>
										{errors["address.street"]}
									</p>
								)}
							</div>

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

									<input type="hidden" name="address.ward" value={formData.address.ward} />

									{wardOpen && formData.address.state && (
										<div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
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
																setTouched((prev) => ({ ...prev, "address.ward": true }));
																validateField("address.ward");
															}}
															className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-red-50 hover:text-red-700 transition flex items-center justify-between ${formData.address.ward === ward ? "bg-red-50 text-red-700 font-medium" : "text-gray-700"}`}>
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
					)}

					{/* Navigation Buttons */}
					<div className={`flex ${step > 1 ? "justify-between" : "justify-end"} pt-6 border-t`}>
						{step > 1 && (
							<button
								type="button"
								onClick={handleBack}
								className="px-6 py-2.5 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
								disabled={isSubmitting}>
								Quay lại
							</button>
						)}

						{step < 3 ? (
							<button
								type="button"
								onClick={handleNext}
								className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
								Tiếp theo
							</button>
						) : (
							<button
								type="button"
								onClick={handleSubmit}
								disabled={isSubmitting}
								className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
								{isSubmitting ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
										Đang đăng ký...
									</>
								) : (
									"Đăng ký làm Người hiến máu"
								)}
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	);
}
