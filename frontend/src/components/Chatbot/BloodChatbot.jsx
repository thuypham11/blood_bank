// frontend/src/components/Chatbot/BloodChatbot.jsx (đã sửa)
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { 
  MessageCircle, X, Send, Bot, User, Heart, 
  Minimize2, Maximize2, HelpCircle 
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

  useEffect(() => {
    console.log("🔌 Kết nối Socket.IO...");
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket", "polling"]
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected");
      setIsConnected(true);
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

    setSocket(newSocket);

    // Tin nhắn chào mừng (không dùng markdown phức tạp)
    setMessages([{
      text: "👋 Xin chào! Tôi là BloodBot. Hãy hỏi tôi về hiến máu nhé!",
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

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !isConnected) {
      console.log("Không thể gửi:", { inputMessage, socket: !!socket, isConnected });
      return;
    }

    setMessages(prev => [...prev, {
      text: inputMessage,
      type: "user",
      timestamp: new Date().toISOString()
    }]);

    socket.emit("send_message", { message: inputMessage });
    setIsTyping(true);
    setInputMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "Điều kiện hiến máu?",
    "Bao lâu được hiến một lần?",
    "Hiến máu có lợi gì?",
    "Chuẩn bị gì trước khi hiến?"
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
      </button>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 ${
      isMinimized 
        ? "bottom-6 right-6 w-80" 
        : "bottom-6 right-6 w-96 h-[600px]"
    }`}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-red-100 h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-full">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">BloodBot</h3>
              <p className="text-xs text-red-100">
                {isConnected ? "🟢 Đang hoạt động" : "🔴 Đang kết nối..."}
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
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${msg.type === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.type === "user" ? "bg-red-600" : "bg-gray-300"
                    }`}>
                      {msg.type === "user" 
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-gray-600" />
                      }
                    </div>
                    <div className={`rounded-2xl px-4 py-2 ${
                      msg.type === "user"
                        ? "bg-red-600 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Câu hỏi gợi ý:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(q);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập câu hỏi..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 resize-none text-sm"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || !isConnected}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BloodChatbot;