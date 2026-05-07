import React from "react";
import {
	Heart,
	Users,
	Shield,
	Award,
	Target,
	Droplet,
	Clock,
	MapPin,
	Phone,
	Mail,
	Globe,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../Footer";
import Header from "../Header";
import Thuy from "../../assets/teams/thuy.jpg";
import Hoa from "../../assets/teams/hoa.jpg";
import Hoang from "../../assets/teams/hoang.jpg";

const AboutUs = () => {
	const stats = [
		{ icon: Users, number: "50.000+", label: "Mạng Sống Được Cứu" },
		{ icon: Droplet, number: "100.000+", label: "Lượt Hiến Máu" },
		{ icon: MapPin, number: "150+", label: "Bệnh Viện Đối Tác" },
		{ icon: Shield, number: "99,8%", label: "Tỷ Lệ An Toàn" },
	];

	const values = [
		{
			icon: Heart,
			title: "Lòng Nhân Ái",
			description: "Chúng tôi tin rằng mỗi hành động nhỏ đều có thể cứu sống một người.",
		},
		{
			icon: Shield,
			title: "An Toàn Là Ưu Tiên",
			description: "Mọi lượt hiến máu đều tuân thủ nghiêm ngặt các quy trình y tế để đảm bảo an toàn.",
		},
		{
			icon: Users,
			title: "Cộng Đồng",
			description:
				"Xây dựng cộng đồng vững mạnh nơi mọi người hỗ trợ lẫn nhau trong những lúc cần thiết.",
		},
		{
			icon: Target,
			title: "Xuất Sắc",
			description: "Cam kết duy trì tiêu chuẩn cao nhất trong thu thập và phân phối máu.",
		},
	];

	const team = [
		{
			name: "Phạm Thị Thùy",
			role: "Trưởng nhóm",
			image: Thuy,
			bio: "...",
		},
		{
			name: "Lù Nguyễn Biên Hòa",
			role: "Thành viên",
			image: Hoa,
			bio: "...",
		},
		{
			name: "Nguyễn Huy Hoàng",
			role: "Thành viên",
			image: Hoang,
			bio: "...",
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
			<Header />
			{/* Hero Section */}
			<section className="relative py-20 mt-20 bg-gradient-to-r from-red-600 to-red-700 text-white">
				<div className="absolute inset-0 bg-black/20"></div>
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h1 className="text-5xl md:text-6xl font-bold mb-6">Chia Sẻ Sự Sống, Lan Tỏa Yêu Thương</h1>
					<p className="text-xl md:text-2x1 mb-8 max-w-4xl mx-auto opacity-90">
						Chúng tôi là nền tảng chuyên kết nối người hiến máu với những người cần máu, làm cho việc hiến
						máu trở nên dễ tiếp cận, an toàn và có sức lan tỏa lớn.
					</p>
					<div className="justify-center">
						<Link to="/login">
							<button className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors">
								Tham Gia Sứ Mệnh Cùng Chúng Tôi
							</button>
						</Link>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-16 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
						{stats.map((stat, index) => (
							<div key={index} className="text-center">
								<div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
									<stat.icon className="w-8 h-8 text-red-600" />
								</div>
								<div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
								<div className="text-gray-600">{stat.label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Mission & Vision */}
			<section className="py-20 bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid md:grid-cols-2 gap-30 items-start">
						{" "}
						{/* Thêm items-start để tiêu đề thẳng hàng từ trên */}
						<div className="flex flex-col">
							{" "}
							{/* Ép khối này full height */}
							<h2 className="text-4xl font-bold text-gray-900 mb-6">Sứ Mệnh Của Chúng Tôi</h2>
							<p className="text-2xl text-gray-600 mb-6">
								Tạo ra một thế giới nơi không ai phải thiệt mạng vì chờ đợi. Chúng tôi kết nối giữa người
								hiến máu tình nguyện và bệnh nhân, đảm bảo cung cấp kịp thời với nguồn máu an toàn khi cần
								thiết nhất.
							</p>
						</div>
						<div className="flex flex-col">
							<div className="space-y-4 mt-4">
								{" "}
								{/* Thêm mt-4 để đẩy xuống nếu cần */}
								<div className="flex items-center">
									<Clock className="w-6 h-6 text-red-600 mr-6 flex-shrink-0" />
									<span className="text-gray-700">Khả Năng Cung Cấp Máu Khẩn Cấp 24/7</span>
								</div>
								<div className="flex items-center">
									<Shield className="w-6 h-6 text-red-600 mr-6 flex-shrink-0" />
									<span className="text-gray-700">Tuân Thủ Nghiêm Ngặt Các Tiêu Chuẩn Y Tế</span>
								</div>
								<div className="flex items-center">
									<Users className="w-6 h-6 text-red-600 mr-6 flex-shrink-0" />
									<span className="text-gray-700">Mạng Lưới Người Hiến Máu Toàn Quốc</span>
								</div>
								<div className="flex items-center">
									<Award className="w-6 h-6 text-red-600 mr-6 flex-shrink-0" />
									<span className="text-gray-700">Chứng Nhận Chất Lượng Từ Các Tổ Chức Y Tế</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Values Section */}
			<section className="py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">Giá Trị Cốt Lõi Của Chúng Tôi</h2>
						<p className="text-xl text-gray-600 max-w-4xl mx-auto">
							Đây là những điều chúng tôi luôn giữ vững trong mọi hoạt động.
						</p>
					</div>
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{values.map((value, index) => (
							<div
								key={index}
								className="text-center group hover:transform hover:scale-105 transition-all duration-300">
								<div className="bg-red-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-red-200 transition-colors">
									<value.icon className="w-10 h-10 text-red-600" />
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
								<p className="text-gray-600 leading-relaxed">{value.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Team Section */}
			<section className="py-20 bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">Gặp Gỡ Đội Ngũ Của Chúng Tôi</h2>
					</div>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
						{team.map((member, index) => (
							<div
								key={index}
								className="bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
								<div className="h-48 bg-gradient-to-r from-red-400 to-red-600 relative overflow-hidden">
									<img
										src={member.image}
										alt={member.name}
										className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-semibold text-gray-900 mb-1">{member.name}</h3>
									<p className="text-red-600 font-medium mb-3">{member.role}</p>
									<p className="text-gray-600 text-sm">{member.bio}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-gradient-to-r from-red-600 to-red-700 text-white">
				<div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
					<h2 className="text-4xl font-bold mb-6">Bạn Sẵn Sàng Tạo Nên Sự Khác Biệt?</h2>
					<p className="text-xl mb-8 opacity-90">
						Hãy tham gia cùng hàng ngàn anh hùng đang cứu sống qua việc hiến máu. Một lượt hiến máu của
						bạn có thể cứu được tới 3 mạng sống.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<button className="bg-white text-red-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-red-50 transition-colors">
							Trở Thành Người Hiến Máu
						</button>
					</div>
				</div>
			</section>

			{/* Contact Section */}
			<section className="py-16 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid md:grid-cols-3 gap-8">
						<div className="text-center">
							<Phone className="w-8 h-8 text-red-600 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 mb-2">Đường Dây Khẩn Cấp</h3>
							<p className="text-gray-600">0900 1234</p>
							<p className="text-gray-600">Hoạt Động 24/7</p>
						</div>
						<div className="text-center">
							<Mail className="w-8 h-8 text-red-600 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 mb-2">Liên Hệ Qua Email</h3>
							<p className="text-gray-600">help@bloodconnect.org</p>
							<p className="text-gray-600">support@bloodconnect.org</p>
						</div>
						<div className="text-center">
							<Globe className="w-8 h-8 text-red-600 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 mb-2">Trụ Sở Chính</h3>
							<p className="text-gray-600">123 Đại Lộ Chăm Sóc Sức Khỏe</p>
							<p className="text-gray-600">Khu Y Tế, Thành Phố 12345</p>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<Footer />
		</div>
	);
};

export default AboutUs;
