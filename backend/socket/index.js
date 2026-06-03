// backend/socket/index.js
import { Server } from "socket.io";

let io;

export function initSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);
    
    // Staff join room
    socket.on('staff_join', (sessionId) => {
      socket.join(`staff_${sessionId}`);
      console.log(`Staff joined room: staff_${sessionId}`);
    });
    
    // Donor join room
    socket.on('donor_join', (donorId) => {
      socket.join(`donor_${donorId}`);
      console.log(`Donor joined room: donor_${donorId}`);
    });
    
    socket.on("send_message", (data) => {
      console.log("📨 Message received:", data.message);
      socket.emit("receive_message", {
        text: `Cảm ơn bạn đã hỏi: "${data.message}"\n\nĐây là câu trả lời mẫu.`,
        type: "bot",
        timestamp: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}