// frontend/src/pages/staff/StaffQueue.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  Users, PhoneCall, CheckCircle, XCircle, Clock, 
  Bed, Printer, QrCode, Loader2, ArrowLeft 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const StaffQueue = () => {
  const { campId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);
  const [bedNumber, setBedNumber] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    connectSocket();
    fetchQueue();
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const connectSocket = () => {
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', {
      extraHeaders: { Authorization: `Bearer ${token}` }
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('staff_join', { campId });
    });
    
    newSocket.on('queue_updated', () => {
      fetchQueue();
    });
    
    setSocket(newSocket);
  };

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/staff/queue/${campId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setQueue(res.data.data.queue);
        setRecentCompleted(res.data.data.recentCompleted);
      }
    } catch (error) {
      toast.error('Không thể tải hàng đợi');
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = () => {
    if (queue.length === 0) {
      toast.error('Hàng đợi trống');
      return;
    }
    setShowCallModal(true);
  };

  const confirmCallNext = async () => {
    if (!bedNumber.trim()) {
      toast.error('Vui lòng nhập số giường/bàn');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/staff/queue/${campId}/call`, 
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
      const res = await axios.put(`/api/staff/appointment/${appointmentId}/complete`, 
        { quantity: 350 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        fetchQueue();
        
        // Hiển thị barcode để in
        if (res.data.data?.bloodUnit?.barcode) {
          toast.success(`Mã barcode: ${res.data.data.bloodUnit.barcode}`);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const handleDefer = async (appointmentId, donorName) => {
    const reason = prompt(`Lý do trì hoãn donor ${donorName}:`);
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/staff/appointment/${appointmentId}/defer`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã trì hoãn donor');
      fetchQueue();
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const getStatusBadge = (calledStatus) => {
    switch (calledStatus) {
      case 'called':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Đã gọi</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Đang hiến</span>;
      default:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Chờ</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => navigate('/staff/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-2"
          >
            <ArrowLeft size={20} /> Quay lại
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Quản lý hàng đợi</h1>
              <p className="text-red-200">Đang chờ: {queue.length} người</p>
            </div>
            <button
              onClick={handleCallNext}
              className="flex items-center gap-2 px-6 py-3 bg-white text-red-700 rounded-xl font-semibold hover:bg-red-50 transition shadow-lg"
            >
              <PhoneCall size={20} /> Gọi donor tiếp theo
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hàng đợi */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Users size={18} /> Hàng đợi hiện tại ({queue.length})
            </h2>
          </div>
          
          {queue.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Hàng đợi trống</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {queue.map((item, index) => (
                <div key={item._id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="font-bold text-red-600">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{item.donor?.fullName}</h3>
                        <div className="flex gap-3 text-sm text-gray-500 mt-1">
                          <span>Nhóm máu: {item.donor?.bloodGroup}</span>
                          <span>Tuổi: {item.donor?.age}</span>
                        </div>
                        {item.bedNumber && (
                          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                            <Bed size={14} /> Giường {item.bedNumber}
                          </p>
                        )}
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
                      
                      {item.calledStatus === 'pending' && (
                        <button
                          onClick={() => handleDefer(item._id, item.donor?.fullName)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                        >
                          <XCircle size={16} /> Trì hoãn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hoàn thành gần đây */}
        {recentCompleted.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <Clock size={18} /> Đã hoàn thành (2 giờ qua)
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {recentCompleted.map((item) => (
                <div key={item._id} className="p-4 flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.donor?.fullName}</span>
                    <span className="ml-3 text-sm text-gray-500">{item.donor?.bloodGroup}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(item.completedAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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
                onClick={confirmCallNext}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffQueue;