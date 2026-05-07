// frontend/src/pages/donor/BookDonation.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, MapPin, Clock, Users, CheckCircle, X, Loader2, 
  Heart, AlertCircle, ChevronRight, Filter, Search, Building2
} from "lucide-react";
import { toast } from "react-hot-toast";

const BookDonation = () => {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Lấy danh sách điểm hiến máu từ database
  const fetchCamps = async () => {
    try {
      setLoading(true);
      console.log("📡 Đang gọi API lấy danh sách điểm hiến máu...");
      
      const res = await fetch("http://localhost:5000/api/donor/camps", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      const data = await res.json();
      console.log("✅ Dữ liệu nhận được:", data);
      
      if (data.success) {
        // Kiểm tra cấu trúc dữ liệu
        let campsData = [];
        if (data.data && data.data.camps) {
          campsData = data.data.camps;
        } else if (data.camps) {
          campsData = data.camps;
        } else if (Array.isArray(data)) {
          campsData = data;
        } else if (Array.isArray(data.data)) {
          campsData = data.data;
        }
        
        console.log("📋 Danh sách điểm hiến máu:", campsData);
        setCamps(campsData);
        
        if (campsData.length === 0) {
          toast.error("Hiện chưa có điểm hiến máu nào. Vui lòng quay lại sau.");
        }
      } else {
        toast.error(data.message || "Không thể tải danh sách điểm hiến máu");
      }
    } catch (error) {
      console.error("❌ Lỗi fetch camps:", error);
      toast.error("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCamps();
  }, []);

  // Lấy danh sách thành phố duy nhất để lọc
  const cities = [...new Set(camps.map(camp => camp.location?.city).filter(Boolean))];

  // Lọc danh sách theo tìm kiếm và thành phố
  const filteredCamps = camps.filter(camp => {
    const matchesSearch = !searchTerm || 
      camp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camp.location?.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camp.location?.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = filterCity === "all" || camp.location?.city === filterCity;
    
    return matchesSearch && matchesCity;
  });

  // Đặt lịch hiến máu
  const handleBook = async () => {
    if (!selectedCamp || !selectedDate || !selectedTime) {
      toast.error("Vui lòng chọn đầy đủ thông tin");
      return;
    }

    setIsSubmitting(true);
    try {
      // Gọi API tạo appointment (sẽ implement sau)
      const res = await fetch("http://localhost:5000/api/donor/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          campId: selectedCamp._id,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Đặt lịch hiến máu thành công!");
        setShowConfirmModal(false);
        setSelectedCamp(null);
        setSelectedDate("");
        setSelectedTime("");
        navigate("/donor/my-appointments");
      } else {
        toast.error(data.message || "Đặt lịch thất bại");
      }
    } catch (error) {
      console.error("Book appointment error:", error);
      toast.error("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải danh sách điểm hiến máu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 rounded-2xl">
              <Heart className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Đăng ký hiến máu</h1>
              <p className="text-gray-600 mt-1">Chọn điểm hiến máu và thời gian phù hợp với bạn</p>
            </div>
          </div>
          
          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">📋 Lưu ý trước khi đăng ký</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Tuổi từ 18-60, cân nặng tối thiểu 45kg</li>
                <li>Không mắc các bệnh truyền nhiễm qua đường máu</li>
                <li>Không sử dụng rượu bia trước 24 giờ</li>
                <li>Ăn nhẹ trước khi hiến 2-3 giờ</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, địa chỉ, thành phố..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500"
            >
              <option value="all">Tất cả thành phố</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Camps Grid */}
        {filteredCamps.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Không tìm thấy điểm hiến máu</h3>
            <p className="text-gray-500">
              {searchTerm || filterCity !== "all" 
                ? "Không có điểm hiến máu nào phù hợp với tìm kiếm của bạn"
                : "Hiện tại chưa có điểm hiến máu nào. Vui lòng quay lại sau."}
            </p>
            {(searchTerm || filterCity !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterCity("all");
                }}
                className="mt-4 text-red-600 hover:text-red-700"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCamps.map((camp) => (
              <div
                key={camp._id}
                className={`bg-white rounded-2xl shadow-lg border-2 transition-all cursor-pointer hover:shadow-xl ${
                  selectedCamp?._id === camp._id ? "border-red-500 ring-2 ring-red-200" : "border-gray-100"
                }`}
                onClick={() => setSelectedCamp(camp)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{camp.title}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 bg-green-100 text-green-700">
                      Sắp diễn ra
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{camp.hospital?.name || "Cơ sở y tế"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{camp.location?.venue}, {camp.location?.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-500" />
                      <span>{new Date(camp.date).toLocaleDateString("vi-VN", {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      <span>{camp.time?.start} - {camp.time?.end}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-red-500" />
                      <span>Dự kiến: {camp.expectedDonors} người tham gia</span>
                    </div>
                  </div>

                  {camp.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{camp.description}</p>
                  )}

                  <button
                    className={`w-full py-2.5 rounded-xl font-medium transition-colors ${
                      selectedCamp?._id === camp._id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCamp(camp);
                    }}
                  >
                    {selectedCamp?._id === camp._id ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Đã chọn
                      </span>
                    ) : (
                      "Chọn điểm này"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        {selectedCamp && !showConfirmModal && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">Đặt lịch hiến máu</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Confirm Modal */}
        {showConfirmModal && selectedCamp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Xác nhận đặt lịch hiến máu</h2>
                <button 
                  onClick={() => setShowConfirmModal(false)} 
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Camp info */}
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="font-semibold text-red-800 mb-1">{selectedCamp.title}</p>
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedCamp.location?.venue}, {selectedCamp.location?.city}
                  </p>
                </div>

                {/* Date selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn ngày hiến máu *</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date(selectedCamp.date).toISOString().split("T")[0]}
                    max={new Date(selectedCamp.date).toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Chỉ có thể đặt lịch đúng ngày diễn ra sự kiện</p>
                </div>

                {/* Time selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn khung giờ *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["08:00 - 10:00", "10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00"].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`px-4 py-3 rounded-xl border font-medium transition-all ${
                          selectedTime === time
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:bg-red-50"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Health reminder */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="font-semibold text-yellow-800 text-sm mb-2">📋 Kiểm tra sức khỏe trước khi đăng ký</p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                    <li>Không có bệnh lý về tim mạch, huyết áp</li>
                    <li>Không đang điều trị bằng kháng sinh</li>
                    <li>Không mắc bệnh mãn tính</li>
                    <li>Phụ nữ không đang trong kỳ kinh nguyệt</li>
                  </ul>
                </div>

                {/* Warning */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-700">
                    <span className="font-semibold">⚠️ Cam kết:</span> Tôi xác nhận các thông tin trên là đúng sự thật 
                    và cam kết tuân thủ quy trình hiến máu an toàn.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t flex gap-3 bg-gray-50">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleBook}
                  disabled={isSubmitting || !selectedDate || !selectedTime}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      Xác nhận đăng ký
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDonation;