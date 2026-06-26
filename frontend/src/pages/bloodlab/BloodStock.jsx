import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  Layers3,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/blood-lab";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const bloodComponents = [
  { key: "red_cells", label: "Khối hồng cầu", color: "border-red-200 bg-red-50 text-red-700" },
  { key: "platelets", label: "Khối tiểu cầu", color: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "plasma", label: "Huyết tương", color: "border-blue-200 bg-blue-50 text-blue-700" },
];

const emptyComponentDetails = bloodComponents.reduce((result, component) => {
  result[component.key] = { quantity: "", expiryDate: "" };
  return result;
}, {});

const componentLabels = {
  whole_blood: "Máu toàn phần",
  red_cells: "Khối hồng cầu",
  platelets: "Khối tiểu cầu",
  plasma: "Huyết tương",
};

// Danh sách dùng để dựng giao diện; sẽ thay bằng API danh sách bệnh viện ở bước chức năng.
const hospitalOptions = [
  "Bệnh viện Chợ Rẫy",
  "Bệnh viện Bạch Mai",
  "Bệnh viện Nhân dân 115",
  "Bệnh viện Đại học Y Dược TP.HCM",
  "Bệnh viện Việt Đức",
  "Bệnh viện Trung ương Huế",
  "Bệnh viện C Đà Nẵng",
  "Bệnh viện Nhi đồng 1",
  "Bệnh viện Từ Dũ",
  "BV Đa khoa Đồng Nai",
];

const issueVolumeOptions = [250, 350, 450, 500, 700, 900, 1000, 1500, 2000];
const pageSizeOptions = [5, 10, 20];
const statusFilterOptions = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "qualified", label: "Đạt sàng lọc" },
  { value: "available", label: "Sẵn sàng trong kho" },
  { value: "issued", label: "Đã xuất kho" },
  { value: "processed", label: "Đã tách chế phẩm" },
  { value: "rejected", label: "Không đạt" },
  { value: "discarded", label: "Đã loại bỏ" },
  { value: "expired", label: "Hết hạn" },
];

const pendingStatusValues = new Set([
  "pending_screening",
  "pending-testing",
  "pending_testing",
  "quarantine",
]);

const screeningFields = [
  { key: "hiv", label: "HIV" },
  { key: "hbv", label: "HBV" },
  { key: "hcv", label: "HCV" },
  { key: "hepatitis", label: "Viêm gan" },
  { key: "syphilis", label: "Giang mai" },
];

const emptyReceiveForm = {
  bloodType: "",
  volume: "",
  unitCount: "1",
  batchCode: "",
  collectionDate: "",
  expiryDate: "",
};

const emptyIssueForm = {
  bloodType: "",
  requestedVolume: "",
  hospitalName: "",
  reason: "",
};

const getToken = () => localStorage.getItem("token");

const formatDate = (date) => {
  if (!date) return "Chưa cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
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
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${config[value] || config.pending
        }`}
    >
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
    processed: {
      label: "Đã tách chế phẩm",
      className: "bg-cyan-100 text-cyan-700",
      icon: <Layers3 className="w-3 h-3" />,
    },
  };

  const item = config[status] || config.pending_screening;

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${item.className}`}
    >
      {item.icon}
      {item.label}
    </span>
  );
};

const BloodStock = () => {
  const [bloodUnits, setBloodUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState("newest");
  const [componentFilter, setComponentFilter] = useState("all");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [receiveForm, setReceiveForm] = useState(emptyReceiveForm);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [selectedIssueUnits, setSelectedIssueUnits] = useState([]);
  const [customIssueVolume, setCustomIssueVolume] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [screeningForm, setScreeningForm] = useState(null);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scannedUnit, setScannedUnit] = useState(null);
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [componentUnit, setComponentUnit] = useState(null);
  const [componentSubmitting, setComponentSubmitting] = useState(false);
  const [componentDetails, setComponentDetails] = useState(emptyComponentDetails);
  const [selectedComponents, setSelectedComponents] = useState(
    bloodComponents.map((component) => component.key)
  );

  const summary = useMemo(() => {
    const storageStatuses = new Set([
      ...pendingStatusValues,
      "qualified",
      "available",
    ]);

    return {
      total: bloodUnits.filter((u) => storageStatuses.has(u.status)).length,
      pending: bloodUnits.filter((u) => pendingStatusValues.has(u.status)).length,
      available: bloodUnits.filter((u) => u.status === "available").length,
      issued: bloodUnits.filter((u) => u.status === "issued").length,
    };
  }, [bloodUnits]);

  const bloodTypeSummary = useMemo(() => {
    const storageStatuses = new Set([
      ...pendingStatusValues,
      "qualified",
      "available",
    ]);

    return bloodTypes.map((type) => {
      const units = bloodUnits.filter(
        (unit) =>
          storageStatuses.has(unit.status) &&
          (unit.bloodType || unit.bloodGroup) === type
      );

      return {
        type,
        units: units.length,
        volume: units.reduce((sum, unit) => sum + Number(unit.quantity || 0), 0),
        available: units.filter((unit) => unit.status === "available").length,
      };
    });
  }, [bloodUnits]);

  const batchSummary = useMemo(() => {
    const batches = new Map();

    bloodUnits
      .filter((unit) => unit.batchCode)
      .forEach((unit) => {
        const batchCode = unit.batchCode;
        const current = batches.get(batchCode) || {
          batchCode,
          bloodType: unit.bloodType || unit.bloodGroup,
          quantity: unit.quantity || 0,
          collectionDate: unit.collectionDate,
          expiryDate: unit.expiryDate || unit.expirationDate,
          total: 0,
          available: 0,
          rejected: 0,
          discarded: 0,
          pending: 0,
          qualified: 0,
          volume: 0,
        };

        current.total += 1;
        current.volume += Number(unit.quantity || 0);
        if (unit.status === "available") current.available += 1;
        else if (unit.status === "rejected") current.rejected += 1;
        else if (unit.status === "discarded") current.discarded += 1;
        else if (unit.status === "qualified") current.qualified += 1;
        else if (pendingStatusValues.has(unit.status)) current.pending += 1;

        batches.set(batchCode, current);
      });

    return Array.from(batches.values()).sort(
      (first, second) => new Date(second.collectionDate || 0) - new Date(first.collectionDate || 0)
    );
  }, [bloodUnits]);

  const filteredUnits = useMemo(() => {
    return bloodUnits
      .filter((unit) => {
        const unitComponent = unit.componentType || "whole_blood";
        const matchesComponent =
          componentFilter === "all" || unitComponent === componentFilter;
        const matchesBloodType =
          bloodTypeFilter === "all" || unit.bloodType === bloodTypeFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "pending"
            ? pendingStatusValues.has(unit.status)
            : unit.status === statusFilter);

        return matchesComponent && matchesBloodType && matchesStatus;
      })
      .sort((first, second) => {
        const firstDate = new Date(first.createdAt || first.collectionDate || 0).getTime();
        const secondDate = new Date(second.createdAt || second.collectionDate || 0).getTime();
        return sortOrder === "newest" ? secondDate - firstDate : firstDate - secondDate;
      });
  }, [bloodUnits, componentFilter, bloodTypeFilter, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / pageSize));
  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUnits.slice(startIndex, startIndex + pageSize);
  }, [filteredUnits, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const requestedVolume = Number(issueForm.requestedVolume || 0);

  const totalSelectedVolume = selectedIssueUnits.reduce(
    (sum, unit) => sum + (unit.quantity || 0),
    0
  );

  const isIssueEnough =
    selectedIssueUnits.length > 0 && totalSelectedVolume >= requestedVolume;

  const fetchBloodUnits = async () => {
    try {
      setLoading(true);

      const token = getToken();

      const { data } = await axios.get(`${API_URL}/blood/units`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const units = data.data || [];
      setBloodUnits(units);


    } catch (error) {
      console.error("Fetch Blood Units Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể tải danh sách túi máu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBloodUnits();
  }, []);

  const validateReceiveForm = () => {
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

  const handleReceiveBlood = async () => {
    if (!validateReceiveForm()) return;


    try {
      setSubmitting(true);

      const token = getToken();

      const res = await axios.post(
        `${API_URL}/blood/units`,
        {
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
      await fetchBloodUnits();
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

      await axios.patch(
        `${API_URL}/blood/units/${selectedUnit._id}/screening`,
        screeningForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

      await axios.patch(
        `${API_URL}/blood/units/${id}/import`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchBloodUnits();
    } catch (error) {
      console.error("Import Blood Unit Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể nhập kho");
    }
  };

  const handleDiscard = async (id) => {
    try {
      const token = getToken();

      await axios.patch(
        `${API_URL}/blood/units/${id}/discard`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchBloodUnits();
    } catch (error) {
      console.error("Discard Blood Unit Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể loại bỏ túi máu");
    }
  };

  const handleAutoSelectUnits = () => {
    if (!issueForm.bloodType || !requestedVolume) {
      alert("Vui lòng chọn nhóm máu và nhập số ml cần xuất");
      setSelectedIssueUnits([]);
      return;
    }

    const matchedUnits = bloodUnits
      .filter(
        (unit) =>
          unit.status === "available" && unit.bloodType === issueForm.bloodType
      )
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    const selected = [];
    let total = 0;

    for (const unit of matchedUnits) {
      if (total >= requestedVolume) break;

      selected.push(unit);
      total += unit.quantity || 0;
    }

    setSelectedIssueUnits(selected);
  };

  const handleIssueBlood = async (e) => {
    e.preventDefault();

    if (!isIssueEnough) return;

    try {
      const token = getToken();

      await axios.patch(`${API_URL}/blood/units/issue`, issueForm, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setIssueForm(emptyIssueForm);
      setSelectedIssueUnits([]);
      setCustomIssueVolume(false);

      await fetchBloodUnits();
    } catch (error) {
      console.error("Issue Blood Units Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể xuất máu");
    }
  };

  const handleToggleComponent = (componentKey) => {
    setSelectedComponents((current) =>
      current.includes(componentKey)
        ? current.filter((key) => key !== componentKey)
        : [...current, componentKey]
    );
  };

  const handlePreviewSplit = async () => {
    if (selectedComponents.length === 0) {
      alert("Vui lòng chọn ít nhất một chế phẩm máu");
      return;
    }

    const components = selectedComponents.map((type) => ({
      type,
      quantity: Number(componentDetails[type]?.quantity),
      expiryDate: componentDetails[type]?.expiryDate,
    }));

    if (components.some((component) => !component.quantity || !component.expiryDate)) {
      alert("Vui lòng nhập dung tích và hạn sử dụng cho từng chế phẩm");
      return;
    }

    try {
      setComponentSubmitting(true);
      const token = getToken();
      await axios.post(
        `${API_URL}/blood/units/${componentUnit._id}/components`,
        { components },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComponentUnit(null);
      setComponentDetails(emptyComponentDetails);
      await fetchBloodUnits();
      alert("Tách chế phẩm và tạo barcode thành công");
    } catch (error) {
      console.error("Split Blood Components Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể tách chế phẩm máu");
    } finally {
      setComponentSubmitting(false);
    }
  };

  const handleBarcodePreview = async () => {
    if (!barcodeValue.trim()) {
      alert("Vui lòng quét hoặc nhập mã barcode");
      return;
    }

    try {
      setBarcodeLoading(true);
      setScannedUnit(null);
      const token = getToken();
      const { data } = await axios.get(
        `${API_URL}/blood/units/barcode/${encodeURIComponent(barcodeValue.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
              Theo dõi từng túi máu theo mã định danh, Barcode, chế phẩm máu,
              xét nghiệm sàng lọc và xuất kho theo yêu cầu bệnh viện.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setBarcodeModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-medium text-white shadow-sm hover:bg-gray-800"
          >
            <ScanLine className="h-5 w-5" />
            Quét mã Barcode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Tổng đơn vị trong kho</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {summary.total}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Chờ xử lý</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {summary.pending}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Sẵn sàng trong kho</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {summary.available}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Đã xuất kho</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {summary.issued}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Số lượng theo nhóm máu</h2>
            <p className="text-sm text-gray-500">Tính các túi đang chờ xử lý, đạt sàng lọc và sẵn sàng trong kho.</p>
          </div>
          <Droplets className="h-5 w-5 text-red-600" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {bloodTypeSummary.map((item) => (
            <div key={item.type} className="rounded-xl border border-red-100 bg-red-50/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold text-red-700">{item.type}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                  {item.available} sẵn sàng
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{item.units}</p>
              <p className="text-xs text-gray-500">túi máu</p>
              <p className="mt-2 text-sm font-semibold text-gray-700">{item.volume.toLocaleString("vi-VN")} ml</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-red-600" />
            Tiếp nhận túi máu mới
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhóm máu
              </label>
              <select
                value={receiveForm.bloodType}
                onChange={(e) =>
                  setReceiveForm({ ...receiveForm, bloodType: e.target.value })
                }
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dung tích ml
              </label>
              <select
                value={receiveForm.volume}
                onChange={(e) =>
                  setReceiveForm({ ...receiveForm, volume: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Chọn dung tích</option>
                <option value="250">250 ml</option>
                <option value="350">350 ml</option>
                <option value="450">450 ml</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày lấy máu
              </label>
              <input
                type="date"
                value={receiveForm.collectionDate}
                onChange={(e) =>
                  setReceiveForm({
                    ...receiveForm,
                    collectionDate: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hạn dùng
              </label>
              <input
                type="date"
                value={receiveForm.expiryDate}
                onChange={(e) =>
                  setReceiveForm({ ...receiveForm, expiryDate: e.target.value })
                }
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
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhóm máu cần xuất
                </label>
                <select
                  required
                  value={issueForm.bloodType}
                  onChange={(e) => {
                    setIssueForm({ ...issueForm, bloodType: e.target.value });
                    setSelectedIssueUnits([]);
                  }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số ml cần xuất
                </label>
                <select
                  required
                  value={customIssueVolume ? "custom" : issueForm.requestedVolume}
                  onChange={(e) => {
                    const isCustom = e.target.value === "custom";
                    setCustomIssueVolume(isCustom);
                    setIssueForm({
                      ...issueForm,
                      requestedVolume: isCustom ? "" : e.target.value,
                    });
                    setSelectedIssueUnits([]);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Chọn dung tích cần xuất</option>
                  {issueVolumeOptions.map((volume) => (
                    <option key={volume} value={volume}>{volume} ml</option>
                  ))}
                  <option value="custom">Nhập dung tích khác...</option>
                </select>

                {customIssueVolume && (
                  <input
                    required
                    autoFocus
                    type="number"
                    min="1"
                    value={issueForm.requestedVolume}
                    onChange={(e) => {
                      setIssueForm({
                        ...issueForm,
                        requestedVolume: e.target.value,
                      });
                      setSelectedIssueUnits([]);
                    }}
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Nhập số ml cần xuất"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bệnh viện nhận
              </label>
              <select
                required
                value={issueForm.hospitalName}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, hospitalName: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Chọn bệnh viện trong hệ thống</option>
                {hospitalOptions.map((hospital) => (
                  <option key={hospital} value={hospital}>{hospital}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lý do xuất
              </label>
              <input
                value={issueForm.reason}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, reason: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Cấp máu theo yêu cầu"
              />
            </div>

            <button
              type="button"
              onClick={handleAutoSelectUnits}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
            >
              <SearchCheck className="w-4 h-4" />
              Tự động chọn túi phù hợp
            </button>

            {selectedIssueUnits.length > 0 && (
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex justify-between gap-4 mb-3">
                  <p className="font-medium text-gray-800">Túi máu được chọn</p>
                  <p className="text-sm text-gray-600">
                    Tổng:{" "}
                    <span className="font-semibold">
                      {totalSelectedVolume}ml
                    </span>{" "}
                    / {issueForm.requestedVolume}ml
                  </p>
                </div>

                {!isIssueEnough && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    Kho chưa đủ, còn thiếu{" "}
                    {Number(issueForm.requestedVolume) - totalSelectedVolume}ml.
                  </div>
                )}

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {selectedIssueUnits.map((unit) => (
                    <div
                      key={unit._id}
                      className="grid grid-cols-4 gap-2 rounded-lg bg-white border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{unit.unitCode || unit._id}</span>
                      <span>{unit.bloodType}</span>
                      <span>{unit.quantity}ml</span>
                      <span>HSD: {formatDate(unit.expiryDate || unit.expirationDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={!isIssueEnough}
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
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách túi máu
          </h2>

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
                setComponentFilter("all");
                setBloodTypeFilter("all");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Đặt lại bộ lọc
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <label className="mb-1 block text-xs font-medium text-gray-600">Loại máu</label>
              <select
                value={componentFilter}
                onChange={(event) => {
                  setComponentFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Tất cả các loại</option>
                {Object.entries(componentLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
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
                  <option key={type} value={type}>{type}</option>
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
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {bloodUnits.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            Chưa có túi máu nào trong hệ thống.
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            Không có đơn vị máu phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Mã túi
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    QR
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Nhóm máu
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Dung tích
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Ngày lấy
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Hạn dùng
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Sàng lọc
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Trạng thái
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedUnits.map((unit) => (
                  <tr
                    key={unit._id}
                    className="border-b hover:bg-gray-50 align-top"
                  >
                    <td className="p-3">
                      <span className="font-semibold text-gray-800">
                        {unit.barcode || unit.unitCode || unit._id}
                      </span>

                      <p className="mt-1 text-xs text-gray-500">
                        {componentLabels[unit.componentType || "whole_blood"]}
                      </p>

                      {unit.parentBarcode && (
                        <p className="mt-1 text-xs text-blue-600">
                          ParentID: {unit.parentBarcode}
                        </p>
                      )}

                      {unit.issuedTo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Đã xuất cho: {unit.issuedTo}
                        </p>
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
                      <span className="font-bold text-red-600">
                        {unit.bloodType}
                      </span>
                    </td>

                    <td className="p-3 text-gray-700">{unit.quantity} ml</td>

                    <td className="p-3 text-gray-700">
                      {formatDate(unit.collectionDate || unit.expirationDate)}
                    </td>

                    <td className="p-3 text-gray-700">
                      {formatDate(unit.expiryDate || unit.expirationDate)}
                    </td>

                    <td className="p-3">
                      <div className="space-y-2 min-w-[150px]">
                        {screeningFields.map((field) => (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="text-sm text-gray-600">
                              {field.label}
                            </span>
                            {getScreeningBadge(
                              unit.screeningResult?.[field.key]
                            )}
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

                        {(unit.status === "qualified" || unit.status === "available") && (
                          <button
                            type="button"
                            onClick={() => {
                              setComponentUnit(unit);
                              setSelectedComponents(
                                bloodComponents.map((component) => component.key)
                              );
                              setComponentDetails(emptyComponentDetails);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
                          >
                            <Layers3 className="h-4 w-4" />
                            Tách chế phẩm
                          </button>
                        )}

                        {(unit.status === "rejected" ||
                          unit.status === "pending_screening") && (
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
                  <option key={size} value={size}>{size}</option>
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
              <p className="mt-2 text-xs text-gray-500">
                Mã chỉ chứa ID. Thông tin nghiệp vụ được truy vấn từ database sau khi quét.
              </p>
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
                  Quét mã Barcode
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Đưa mã trên túi máu vào vùng quét bên dưới.
                </p>
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Hoặc nhập mã barcode
                </label>
                <input
                  value={barcodeValue}
                  onChange={(event) => setBarcodeValue(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Ví dụ: BLD-2026-00001"
                />
              </div>

              <button
                type="button"
                onClick={handleBarcodePreview}
                disabled={barcodeLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700"
              >
                {barcodeLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="h-4 w-4" />
                )}
                {barcodeLoading ? "Đang tra cứu..." : "Nhận diện barcode"}
              </button>

              {scannedUnit && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    Đã tìm thấy đơn vị lưu trữ
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700">
                    <dt className="text-gray-500">ID</dt>
                    <dd className="break-all font-medium">{scannedUnit.barcode || scannedUnit.unitCode}</dd>
                    <dt className="text-gray-500">Loại</dt>
                    <dd>{componentLabels[scannedUnit.componentType || "whole_blood"]}</dd>
                    <dt className="text-gray-500">Nhóm máu</dt>
                    <dd>{scannedUnit.bloodType}</dd>
                    <dt className="text-gray-500">Trạng thái</dt>
                    <dd>{getStatusBadge(scannedUnit.status)}</dd>
                    {scannedUnit.parentBarcode && (
                      <>
                        <dt className="text-gray-500">ParentID</dt>
                        <dd className="break-all">{scannedUnit.parentBarcode}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {componentUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Layers3 className="h-5 w-5 text-blue-600" />
                  Tách túi máu thành chế phẩm
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Túi {componentUnit.unitCode || componentUnit._id} · Nhóm {componentUnit.bloodType} · {componentUnit.quantity} ml
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComponentUnit(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Đóng cửa sổ tách chế phẩm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="mb-3 text-sm font-medium text-gray-700">
                Chọn các chế phẩm cần tạo
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {bloodComponents.map((component) => {
                  const checked = selectedComponents.includes(component.key);
                  return (
                    <div
                      key={component.key}
                      className={`rounded-xl border p-4 transition ${
                        checked ? component.color : "border-gray-200 bg-white text-gray-500"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <TestTube className="h-6 w-6" />
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleComponent(component.key)}
                          className="h-4 w-4 accent-red-600"
                        />
                      </div>
                      <p className="mt-4 font-semibold">{component.label}</p>
                      <p className="mt-1 text-xs opacity-75">Chế phẩm từ máu toàn phần</p>

                      {checked && (
                        <div className="mt-4 space-y-3 text-gray-700">
                          <div>
                            <label className="mb-1 block text-xs font-medium">Dung tích (ml)</label>
                            <input
                              type="number"
                              min="1"
                              value={componentDetails[component.key]?.quantity || ""}
                              onChange={(event) =>
                                setComponentDetails((current) => ({
                                  ...current,
                                  [component.key]: {
                                    ...current[component.key],
                                    quantity: event.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                              placeholder="Nhập dung tích"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Hạn sử dụng</label>
                            <input
                              type="date"
                              value={componentDetails[component.key]?.expiryDate || ""}
                              onChange={(event) =>
                                setComponentDetails((current) => ({
                                  ...current,
                                  [component.key]: {
                                    ...current[component.key],
                                    expiryDate: event.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Mỗi chế phẩm sẽ được cấp ID và QR riêng, đồng thời lưu ParentID để truy vết về túi máu gốc.
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setComponentUnit(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handlePreviewSplit}
                disabled={componentSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {componentSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Layers3 className="h-4 w-4" />
                )}
                {componentSubmitting ? "Đang xử lý..." : "Xác nhận tách chế phẩm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUnit && screeningForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Cập nhật sàng lọc
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedUnit.unitCode} - {selectedUnit.bloodType}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {screeningFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <select
                    value={screeningForm[field.key]}
                    onChange={(e) =>
                      setScreeningForm({
                        ...screeningForm,
                        [field.key]: e.target.value,
                      })
                    }
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

              <button
                onClick={handleSaveScreening}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
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
