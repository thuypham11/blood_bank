import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const HealthDeclarationForm = ({ appointmentId, onSuccess }) => {
  const [answers, setAnswers] = useState({
    // Phần 1: Tiền sử
    previousDonation: false,
    chronicDiseases: false,
    weightLoss: false,
    lymphNodes: false,
    acupuncture: false,
    tattoo: false,
    bloodTransfusion: false,
    drugUse: false,
    unsafeSex: false,
    sameSex: false,
    vaccine: false,
    vaccineName: '',
    epidemicArea: false,
    // Phần 2: 1 tuần gần đây
    flu: false,
    antibiotics: false,
    doctorVisit: false,
    // Phần 3: Phụ nữ
    pregnant: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAnswers(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    await axios.post('/api/donor/health-declaration', {
      appointmentId,
      answers
    }, { headers: { Authorization: `Bearer ${token}` } });
    alert('Khai báo y tế thành công! Vui lòng chờ nhân viên gọi tên.');
    if (onSuccess) onSuccess();
  } catch (error) {
    alert(error.response?.data?.message || 'Lỗi gửi khai báo');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-4xl mx-auto p-6 max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">PHIẾU ĐĂNG KÝ HIẾN MÁU TÌNH NGUYỆN</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Phần 1: Tiền sử */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">1. Tiền sử</legend>
          <div className="grid grid-cols-1 gap-2">
            <label className="flex items-center gap-2"><input type="checkbox" name="previousDonation" checked={answers.previousDonation} onChange={handleChange} /> Đã từng hiến máu trước đây</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="chronicDiseases" checked={answers.chronicDiseases} onChange={handleChange} /> Mắc bệnh mạn tính (tim, gan, thận, huyết áp, hen, lao, ung thư...)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="weightLoss" checked={answers.weightLoss} onChange={handleChange} /> Sút cân ≥4kg không rõ nguyên nhân trong 6 tháng</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="lymphNodes" checked={answers.lymphNodes} onChange={handleChange} /> Nổi hạch kéo dài</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="acupuncture" checked={answers.acupuncture} onChange={handleChange} /> Châm cứu, phẫu thuật trong 6 tháng</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="tattoo" checked={answers.tattoo} onChange={handleChange} /> Xăm mình, xỏ khuyên qua da</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="bloodTransfusion" checked={answers.bloodTransfusion} onChange={handleChange} /> Được truyền máu</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="drugUse" checked={answers.drugUse} onChange={handleChange} /> Sử dụng ma túy, tiêm chích</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="unsafeSex" checked={answers.unsafeSex} onChange={handleChange} /> Quan hệ tình dục với người nhiễm HIV/nguy cơ cao</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="sameSex" checked={answers.sameSex} onChange={handleChange} /> Quan hệ tình dục đồng giới</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="vaccine" checked={answers.vaccine} onChange={handleChange} /> Tiêm vắc xin (nếu có, ghi rõ)</label>
            {answers.vaccine && <input type="text" name="vaccineName" placeholder="Loại vắc xin" value={answers.vaccineName} onChange={handleChange} className="border p-2 rounded w-full mt-1" />}
            <label className="flex items-center gap-2"><input type="checkbox" name="epidemicArea" checked={answers.epidemicArea} onChange={handleChange} /> Sống trong vùng dịch</label>
          </div>
        </fieldset>

        {/* Phần 2: Trong 1 tuần gần đây */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">2. Trong 1 tuần gần đây</legend>
          <div className="grid grid-cols-1 gap-2">
            <label><input type="checkbox" name="flu" checked={answers.flu} onChange={handleChange} /> Bị cúm, ho, sốt</label>
            <label><input type="checkbox" name="antibiotics" checked={answers.antibiotics} onChange={handleChange} /> Dùng kháng sinh, aspirin, corticoid</label>
            <label><input type="checkbox" name="doctorVisit" checked={answers.doctorVisit} onChange={handleChange} /> Đi khám bác sĩ, xét nghiệm, chữa răng</label>
          </div>
        </fieldset>

        {/* Phần 3: Dành cho phụ nữ */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">3. Dành cho phụ nữ</legend>
          <label><input type="checkbox" name="pregnant" checked={answers.pregnant} onChange={handleChange} /> Đang có thai hoặc nuôi con dưới 12 tháng</label>
        </fieldset>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => window.history.back()} className="px-4 py-2 border rounded">Quay lại</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">
            {loading ? 'Đang gửi...' : 'Gửi khai báo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HealthDeclarationForm;