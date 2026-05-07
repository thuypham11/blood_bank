import React from "react";
import {
	Phone,
	Mail,
	MapPin,
	Send,
	User,
	MessageSquare,
	Globe,
	Instagram,
	Facebook,
	Linkedin,
} from "lucide-react";
import Header from "../Header";
import Footer from "../Footer";

const LienHe = () => {
	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
			<Header />

			{/* PHẦN HERO */}
			<section className="py-20 mt-20 bg-gradient-to-r from-red-900 to-red-600 text-white text-center">
				<h1 className="text-5xl md:text-6xl font-bold mb-4">Liên Hệ Với Chúng Tôi</h1>
				<p className="text-xl opacity-90 max-w-3xl mx-auto font-medium">
					Chúng tôi luôn sẵn sàng hỗ trợ bạn. Vui lòng liên hệ khi cần tư vấn, hỗ trợ về hiến máu, tổ
					chức hiến máu hoặc bất kỳ thông tin nào liên quan đến ngân hàng máu.
				</p>
			</section>

			{/* THẺ THÔNG TIN LIÊN HỆ */}
			<section className="py-16 bg-white">
				<div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 px-6">
					{/* Hotline khẩn cấp */}
					<div className="text-center shadow-md p-8 rounded-xl hover:shadow-xl transition">
						<Phone className="w-10 h-10 text-red-600 mx-auto mb-4" />
						<h3 className="text-xl font-semibold mb-2">Đường dây nóng</h3>
						<p className="text-gray-600">1900 6868</p>
						<p className="text-gray-600">0888 115 115</p>
						<p className="text-gray-600">Hỗ trợ 24/7</p>
					</div>

					{/* Email */}
					<div className="text-center shadow-md p-8 rounded-xl hover:shadow-xl transition">
						<Mail className="w-10 h-10 text-red-600 mx-auto mb-4" />
						<h3 className="text-xl font-semibold mb-2">Gửi email</h3>
						<p className="text-gray-600">hotro@nganhangmau.vn</p>
						<p className="text-gray-600">tuvan@nganhangmau.vn</p>
					</div>

					{/* Trụ sở */}
					<div className="text-center shadow-md p-8 rounded-xl hover:shadow-xl transition">
						<MapPin className="w-10 h-10 text-red-600 mx-auto mb-4" />
						<h3 className="text-xl font-semibold mb-2">Trụ sở chính</h3>
						<p className="text-gray-600">Số 236, Đường Hoàng Quốc Việt,</p>
						<p className="text-gray-600">Phường Nghĩa Đô, Thành phố Hà Nội</p>
						<p className="text-gray-600">Việt Nam</p>
					</div>
				</div>
			</section>

			{/* PHẦN FORM LIÊN HỆ */}
			<section className="py-20 bg-gray-50">
				<div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 px-6">
					{/* Nội dung bên trái */}
					<div>
						<h2 className="text-4xl font-bold text-gray-900 mb-4">Gửi thông tin liên hệ</h2>
						<p className="text-gray-600 mb-6">
							Bạn có bất kỳ câu hỏi nào về hiến máu, tổ chức ngày hội hiến máu, hoặc cần hỗ trợ khẩn cấp?
							Chúng tôi luôn sẵn lòng lắng nghe và hỗ trợ.
						</p>

						<div className="space-y-4">
							<div className="flex items-center gap-1">
								<Phone className="text-red-600 mr-3" />
								<span className="text-gray-700">Hotline: 1900 6868</span>
							</div>
							<div className="flex items-center gap-1">
								<Mail className="text-red-600 mr-3" />
								<span className="text-gray-700">Email: hotro@nganhangmau.vn</span>
							</div>
							<div className="flex items-center gap-1">
								<MapPin className="text-red-600 mr-3" />
								<span className="text-gray-700">Số 236, Hoàng Quốc Việt, P. Nghĩa Đô, Tp. Hà Nội</span>
							</div>
						</div>

						{/* Mạng xã hội */}
						<div className="flex gap-6 mt-8">
							<Instagram className="w-8 h-8 text-red-600 hover:text-red-700 cursor-pointer" />
							<Facebook className="w-8 h-8 text-red-600 hover:text-red-700 cursor-pointer" />
							<Linkedin className="w-8 h-8 text-red-600 hover:text-red-700 cursor-pointer" />
							<Globe className="w-8 h-8 text-red-600 hover:text-red-700 cursor-pointer" />
						</div>
					</div>

					{/* FORM */}
					<form className="bg-white p-8 rounded-2xl shadow-lg space-y-6">
						{/* Họ và tên */}
						<div>
							<label className="font-medium text-gray-700">Họ và tên</label>
							<div className="flex items-center border rounded-lg px-3 mt-2">
								<User className="text-gray-500 mr-2" />
								<input
									type="text"
									placeholder="Vui lòng nhập họ và tên"
									className="w-full p-3 outline-none"
								/>
							</div>
						</div>

						{/* Email */}
						<div>
							<label className="font-medium text-gray-700">Địa chỉ email</label>
							<div className="flex items-center border rounded-lg px-3 mt-2">
								<Mail className="text-gray-500 mr-2" />
								<input type="email" placeholder="Vui lòng nhập email" className="w-full p-3 outline-none" />
							</div>
						</div>

						{/* Số điện thoại */}
						<div>
							<label className="font-medium text-gray-700">Số điện thoại</label>
							<div className="flex items-center border rounded-lg px-3 mt-2">
								<Phone className="text-gray-500 mr-2" />
								<input
									type="tel"
									placeholder="Vui lòng nhập số điện thoại"
									className="w-full p-3 outline-none"
								/>
							</div>
						</div>

						{/* Nội dung */}
						<div>
							<label className="font-medium text-gray-700">Nội dung yêu cầu</label>
							<div className="flex items-start border rounded-lg px-3 mt-2">
								<MessageSquare className="text-gray-500 mr-2 mt-3" />
								<textarea
									rows={4}
									placeholder="Vui lòng mô tả chi tiết yêu cầu hoặc câu hỏi của bạn..."
									className="w-full p-3 outline-none"></textarea>
							</div>
						</div>

						{/* Nút gửi */}
						<button
							type="submit"
							className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2">
							<Send className="w-5 h-5" />
							Gửi thông tin
						</button>
					</form>
				</div>
			</section>

			{/* PHẦN BẢN ĐỒ */}
			<section className="mb-5">
				<iframe
					title="Bản đồ trụ sở"
					className="w-full h-96"
					src="https://maps.google.com/maps?q=H%C3%A0+N%E1%BB%99i&t=&z=13&ie=UTF8&iwloc=&output=embed"
					allowFullScreen></iframe>
			</section>

			<Footer />
		</div>
	);
};

export default LienHe;
