// frontend/src/components/OtpModal.jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const OtpModal = ({ isOpen, onClose, onVerified, email }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendOtp = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/donor/send-otp', {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Mã OTP đã được gửi đến email của bạn');
    } catch (error) {
      toast.error('Gửi OTP thất bại');
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    await sendOtp();
    setLoading(false);
    setResendDisabled(true);
    let time = 60;
    setCountdown(time);
    const interval = setInterval(() => {
      time--;
      setCountdown(time);
      if (time <= 0) {
        clearInterval(interval);
        setResendDisabled(false);
      }
    }, 1000);
  };

  const handleVerify = async () => {
    if (!otp) return toast.error('Vui lòng nhập mã OTP');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/donor/verify-otp', { otpCode: otp }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Xác thực thành công');
      if (onVerified) onVerified();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleSendOtp();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Xác thực qua email</h2>
        <p className="text-gray-600 mb-2">Mã OTP đã được gửi đến <strong>{email}</strong></p>
        <input
          type="text"
          placeholder="Nhập mã OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            {loading ? 'Đang xác thực...' : 'Xác nhận'}
          </button>
          <button
            onClick={handleSendOtp}
            disabled={resendDisabled || loading}
            className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {resendDisabled ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-3 text-gray-500 text-sm">Hủy</button>
      </div>
    </div>
  );
};

export default OtpModal;