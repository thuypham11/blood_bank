import { useState } from 'react';
import axios from 'axios';

const HealthDeclarationForm = ({ appointmentId, onSuccess, onClose }) => {
  const [answers, setAnswers] = useState({
    usedStimulants: false,
    usedCannabis: false,
    usedCocaine: false,
    usedHeroin: false,
    usedCorticoids: false,
    hasFever: false,
    hasCough: false,
    hasInfection: false,
    hasSkinDisease: false,
    hasAllergy: false
  });
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/donor/health-declaration', {
        appointmentId,
        answers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setQrCode(res.data.qrCode);
        if (onSuccess) onSuccess(res.data);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      alert('Lỗi gửi khai báo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (qrCode) {
    return (
      <div className="text-center p-4">
        <h3 className="font-bold text-lg mb-2">Mã QR khai báo y tế</h3>
        <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48 border rounded-lg" />
        <p className="mt-2 text-sm text-gray-600">Xuất trình mã này cho nhân viên tại điểm hiến máu</p>
        <p className="text-xs text-gray-500">Mã có hiệu lực trong 30 phút</p>
        <button onClick={onClose} className="mt-3 px-4 py-2 bg-gray-200 rounded">Đóng</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-center">Phiếu khai báo sức khỏe</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.usedStimulants} onChange={e => setAnswers({...answers, usedStimulants: e.target.checked})} />
          Bạn có sử dụng chất kích thích không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.usedCannabis} onChange={e => setAnswers({...answers, usedCannabis: e.target.checked})} />
          Bạn có sử dụng cần sa không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.usedCocaine} onChange={e => setAnswers({...answers, usedCocaine: e.target.checked})} />
          Bạn có sử dụng cocaine không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.usedHeroin} onChange={e => setAnswers({...answers, usedHeroin: e.target.checked})} />
          Bạn có sử dụng heroin không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.usedCorticoids} onChange={e => setAnswers({...answers, usedCorticoids: e.target.checked})} />
          Bạn có đang dùng corticoid không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.hasFever} onChange={e => setAnswers({...answers, hasFever: e.target.checked})} />
          Bạn có sốt không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.hasCough} onChange={e => setAnswers({...answers, hasCough: e.target.checked})} />
          Bạn có ho không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.hasInfection} onChange={e => setAnswers({...answers, hasInfection: e.target.checked})} />
          Bạn có đang bị nhiễm trùng không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.hasSkinDisease} onChange={e => setAnswers({...answers, hasSkinDisease: e.target.checked})} />
          Bạn có bệnh ngoài da không?
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={answers.hasAllergy} onChange={e => setAnswers({...answers, hasAllergy: e.target.checked})} />
          Bạn có dị ứng gì không?
        </label>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Đang xử lý...' : 'Gửi khai báo và nhận mã QR'}
      </button>
    </div>
  );
};

export default HealthDeclarationForm;