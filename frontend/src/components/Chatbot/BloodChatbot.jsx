// frontend/src/components/BloodChatbot.jsx
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { 
  MessageCircle, X, Send, Bot, User, Heart, 
  Minimize2, Maximize2, HelpCircle, Zap 
} from "lucide-react";

const BloodChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Quick replies cho người dùng
  const quickReplies = [
    { emoji: "📋", text: "Điều kiện hiến máu", query: "Điều kiện hiến máu là gì?" },
    { emoji: "⏰", text: "Tần suất hiến", query: "Bao lâu được hiến máu một lần?" },
    { emoji: "💪", text: "Lợi ích", query: "Hiến máu có lợi gì?" },
    { emoji: "🏥", text: "Điểm hiến gần đây", query: "Điểm hiến máu ở đâu?" },
    { emoji: "🩸", text: "Nhóm máu", query: "Các nhóm máu" },
    { emoji: "📝", text: "Chuẩn bị", query: "Cần chuẩn bị gì trước khi hiến máu?" },
    { emoji: "🍎", text: "Sau khi hiến", query: "Sau khi hiến máu cần làm gì?" },
    { emoji: "❓", text: "Không đủ điều kiện", query: "Khi nào không được hiến máu?" },
  ];

  useEffect(() => {
    console.log("🔌 Kết nối Socket.IO...");
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      reconnection: false,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected");
      setIsConnected(true);
      
      // Gửi thông tin donor (nếu có) để cá nhân hóa
      const token = localStorage.getItem("token");
      if (token) {
        newSocket.emit("authenticate", { token });
      }
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket error:", err);
      setIsConnected(false);
    });

    newSocket.on("receive_message", (data) => {
      console.log("📨 Nhận:", data);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        text: data.text,
        type: "bot",
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on("ai_thinking", (data) => {
      setIsTyping(data.isThinking);
    });

    setSocket(newSocket);

    // Tin nhắn chào mừng (phiên bản Pro)
    setMessages([{
      text: "👋 **Xin chào! Tôi là BloodBot Pro - trợ lý AI của Ngân hàng Máu Việt Nam.**\n\n💡 Tôi có thể giúp bạn:\n• 📋 Tư vấn điều kiện và quy trình hiến máu\n• ⏰ Nhắc lịch tái hiến\n• 🩸 Giải đáp về nhóm máu\n• 🏥 Tìm điểm hiến máu gần nhất\n• 💪 Lợi ích khi hiến máu\n\n**Hãy hỏi tôi bất cứ điều gì bạn muốn biết!** 💬",
      type: "bot",
      timestamp: new Date().toISOString()
    }]);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = (text = null) => {
    const messageToSend = text || inputMessage;
    if (!messageToSend.trim() || !socket || !isConnected) {
      console.log("Không thể gửi:", { messageToSend, socket: !!socket, isConnected });
      return;
    }

    setMessages(prev => [...prev, {
      text: messageToSend,
      type: "user",
      timestamp: new Date().toISOString()
    }]);

    socket.emit("send_message", { message: messageToSend });
    setIsTyping(true);
    setInputMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format thời gian hiển thị
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
        <div className="absolute inset-0 rounded-full bg-red-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
      </button>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 ${
      isMinimized 
        ? "bottom-6 right-6 w-80" 
        : "bottom-6 right-6 w-96 h-[650px]"
    }`}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-red-100 h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-full">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">BloodBot Pro</h3>
              <p className="text-xs text-red-100 flex items-center gap-1">
                <Zap size={10} className="text-yellow-300" />
                {isConnected ? "🟢 AI sẵn sàng" : "🔴 Đang kết nối..."}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4 text-white" /> : <Minimize2 className="w-4 h-4 text-white" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-gray-50 to-red-50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.type === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.type === "user" 
                        ? "bg-red-600" 
                        : "bg-gradient-to-br from-gray-300 to-gray-400"
                    }`}>
                      {msg.type === "user" 
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-white" />
                      }
                    </div>
                    <div className={`rounded-2xl px-4 py-2 ${
                      msg.type === "user"
                        ? "bg-red-600 text-white rounded-br-none"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.type === "user" ? "text-red-200" : "text-gray-400"
                      }`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start animate-pulse">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {messages.length <= 2 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Câu hỏi gợi ý nhanh:
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.slice(0, 6).map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(qr.query)}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 shadow-sm"
                    >
                      {qr.emoji} {qr.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                  rows={1}
                  style={{ maxHeight: "80px" }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || !isConnected}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                BloodBot Pro có thể trả lời câu hỏi về hiến máu, sức khỏe và quy trình
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BloodChatbot;