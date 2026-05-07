import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";

const WEBSITE_NAME = import.meta.env.VITE_WEBSITE_NAME || "Ngân Hàng Máu Việt Nam";

export default function Header({ currentUser, urgentBloodTypes = "O-, A-, B-" }) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const location = useLocation();

	// Xử lý scroll → thay đổi background
	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Đóng menu mobile khi chuyển route
	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	const navLinks = [
		{ name: "Trang chủ", path: "/" },
		{ name: "Giới thiệu", path: "/about" },
		{ name: "Liên hệ", path: "/contact" },
	];

	// FIX #5: Dùng variant field thay vì includes("Đăng ký")
	const authLinks = currentUser
		? [
				{ name: "Bảng điều khiển", path: "/dashboard", variant: "default" },
				{ name: "Hồ sơ", path: "/profile", variant: "default" },
			]
		: [
				{ name: "Đăng nhập", path: "/login", variant: "default" },
				{ name: "Đăng ký", path: "/register", variant: "primary" },
			];

	// FIX: Dùng NavLink className callback thay isActive() thủ công
	const navLinkClass = ({ isActive }) =>
		`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
			isActive ? "text-red-700 bg-red-50" : "text-gray-700 hover:text-red-600 hover:bg-red-50/50"
		}`;

	const mobileNavLinkClass = ({ isActive }) =>
		`block px-5 py-3.5 rounded-xl text-base font-medium transition-colors ${
			isActive
				? "bg-red-50 text-red-700 border-l-4 border-red-600"
				: "text-gray-800 hover:bg-gray-50 hover:text-red-600"
		}`;

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				scrolled
					? "bg-white/95 backdrop-blur-md shadow-lg border-b border-red-100"
					: "bg-white/90 backdrop-blur-sm border-b border-gray-100"
			}`}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-20">
					{/* Logo + Title */}
					<Link to="/" className="flex items-center gap-3 group">
						<div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="w-5 h-5 text-white">
								<path d="M12 2C12 2 6 8 6 12a6 6 0 0012 0c0-4-6-10-6-10z" />
							</svg>
						</div>
						<div className="flex flex-col">
							<h1 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-200">
								{WEBSITE_NAME}
							</h1>
							<p className="text-xs text-gray-500 -mt-0.5 font-medium">Blood Bank Management System</p>
						</div>
					</Link>

					{/* Desktop: Nav + Urgent + CTA + Auth */}
					<div className="hidden lg:flex items-center gap-5">
						{/* Menu chính — dùng NavLink */}
						<nav className="flex items-center gap-2" aria-label="Menu chính">
							{navLinks.map((link) => (
								<NavLink key={link.path} to={link.path} end={link.path === "/"} className={navLinkClass}>
									{link.name}
								</NavLink>
							))}
						</nav>

						<div className="mx-5 h-8 w-px bg-gray-300 shrink-0" />

						{/* Auth links */}
						<div className="flex items-center gap-2">
							{authLinks.map((link) => (
								<NavLink
									key={link.path}
									to={link.path}
									className={({ isActive }) =>
										`px-6 py-3 text-sm font-medium rounded-lg transition-all ${
											link.variant === "primary"
												? "bg-gradient-to-br from-red-900 to-red-600 text-white hover:bg-red-700 shadow-md"
												: isActive
													? "text-red-700 bg-red-50"
													: "text-gray-700 hover:text-red-600 hover:bg-gray-50"
										}`
									}>
									{link.name}
								</NavLink>
							))}
						</div>
					</div>

					{/* FIX #6: Mobile Hamburger với aria attributes đầy đủ */}
					<button
						onClick={() => setMobileOpen((prev) => !prev)}
						className={`lg:hidden p-2.5 rounded-xl transition-all ${
							mobileOpen ? "bg-red-50 text-red-600" : "hover:bg-gray-100 text-gray-700"
						}`}
						aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
						aria-expanded={mobileOpen}
						aria-controls="mobile-menu">
						{/* FIX #1: Thêm -translate-x-1/2 -translate-y-1/2 để căn giữa đúng */}
						<div className="relative w-6 h-6">
							<span
								className={`absolute left-1/2 top-1/2 w-6 h-0.5 bg-current rounded-full transition-all duration-300 -translate-x-1/2 ${
									mobileOpen ? "rotate-45 -translate-y-1/2" : "-translate-y-[10px]"
								}`}
							/>
							<span
								className={`absolute left-1/2 top-1/2 w-6 h-0.5 bg-current rounded-full transition-all duration-300 -translate-x-1/2 -translate-y-1/2 ${
									mobileOpen ? "opacity-0 scale-x-0" : "opacity-100"
								}`}
							/>
							<span
								className={`absolute left-1/2 top-1/2 w-6 h-0.5 bg-current rounded-full transition-all duration-300 -translate-x-1/2 ${
									mobileOpen ? "-rotate-45 -translate-y-1/2" : "translate-y-[6px]"
								}`}
							/>
						</div>
					</button>
				</div>
			</div>

			{/* FIX #2: duration-300 thay vì duration-400 (không tồn tại trong Tailwind) */}
			{/* FIX #3: max-h-[600px] để tránh bị cắt nếu thêm menu items */}
			<div
				id="mobile-menu"
				role="navigation"
				aria-label="Menu di động"
				className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
					mobileOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
				}`}>
				<div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
					<div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
						{/* Nav links */}
						<div className="space-y-1">
							{navLinks.map((link) => (
								<NavLink
									key={link.path}
									to={link.path}
									end={link.path === "/"}
									className={mobileNavLinkClass}
									onClick={() => setMobileOpen(false)}>
									{link.name}
								</NavLink>
							))}
						</div>

						{/* Auth links */}
						<div className="pt-4 border-t border-gray-200 space-y-2">
							{authLinks.map((link) => (
								<NavLink
									key={link.path}
									to={link.path}
									className={({ isActive }) =>
										`block px-5 py-3.5 rounded-xl text-base font-medium text-center transition-all ${
											link.variant === "primary"
												? "bg-red-600 text-white hover:bg-red-700 shadow-md"
												: isActive
													? "bg-red-50 text-red-700 border-l-4 border-red-600"
													: "text-gray-800 hover:bg-gray-50 hover:text-red-600"
										}`
									}
									onClick={() => setMobileOpen(false)}>
									{link.name}
								</NavLink>
							))}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
