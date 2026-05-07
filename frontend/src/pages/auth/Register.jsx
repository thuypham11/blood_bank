import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";

export default function Register() {
	const navigate = useNavigate();
	const [hovered, setHovered] = useState(null);

	const accountTypes = [
		{
			id: "donor",
			path: "/register/donor",
			label: "Người hiến máu",
			icon: (
				<svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
					<path d="M12 2C12 2 6 8.5 6 13a6 6 0 0012 0C18 8.5 12 2 12 2z" />
				</svg>
			),
			color: "red",
			tagline: "Tôi muốn hiến máu cứu người",
			features: [
				"Đăng ký thông tin nhóm máu cá nhân",
				"Nhận thông báo khi có tổ chức hiến máu",
				"Theo dõi lịch sử hiến máu",
				"Kết nối với các cơ sở y tế gần bạn",
				"Nhận chứng nhận & ghi nhận đóng góp",
			],
			badge: "Dành cho cá nhân",
		},
		{
			id: "facility",
			path: "/register/facility",
			label: "Cơ sở y tế",
			icon: (
				<svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
					<path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 011 1v2h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2H9a1 1 0 010-2h2V7a1 1 0 011-1z" />
				</svg>
			),
			color: "blue",
			tagline: "Bệnh viện, trung tâm y tế",
			features: [
				"Quản lý kho máu & tồn kho theo thời gian thực",
				"Yêu cầu máu khẩn cấp lên hệ thống",
				"Tìm kiếm & liên hệ người hiến phù hợp",
				"Xác minh & quản lý hồ sơ người hiến",
				"Báo cáo thống kê & lịch sử tiếp nhận",
			],
			badge: "Dành cho tổ chức",
		},
	];

	const colorMap = {
		red: {
			border: "border-red-200",
			borderHover: "hover:border-red-400",
			iconBg: "bg-red-100",
			iconText: "text-red-600",
			badge: "bg-red-100 text-red-700",
			btn: "bg-red-600 hover:bg-red-700",
			check: "text-red-500",
			ring: "ring-red-300",
			glow: "shadow-red-100",
		},
		blue: {
			border: "border-blue-200",
			borderHover: "hover:border-blue-400",
			iconBg: "bg-blue-100",
			iconText: "text-blue-600",
			badge: "bg-blue-100 text-blue-700",
			btn: "bg-blue-600 hover:bg-blue-700",
			check: "text-blue-500",
			ring: "ring-blue-300",
			glow: "shadow-blue-100",
		},
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-16">
			<Header />

			{/* Card wrapper — matches Login's card style */}
			<div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-4xl border border-gray-200">
				{/* Title — mirrors Login heading */}
				<h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
					<span className="bg-gradient-to-r from-red-800 to-red-600 bg-clip-text text-transparent">
						ĐĂNG KÝ
					</span>
				</h2>
				<p className="text-center text-gray-500 mb-8 text-sm">
					Chọn loại tài khoản phù hợp với bạn để bắt đầu
				</p>

				{/* Account type cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					{accountTypes.map((type) => {
						const c = colorMap[type.color];
						const isHovered = hovered === type.id;

						return (
							<div
								key={type.id}
								onMouseEnter={() => setHovered(type.id)}
								onMouseLeave={() => setHovered(null)}
								onClick={() => navigate(type.path)}
								className={`
									relative cursor-pointer rounded-lg border-2 p-5 flex flex-col gap-4
									transition-all duration-300 bg-white
									${c.border} ${c.borderHover}
									${isHovered ? `shadow-lg ${c.glow} -translate-y-0.5 ring-2 ${c.ring}` : "shadow-sm"}
								`}>
								{/* Badge */}
								<span
									className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
									{type.badge}
								</span>

								{/* Icon + Label */}
								<div className="flex items-center gap-3 pr-20">
									<div
										className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg} ${c.iconText} transition-transform duration-300 ${isHovered ? "scale-110" : ""}`}>
										{type.icon}
									</div>
									<div>
										<h3 className="text-base font-bold text-gray-900">{type.label}</h3>
										<p className="text-xs text-gray-500 mt-0.5 leading-snug">{type.tagline}</p>
									</div>
								</div>

								{/* Divider */}
								<div className="border-t border-gray-100" />

								{/* Features */}
								<ul className="space-y-2 flex-1">
									{type.features.map((f, i) => (
										<li key={i} className="flex items-start gap-2 text-xs text-gray-600">
											<svg
												className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.check}`}
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={2.5}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
											</svg>
											{f}
										</li>
									))}
								</ul>

								{/* CTA Button — matches Login's submit button */}
								<button
									className={`w-full py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center ${c.btn} ${isHovered ? "shadow-md" : ""}`}
									onClick={(e) => {
										e.stopPropagation();
										navigate(type.path);
									}}>
									Đăng ký với tư cách {type.label} →
								</button>
							</div>
						);
					})}
				</div>

				{/* Footer note — mirrors Login's footer */}
				<p className="mt-6 text-center text-gray-600 text-sm">
					Đã có tài khoản?{" "}
					<a href="/login" className="text-red-600 font-medium hover:underline">
						Đăng nhập tại đây
					</a>
				</p>
			</div>
		</div>
	);
}
