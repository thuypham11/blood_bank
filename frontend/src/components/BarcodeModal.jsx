// frontend/src/components/BarcodeModal.jsx
import { useState, useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';

const BarcodeModal = ({ bloodUnit, donor, volume, onClose }) => {
  const [barcodeImage, setBarcodeImage] = useState(null);

  useEffect(() => {
    // Tạo barcode từ bloodUnit._id hoặc thông tin donor
    generateBarcode();
  }, [bloodUnit]);

  const generateBarcode = async () => {
    // Tạo barcode đơn giản từ ID
    const barcodeText = bloodUnit?.barcode || bloodUnit?._id || donor?._id;
    // Sử dụng API tạo barcode (có thể dùng Google Charts API hoặc tự tạo)
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${barcodeText}&code=Code128&dpi=96`;
    setBarcodeImage(barcodeUrl);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-area').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode - ${donor?.fullName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .barcode-container {
              text-align: center;
              padding: 20px;
              border: 2px solid #000;
              border-radius: 10px;
              width: 300px;
            }
            img { max-width: 100%; margin: 10px 0; }
            .info { margin: 10px 0; text-align: left; }
            .info p { margin: 5px 0; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Barcode & Thông tin túi máu</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div id="print-area" className="p-6">
          <div className="text-center">
            <div className="mb-4">
              <div className="text-2xl font-bold text-red-600 mb-2">🏥 BỆNH VIỆN HIẾN MÁU</div>
              <div className="border-t-2 border-b-2 border-gray-300 py-2 my-2">
                <div className="text-sm">THÔNG TIN TÚI MÁU</div>
              </div>
            </div>

            {/* QR Code */}
            {bloodUnit?.qrCode && (
              <div className="mb-4">
                <img src={bloodUnit.qrCode} alt="QR Code" className="mx-auto w-48 h-48" />
              </div>
            )}

            {/* Barcode */}
            {barcodeImage && (
              <div className="mb-4">
                <img src={barcodeImage} alt="Barcode" className="mx-auto" />
                <div className="text-sm mt-1 font-mono">{bloodUnit?.barcode || bloodUnit?._id}</div>
              </div>
            )}

            {/* Thông tin donor */}
            <div className="info bg-gray-50 p-4 rounded-lg text-left space-y-2">
              <p><strong>Mã túi máu:</strong> {bloodUnit?._id?.slice(-8) || 'N/A'}</p>
              <p><strong>Người hiến:</strong> {donor?.fullName || 'N/A'}</p>
              <p><strong>Nhóm máu:</strong> <span className="text-red-600 font-bold text-lg">{donor?.bloodGroup || 'N/A'}</span></p>
              <p><strong>Thể tích:</strong> {volume}ml</p>
              <p><strong>Ngày hiến:</strong> {new Date().toLocaleDateString('vi-VN')}</p>
              <p><strong>Giờ hiến:</strong> {new Date().toLocaleTimeString('vi-VN')}</p>
              <p><strong>Mã số:</strong> {donor?._id?.slice(-6) || 'N/A'}</p>
            </div>

            {/* Cảnh báo */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              ⚠️ Vui lòng dán barcode này lên túi máu ngay sau khi lấy máu
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            In barcode
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeModal;