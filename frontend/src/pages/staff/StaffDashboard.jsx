// frontend/src/pages/staff/StaffDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PhoneCall, CheckCircle, Bed, Printer, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const StaffDashboard = () => {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ total: 0, waiting: 0, called: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);
  const [bedNumber, setBedNumber] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [showBarcode, setShowBarcode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQueue();
    // Auto refresh mỗi 10 giây
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/donation-staff/queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setQueue(res.data.data.queue);
        setStats(res.data.data.stats);
      }
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = () => {
    if (stats.waiting === 0) {
      toast.error('Hàng đợi trống');
      return;
    }
    setShowCallModal(true);
  };

  const confirmCall = async () => {
    if (!bedNumber.trim()) {
      toast.error('Vui lòng nhập số giường/bàn');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/donation-staff/call', 
        { bedNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setShowCallModal(false);
        setBedNumber('');
        fetchQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const handleComplete = async (appointmentId, donorName) => {
    if (!window.confirm(`Xác nhận donor ${donorName} đã hiến máu thành công?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/donation-staff/complete/${appointmentId}`,
        { quantity: 350 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setShowBarcode(res.data.data);
        fetchQueue();
        
        // Tự động đóng barcode sau 10 giây
        setTimeout(() => setShowBarcode(null), 10000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const getStatusBadge = (calledStatus) => {
    switch (calledStatus) {
      case 'called':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">📢 Đã gọi</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">💉 Đang hiến</span>;
      default:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">⏳ Chờ</span>;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Quản lý điểm hiến máu</h1>
              <p className="text-red-200">Hàng đợi: {stats.waiting} đang chờ | {stats.called} đã gọi | {stats.inProgress} đang hiến</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchQueue}
                className="flex items-center gap-2 px-4 py-2 bg-red-800 rounded-lg hover:bg-red-900"
              >
                <RefreshCw size={18} /> Làm mới
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-800 rounded-lg hover:bg-red-900"
              >
                <LogOut size={18} /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nút gọi donor */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <button
          onClick={handleCallNext}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
        >
          <PhoneCall size={24} /> GỌI DONOR TIẾP THEO
        </button>
      </div>

      {/* Hàng đợi */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Users size={18} /> Hàng đợi ({queue.length})
            </h2>
          </div>
          
          {queue.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🩸</div>
              <p className="text-gray-500">Hàng đợi trống</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {queue.map((item, index) => (
                <div key={item._id} className="p-5 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="font-bold text-red-600 text-lg">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{item.donor?.fullName}</h3>
                        <div className="flex gap-3 text-sm text-gray-500 mt-1">
                          <span>🩸 {item.donor?.bloodGroup}</span>
                          <span>🎂 {item.donor?.age} tuổi</span>
                          {item.bedNumber && <span>🛏️ Giường {item.bedNumber}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(item.calledStatus)}
                      
                      {item.calledStatus === 'called' && (
                        <button
                          onClick={() => handleComplete(item._id, item.donor?.fullName)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <CheckCircle size={16} /> Hoàn thành
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal nhập số giường */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Nhập số giường/bàn</h2>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
              placeholder="VD: A01, 01, B2..."
              value={bedNumber}
              onChange={(e) => setBedNumber(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCallModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmCall}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hiển thị barcode */}
      {showBarcode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 text-center">
            <h2 className="text-xl font-bold mb-2">🩸 Mã barcode túi máu</h2>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="font-mono text-lg font-bold tracking-wider">{showBarcode.barcode}</p>
            </div>
            <img src={showBarcode.qrCode} alt="QR Code" className="w-48 h-48 mx-auto my-4" />
            <p className="text-sm text-gray-500 mb-4">Dán nhãn này lên túi máu</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                🖨️ In
              </button>
              <button
                onClick={() => setShowBarcode(null)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;