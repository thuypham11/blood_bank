import {
	ArrowRight,
	Heart,
	Users,
	MapPin,
	Clock,
	Droplets,
	Shield,
	Zap,
	Dot,
	Search,
	Bell,
	Calendar,
	FileText,
	Award,
	CheckCircle,
	Target,
	Activity,
	RefreshCw,
	AlertTriangle,
	Stethoscope,
	DockIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const LandingPage = () => {
	const stats = [
		{ icon: Users, label: "Mạng sống được cứu", value: "50.000+" },
		{ icon: Heart, label: "Đơn vị máu", value: "50.000+" },
		{ icon: MapPin, label: "Bệnh viện đối tác", value: "150+" },
		{ icon: Clock, label: "Thời gian phản hồi", value: "< 10 phút" },
	];

	const bloodTypes = [
		{ type: "A+", need: "Cao", donors: "32%" },
		{ type: "A-", need: "Rất khẩn cấp", donors: "8%" },
		{ type: "B+", need: "Trung bình", donors: "12%" },
		{ type: "B-", need: "Cao", donors: "3%" },
		{ type: "O+", need: "Cao", donors: "35%" },
		{ type: "O-", need: "Rất khẩn cấp", donors: "5%" },
		{ type: "AB+", need: "Thấp", donors: "4%" },
		{ type: "AB-", need: "Trung bình", donors: "1%" },
	];

	const donationFacts = [
		{
			icon: Heart,
			title: "Tăng cơ hội sống",
			description:
				"Hiến máu không chỉ là cho đi, mà là trao cơ hội sống. Mỗi lần bạn hiến máu sẽ mang lại hy vọng cho nhiều gia đình.",
		},
		{
			icon: RefreshCw,
			title: "Tái tạo máu nhanh chóng",
			description:
				"Chỉ trong một đến hai ngày, bạn sẽ hồi phục gần như bình thường, và sau vài tuần thì hoàn toàn cân bằng trở lại.",
		},
		{
			icon: Users,
			title: "Nhu cầu liên tục",
			description:
				"Mỗi vài giây lại có một bệnh nhân cần truyền máu. Việc hiến máu định kỳ giúp hệ thống luôn sẵn sàng trong mọi tình huống.",
		},
		{
			icon: Clock,
			title: "Thời gian bảo quản",
			description:
				"Các chế phẩm máu có thời gian bảo quản ngắn. Hiến máu thường xuyên đảm bảo nguồn cung luôn ổn định và kịp thời.",
		},
	];

	const emergencyNeeds = [
		{
			type: "Nạn nhân tai nạn",
			units: "Có thể tới 100 đơn vị",
			emoji: "🚑", // xe cứu thương - biểu tượng rõ ràng nhất cho tai nạn
		},
		{
			type: "Bệnh nhân ung thư",
			units: "8 đơn vị/tuần",
			emoji: "❤️‍🩹", // trái tim đang lành – tượng trưng cho điều trị dài hạn
		},
		{
			type: "Bệnh nhân phẫu thuật",
			units: "5-10 đơn vị",
			emoji: "🏥", // bệnh viện – liên quan trực tiếp đến phẫu thuật
		},
		{
			type: "Người bị bỏng nặng",
			units: "Trên 20 đơn vị",
			emoji: "🔥", // lửa – biểu tượng trực quan cho bỏng
		},
	];

	const processSteps = [
		{
			step: "01",
			icon: FileText,
			title: "Đăng ký thông tin",
			description: "Điền thông tin cá nhân, tiền sử bệnh và xác nhận tham gia hiến máu tự nguyện",
		},
		{
			step: "02",
			icon: Search,
			title: "Khám sàng lọc",
			description: "Kiểm tra huyết áp, cân nặng, hemoglobin và tư vấn sức khỏe trước khi hiến",
		},
		{
			step: "03",
			icon: Heart,
			title: "Hiến máu",
			description: "Thực hiện lấy máu an toàn (250ml - 450ml) với dụng cụ vô trùng dùng một lần",
		},
		{
			step: "04",
			icon: Bell,
			title: "Nghỉ ngơi & Theo dõi",
			description: "Nghỉ tại chỗ 10–15 phút, nhận giấy chứng nhận và theo dõi sức khỏe sau hiến",
		},
	];

	const eligibilityInfo = [
		{
			icon: CheckCircle,
			title: "Ai có thể hiến máu",
			items: [
				"Độ tuổi từ 18-60 tuổi",
				"Nữ từ 42kg trở lên, nam từ 45kg trở lên",
				"Sức khỏe tốt, không mắc bệnh mãn tính",
				"Không sốt, cảm cúm hoặc đang điều trị",
			],
		},
		{
			icon: Stethoscope,
			title: "Lợi ích cho sức khỏe",
			items: [
				"Được khám sức khỏe miễn phí",
				"Giảm nguy cơ mắc bệnh tim mạch",
				"Kích thích cơ thể sản sinh tế bào máu mới",
				"Tạo cảm giác tích cực, giảm căng thẳng",
			],
		},
		{
			icon: Shield,
			title: "An toàn tuyệt đối",
			items: [
				"Dụng cụ vô trùng dùng một lần",
				"Đội ngũ y bác sĩ giàu kinh nghiệm",
				"Môi trường thoải mái, sạch sẽ, thoáng mát",
				"Chăm sóc sau hiến tận tình, chu đáo",
			],
		},
	];

	const reasonsFeat = [
		{
			icon: Users,
			title: "Đăng ký hiến máu dễ dàng",
			description:
				"Quy trình đăng ký đơn giản, an toàn, theo dõi tiền sử sức khỏe và kiểm tra điều kiện hiến máu thường xuyên.",
			color: "red",
		},
		{
			icon: Shield,
			title: "Bảo mật thông tin tuyệt đối",
			description:
				"Thông tin cá nhân và hồ sơ sức khỏe của người hiến được mã hóa và lưu trữ an toàn. Cam kết không chia sẻ thông tin khi chưa có sự đồng ý.",
			color: "blue",
		},
		{
			icon: DockIcon,
			title: "Xác thực & Cấp phép đầy đủ",
			description:
				"Hệ thống kết nối với các bệnh viện và trung tâm đạt chuẩn, đảm bảo quy trình tiếp nhận - xét nghiệm - cấp phát máu đúng quy định.",
			color: "green",
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 to-red-50 mt-10">
			<Header />

			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-r from-red-700 to-red-900 text-white">
				<div className="absolute inset-0 opacity-20"></div>
				<div className="container mx-auto px-4 py-20 text-center relative z-10">
					<div className="max-w-4xl mx-auto">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6 backdrop-blur-sm">
							<Heart className="w-4 h-4" />
							Vì Sự Sống Luôn Tiếp Diễn
						</div>

						<h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
							Kết nối{" "}
							<span className="bg-gradient-to-r from-red-100 to-red-200 bg-clip-text text-transparent">
								Người hiến máu
							</span>{" "}
							Với {""}
							<span className="bg-gradient-to-r from-red-200 to-white bg-clip-text text-transparent">
								Những người đang
							</span>{" "}
							cần máu
						</h1>

						<p className="text-lg md:text-xl text-red-100 mb-8 max-w-2xl mx-auto">
							Hệ thống quản lý ngân hàng máu hiện đại giúp kết nối, quản lý và phân phối máu một cách nhanh
							chóng, hiệu quả - vì mỗi giây đều quý giá.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link to="/login">
								<button className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium rounded-xl bg-white text-red-700 hover:bg-red-50 transition-all duration-300 shadow-lg hover:shadow-xl">
									Bắt đầu ngay <ArrowRight className="w-4 h-4 ml-2" />
								</button>
							</Link>
							<Link to="/about">
								<button className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium rounded-xl border-2 border-white text-white hover:bg-white/10 transition-all duration-300">
									Tìm hiểu thêm
								</button>
							</Link>
						</div>
					</div>
				</div>

				{/* Wave divider */}
				<div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
					<svg className="relative block w-full h-16" viewBox="0 0 1200 150" preserveAspectRatio="none">
						<path
							d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V150H0V90.83C36.67,85.19,76.33,76,112,69.33C160.67,59.67,224.67,47.33,321.39,56.44Z"
							className="fill-slate-50"></path>
					</svg>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-4">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
						{stats.map((stat, index) => {
							const Icon = stat.icon;
							return (
								<div
									key={index}
									className={`group relative bg-white rounded-2xl hover:-translate-y-3 
									transition-all duration-300 ease-out overflow-hidden`}>
									{/* Layer nền gradient nhẹ khi hover */}
									<div
										className="absolute inset-0 bg-gradient-to-br
									from-red-50/0 to-red-50/0 group-hover:from-red-50/40
									group-hover:to-red-50/20 transition-opacity duration-500opacity-0
									group-hover:opacity-100"
									/>

									<div className="relative p-6 md:p-8 text-center z-10">
										{/* Icon circle */}
										<div
											className="
									w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 md:mb-6 rounded-full bg-red-50 
									flex items-center justify-center group-hover:bg-red-10
									transition-colors duration-300 shadow-sm group-hover:shadow-md
								">
											<Icon className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
										</div>

										{/* Giá trị lớn */}
										<div className="text-3xl md:text-2xl lg:text-3xl font-bold text-black-700 mb-2 tracking-tight">
											{stat.value}
										</div>

										{/* Label */}
										<div className="text-base md:text-lg font-medium text-slate-700 group-hover:text-red-800 transition-colors duration-300">
											{stat.label}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Blood Need Section */}
			<section className="py-20 bg-slate-50">
				<div className="container mx-auto px-4">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold mb-6 ">
							<span className="bg-gradient-to-r from-red-900 to-red-600 bg-clip-text text-transparent">
								NHU CẦU MÁU HIỆN NAY
							</span>
						</h2>
						<p className="text-lg text-slate-600">
							Nhu cầu các nhóm máu luôn được cập nhật thường xuyên, liên tục trên toàn hệ thống.
							<br />
							Mỗi giọt máu bạn hiến tặng hôm nay có thể mang lại cơ hội sống cho một ai đó.
						</p>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
						{bloodTypes.map((blood, index) => (
							<div
								key={index}
								className="bg-white rounded-xl shadow-lg p-4 text-center hover:shadow-xl transition-all duration-300">
								<div
									className={`text-2xl font-bold mb-2 ${
										blood.need === "Rất khẩn cấp"
											? "text-red-600"
											: blood.need === "Cao"
												? "text-orange-500"
												: "text-green-500"
									}`}>
									{blood.type}
								</div>
								<div
									className={`text-sm font-medium px-2 py-1 rounded-full ${
										blood.need === "Rất khẩn cấp"
											? "bg-red-100 text-red-700"
											: blood.need === "Cao"
												? "bg-orange-100 text-orange-700"
												: "bg-green-100 text-green-700"
									}`}>
									{blood.need}
								</div>
								<div className="text-xs text-slate-500 mt-2">Tỷ lệ người hiến: {blood.donors}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Why Donate Blood Section */}
			<section className="py-20 bg-white">
				<div className="container mx-auto px-4">
					<div className="max-w-4xl mx-auto text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
							Vì Sao Việc Hiến Máu Của Bạn Vô Cùng Ý Nghĩa?
						</h2>
						<p className="text-lg text-slate-600">
							Mỗi lần hiến máu là một làn sóng yêu thương và hy vọng lan tỏa trong cộng đồng.
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
						{donationFacts.map((fact, index) => {
							const Icon = fact.icon;
							return (
								<div
									key={index}
									className="bg-slate-50 rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300 border-t-4 border-red-500">
									<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
										<Icon className="w-8 h-8 text-red-600" />
									</div>
									<h3 className="text-lg font-semibold mb-6 text-slate-800">{fact.title}</h3>
									<p className="text-slate-600 text-lg mb-6">{fact.description}</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Emergency Needs Section */}
			<section className="py-20 bg-gradient-to-br from-red-600 to-red-800 text-white">
				<div className="container mx-auto px-4">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
							Giọt máu của bạn có thể thay đổi cuộc đời ai?
						</h2>
						<p className="text-lg text-red-100">
							Máu bạn hiến có thể trực tiếp cứu sống những bệnh nhân đang chiến đấu từng giây
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
						{emergencyNeeds.map((need, index) => (
							<div
								key={index}
								className="bg-white/15 rounded-2xl p-6 text-center backdrop-blur-md border border-white/20 hover:bg-white/25 hover:border-white/40 transition-all duration-300 shadow-lg hover:shadow-2xl group">
								<div className="text-4xl md:text-5xl mt-2 mb-6 drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
									{need.emoji}
								</div>

								<h3 className="text-lg md:text-xl font-semibold mb-3 text-white">{need.type}</h3>

								<p className="text-red-100 text-base md:text-lg font-medium">{need.units}</p>
							</div>
						))}
					</div>

					<div className="text-center mt-12">
						<div className="bg-white/10 rounded-2xl p-6 max-w-2xl mx-auto backdrop-blur-sm">
							<p className="text-lg text-white mb-4">
								<strong>47% dân số</strong> đủ điều kiện hiến máu, nhưng chỉ <strong>5%</strong> thực sự
								tham gia.
							</p>
							<p className="text-red-100">Chỉ một lần hiến của bạn đã có thể tạo nên sự khác biệt lớn.</p>
						</div>
					</div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="py-20 bg-slate-50">
				<div className="container mx-auto px-4">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
							Quy Trình Hiến Máu Đơn Giản
						</h2>
						<p className="text-2xl text-slate-600">
							Chỉ vài bước để bạn trở thành người hùng thầm lặng.
							<br /> Hãy cùng hàng ngàn người khác lan tỏa yêu thương.
						</p>
					</div>

					<div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
						{processSteps.map((step, index) => {
							const Icon = step.icon;
							return (
								<div key={index} className="text-center group">
									<div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-t-4 border-red-500 group-hover:transform group-hover:-translate-y-2">
										<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
											{step.step}
										</div>
										{Icon && (
											<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500 flex items-center justify-center">
												<Icon className="w-6 h-6 text-white" />
											</div>
										)}
										<h3 className="md:text-xl font-semibold mb-3 text-slate-800">{step.title}</h3>
										<p className="text-slate-600 md:text-lg text-sm">{step.description}</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Eligibility & Benefits Section */}
			<section className="py-20 bg-white">
				<div className="container mx-auto px-4">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
							Điều kiện & Lợi ích khi hiến máu
						</h2>
						<p className="text-lg text-slate-600">
							Hiến máu rất đơn giản, an toàn và mang lại nhiều giá trị.{" "}
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
						{eligibilityInfo.map((info, index) => {
							const Icon = info.icon;
							return (
								<div
									key={index}
									className="bg-slate-50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
									<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
										<Icon className="w-6 h-6 text-red-600" />
									</div>
									<h3 className="text-xl font-semibold mb-4 text-slate-800 text-center">{info.title}</h3>
									<ul className="space-y-3">
										{info.items.map((item, itemIndex) => (
											<li key={itemIndex} className="flex items-start gap-3 text-slate-600">
												<CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
												<span>{item}</span>
											</li>
										))}
									</ul>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* About Section */}
			<section id="about" className="py-20 bg-slate-50">
				<div className="container mx-auto px-4">
					<div className="max-w-3xl mx-auto text-center mb-10">
						<h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
							Vì sao bạn nên chọn <br />{" "}
							<span className="bg-gradient-to-r from-red-500 to-red-900 bg-clip-text text-transparent">
								Hệ thống Ngân hàng máu
							</span>{" "}
							của chúng tôi?
						</h2>
					</div>

					<div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
						{reasonsFeat.map((reasonFeats, index) => {
							const Icon = reasonFeats.icon;
							return (
								<div key={index}>
									<div className="w-16 h-16 mb-4 rounded-full bg-green-100 flex items-center justify-center">
										<Icon className="w-8 h-8 text-green-600" />
									</div>
									<h3 className="text-xl font-semibold mb-2 text-slate-800">{reasonFeats.title}</h3>
									<p className="text-slate-600 font-medium">{reasonFeats.description}</p>
								</div>
							);
						})}
					</div>

					<div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto mt-4">
						{/* Cột 1:*/}
						<div className="flex flex-col">
							<div className="space-y-2">
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Đăng ký hiến máu dễ dàng</p>
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Thời gian chủ động, phù hợp cá nhân</p>
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Theo dõi lịch sử, thời gian đủ điều kiện</p>
									</span>
								</div>
							</div>
						</div>

						{/* Cột 2:*/}
						<div className="flex flex-col">
							<div className="space-y-2">
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Dữ liệu được mã hóa, an toàn</p>
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Không chia sẻ nếu chưa được sự đồng ý</p>
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Tuân thủ quy định bảo mật y tế</p>
									</span>
								</div>
							</div>
						</div>

						{/* Cột 3:*/}
						<div className="flex flex-col space-y-5 ">
							<div className="space-y-2">
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Bệnh viện, trung tâm hợp tác đạt chuẩn</p>
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Dot className="w-8 h-8 text-red-600" />
									<span className="text-slate-800">
										<p className="text-slate-600 font-medium">Các quy trình nghiệp vụ đúng quy định</p>
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-gradient-to-br from-red-700 to-red-900 text-white relative overflow-hidden">
				<div className="absolute inset-0 opacity-20"></div>
				<div className="container mx-auto px-4 text-center relative z-10">
					<h2 className="text-3xl md:text-4xl font-bold mb-6">
						Bạn đã sẵn sàng tham gia với chúng tôi?
					</h2>
					<p className="text-lg opacity-90 mb-8 max-w-6xl mx-auto font-medium">
						Cùng chúng tôi xây dựng một cộng đồng hiến máu vững mạnh, nơi mỗi giọt máu được trao đi là một
						hy vọng được thắp sáng, để nguồn máu luôn sẵn sàng cứu sống trong mọi tình huống khẩn cấp. Hãy
						chung tay kết nối người hiến máu và đội ngũ y bác sĩ tận tâm, tạo nên một mạng lưới nhân ái -
						nơi sự sẻ chia hôm nay có thể cứu lấy một cuộc đời ngày mai.
					</p>
					<Link to="/login">
						<button className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium rounded-xl bg-white text-red-700 hover:bg-red-50 transition-all duration-300 shadow-lg hover:shadow-xl">
							Tham gia ngay hôm nay <ArrowRight className="w-4 h-4 ml-2" />
						</button>
					</Link>
				</div>
			</section>

			<Footer />
		</div>
	);
};

export default LandingPage;
