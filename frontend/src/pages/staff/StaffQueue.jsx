// frontend/src/pages/staff/StaffQueue.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Users, Clock, CheckCircle, UserCheck, PhoneCall, 
  ChevronLeft, RefreshCw, Volume2
} from 'lucide-react';
import io from 'socket.io-client';
import BarcodeModal from '../../components/BarcodeModal';

const StaffQueue = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionTitle } = location.state || {};
  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentServing, setCurrentServing] = useState(null);
  const [calling, setCalling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showBarcode, setShowBarcode] = useState(false);
  const [completedData, setCompletedData] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      navigate('/staff/login');
      return;
    }

    const socket = io('http://localhost:5000', {
      extraHeaders: { Authorization: `Bearer ${token}` }
    });
    socketRef.current = socket;

    const sessionId = location.pathname.split('/').pop();
    socket.emit('staff_join', sessionId);
    
    console.log('🔌 Socket connected, sessionId:', sessionId);

    socket.on('queue_updated', (data) => {
      console.log('📡 Queue updated via socket:', data);
      setQueue(data.queue || []);
      if (data.currentServing !== undefined) {
        setCurrentServing(data.currentServing);
      }
      fetchQueue();
    });

    fetchQueue();

    return () => {
      console.log('🔌 Socket disconnecting');
      socket.disconnect();
    };
  }, [refreshKey]);

  const fetchQueue = async () => {
    const token = localStorage.getItem('staffToken');
    const sessionId = location.pathname.split('/').pop();
    try {
      console.log('🔄 Fetching queue for session:', sessionId);
      const res = await fetch(`http://localhost:5000/api/staff/queue/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('📦 Queue data:', data);
      if (data.success) {
        setSession(data.data);
        setQueue(data.data.queue || []);
        setCurrentServing(data.data.currentServing);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Không thể tải hàng đợi');
    } finally {
      setLoading(false);
    }
  };

  const callNext = async () => {
    const token = localStorage.getItem('staffToken');
    const sessionId = location.pathname.split('/').pop();
    setCalling(true);
    try {
      const res = await fetch(`http://localhost:5000/api/staff/queue/call/${sessionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã gọi donor: ${data.data.donor?.fullName}`);
        const audio = new Audio('/sounds/notification.mp3');
        audio.play();
        await fetchQueue();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error calling next donor:', error);
      toast.error('Không thể gọi donor');
    } finally {
      setCalling(false);
    }
  };

  const completeDonation = async (donorId, volume) => {
  const token = localStorage.getItem('staffToken');
  const sessionId = location.pathname.split('/').pop();
  
  const loadingToast = toast.loading('Đang xử lý...');
  
  try {
    const res = await fetch('http://localhost:5000/api/staff/donation/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId, donorId, volume })
    });
    
    const data = await res.json();
    console.log('📥 Complete donation response:', data);
    
    if (data.success) {
      toast.success('Hoàn thành hiến máu!', { id: loadingToast });
      
      // ✅ Lấy donor từ response (quan trọng!)
      setCompletedData({
        bloodUnit: data.data.bloodUnit,
        donor: data.data.donor,  // Dùng donor từ response
        volume: volume
      });
      setShowBarcode(true);
      
      await fetchQueue();
      setRefreshKey(prev => prev + 1);
    } else {
      toast.error(data.message || 'Không thể hoàn thành hiến máu', { id: loadingToast });
    }
  } catch (error) {
    console.error('❌ Complete donation error:', error);
    toast.error('Lỗi: ' + error.message, { id: loadingToast });
  }
};

  const waitingQueue = queue.filter(q => q.status === 'waiting');
  const calledQueue = queue.filter(q => q.status === 'called');
  const donatingQueue = queue.filter(q => q.status === 'donating');
  const completedQueue = queue.filter(q => q.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const total = queue.length;
  const completed = completedQueue.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/staff/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{sessionTitle || 'Quản lý hàng đợi'}</h1>
              <p className="text-sm text-gray-500">
                {new Date(session?.date).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              fetchQueue();
              toast.success('Đã làm mới hàng đợi');
            }} 
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Thống kê nhanh */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <QuickStatCard icon={Users} label="Đang chờ" value={waitingQueue.length} color="yellow" />
          <QuickStatCard icon={PhoneCall} label="Đã gọi" value={calledQueue.length} color="blue" />
          <QuickStatCard icon={UserCheck} label="Đang hiến" value={donatingQueue.length} color="purple" />
          <QuickStatCard icon={CheckCircle} label="Hoàn thành" value={completedQueue.length} color="green" />
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Tiến độ hiến máu</span>
            <span className="text-gray-600">{completed}/{total} người</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Nút gọi tiếp theo */}
        {waitingQueue.length > 0 && (
          <button
            onClick={callNext}
            disabled={calling}
            className="w-full mb-6 bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <Volume2 className="w-6 h-6" />
            {calling ? 'Đang gọi...' : 'GỌI NGƯỜI TIẾP THEO'}
          </button>
        )}

        {/* Hàng đợi đang gọi */}
        {calledQueue.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-blue-600" />
              Đã gọi - Đang chờ vào
            </h2>
            <div className="space-y-3">
              {calledQueue.map((item) => (
                <CalledDonorCard
                  key={item._id}
                  donor={item.donor}
                  position={item.position}
                  onComplete={(volume) => completeDonation(item.donor._id, volume)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Danh sách chờ */}
        {waitingQueue.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              Hàng đợi chờ ({waitingQueue.length})
            </h2>
            <div className="space-y-2">
              {waitingQueue.map((item) => (
                <WaitingDonorCard
                  key={item._id}
                  donor={item.donor}
                  position={item.position}
                  isCurrent={currentServing === item.position}
                />
              ))}
            </div>
          </div>
        )}

        {/* Danh sách đang hiến */}
        {donatingQueue.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              Đang hiến máu ({donatingQueue.length})
            </h2>
            <div className="space-y-2">
              {donatingQueue.map((item) => (
                <DonatingDonorCard
                  key={item._id}
                  donor={item.donor}
                  position={item.position}
                />
              ))}
            </div>
          </div>
        )}

        {/* Trống */}
        {waitingQueue.length === 0 && calledQueue.length === 0 && donatingQueue.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Chưa có ai trong hàng đợi</p>
            <p className="text-sm text-gray-400">Chờ donor check-in</p>
          </div>
        )}
      </main>

      {/* Modal barcode */}
      {showBarcode && completedData && (
        <BarcodeModal
          bloodUnit={completedData.bloodUnit}
          donor={completedData.donor}
          volume={completedData.volume}
          onClose={() => {
            setShowBarcode(false);
            setCompletedData(null);
          }}
        />
      )}
    </div>
  );
};

const QuickStatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
};

const WaitingDonorCard = ({ donor, position, isCurrent }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${isCurrent ? 'border-l-red-500 bg-red-50' : 'border-l-gray-300'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-lg font-bold text-red-600">#{position}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{donor?.fullName || 'Đang tải...'}</p>
            <p className="text-sm text-gray-500">Nhóm máu: {donor?.bloodGroup || '--'}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">⏳ Chờ</span>
      </div>
    </div>
  );
};

const CalledDonorCard = ({ donor, position, onComplete }) => {
  const [showVolume, setShowVolume] = useState(false);
  const volumes = [250, 350, 450];

  const handleComplete = async (volume) => {
    console.log('🎯 Completing with volume:', volume);
    await onComplete(volume);
    setShowVolume(false);
  };

  if (showVolume) {
    return (
      <div className="bg-blue-50 rounded-xl shadow-sm p-4 border border-blue-200">
        <p className="text-center font-semibold mb-3">Chọn thể tích máu:</p>
        <div className="flex gap-3 justify-center">
          {volumes.map(v => (
            <button
              key={v}
              onClick={() => handleComplete(v)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {v}ml
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowVolume(false)} 
          className="mt-3 text-sm text-gray-500 hover:text-gray-700 w-full text-center"
        >
          Hủy
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-xl shadow-sm p-4 border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
            <PhoneCall className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{donor?.fullName || 'Đang tải...'}</p>
            <p className="text-sm text-gray-500">Nhóm máu: {donor?.bloodGroup || '--'}</p>
          </div>
        </div>
        <button
          onClick={() => setShowVolume(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Hoàn thành
        </button>
      </div>
    </div>
  );
};

const DonatingDonorCard = ({ donor, position }) => {
  return (
    <div className="bg-purple-50 rounded-xl shadow-sm p-4 border border-purple-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{donor?.fullName || 'Đang tải...'}</p>
            <p className="text-sm text-gray-500">Nhóm máu: {donor?.bloodGroup || '--'}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Đang hiến
        </span>
      </div>
    </div>
  );
};

export default StaffQueue;