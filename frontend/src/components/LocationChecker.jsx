// frontend/src/components/LocationChecker.jsx
import { useState } from 'react';
import axios from 'axios';

const LocationChecker = ({ appointmentId, onSuccess }) => {
  const [checking, setChecking] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị');
      return;
    }
    setChecking(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post('/api/donor/check-location', {
            appointmentId,
            latitude,
            longitude
          }, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.success) {
            alert(res.data.message); // "Đã đến đúng địa điểm, có thể khai báo y tế"
            onSuccess();
          } else {
            alert(res.data.message); // Thông báo lỗi từ server
          }
        } catch (err) {
          alert(err.response?.data?.message || 'Lỗi xác thực vị trí');
        } finally {
          setChecking(false);
        }
      },
      (err) => {
        alert('Không thể lấy vị trí. Vui lòng bật định vị và thử lại.');
        setChecking(false);
      }
    );
  };

  return (
    <div className="text-center p-6">
      <p className="mb-4">Để bắt đầu khai báo y tế, chúng tôi cần xác minh bạn đã đến đúng điểm hiến máu.</p>
      <button
        onClick={requestLocation}
        disabled={checking}
        className="bg-red-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
      >
        {checking ? 'Đang xác thực vị trí...' : 'Xác nhận đã đến điểm hiến máu'}
      </button>
    </div>
  );
};

export default LocationChecker;