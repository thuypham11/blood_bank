// Ép Node.js dùng Google DNS (8.8.8.8) để resolve SRV record của Atlas
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
console.log("✅ DNS đã set sang Google (8.8.8.8)");
