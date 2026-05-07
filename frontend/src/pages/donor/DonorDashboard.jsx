// frontend/src/pages/donor/DonorDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ thêm useNavigate
import axios from "axios";
import {
  Droplet,
  Calendar,
  Users,
  Activity,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Shield,
  Award,
  Heart,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Download,
  Share2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import InviteFriendModal from "../../components/InviteFriendModal"; // ✅ import modal

const API_URL = "http://localhost:5000/api/donor";

const DonorDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [donor, setDonor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // ✅ di chuyển vào trong component
  const navigate = useNavigate(); // ✅ khởi tạo navigate

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Yêu cầu xác thực");
        return;
      }

      const [profileRes, historyRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/history`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: {} })),
      ]);

      const donorData = profileRes.data.donor || profileRes.data;
      setDonor(donorData);

      let historyData = [];
      if (historyRes.data.history) historyData = historyRes.data.history;
      else if (historyRes.data.donations) historyData = historyRes.data.donations;
      else if (Array.isArray(historyRes.data)) historyData = historyRes.data;

      setHistory(historyData);

      const totalDonations = historyData.length;
      const livesImpacted = totalDonations * 3;
      const achievementLevel = totalDonations >= 10 ? "Vàng" : totalDonations >= 5 ? "Bạc" : "Đồng";
      const nextMilestone = totalDonations < 5 ? 5 : totalDonations < 10 ? 10 : 15;
      const completionRate = Math.min(100, (totalDonations / nextMilestone) * 100);

      setDashboard({
        stats: {
          totalDonations,
          livesImpacted,
          achievementLevel,
          nextMilestone,
          completionRate,
          ...statsRes.data,
        },
        recentActivity: historyData.slice(0, 5),
      });
    } catch (error) {
      console.error("🚨 Lỗi Bảng Điều Khiển:", error);
      toast.error(error.response?.data?.message || "Không thể tải dữ liệu");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Đã cập nhật bảng điều khiển");
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-red-500 mx-auto animate-pulse mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Đang tải Bảng Điều Khiển</h2>
        </div>
      </div>
    );
  }

  const isEligible = donor?.eligibleToDonate || false;
  const nextDonationDate = donor?.nextEligibleDate ? new Date(donor.nextEligibleDate) : null;
  const daysUntilEligible = nextDonationDate
    ? Math.ceil((nextDonationDate - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            Bảng Điều Khiển
          </h1>
          <p className="text-gray-600 mt-2">Theo dõi hành trình hiến máu và hoạt động của bạn</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 lg:mt-0 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Đang làm mới..." : "Làm Mới"}
        </button>
      </div>

      {/* Eligibility alerts */}
      {!isEligible && nextDonationDate && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">Lần Hiến Máu Tiếp Theo</p>
            <p className="text-yellow-600 text-sm">Bạn có thể hiến máu lại sau {daysUntilEligible} ngày nữa</p>
          </div>
        </div>
      )}
      {isEligible && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Sẵn Sàng Hiến Máu!</p>
            <p className="text-green-600 text-sm">Bạn đủ điều kiện để hiến máu ngay bây giờ</p>
          </div>
        </div>
      )}

      {/* Donor Profile */}
      {donor && (
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-red-600" /> Hồ Sơ
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${isEligible ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {isEligible ? "Đủ Điều Kiện" : "Chưa Đủ Điều Kiện"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <LabInfo icon={<Mail className="w-4 h-4" />} label="Email" value={donor.email} />
            <LabInfo icon={<Phone className="w-4 h-4" />} label="Số Điện Thoại" value={donor.phone} />
            <LabInfo icon={<Droplet className="w-4 h-4" />} label="Nhóm Máu" value={donor.bloodGroup} />
            <LabInfo icon={<MapPin className="w-4 h-4" />} label="Địa Chỉ" value={donor.address?.city} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard icon={<Droplet className="w-6 h-6" />} label="Số Lần Hiến Máu" value={dashboard.stats.totalDonations} subtitle="Tổng số lần đã hiến" color="red" />
          <MetricCard icon={<Heart className="w-6 h-6" />} label="Cuộc Sống Được Cứu" value={`${dashboard.stats.livesImpacted}+`} subtitle="Ước tính số người được cứu" color="green" />
          <MetricCard icon={<Award className="w-6 h-6" />} label="Thành Tích" value={dashboard.stats.achievementLevel} subtitle={`Mục tiêu tiếp theo: ${dashboard.stats.nextMilestone} lần`} color="purple" />
          <MetricCard icon={<TrendingUp className="w-6 h-6" />} label="Tiến Độ" value={`${Math.round(dashboard.stats.completionRate)}%`} subtitle="Tiến độ đến mốc tiếp theo" color="blue" />
        </div>
      )}

      {/* Progress Bar */}
      {dashboard && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-600" /> Tiến Độ Đến Mốc Tiếp Theo
          </h3>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{dashboard.stats.totalDonations} lần hiến</span>
            <span>Mục tiêu: {dashboard.stats.nextMilestone} lần</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-gradient-to-r from-red-500 to-red-600 h-4 rounded-full transition-all duration-700" style={{ width: `${dashboard.stats.completionRate}%` }} />
          </div>
        </div>
      )}

      {/* Recent Donations & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Lịch Sử Hiến Máu Gần Đây" icon={<Droplet className="w-5 h-5" />} subtitle="5 lần hiến máu gần nhất của bạn">
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.slice(0, 5).map((donation, idx) => (
                <DonationHistoryItem key={donation._id || idx} donation={donation} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Droplet className="w-8 h-8" />} message="Chưa có lịch sử hiến máu" actionText="Đặt Lịch Hiến Máu Đầu Tiên" onAction={() => navigate("/donor/book")} />
          )}
        </Section>
        <Section title="Hoạt Động Gần Đây" icon={<Activity className="w-5 h-5" />} subtitle="Các hoạt động mới nhất của bạn">
          {dashboard?.recentActivity?.length > 0 ? (
            dashboard.recentActivity.map((activity, idx) => <ActivityCard key={activity._id || idx} activity={activity} />)
          ) : (
            <EmptyState icon={<Activity className="w-8 h-8" />} message="Chưa có hoạt động nào" />
          )}
        </Section>
      </div>

      {/* Quick Actions */}
      <Section title="Thao Tác Nhanh" icon={<Shield className="w-5 h-5" />} subtitle="Quản lý hồ sơ người hiến máu của bạn" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard icon={<Download className="w-5 h-5" />} title="Tải Chứng Nhận" description="Nhận chứng nhận hiến máu của bạn" onClick={() => toast.success("Đang tải chứng nhận!")} color="blue" />
          <ActionCard icon={<Share2 className="w-5 h-5" />} title="Chia Sẻ Thành Tích" description="Chia sẻ hành trình cứu người của bạn" onClick={() => toast.success("Chia sẻ hành trình cứu người của bạn!")} color="green" />
          <ActionCard icon={<Calendar className="w-5 h-5" />} title="Đặt Lịch Hiến Máu" description="Đặt lịch cho lần hiến máu tiếp theo" onClick={() => navigate("/donor/book")} color="red" />
          <ActionCard icon={<Users className="w-5 h-5" />} title="Mời Bạn Bè" description="Mở rộng cộng đồng người hiến máu" onClick={() => setIsInviteModalOpen(true)} color="purple" />
        </div>
      </Section>

      {/* Health Overview */}
      {donor && (
        <Section title="Tổng Quan Sức Khỏe" icon={<Heart className="w-5 h-5" />} subtitle="Các chỉ số sức khỏe của bạn" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <HealthStat label="Tuổi" value={donor.age || "Chưa cập nhật"} icon={<User className="w-4 h-4" />} />
            <HealthStat label="Cân Nặng" value={donor.weight ? `${donor.weight} kg` : "Chưa cập nhật"} icon={<Activity className="w-4 h-4" />} />
            <HealthStat label="Lần Hiến Máu Cuối" value={donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString("vi-VN") : "Chưa từng"} icon={<Calendar className="w-4 h-4" />} />
            <HealthStat label="Thành Viên Từ" value={donor.createdAt ? new Date(donor.createdAt).getFullYear() : new Date().getFullYear()} icon={<Award className="w-4 h-4" />} />
          </div>
        </Section>
      )}

      {/* Invite Friend Modal */}
      <InviteFriendModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </div>
  );
};

// ============== Các component con ==============
const MetricCard = ({ icon, label, value, subtitle, color }) => {
  const colorClasses = {
    blue: { border: "border-l-blue-400", bg: "bg-blue-100", text: "text-blue-600" },
    green: { border: "border-l-green-400", bg: "bg-green-100", text: "text-green-600" },
    red: { border: "border-l-red-400", bg: "bg-red-100", text: "text-red-600" },
    purple: { border: "border-l-purple-400", bg: "bg-purple-100", text: "text-purple-600" },
  };
  const colors = colorClasses[color] || colorClasses.blue;
  return (
    <div className={`bg-white rounded-xl shadow-lg border-l-4 ${colors.border} p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>{icon}</div>
      </div>
    </div>
  );
};

const Section = ({ title, icon, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-lg border border-red-50 p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {icon} {title}
        </h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const LabInfo = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="p-2 bg-red-100 rounded-lg text-red-600 mt-1">{icon}</div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-gray-800">{value || "—"}</p>
    </div>
  </div>
);

const DonationHistoryItem = ({ donation }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-red-100 rounded-lg text-red-600"><Droplet className="w-4 h-4" /></div>
      <div>
        <p className="font-medium text-gray-800">{donation.facility || "Điểm Hiến Máu"}</p>
        <p className="text-xs text-gray-500">{new Date(donation.donationDate || donation.date).toLocaleDateString("vi-VN")} • {donation.bloodType || donation.bloodGroup}</p>
      </div>
    </div>
    <div className="text-right">
      <span className="font-bold text-gray-800">{donation.quantity || 1} đơn vị</span>
      <p className="text-xs text-green-600 mt-1">Hoàn Thành</p>
    </div>
  </div>
);

const ActivityCard = ({ activity }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
    <div>
      <h4 className="font-medium text-gray-800">{activity.eventType || "Hiến Máu"}</h4>
      <p className="text-sm text-gray-600">{activity.description || "Hoàn thành hiến máu"}</p>
    </div>
    <span className="text-xs text-gray-500">{new Date(activity.date || activity.createdAt).toLocaleDateString("vi-VN")}</span>
  </div>
);

const ActionCard = ({ icon, title, description, onClick, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200",
    green: "bg-green-50 text-green-600 hover:bg-green-100 border-green-200",
    red: "bg-red-50 text-red-600 hover:bg-red-100 border-red-200",
    purple: "bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200",
  };
  return (
    <button onClick={onClick} className={`p-4 rounded-xl border text-left transition-colors ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white rounded-lg">{icon}</div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm opacity-75">{description}</p>
    </button>
  );
};

const HealthStat = ({ label, value, icon }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
    <div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
    <div className="p-2 bg-red-100 rounded-lg text-red-600">{icon}</div>
  </div>
);

const EmptyState = ({ icon, message, actionText, onAction }) => (
  <div className="text-center py-8 text-gray-500">
    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">{icon}</div>
    <p className="text-sm mb-3">{message}</p>
    {actionText && onAction && (
      <button onClick={onAction} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">{actionText}</button>
    )}
  </div>
);

export default DonorDashboard;