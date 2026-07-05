import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  CalendarDays, Loader2, AlertTriangle, MapPin, Users, CheckCircle,
  Clock, Plus, RefreshCw, X, Edit3, ExternalLink, Map, Wifi, WifiOff
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const CAMP_STATUSES = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

// 63 tỉnh thành Việt Nam
const VIETNAM_CITIES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng",
  "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
  "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh",
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

const EMPTY_FORM = {
  title: "", date: "", timeStart: "", timeEnd: "",
  venue: "", address: "", ward: "", city: "TP. Hồ Chí Minh", state: "",
  hospital: "", expectedDonors: 100, description: "",
  lat: "", lng: "",
};

// Geocode địa chỉ → tọa độ qua Nominatim (miễn phí)
const geocodeAddress = async (venue, address, ward, city) => {
  const query = [venue, address, ward, city, "Việt Nam"].filter(Boolean).join(", ");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "Accept-Language": "vi" } }
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
};

const AdminBloodCamps = () => {
  const { userData } = useOutletContext();
  const [camps, setCamps]             = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [successMsg, setSuccessMsg]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [labs, setLabs]               = useState([]);
  const [statusModal, setStatusModal] = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [isEditing, setIsEditing]     = useState(false);
  const [mapCoords, setMapCoords]     = useState(null);
  const [geocoding, setGeocoding]     = useState(false);
  // Ward (phường/xã) combobox
  const [wardOptions, setWardOptions]     = useState([]);
  const [wardLoading, setWardLoading]     = useState(false);
  const [wardInputFocus, setWardInputFocus] = useState(false); // { lat, lng }
  const [rtConnected, setRtConnected] = useState(false);
  const socketRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // ── Socket.IO realtime ──────────────────────────────────────────
  useEffect(() => {
    const socket = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setRtConnected(true));
    socket.on("disconnect", () => setRtConnected(false));

    socket.on("campStatusUpdated", () => {
      // Reload camps khi server thông báo có thay đổi trạng thái
      fetchCamps();
    });

    return () => socket.disconnect();
  }, []);

  // ── Fetch camps ─────────────────────────────────────────────────
  const fetchCamps = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/camps", { headers });
      setCamps(data.camps);
    } catch (err) { setError(err.response?.data?.message || "Lỗi tải dữ liệu chiến dịch"); }
    finally { setIsLoading(false); }
  }, []);

  const fetchLabs = useCallback(async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/facilities", { headers });
      setLabs(data.facilities || []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchCamps(); fetchLabs(); }, []);

  // Auto-chọn mặc định Viện Huyết Học khi danh sách labs load xong
  useEffect(() => {
    if (labs.length > 0 && !form.hospital) {
      const vienHuyetHoc = labs.find(l =>
        l.name?.toLowerCase().includes("huyết học") ||
        l.name?.toLowerCase().includes("huyet hoc") ||
        l.name?.toLowerCase().includes("truyền máu")
      );
      if (vienHuyetHoc) {
        setForm(f => ({ ...f, hospital: vienHuyetHoc._id }));
      } else if (labs[0]) {
        setForm(f => ({ ...f, hospital: labs[0]._id }));
      }
    }
  }, [labs]);

  useEffect(() => {
    setFiltered(filterStatus === "all" ? camps : camps.filter(c => c.status === filterStatus));
  }, [filterStatus, camps]);

  // ── Tải ward khi đổi thành phố ───────────────────────────────────────────────
  useEffect(() => {
    if (!form.city || !showCreateModal) { setWardOptions([]); return; }
    let cancelled = false;
    const fetchWards = async () => {
      setWardLoading(true);
      try {
        // Bước 1: Tìm mã tỉnh theo tên
        const res = await fetch("https://provinces.open-api.vn/api/");
        const provinces = await res.json();
        // Match tên không dấu hoặc có dấu
        const normalize = s => s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^(tp\.?\s*|tinh\s*|thành phố\s*|tỉnh\s*)/i, "").trim();
        const cityNorm = normalize(form.city.replace("TP. Hồ Chí Minh", "Hồ Chí Minh"));
        const province = provinces.find(p => normalize(p.name) === cityNorm || normalize(p.name).includes(cityNorm) || cityNorm.includes(normalize(p.name)));
        if (!province) { if (!cancelled) { setWardOptions([]); setWardLoading(false); } return; }
        // Bước 2: Lấy danh sách quận/huyện và phường/xã
        const r2 = await fetch(`https://provinces.open-api.vn/api/p/${province.code}?depth=3`);
        const detail = await r2.json();
        const wards = [];
        (detail.districts || []).forEach(d => {
          (d.wards || []).forEach(w => wards.push(w.name));
        });
        if (!cancelled) setWardOptions(wards);
      } catch (_) {
        if (!cancelled) setWardOptions([]);
      } finally {
        if (!cancelled) setWardLoading(false);
      }
    };
    fetchWards();
    return () => { cancelled = true; };
  }, [form.city, showCreateModal]);

  // ── Geocode khi địa chỉ thay đổi (debounce 600ms) ─────────────────────────
  const geocodeTimer = useRef(null);
  // Dùng ref để tránh stale closure
  const venueRef = useRef(form.venue);
  const addressRef = useRef(form.address);
  const cityRef = useRef(form.city);

  useEffect(() => { venueRef.current = form.venue; }, [form.venue]);
  useEffect(() => { addressRef.current = form.address; }, [form.address]);
  useEffect(() => { cityRef.current = form.city; }, [form.city]);

  useEffect(() => {
    if (!showCreateModal) return;
    const venue = form.venue;
    const address = form.address;
    const ward = form.ward;
    const city = form.city;
    if (!venue && !city) return;

    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      const coords = await geocodeAddress(venue, address, ward, city);
      setGeocoding(false);
      if (coords) {
        setMapCoords(coords);
        setForm(f => ({ ...f, lat: coords.lat, lng: coords.lng }));
      }
    }, 600);

    return () => clearTimeout(geocodeTimer.current);
  }, [form.venue, form.address, form.ward, form.city, showCreateModal]);



  // ── Submit form ─────────────────────────────────────────────────
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        title: form.title,
        date: form.date,
        time: { start: form.timeStart, end: form.timeEnd },
        location: {
          venue: form.venue,
          address: form.address,
          ward: form.ward,
          city: form.city,
          state: form.state,
          coordinates: {
            lat: parseFloat(form.lat) || 10.7769,
            lng: parseFloat(form.lng) || 106.7009,
          },
        },
        hospital: form.hospital,
        expectedDonors: Number(form.expectedDonors),
        description: form.description,
      };

      if (isEditing) {
        await axios.put(`http://localhost:5000/api/admin/camps/${form._id}`, payload, { headers });
      } else {
        await axios.post("http://localhost:5000/api/admin/camps", payload, { headers });
      }
      setSuccessMsg(isEditing ? "✅ Đã cập nhật chiến dịch!" : "✅ Đã tạo chiến dịch mới!");
      setShowCreateModal(false);
      fetchCamps();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi xử lý chiến dịch");
    } finally { setTimeout(() => setSuccessMsg(""), 3000); }
  };

  const getDefaultHospital = () => {
    const vhh = labs.find(l =>
      l.name?.toLowerCase().includes("huyết học") ||
      l.name?.toLowerCase().includes("truyền máu")
    );
    return vhh?._id || labs[0]?._id || "";
  };

  const openAddForm = () => {
    setIsEditing(false);
    setMapCoords(null);
    setForm({ ...EMPTY_FORM, hospital: getDefaultHospital() });
    setShowCreateModal(true);
  };

  const openEditForm = (camp) => {
    setIsEditing(true);
    const coords = camp.location?.coordinates;
    setMapCoords(coords?.lat ? { lat: coords.lat, lng: coords.lng } : null);
    setForm({
      _id: camp._id,
      title: camp.title,
      date: camp.date ? camp.date.split("T")[0] : "",
      timeStart: camp.time?.start || "",
      timeEnd: camp.time?.end || "",
      venue: camp.location?.venue || "",
      address: camp.location?.address || "",
      ward: camp.location?.ward || "",
      city: camp.location?.city || "TP. Hồ Chí Minh",
      state: camp.location?.state || "",
      hospital: camp.hospital?._id || camp.hospital || "",
      expectedDonors: camp.expectedDonors || 100,
      description: camp.description || "",
      lat: coords?.lat || "",
      lng: coords?.lng || "",
    });
    setShowCreateModal(true);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/camps/${id}/status`, { status }, { headers });
      setSuccessMsg(`✅ Đã cập nhật trạng thái thành "${status}"`);
      setStatusModal(null);
      fetchCamps();
    } catch (err) { setError("Lỗi cập nhật trạng thái"); }
    finally { setTimeout(() => setSuccessMsg(""), 3000); }
  };

  const openGoogleMaps = () => {
    const query = [form.venue, form.address, form.ward, form.city, "Việt Nam"].filter(Boolean).join(", ");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
  };

  const stats = {
    total: camps.length,
    upcoming: camps.filter(c => c.status === "Upcoming").length,
    ongoing: camps.filter(c => c.status === "Ongoing").length,
    completed: camps.filter(c => c.status === "Completed").length,
  };

  if (userData?.role !== "superadmin" && !userData?.permissions?.includes("manage_blood_camps")) {
    return <div className="flex flex-col items-center justify-center h-96"><AlertTriangle size={64} className="text-red-400 mb-4" /><h2 className="text-2xl font-bold">Không có quyền truy cập</h2></div>;
  }

  // Map embed URL (OpenStreetMap iframe — không cần API key)
  const mapEmbedUrl = mapCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.01},${mapCoords.lat - 0.01},${mapCoords.lng + 0.01},${mapCoords.lat + 0.01}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lng}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarDays className="text-red-600"/> Quản Lý Chiến Dịch Hiến Máu
          </h1>
          <p className="text-sm text-gray-500 mt-1">Lập kế hoạch và quản lý các đợt hiến máu lưu động.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Realtime indicator */}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${rtConnected ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {rtConnected ? <Wifi size={12}/> : <WifiOff size={12}/>}
            {rtConnected ? "Realtime" : "Offline"}
          </div>
          <button onClick={fetchCamps} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600"><RefreshCw size={16}/></button>
          <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold">
            <Plus size={16} /> Tạo Chiến Dịch
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Tổng",        val: stats.total,     color: "bg-gray-800",   icon: CalendarDays },
          { label: "Sắp tới",     val: stats.upcoming,  color: "bg-blue-500",   icon: Clock },
          { label: "Đang diễn ra", val: stats.ongoing,  color: "bg-yellow-500", icon: Users },
          { label: "Hoàn thành",   val: stats.completed, color: "bg-green-500", icon: CheckCircle },
        ].map(({ label, val, color, icon: Icon }) => (
          <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}><Icon size={18} className="text-white" /></div>
            <div className="text-2xl font-black text-gray-800">{val}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase mt-1">{label}</div>
          </div>
        ))}
      </div>

      {successMsg && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">{successMsg}</div>}
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}><X size={18} /></button></div>}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Tất cả"],["Upcoming","Sắp tới"],["Ongoing","Đang diễn ra"],["Completed","Hoàn thành"],["Cancelled","Đã huỷ"]].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterStatus === val ? "bg-red-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-red-300"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
        {isLoading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                  <th className="p-4 font-semibold">Tên Chiến Dịch</th>
                  <th className="p-4 font-semibold">Đơn Vị Tổ Chức</th>
                  <th className="p-4 font-semibold">Thời Gian &amp; Địa Điểm</th>
                  <th className="p-4 font-semibold text-center">Trạng Thái</th>
                  <th className="p-4 font-semibold text-right">Dự Kiến</th>
                  <th className="p-4 font-semibold text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(camp => (
                  <tr key={camp._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800 text-sm">{camp.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{camp.description}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{camp.hospital?.name || "N/A"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1"><Clock size={11} className="text-blue-400"/>{new Date(camp.date).toLocaleDateString("vi-VN")}{camp.time?.start && ` • ${camp.time.start}${camp.time.end ? ` - ${camp.time.end}` : ""}`}</div>
                      <div className="flex items-start gap-1 text-xs text-gray-500">
                        <MapPin size={11} className="text-red-400 mt-0.5 shrink-0" />
                        <span className="truncate max-w-[180px]">{camp.location?.venue}, {camp.location?.city}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        camp.status === "Upcoming"  ? "bg-blue-100 text-blue-700"    :
                        camp.status === "Ongoing"   ? "bg-yellow-100 text-yellow-700":
                        camp.status === "Completed" ? "bg-green-100 text-green-700"  :
                        "bg-gray-100 text-gray-600"
                      }`}>{camp.status}</span>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-700 text-sm">
                      <div className="flex items-center justify-end gap-1"><Users size={13} className="text-gray-400" />{camp.expectedDonors}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setStatusModal(camp)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">Trạng thái</button>
                        <button onClick={() => openEditForm(camp)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium"><Edit3 size={12}/> Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Chưa có chiến dịch nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Plus className="text-red-600"/> {isEditing ? "Sửa Chiến Dịch" : "Tạo Chiến Dịch Hiến Máu Mới"}
            </h3>
            <form onSubmit={handleSubmitForm} className="space-y-4">

              {/* Tên chiến dịch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Chiến Dịch *</label>
                <input required placeholder="VD: Lễ hội Xuân Hồng 2026" value={form.title}
                  onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
              </div>

              {/* Ngày + Giờ */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Tổ Chức *</label>
                  <input type="date" required value={form.date}
                    onChange={e => setForm(f => ({...f, date: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ Bắt Đầu</label>
                  <input type="time" value={form.timeStart}
                    onChange={e => setForm(f => ({...f, timeStart: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ Kết Thúc</label>
                  <input type="time" value={form.timeEnd}
                    onChange={e => setForm(f => ({...f, timeEnd: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
                </div>
              </div>

              {/* Đơn vị tổ chức — mặc định Viện Huyết Học */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn Vị Tổ Chức *</label>
                <select required value={form.hospital}
                  onChange={e => setForm(f => ({...f, hospital: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none">
                  <option value="">-- Chọn đơn vị --</option>
                  {labs.map(l => (
                    <option key={l._id} value={l._id}>
                      {l.name}
                      {(l.name?.toLowerCase().includes("huyết học") || l.name?.toLowerCase().includes("truyền máu")) ? " ★ (Mặc định)" : ""}
                    </option>
                  ))}
                </select>
                {labs.find(l => l._id === form.hospital)?.name?.toLowerCase().includes("huyết học") && (
                  <p className="text-xs text-green-600 mt-1">✅ Viện Huyết Học - Truyền Máu (mặc định)</p>
                )}
              </div>

              {/* Địa điểm */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Địa Điểm (Venue) *</label>
                <input required placeholder="VD: Nhà Văn hóa Thanh niên" value={form.venue}
                  onChange={e => setForm(f => ({...f, venue: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa Chỉ Chi Tiết</label>
                <input placeholder="VD: 36 Lê Quý Đôn" value={form.address}
                  onChange={e => setForm(f => ({...f, address: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
              </div>

              {/* Phường / Xã — combobox: vừa gõ vừa chọn */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phường / Xã
                  {wardLoading && <span className="ml-2 text-xs text-blue-500 animate-pulse">Đang tải...</span>}
                </label>
                <div className="relative">
                  <input
                    list="ward-list"
                    placeholder={wardLoading ? "Đang tải danh sách..." : wardOptions.length ? "Nhập hoặc chọn phường/xã..." : "Nhập tên phường/xã"}
                    value={form.ward}
                    onChange={e => setForm(f => ({...f, ward: e.target.value}))}
                    onFocus={() => setWardInputFocus(true)}
                    onBlur={() => setTimeout(() => setWardInputFocus(false), 200)}
                    autoComplete="off"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none pr-10"
                  />
                  {/* Native datalist cho UX tốt nhất */}
                  <datalist id="ward-list">
                    {wardOptions
                      .filter(w => !form.ward || w.toLowerCase().includes(form.ward.toLowerCase()))
                      .slice(0, 80)
                      .map(w => <option key={w} value={w} />)
                    }
                  </datalist>
                  {/* Icon dropdown / loading */}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {wardLoading
                      ? <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75"/></svg>
                      : <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M7 7l3-3 3 3M7 13l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                    }
                  </span>
                  {/* Dropdown gợi ý custom khi focus (hỗ trợ browser không show datalist đẹp) */}
                  {wardInputFocus && wardOptions.length > 0 && form.ward && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {wardOptions
                        .filter(w => w.toLowerCase().includes(form.ward.toLowerCase()))
                        .slice(0, 15)
                        .map(w => (
                          <button key={w} type="button"
                            onMouseDown={() => { setForm(f => ({...f, ward: w})); setWardInputFocus(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 hover:text-red-700 transition-colors first:rounded-t-xl last:rounded-b-xl">
                            {w}
                          </button>
                        ))
                      }
                      {wardOptions.filter(w => w.toLowerCase().includes(form.ward.toLowerCase())).length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-400 italic">Không tìm thấy — nhập tự do</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Thành phố — dropdown 63 tỉnh thành */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành Phố / Tỉnh *</label>
                  <select required value={form.city}
                    onChange={e => setForm(f => ({...f, city: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none">
                    {VIETNAM_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số Người Hiến Dự Kiến</label>
                  <input type="number" min="1" value={form.expectedDonors}
                    onChange={e => setForm(f => ({...f, expectedDonors: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
                </div>
              </div>

              {/* Google Maps Preview */}
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Map size={14} className="text-red-500"/>
                    Bản Đồ Địa Điểm
                    {geocoding && <Loader2 size={12} className="animate-spin text-blue-500"/>}
                  </span>
                  <button type="button" onClick={openGoogleMaps}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                    <ExternalLink size={12}/> Xem trên Google Maps
                  </button>
                </div>
                {mapCoords && mapEmbedUrl ? (
                  <iframe
                    src={mapEmbedUrl}
                    width="100%" height="200"
                    style={{ border: "none", display: "block" }}
                    title="map-preview"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
                    {geocoding ? "Đang tìm tọa độ..." : "Nhập tên địa điểm và thành phố để xem bản đồ"}
                  </div>
                )}
                {mapCoords && (
                  <div className="px-4 py-2 bg-green-50 text-xs text-green-700 flex items-center gap-1">
                    <MapPin size={11}/> Tọa độ: {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
                    <button type="button" onClick={openGoogleMaps} className="ml-auto flex items-center gap-1 text-blue-600 hover:underline">
                      <ExternalLink size={10}/> Xác nhận trên Google Maps
                    </button>
                  </div>
                )}
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô Tả</label>
                <textarea rows={2} placeholder="Thông tin thêm về chiến dịch..." value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Hủy</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm">
                  {isEditing ? "Cập Nhật" : "Lưu Chiến Dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Status Update Modal ─────────────────────────────────────── */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2"><Edit3 className="inline mr-2 text-blue-500" size={18} />Cập Nhật Trạng Thái</h3>
            <p className="text-sm text-gray-500 mb-5">Chiến dịch: <strong>{statusModal.title}</strong></p>
            <div className="space-y-2">
              {CAMP_STATUSES.map(s => (
                <button key={s} onClick={() => handleUpdateStatus(statusModal._id, s)}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm text-left px-4 transition-all border ${
                    statusModal.status === s ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}>
                  {statusModal.status === s && "✓ "}
                  {s === "Upcoming" ? "⏰ Sắp tới" : s === "Ongoing" ? "🔴 Đang diễn ra" : s === "Completed" ? "✅ Hoàn thành" : "❌ Đã huỷ"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">💡 Trạng thái cũng tự động cập nhật theo ngày tổ chức</p>
            <button onClick={() => setStatusModal(null)} className="w-full mt-3 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBloodCamps;
