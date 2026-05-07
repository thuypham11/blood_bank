// frontend/src/pages/donor/DonorTestResults.jsx
import { useState, useEffect } from "react";
import { Beaker, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";

const DonorTestResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestResults();
  }, []);

  const fetchTestResults = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/donor/test-results", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log("API response:", data); // Kiểm tra log
      if (data.success) {
        setResults(data.data);
      } else {
        toast.error(data.message || "Không thể tải kết quả");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === "negative") return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === "positive") return <XCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-yellow-500" />;
  };

  const getOverallBadge = (status) => {
    if (status === "passed") return { bg: "bg-green-100", text: "text-green-700", label: "Đạt yêu cầu" };
    if (status === "failed") return { bg: "bg-red-100", text: "text-red-700", label: "Không đạt" };
    return { bg: "bg-yellow-100", text: "text-yellow-700", label: "Chờ kết quả" };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-12 text-center">
          <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Chưa có kết quả xét nghiệm</h3>
          <p className="text-gray-500">Bạn chưa có lần hiến máu nào hoặc kết quả đang được cập nhật.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <div className="p-2 bg-red-100 rounded-xl">
            <Beaker className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Kết quả xét nghiệm máu</h1>
            <p className="text-gray-600">Chi tiết kết quả xét nghiệm các bệnh truyền nhiễm</p>
          </div>
        </div>

        <div className="space-y-6">
          {results.map((result, idx) => {
            const overall = getOverallBadge(result.screeningStatus);
            return (
              <div key={idx} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Ngày hiến: {new Date(result.donationDate).toLocaleDateString("vi-VN", {
                          weekday: "long", day: "numeric", month: "long", year: "numeric"
                        })}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {result.bloodGroup}
                        </span>
                        <span className="text-sm text-gray-500">Mã: {result.barcode}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${overall.bg} ${overall.text}`}>
                      {overall.label}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <TestItem label="HIV" status={result.screening?.hiv} />
                    <TestItem label="Viêm gan B" status={result.screening?.hepatitisB} />
                    <TestItem label="Viêm gan C" status={result.screening?.hepatitisC} />
                    <TestItem label="Giang mai" status={result.screening?.syphilis} />
                    <TestItem label="Sốt rét" status={result.screening?.malaria} />
                  </div>
                  {result.screening?.testedAt && (
                    <p className="text-xs text-gray-400 text-center mt-4">
                      Ngày xét nghiệm: {new Date(result.screening.testedAt).toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TestItem = ({ label, status }) => {
  const getStatus = () => {
    if (status === "negative") return { text: "Âm tính", color: "text-green-600", icon: <CheckCircle className="w-5 h-5 text-green-500" /> };
    if (status === "positive") return { text: "Dương tính", color: "text-red-600", icon: <XCircle className="w-5 h-5 text-red-500" /> };
    return { text: "Chờ kết quả", color: "text-yellow-600", icon: <Clock className="w-5 h-5 text-yellow-500" /> };
  };
  const { text, color, icon } = getStatus();
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold mt-1 ${color}`}>{text}</p>
    </div>
  );
};

export default DonorTestResults;