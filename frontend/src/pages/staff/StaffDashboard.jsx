// frontend/src/pages/staff/StaffDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Calendar, MapPin, Users, Clock, LogOut, RefreshCw, ChevronRight } from 'lucide-react';

const StaffDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    if (!token) {
      navigate('/staff/login');
      return;
    }
    setStaffInfo(JSON.parse(info));
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('staffToken');
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5000/api/staff/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/staff/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const sessionsData = await sessionsRes.json();
      const statsData = await statsRes.json();
      if (sessionsData.success) setSessions(sessionsData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffInfo');
    navigate('/staff/login');
    toast.success('Đã đăng xuất');
  };

  const handleSelectSession = (sessionId, title) => {
    navigate(`/staff/queue/${sessionId}`, { state: { sessionTitle: title } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const waitingCount = sessions.reduce((sum, s) => sum + (s.queue?.filter(q => q.status === 'waiting').length || 0), 0);
  const totalDonors = sessions.reduce((sum, s) => sum + (s.totalDonors || 0), 0);
  const completedDonors = sessions.reduce((sum, s) => sum + (s.completedDonors || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bảng điều khiển nhân viên</h1>
            <p className="text-sm text-gray-500">Xin chào, {staffInfo?.name || 'Nhân viên'}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Users} label="Đang chờ" value={waitingCount} color="orange" />
          <StatCard icon={Clock} label="Đã gọi" value={stats?.totalCalled || 0} color="blue" />
          <StatCard icon={Calendar} label="Đã hiến" value={completedDonors} color="green" />
          <StatCard icon={Users} label="Tổng đăng ký" value={totalDonors} color="purple" />
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Phiên hiến máu hôm nay</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Không có phiên hiến máu nào hôm nay</p>
              </div>
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  onClick={() => handleSelectSession(session._id, session.camp?.title)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color].bg}`}>
          <Icon className={`w-6 h-6 ${colors[color].text}`} />
        </div>
      </div>
    </div>
  );
};

const SessionCard = ({ session, onClick }) => {
  const waiting = session.queue?.filter(q => q.status === 'waiting').length || 0;
  const completed = session.completedDonors || 0;
  const total = session.totalDonors || 0;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{session.camp?.title}</h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {session.camp?.location?.venue}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(session.date).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Tiến độ hiến máu</span>
          <span className="text-gray-600">{completed}/{total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex gap-4 mt-4 text-sm">
        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">⏳ {waiting} chờ</span>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">📞 {session.queue?.filter(q => q.status === 'called').length || 0} đã gọi</span>
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">✅ {completed} hoàn thành</span>
      </div>
    </div>
  );
};

export default StaffDashboard;