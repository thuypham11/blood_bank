import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
  Droplets,
  QrCode,
  TestTube,
  Clock,
  CheckCircle,
  XCircle,
  PlusCircle,
  Send,
  PackageCheck,
  Trash2,
  SearchCheck,
  AlertTriangle,
  RefreshCw,
  ScanLine,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  UploadCloud,
  Cable,
  Camera,
  ShieldCheck,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/blood-lab";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const pageSizeOptions = [5, 10, 20];

const statusFilterOptions = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "qualified", label: "Đạt sàng lọc" },
  { value: "available", label: "Sẵn sàng trong kho" },
  { value: "issued", label: "Đã xuất kho" },
  { value: "rejected", label: "Không đạt" },
  { value: "discarded", label: "Đã loại bỏ" },
  { value: "expired", label: "Hết hạn" },
];

const pendingStatusValues = new Set([
  "pending_screening",
  "pending-testing",
  "pending_testing",
  "quarantine",
  "pending",
]);

const screeningFields = [
  { key: "hiv", label: "HIV" },
  { key: "hbv", label: "HBV" },
  { key: "hcv", label: "HCV" },
  { key: "hepatitis", label: "Viêm gan" },
  { key: "syphilis", label: "Giang mai" },
];

const emptyReceiveForm = {
  unitCode: "",
  bloodType: "",
  volume: "",
  collectionDate: "",
  expiryDate: "",
};

const emptyIssueForm = {
  bloodType: "",
  requestedVolume: "",
  hospitalId: "",
  hospitalName: "",
  requestId: "",
  reason: "",
};

const getToken = () => localStorage.getItem("token");

const formatDate = (date) => {
  if (!date) return "Chưa cập nhật";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Chưa cập nhật";
  return parsedDate.toLocaleDateString("vi-VN");
};

const toInputDate = (value) => {
  if (!value) return "";
  const text = String(value).trim();

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  const dashMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const day = dashMatch[1].padStart(2, "0");
    const month = dashMatch[2].padStart(2, "0");
    const year = dashMatch[3];
    return `${year}-${month}-${day}`;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  return "";
};

const parseBloodQrText = (rawText) => {
  const text = String(rawText || "").trim();

  const result = {
    unitCode: "",
    bloodType: "",
    volume: "",
    collectionDate: "",
  };

  if (!text) return result;

  try {
    const json = JSON.parse(text);

    result.unitCode =
      json.unitCode ||
      json.barcode ||
      json.bloodCode ||
      json.code ||
      json.bagCode ||
      "";

    result.bloodType = json.bloodType || json.bloodGroup || json.group || "";

    result.volume = String(json.volume || json.quantity || json.amount || "").replace(
      /[^\d]/g,
      ""
    );

    result.collectionDate = toInputDate(
      json.collectionDate || json.donationDate || json.donateDate || json.date
    );

    return result;
  } catch {
    // Không phải JSON thì tiếp tục parse dạng text/mã thường.
  }

  const bloodCodeMatch = text.match(/(BLOOD-[A-Za-z0-9]+-[A-Za-z0-9]+-(\d+))/i);

  if (bloodCodeMatch) {
    result.unitCode = bloodCodeMatch[1];
    result.volume = bloodCodeMatch[2];
  } else {
    const genericCodeMatch = text.match(/[A-Z0-9]+-[A-Z0-9-]+/i);
    if (genericCodeMatch) result.unitCode = genericCodeMatch[0];
  }

  const bloodTypeMatch = text.match(/\b(AB\+|AB-|A\+|A-|B\+|B-|O\+|O-)\b/);
  if (bloodTypeMatch) result.bloodType = bloodTypeMatch[1];

  const dateMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (dateMatch) result.collectionDate = toInputDate(dateMatch[1]);

  const volumeMatch = text.match(/(?:Thể tích|The tich|volume|quantity)\D*(\d{2,4})\s*ml/i);
  if (volumeMatch && !result.volume) result.volume = volumeMatch[1];

  return result;
};

const getScreeningBadge = (value) => {
  const config = {
    negative: "bg-green-100 text-green-700",
    positive: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };

  const label = {
    negative: "Âm tính",
    positive: "Dương tính",
    pending: "Đang chờ",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[value] || config.pending}`}>
      {label[value] || label.pending}
    </span>
  );
};

const getStatusBadge = (status) => {
  const config = {
    pending_screening: {
      label: "Chờ sàng lọc",
      className: "bg-amber-100 text-amber-700",
      icon: <Clock className="w-3 h-3" />,
    },
    pending: {
      label: "Chờ sàng lọc",
      className: "bg-amber-100 text-amber-700",
      icon: <Clock className="w-3 h-3" />,
    },
    qualified: {
      label: "Đạt sàng lọc",
      className: "bg-blue-100 text-blue-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    available: {
      label: "Sẵn sàng trong kho",
      className: "bg-green-100 text-green-700",
      icon: <PackageCheck className="w-3 h-3" />,
    },
    issued: {
      label: "Đã xuất kho",
      className: "bg-purple-100 text-purple-700",
      icon: <Send className="w-3 h-3" />,
    },
    rejected: {
      label: "Không đạt",
      className: "bg-red-100 text-red-700",
      icon: <XCircle className="w-3 h-3" />,
    },
    discarded: {
      label: "Đã loại bỏ",
      className: "bg-gray-100 text-gray-700",
      icon: <Trash2 className="w-3 h-3" />,
    },
    expired: {
      label: "Hết hạn",
      className: "bg-orange-100 text-orange-700",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };

  const item = config[status] || config.pending_screening;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${item.className}`}>
      {item.icon}
      {item.label}
    </span>
  );
};

const BloodStock = () => {
  const [expiringUnits, setExpiringUnits] = useState([]);
  const [bloodUnits, setBloodUnits] = useState([]);
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState("newest");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [receiveForm, setReceiveForm] = useState(emptyReceiveForm);

  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [issueDraft, setIssueDraft] = useState({ bloodType: "", requestedVolume: "" });
  const [issueCart, setIssueCart] = useState([]);
  const [issuePreview, setIssuePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [hospitalComboboxOpen, setHospitalComboboxOpen] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState("");

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [screeningForm, setScreeningForm] = useState(null);

  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scannedUnit, setScannedUnit] = useState(null);
  const [barcodePreview, setBarcodePreview] = useState(null);

  const [qrImportModalOpen, setQrImportModalOpen] = useState(false);
  const [qrImageLoading, setQrImageLoading] = useState(false);
  const [qrRawText, setQrRawText] = useState("");
  const [qrParsedPreview, setQrParsedPreview] = useState(null);

  const summary = useMemo(() => {
    const storageStatuses = new Set([...pendingStatusValues, "qualified", "available"]);

    return {
      total: bloodUnits.filter((unit) => storageStatuses.has(unit.status)).length,
      pending: bloodUnits.filter((unit) => pendingStatusValues.has(unit.status)).length,
      available: bloodUnits.filter((unit) => unit.status === "available").length,
      issued: bloodUnits.filter((unit) => unit.status === "issued").length,
    };
  }, [bloodUnits]);

  const filteredUnits = useMemo(() => {
    return bloodUnits
      .filter((unit) => {
        const matchesBloodType = bloodTypeFilter === "all" || unit.bloodType === bloodTypeFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "pending" ? pendingStatusValues.has(unit.status) : unit.status === statusFilter);

        return matchesBloodType && matchesStatus;
      })
      .sort((first, second) => {
        const firstDate = new Date(first.createdAt || first.collectionDate || 0).getTime();
        const secondDate = new Date(second.createdAt || second.collectionDate || 0).getTime();
        return sortOrder === "newest" ? secondDate - firstDate : firstDate - secondDate;
      });
  }, [bloodUnits, bloodTypeFilter, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / pageSize));
  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUnits.slice(startIndex, startIndex + pageSize);
  }, [filteredUnits, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const fetchExpiringUnits = async () => {
    try {
      const token = getToken();
      const { data } = await axios.get(`${API_URL}/blood/check-expiry?threshold=3`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) setExpiringUnits(data.expiringUnits || data.data?.expiringUnits || []);
    } catch (err) {
      console.error("Check Blood Expiry Error:", err);
    }
  };

  const fetchHospitals = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/hospitals`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      setHospitalOptions(data.hospitals || data.data || []);
    } catch (err) {
      console.warn("Không thể tải danh sách bệnh viện:", err?.response?.data || err);
    }
  };

  const fetchBloodUnits = async () => {
    try {
      setLoading(true);
      const token = getToken();

      const { data } = await axios.get(`${API_URL}/blood/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBloodUnits(data.data || data.items || []);
      await fetchHospitals();
    } catch (error) {
      console.error("Fetch Blood Units Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể tải danh sách túi máu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBloodUnits();
    fetchExpiringUnits();
  }, []);

  const validateReceiveForm = () => {
    if (!receiveForm.unitCode.trim()) {
      alert("Vui lòng nhập hoặc quét mã túi máu");
      return false;
    }

    if (!receiveForm.bloodType) {
      alert("Vui lòng chọn nhóm máu");
      return false;
    }

    if (!receiveForm.volume || Number(receiveForm.volume) <= 0) {
      alert("Vui lòng nhập dung tích hợp lệ");
      return false;
    }

    if (!receiveForm.collectionDate) {
      alert("Vui lòng chọn ngày lấy máu");
      return false;
    }

    return true;
  };

  const handleQrImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setQrImageLoading(true);

      const scanner = new Html5Qrcode("qr-image-reader");
      const decodedText = await scanner.scanFile(file, true);

      setQrRawText(decodedText);

      const parsed = parseBloodQrText(decodedText);
      setQrParsedPreview(parsed);

      setReceiveForm((current) => ({
        ...current,
        unitCode: parsed.unitCode || current.unitCode,
        bloodType: parsed.bloodType || current.bloodType,
        volume: parsed.volume || current.volume,
        collectionDate: parsed.collectionDate || current.collectionDate,
      }));

      alert("Đã đọc QR/barcode và tự điền thông tin. Vui lòng kiểm tra lại hạn dùng trước khi tạo túi máu.");
    } catch (error) {
      console.error("Read QR Image Error:", error);
      alert("Không đọc được QR/barcode từ ảnh này. Vui lòng thử ảnh rõ hơn hoặc nhập thông tin thủ công.");
    } finally {
      setQrImageLoading(false);
      event.target.value = "";
    }
  };

  const handleReceiveBlood = async () => {
    if (!validateReceiveForm()) return;

    try {
      setSubmitting(true);
      const token = getToken();

      await axios.post(
        `${API_URL}/blood/units`,
        {
          unitCode: receiveForm.unitCode.trim(),
          barcode: receiveForm.unitCode.trim(),
          bloodType: receiveForm.bloodType,
          quantity: Number(receiveForm.volume),
          collectionDate: receiveForm.collectionDate,
          expiryDate: receiveForm.expiryDate || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setReceiveForm(emptyReceiveForm);
      setQrRawText("");
      setQrParsedPreview(null);
      await Promise.all([fetchBloodUnits(), fetchExpiringUnits()]);
    } catch (error) {
      console.error("Create Blood Unit Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể tạo túi máu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenScreening = (unit) => {
    setSelectedUnit(unit);
    setScreeningForm({
      hiv: unit.screeningResult?.hiv || "pending",
      hbv: unit.screeningResult?.hbv || "pending",
      hcv: unit.screeningResult?.hcv || "pending",
      hepatitis: unit.screeningResult?.hepatitis || "pending",
      syphilis: unit.screeningResult?.syphilis || "pending",
    });
  };

  const handleSaveScreening = async () => {
    try {
      if (!selectedUnit?._id) return;
      const token = getToken();

      await axios.patch(`${API_URL}/blood/units/${selectedUnit._id}/screening`, screeningForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSelectedUnit(null);
      setScreeningForm(null);
      await fetchBloodUnits();
    } catch (error) {
      console.error("Update Screening Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể cập nhật sàng lọc");
    }
  };

  const handleImportToStock = async (id) => {
    try {
      const token = getToken();
      await axios.patch(`${API_URL}/blood/units/${id}/import`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await Promise.all([fetchBloodUnits(), fetchExpiringUnits()]);
    } catch (error) {
      console.error("Import Blood Unit Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể nhập kho");
    }
  };

  const handleDiscard = async (id) => {
    try {
      const token = getToken();
      await axios.patch(`${API_URL}/blood/units/${id}/discard`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await Promise.all([fetchBloodUnits(), fetchExpiringUnits()]);
    } catch (error) {
      console.error("Discard Blood Unit Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể loại bỏ túi máu");
    }
  };

  const handleAddToIssueCart = () => {
    if (!issueDraft.bloodType) {
      alert("Vui lòng chọn nhóm máu");
      return;
    }

    if (!issueDraft.requestedVolume || Number(issueDraft.requestedVolume) <= 0) {
      alert("Vui lòng nhập số ml cần xuất");
      return;
    }

    const newItem = {
      bloodType: issueDraft.bloodType,
      requestedVolume: Number(issueDraft.requestedVolume),
    };

    setIssueCart((current) => {
      const existedIndex = current.findIndex((item) => item.bloodType === newItem.bloodType);

      if (existedIndex >= 0) {
        return current.map((item, index) =>
          index === existedIndex
            ? { ...item, requestedVolume: Number(item.requestedVolume) + Number(newItem.requestedVolume) }
            : item
        );
      }

      return [...current, newItem];
    });

    setIssueDraft({ bloodType: "", requestedVolume: "" });
    setIssuePreview(null);
  };

  const handleRemoveFromIssueCart = (index) => {
    setIssueCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setIssuePreview(null);
  };

  const getHospitalRequests = (hospital) => {
    const requests = hospital?.openRequests || hospital?.requests || [];
    return Array.isArray(requests) ? requests : [];
  };

  const getAcceptedRequest = (hospital) => {
    const requests = getHospitalRequests(hospital);
    const acceptedFromList = requests.find((request) => request.status === "accepted");

    if (acceptedFromList) return acceptedFromList;
    if (hospital?.nextRequest?.status === "accepted") return hospital.nextRequest;

    return null;
  };

  const getRequestVolume = (request) => {
    return Number(
      request?.requestedVolume ||
      request?.volume ||
      Number(request?.units || request?.quantity || 0) * 450
    );
  };

  const getHospitalOptionMeta = (hospital) => {
    const hospitalId = hospital?._id || hospital?.id;
    const acceptedRequest = getAcceptedRequest(hospital);
    const requests = getHospitalRequests(hospital);
    const pendingRequest = requests.find((request) => request.status === "pending");
    const selected = String(issueForm.hospitalId) === String(hospitalId);
    const requestVolume = acceptedRequest ? getRequestVolume(acceptedRequest) : 0;
    const hasAcceptedRequest = Boolean(acceptedRequest);
    const hospitalName = hospital?.name || hospital?.facilityName || "Bệnh viện";
    const bloodType = acceptedRequest?.bloodType || acceptedRequest?.bloodGroup || "";

    return {
      hospital,
      hospitalId,
      hospitalName,
      acceptedRequest,
      pendingRequest,
      selected,
      requestVolume,
      hasAcceptedRequest,
      bloodType,
      searchText: `${hospitalName} ${bloodType} ${hasAcceptedRequest ? "đã nhận accepted" : pendingRequest ? "chờ nhận pending" : "không có yêu cầu"}`.toLowerCase(),
    };
  };

  const handleIssueHospitalChange = (hospitalId) => {
    const hospital = hospitalOptions.find((item) => String(item._id || item.id) === String(hospitalId));
    const request = getAcceptedRequest(hospital);

    if (!hospital) return;

    if (!request) {
      alert("Bệnh viện này chưa có yêu cầu đã được nhận. Vui lòng nhận yêu cầu trước khi xuất máu.");
      return;
    }

    const requestedVolume = getRequestVolume(request);

    setIssueForm({
      ...issueForm,
      hospitalId: hospital._id || hospital.id || "",
      hospitalName: hospital.name || hospital.facilityName || "",
      requestId: request._id || request.id || "",
      reason: `Cấp máu theo yêu cầu ${request._id || request.id}`,
    });

    setIssueCart([
      {
        bloodType: request.bloodType || request.bloodGroup,
        requestedVolume,
      },
    ]);

    setIssuePreview(null);
    setHospitalComboboxOpen(false);
    setHospitalSearch("");
  };

  const handlePreviewIssueCart = async () => {
    if (!issueForm.hospitalName) {
      alert("Vui lòng chọn bệnh viện nhận máu");
      return;
    }

    if (issueCart.length === 0) {
      alert("Vui lòng thêm ít nhất một dòng vào giỏ xuất");
      return;
    }

    try {
      setPreviewLoading(true);
      const token = getToken();

      const { data } = await axios.post(
        `${API_URL}/blood/units/issue/preview`,
        {
          hospitalId: issueForm.hospitalId,
          hospitalName: issueForm.hospitalName,
          requestId: issueForm.requestId,
          reason: issueForm.reason || "Cấp máu theo yêu cầu",
          items: issueCart,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIssuePreview(data.data || data);
    } catch (error) {
      console.error("Preview Issue Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể kiểm tra tồn kho");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleIssueBlood = async (event) => {
    event.preventDefault();

    if (!issueForm.hospitalName) {
      alert("Vui lòng chọn bệnh viện nhận máu");
      return;
    }

    if (issueCart.length === 0) {
      alert("Vui lòng thêm ít nhất một dòng vào giỏ xuất");
      return;
    }

    if (!issuePreview?.canIssue) {
      alert("Vui lòng kiểm tra tồn kho và đảm bảo đủ máu trước khi xuất");
      return;
    }

    try {
      const token = getToken();

      const { data } = await axios.patch(
        `${API_URL}/blood/units/issue`,
        {
          hospitalId: issueForm.hospitalId,
          hospitalName: issueForm.hospitalName,
          requestId: issueForm.requestId,
          reason: issueForm.reason || "Cấp máu theo yêu cầu",
          items: issueCart,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(data.message || "Xuất máu thành công");

      setIssueForm(emptyIssueForm);
      setIssueDraft({ bloodType: "", requestedVolume: "" });
      setIssueCart([]);
      setIssuePreview(null);

      await Promise.all([fetchBloodUnits(), fetchExpiringUnits()]);
    } catch (error) {
      console.error("Issue Blood Units Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể xuất máu");
    }
  };

  const canConfirmIssue = issueForm.hospitalName && issueCart.length > 0 && issuePreview?.canIssue;

  const handleBarcodePreview = async () => {
    if (!barcodeValue.trim()) {
      alert("Vui lòng quét hoặc nhập mã barcode");
      return;
    }

    try {
      setBarcodeLoading(true);
      setScannedUnit(null);
      const token = getToken();

      const { data } = await axios.get(`${API_URL}/blood/units/barcode/${encodeURIComponent(barcodeValue.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setScannedUnit(data.data);
    } catch (error) {
      console.error("Lookup Barcode Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không tìm thấy barcode");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleViewBarcode = async (unit) => {
    try {
      const token = getToken();
      const { data } = await axios.get(`${API_URL}/blood/units/${unit._id}/code`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBarcodePreview({ ...data.data, unit });
    } catch (error) {
      console.error("Load Barcode Image Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể hiển thị barcode");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-red-50 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Đang tải dữ liệu kho máu...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50 p-6">
      <div className="mb-6 bg-white rounded-2xl shadow-sm border border-red-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Droplets className="w-7 h-7 text-red-600" />
              Quản lý đơn vị máu
            </h1>
            <p className="text-gray-600 mt-2">
              Tiếp nhận máu toàn phần, sàng lọc, nhập kho và xuất máu theo yêu cầu bệnh viện.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setQrImportModalOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-red-700"
            >
              <ScanLine className="h-5 w-5" />
              Nhập túi máu bằng QR
            </button>

            <button
              type="button"
              onClick={() => setBarcodeModalOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-medium text-white shadow-sm hover:bg-gray-800"
            >
              <QrCode className="h-5 w-5" />
              Tra cứu Barcode
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Tổng đơn vị trong kho</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Chờ xử lý</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Sẵn sàng trong kho</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{summary.available}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Đã xuất kho</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{summary.issued}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-red-600" />
                Tiếp nhận túi máu mới
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Có thể nhập thủ công hoặc dùng QR để tự động điền thông tin túi máu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQrImportModalOpen(true)}
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <ScanLine className="h-4 w-4" />
              Nhập bằng QR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã túi máu</label>
              <input
                value={receiveForm.unitCode}
                onChange={(event) => setReceiveForm({ ...receiveForm, unitCode: event.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Ví dụ: BLOOD-1780562179157-bf56d7-350"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm máu</label>
              <select
                value={receiveForm.bloodType}
                onChange={(event) => setReceiveForm({ ...receiveForm, bloodType: event.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Chọn nhóm máu</option>
                {bloodTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dung tích ml</label>
              <select
                value={receiveForm.volume}
                onChange={(event) => setReceiveForm({ ...receiveForm, volume: event.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Chọn dung tích</option>
                <option value="250">250 ml</option>
                <option value="350">350 ml</option>
                <option value="450">450 ml</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày lấy máu</label>
              <input
                type="date"
                value={receiveForm.collectionDate}
                onChange={(event) => setReceiveForm({ ...receiveForm, collectionDate: event.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hạn dùng</label>
              <input
                type="date"
                value={receiveForm.expiryDate}
                onChange={(event) => setReceiveForm({ ...receiveForm, expiryDate: event.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleReceiveBlood}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-300"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {submitting ? "Đang tạo..." : "Tạo túi máu"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-red-600" />
            Xuất máu theo yêu cầu bệnh viện
          </h2>

          <form onSubmit={handleIssueBlood} className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Chọn bệnh viện đã được nhận yêu cầu</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Bệnh viện có yêu cầu đã được chấp nhận sẽ nằm trong danh sách nổi bật. Mở combobox, chọn bệnh viện, rồi kiểm tra tồn kho.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchHospitals}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Làm mới
                </button>
              </div>

              {hospitalOptions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500">
                  Chưa tải được danh sách bệnh viện.
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHospitalComboboxOpen((open) => !open)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition ${issueForm.hospitalName
                        ? "border-green-300 ring-2 ring-green-50"
                        : "border-gray-300 hover:border-red-300"
                      }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {issueForm.hospitalName || "Chọn bệnh viện đã nhận yêu cầu"}
                      </p>
                      {issueForm.hospitalName && issueCart.length > 0 ? (
                        <p className="mt-1 truncate text-xs text-green-700">
                          Đã chọn · Nhóm {issueCart[0]?.bloodType} · {issueCart[0]?.requestedVolume} ml
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">
                          Có thể tìm theo tên bệnh viện, trạng thái hoặc nhóm máu
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-gray-500 transition ${hospitalComboboxOpen ? "rotate-180" : ""}`} />
                  </button>

                  {hospitalComboboxOpen && (
                    <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                      <div className="border-b border-gray-100 p-3">
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                          <SearchCheck className="h-4 w-4 shrink-0 text-gray-400" />
                          <input
                            value={hospitalSearch}
                            onChange={(event) => setHospitalSearch(event.target.value)}
                            className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                            placeholder="Tìm bệnh viện, nhóm máu, trạng thái..."
                            autoFocus
                          />
                          {hospitalSearch && (
                            <button
                              type="button"
                              onClick={() => setHospitalSearch("")}
                              className="rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                              aria-label="Xóa tìm kiếm"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto p-2">
                        {hospitalOptions
                          .map((hospital) => getHospitalOptionMeta(hospital))
                          .filter((meta) => !hospitalSearch.trim() || meta.searchText.includes(hospitalSearch.trim().toLowerCase()))
                          .sort((first, second) => {
                            if (first.hasAcceptedRequest && !second.hasAcceptedRequest) return -1;
                            if (!first.hasAcceptedRequest && second.hasAcceptedRequest) return 1;
                            if (first.pendingRequest && !second.pendingRequest) return -1;
                            if (!first.pendingRequest && second.pendingRequest) return 1;
                            return first.hospitalName.localeCompare(second.hospitalName);
                          })
                          .map((meta) => (
                            <button
                              key={meta.hospitalId}
                              type="button"
                              disabled={!meta.hasAcceptedRequest}
                              onClick={() => handleIssueHospitalChange(meta.hospitalId)}
                              className={`mb-2 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition last:mb-0 ${meta.selected
                                  ? "border-green-500 bg-green-50 ring-2 ring-green-100"
                                  : meta.hasAcceptedRequest
                                    ? "border-green-200 bg-white hover:border-green-400 hover:bg-green-50"
                                    : meta.pendingRequest
                                      ? "border-amber-200 bg-amber-50 opacity-80"
                                      : "border-gray-200 bg-gray-50 opacity-60"
                                } ${!meta.hasAcceptedRequest ? "cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">{meta.hospitalName}</p>
                                <p className="mt-1 truncate text-xs text-gray-500">
                                  {meta.hasAcceptedRequest
                                    ? `Yêu cầu đã nhận · Nhóm ${meta.bloodType} · ${meta.requestVolume} ml`
                                    : meta.pendingRequest
                                      ? "Có yêu cầu chờ nhận ở trang Yêu cầu máu"
                                      : "Chưa có yêu cầu đã nhận"}
                                </p>
                              </div>

                              {meta.hasAcceptedRequest ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Đã nhận
                                </span>
                              ) : meta.pendingRequest ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  <Clock className="h-3.5 w-3.5" />
                                  Chờ nhận
                                </span>
                              ) : (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                                  Không có
                                </span>
                              )}
                            </button>
                          ))}

                        {hospitalOptions
                          .map((hospital) => getHospitalOptionMeta(hospital))
                          .filter((meta) => !hospitalSearch.trim() || meta.searchText.includes(hospitalSearch.trim().toLowerCase())).length === 0 && (
                            <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                              Không tìm thấy bệnh viện phù hợp.
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-red-100 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Yêu cầu xuất kho đang chọn</p>
                  {issueForm.hospitalName && issueCart.length > 0 ? (
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        Bệnh viện nhận: <span className="font-semibold text-gray-900">{issueForm.hospitalName}</span>
                      </p>
                      <p>
                        Nhóm máu: <span className="font-semibold text-red-600">{issueCart[0]?.bloodType}</span> · Số lượng yêu cầu: <span className="font-semibold text-gray-900">{issueCart[0]?.requestedVolume} ml</span>
                      </p>
                      {issueForm.requestId && <p className="text-xs text-green-600">Đồng bộ với yêu cầu {issueForm.requestId}</p>}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Chọn một bệnh viện có trạng thái “Đã nhận” để hệ thống tự lấy thông tin yêu cầu.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePreviewIssueCart}
                  disabled={previewLoading || issueCart.length === 0 || !issueForm.hospitalName}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {previewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                  {previewLoading ? "Đang kiểm tra..." : "Kiểm tra tồn kho"}
                </button>
              </div>
            </div>

            {issuePreview && (
              <div className={`rounded-xl border p-4 text-sm ${issuePreview.canIssue ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-semibold ${issuePreview.canIssue ? "text-green-800" : "text-red-800"}`}>
                      {issuePreview.canIssue ? "Đủ tồn kho để xuất máu" : "Không đủ tồn kho"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Hệ thống ưu tiên đề xuất túi máu còn hạn gần nhất trước để giảm hao hụt kho.
                    </p>
                  </div>

                  {issuePreview.canIssue && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-green-700">
                      {issuePreview.totalUnits || issuePreview.plan?.reduce((sum, item) => sum + (item.units?.length || 0), 0) || 0} túi được đề xuất
                    </span>
                  )}
                </div>

                {!issuePreview.canIssue && issuePreview.missingItems?.length > 0 && (
                  <div className="mt-3 space-y-1 text-red-700">
                    {issuePreview.missingItems.map((item, index) => (
                      <p key={`${item.bloodType}-${index}`}>
                        Thiếu {item.missingVolume} ml - Nhóm {item.bloodType || item.bloodGroup}
                      </p>
                    ))}
                  </div>
                )}

                {issuePreview.plan?.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {issuePreview.plan.map((item, index) => {
                      const suggestedUnits = item.units || item.selectedUnits || [];

                      return (
                        <div key={`${item.bloodType}-${index}`} className="rounded-xl border border-white/80 bg-white p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="font-semibold text-gray-800">
                              Nhóm {item.bloodType || item.bloodGroup}: yêu cầu {item.requestedVolume} ml, đề xuất {item.allocatedVolume || item.selectedVolume || 0} ml
                            </p>
                          </div>

                          {suggestedUnits.length > 0 ? (
                            <div className="space-y-2">
                              {suggestedUnits.map((unit) => (
                                <div key={unit._id || unit.id || unit.unitCode || unit.barcode} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700 sm:grid-cols-4">
                                  <span className="font-semibold text-gray-900">{unit.unitCode || unit.barcode || unit._id}</span>
                                  <span>Nhóm {unit.bloodType || unit.bloodGroup}</span>
                                  <span>{unit.quantity || unit.volume || 0} ml</span>
                                  <span>Hạn: {formatDate(unit.expiryDate || unit.expirationDate)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">Không có túi máu phù hợp được đề xuất.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do xuất</label>
              <input
                value={issueForm.reason}
                onChange={(event) => setIssueForm({ ...issueForm, reason: event.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Cấp máu theo yêu cầu"
              />
            </div>

            <button
              disabled={!canConfirmIssue}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Xác nhận xuất kho
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">Danh sách túi máu</h2>
          <span className="text-sm text-gray-500">
            Hiển thị: {filteredUnits.length}/{bloodUnits.length} đơn vị
          </span>
        </div>

        <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Filter className="h-4 w-4 text-red-600" />
              Bộ lọc kho máu
            </p>
            <button
              type="button"
              onClick={() => {
                setSortOrder("newest");
                setBloodTypeFilter("all");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Đặt lại bộ lọc
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Thời gian</label>
              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="newest">Mới nhất đến cũ nhất</option>
                <option value="oldest">Cũ nhất đến mới nhất</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nhóm máu</label>
              <select
                value={bloodTypeFilter}
                onChange={(event) => {
                  setBloodTypeFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Tất cả nhóm máu</option>
                {bloodTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Tất cả trạng thái</option>
                {statusFilterOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {bloodUnits.length === 0 ? (
          <div className="py-10 text-center text-gray-500">Chưa có túi máu nào trong hệ thống.</div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-10 text-center text-gray-500">Không có đơn vị máu phù hợp với bộ lọc hiện tại.</div>
        ) : (
          <>
            {expiringUnits.length > 0 && (
              <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-700">
                <p>
                  Có <strong>{expiringUnits.length}</strong> túi máu sắp hết hạn, vui lòng ưu tiên sử dụng.
                </p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  {expiringUnits.map((unit) => (
                    <li key={unit._id}>
                      {unit.unitCode || unit.barcode} - Nhóm {unit.bloodType} - Hạn sử dụng: {formatDate(unit.expiryDate)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Mã túi</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">QR</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Nhóm máu</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Dung tích</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Ngày lấy</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Hạn dùng</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Sàng lọc</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Trạng thái</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnits.map((unit) => (
                    <tr key={unit._id} className="border-b hover:bg-gray-50 align-top">
                      <td className="p-3">
                        <span className="font-semibold text-gray-800">{unit.barcode || unit.unitCode || unit._id}</span>
                        {unit.issuedTo && (
                          <p className="text-xs text-gray-500 mt-1">Đã xuất cho: {unit.issuedToName || unit.issuedTo}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleViewBarcode(unit)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <QrCode className="w-4 h-4" />
                          Xem mã
                        </button>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-red-600">{unit.bloodType}</span>
                      </td>
                      <td className="p-3 text-gray-700">{unit.quantity} ml</td>
                      <td className="p-3 text-gray-700">{formatDate(unit.collectionDate || unit.createdAt)}</td>
                      <td className="p-3 text-gray-700">{formatDate(unit.expiryDate || unit.expirationDate)}</td>
                      <td className="p-3">
                        <div className="space-y-2 min-w-[150px]">
                          {screeningFields.map((field) => (
                            <div key={field.key} className="flex items-center justify-between gap-3">
                              <span className="text-sm text-gray-600">{field.label}</span>
                              {getScreeningBadge(unit.screeningResult?.[field.key])}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">{getStatusBadge(unit.status)}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleOpenScreening(unit)}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                          >
                            <TestTube className="w-4 h-4" />
                            Sàng lọc
                          </button>

                          {unit.status === "qualified" && (
                            <button
                              onClick={() => handleImportToStock(unit._id)}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                            >
                              <PackageCheck className="w-4 h-4" />
                              Nhập kho
                            </button>
                          )}

                          {(unit.status === "rejected" || pendingStatusValues.has(unit.status)) && (
                            <button
                              onClick={() => handleDiscard(unit._id)}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Loại bỏ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Hiển thị</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>đơn vị mỗi trang</span>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-sm text-gray-600">
                  Trang {currentPage}/{totalPages} · {filteredUnits.length} kết quả
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {qrImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <ScanLine className="h-5 w-5 text-red-600" />
                  Nhập túi máu bằng QR
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Kết nối máy quét QR/barcode hoặc mô phỏng bằng ảnh tem túi máu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrImportModalOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Đóng cửa sổ nhập túi máu bằng QR"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-gray-200 bg-gray-950 p-5 text-white shadow-inner">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Thiết bị quét QR/Barcode</p>
                    <p className="mt-1 text-xs text-white/60">Chế độ mô phỏng kết nối máy quét</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-300">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    Sẵn sàng
                  </span>
                </div>

                <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <div className="absolute inset-8 rounded-xl border-2 border-white/70" />
                  <div className="absolute left-12 right-12 top-1/2 h-0.5 bg-red-500 shadow-[0_0_14px_3px_rgba(239,68,68,0.65)]" />
                  <div className="text-center text-white/70">
                    <Camera className="mx-auto mb-3 h-16 w-16" />
                    <p className="text-sm font-medium">Đưa tem QR/barcode vào vùng quét</p>
                    <p className="mt-1 text-xs text-white/50">Hỗ trợ máy quét 2D USB hoặc ảnh tem QR</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15"
                  >
                    <Cable className="h-4 w-4" />
                    Kết nối máy quét
                  </button>

                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
                    {qrImageLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    {qrImageLoading ? "Đang đọc ảnh..." : "Tải ảnh tem QR"}
                    <input type="file" accept="image/*" onChange={handleQrImageUpload} disabled={qrImageLoading} className="hidden" />
                  </label>
                </div>

                <div id="qr-image-reader" className="hidden" />
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-red-700">
                    <ShieldCheck className="h-5 w-5" />
                    Dữ liệu sau khi quét
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Sau khi đọc QR/barcode, hệ thống sẽ tự điền mã túi máu, nhóm máu, dung tích và ngày lấy máu vào form tiếp nhận.
                  </p>
                </div>

                {qrParsedPreview ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm">
                    <p className="mb-3 font-semibold text-gray-800">Thông tin nhận diện</p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700">
                      <dt className="text-gray-500">Mã túi máu</dt>
                      <dd className="break-all font-medium">{qrParsedPreview.unitCode || "Chưa nhận diện"}</dd>
                      <dt className="text-gray-500">Nhóm máu</dt>
                      <dd>{qrParsedPreview.bloodType || "Chưa nhận diện"}</dd>
                      <dt className="text-gray-500">Dung tích</dt>
                      <dd>{qrParsedPreview.volume ? `${qrParsedPreview.volume} ml` : "Chưa nhận diện"}</dd>
                      <dt className="text-gray-500">Ngày lấy máu</dt>
                      <dd>{qrParsedPreview.collectionDate || "Chưa nhận diện"}</dd>
                    </dl>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                    Chưa có dữ liệu quét. Chọn “Tải ảnh tem QR” để mô phỏng quét từ ảnh.
                  </div>
                )}

                {qrRawText && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Nội dung QR/barcode</p>
                    <p className="break-all text-xs text-gray-600">{qrRawText}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setQrImportModalOpen(false)}
                  className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Dùng dữ liệu đã quét
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {barcodePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Mã định danh đơn vị máu</h3>
                <p className="mt-1 text-xs text-gray-500">QR · Mức sửa lỗi H</p>
              </div>
              <button
                type="button"
                onClick={() => setBarcodePreview(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Đóng mã QR"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <img
                src={barcodePreview.dataUrl}
                alt={`QR ${barcodePreview.identifier}`}
                className="mx-auto h-64 w-64 rounded-xl border border-gray-200"
              />
              <p className="mt-4 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm font-semibold text-gray-800">
                {barcodePreview.identifier}
              </p>
              <p className="mt-2 text-xs text-gray-500">Mã chỉ chứa ID. Thông tin nghiệp vụ được truy vấn từ database sau khi quét.</p>
            </div>
          </div>
        </div>
      )}

      {barcodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <ScanLine className="h-5 w-5 text-red-600" />
                  Tra cứu Barcode
                </h3>
                <p className="mt-1 text-sm text-gray-500">Quét hoặc nhập mã trên túi máu để tra cứu thông tin.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBarcodeModalOpen(false);
                  setScannedUnit(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Đóng cửa sổ quét barcode"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-gray-950">
                <div className="absolute inset-7 rounded-xl border-2 border-white/80" />
                <div className="absolute left-10 right-10 top-1/2 h-0.5 bg-red-500 shadow-[0_0_14px_3px_rgba(239,68,68,0.65)]" />
                <div className="text-center text-white/70">
                  <QrCode className="mx-auto mb-2 h-14 w-14" />
                  <p className="text-sm">Khu vực xem trước camera</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Hoặc nhập mã barcode</label>
                <input
                  value={barcodeValue}
                  onChange={(event) => setBarcodeValue(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Ví dụ: BLOOD-1780562179157-bf56d7-350"
                />
              </div>

              <button
                type="button"
                onClick={handleBarcodePreview}
                disabled={barcodeLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700"
              >
                {barcodeLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {barcodeLoading ? "Đang tra cứu..." : "Nhận diện barcode"}
              </button>

              {scannedUnit && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    Đã tìm thấy đơn vị lưu trữ
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700">
                    <dt className="text-gray-500">Mã túi máu</dt>
                    <dd className="break-all font-medium">{scannedUnit.barcode || scannedUnit.unitCode}</dd>
                    <dt className="text-gray-500">Nhóm máu</dt>
                    <dd>{scannedUnit.bloodType}</dd>
                    <dt className="text-gray-500">Dung tích</dt>
                    <dd>{scannedUnit.quantity} ml</dd>
                    <dt className="text-gray-500">Trạng thái</dt>
                    <dd>{getStatusBadge(scannedUnit.status)}</dd>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedUnit && screeningForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Cập nhật sàng lọc</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedUnit.unitCode || selectedUnit.barcode} - {selectedUnit.bloodType}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {screeningFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <select
                    value={screeningForm[field.key]}
                    onChange={(event) => setScreeningForm({ ...screeningForm, [field.key]: event.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="pending">Đang chờ</option>
                    <option value="negative">Âm tính</option>
                    <option value="positive">Dương tính</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => {
                  setSelectedUnit(null);
                  setScreeningForm(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button onClick={handleSaveScreening} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
                Lưu kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodStock;
