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
} from "lucide-react";

const API_URL = "http://localhost:5000/api/blood-lab";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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

  const [receiveForm, setReceiveForm] = useState(emptyReceiveForm);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [selectedIssueUnits, setSelectedIssueUnits] = useState([]);

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [screeningForm, setScreeningForm] = useState(null);

  const summary = useMemo(() => {
    return {
      total: bloodUnits.length,
      pending: bloodUnits.filter((u) => u.status === "pending_screening").length,
      available: bloodUnits.filter((u) => u.status === "available").length,
      issued: bloodUnits.filter((u) => u.status === "issued").length,
    };
  }, [bloodUnits]);

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

      await fetchBloodUnits();
    } catch (error) {
      console.error("Issue Blood Units Error:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể xuất máu");
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
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Droplets className="w-7 h-7 text-red-600" />
          Quản lý đơn vị máu
        </h1>

        <p className="text-gray-600 mt-2">
          Theo dõi từng túi máu theo mã định danh, QR/Barcode, xét nghiệm sàng
          lọc, nhập kho và xuất kho theo yêu cầu bệnh viện.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Tổng túi máu</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {summary.total}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm text-gray-500">Chờ sàng lọc</p>
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
                <input
                  required
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="11700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bệnh viện nhận
              </label>
              <input
                required
                value={issueForm.hospitalName}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, hospitalName: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Bệnh viện A"
              />
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
            Tổng cộng: {bloodUnits.length} túi máu
          </span>
        </div>

        {bloodUnits.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            Chưa có túi máu nào trong hệ thống.
          </div>
        ) : (
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
                {bloodUnits.map((unit) => (
                  <tr
                    key={unit._id}
                    className="border-b hover:bg-gray-50 align-top"
                  >
                    <td className="p-3">
                      <span className="font-semibold text-gray-800">
                        {unit.unitCode || unit._id}
                      </span>

                      {unit.issuedTo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Đã xuất cho: {unit.issuedTo}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
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
        )}
      </div>

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