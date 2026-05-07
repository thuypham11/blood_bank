import React from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Phone, Mail, Facebook, Instagram, Linkedin, Globe } from "lucide-react";

const Footer = () => {
	const currentYear = new Date().getFullYear();

	const quickLinks = [
		{ name: "Giới thiệu", path: "/about" },
		{ name: "Liên hệ", path: "/contact" },
	];

	const socialLinks = [
		{ icon: Facebook, name: "Facebook", url: "#" },
		{ icon: Instagram, name: "Instagram", url: "#" },
		{ icon: Linkedin, name: "LinkedIn", url: "#" },
		{ icon: Globe, name: "Website", url: "#" },
	];

	return (
		<footer className="bg-gradient-to-b from-slate-900 to-gray-900 text-white">
			{/* Main Footer Content */}
			<div className="container mx-auto px-4 py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
					{/* Brand Column */}
					<div className="lg:col-span-1">
						<Link to="/" className="flex items-center gap-3 mb-6">
							<div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
								<Heart className="w-6 h-6 text-white" />
							</div>
							<div>
								<h2 className="text-xl font-bold text-white">Ngân Hàng Máu</h2>
								<p className="text-red-200 text-sm">Kết nối · Chia sẻ · Cứu sống</p>
							</div>
						</Link>
						<p className="text-gray-300 mb-6 leading-relaxed text-sm">
							Kết nối người hiến máu tình nguyện với các cơ sở y tế thông qua hệ thống quản lý ngân hàng
							máu hiện đại. Cùng nhau, chúng ta cứu sống con người.
						</p>
						<div className="flex space-x-3">
							{socialLinks.map((social, index) => {
								const Icon = social.icon;
								return (
									<a
										key={index}
										href={social.url}
										className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-600 transition-all duration-300 hover:scale-110"
										aria-label={social.name}>
										<Icon className="w-5 h-5" />
									</a>
								);
							})}
						</div>
					</div>

					{/* Quick Links */}
					<div> </div>

					<div>
						<div className="flex items-start gap-3 mb-3 text-gray-300 text-sm">
							<Phone className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
							<div>
								<p>1900 6868</p>
								<p>0888 115 115</p>
								<p className="text-gray-500 text-xs">Hỗ trợ 24/7</p>
							</div>
						</div>
						<div className="flex items-start gap-3 mb-3 text-gray-300 text-sm">
							<Mail className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
							<div>
								<p>hotro@nganhangmau.vn</p>
								<p>tuvan@nganhangmau.vn</p>
							</div>
						</div>
						<div className="flex items-start gap-3 mb-3 text-gray-300 text-sm">
							<MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
							<p>Số 236, Hoàng Quốc Việt, P. Nghĩa Đô, Hà Nội</p>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className="border-t border-gray-800">
				<div className="container mx-auto px-4 py-6">
					<div className="flex justify-between items-center gap-4">
						<div className="text-gray-400 text-sm">
							© {currentYear} Ngân Hàng Máu Việt Nam. Bảo lưu mọi quyền. Cứu sống qua công nghệ.
						</div>
					</div>
				</div>
			</div>

			{/* Floating Donate Button */}
			<div className="fixed bottom-6 right-6 z-50">
				<Link
					to="/register/donor"
					className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:from-red-700 hover:to-red-800">
					<Heart className="w-5 h-5" />
					<span>Hiến máu ngay</span>
				</Link>
			</div>
		</footer>
	);
};

export default Footer;
