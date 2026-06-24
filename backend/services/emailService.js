import nodemailer from "nodemailer";

// ── Tạo transporter Gmail ──────────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ── Gửi mật khẩu mới cho donor ─────────────────────────────────────────────
export const sendDonorPasswordReset = async ({ toEmail, fullName, newPassword }) => {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px 24px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px 28px; }
        .greeting { font-size: 16px; color: #374151; margin-bottom: 16px; }
        .info-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
        .info-box p { margin: 0 0 8px; font-size: 13px; color: #6b7280; }
        .password { font-size: 28px; font-weight: 800; color: #dc2626; letter-spacing: 4px; font-family: monospace; }
        .note { font-size: 13px; color: #9ca3af; margin-top: 24px; }
        .footer { background: #f9fafb; padding: 20px 28px; text-align: center; }
        .footer p { margin: 0; font-size: 12px; color: #9ca3af; }
        .logo { font-size: 18px; font-weight: 800; color: #dc2626; }
        .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-top: 16px; font-size: 13px; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size:32px; margin-bottom:8px;">🩸</div>
          <h1>Đặt Lại Mật Khẩu</h1>
          <p>Hệ Thống Quản Lý Ngân Hàng Máu</p>
        </div>
        <div class="body">
          <p class="greeting">Xin chào <strong>${fullName || "Quý thành viên"}</strong>,</p>
          <p style="color:#374151; font-size:15px;">Quản trị viên đã đặt lại mật khẩu tài khoản hiến máu của bạn. Dưới đây là mật khẩu mới:</p>
          
          <div class="info-box">
            <p>Mật khẩu mới của bạn:</p>
            <div class="password">${newPassword}</div>
          </div>

          <div class="warning">
            ⚠️ Vui lòng <strong>đăng nhập ngay</strong> và đổi mật khẩu sang mật khẩu mới của riêng bạn để bảo mật tài khoản.
          </div>

          <p class="note">
            Nếu bạn không yêu cầu đặt lại mật khẩu, hãy liên hệ ngay với quản trị viên hệ thống.<br><br>
            Trân trọng,<br>
            <strong>Ban Quản Trị Ngân Hàng Máu</strong>
          </p>
        </div>
        <div class="footer">
          <p class="logo">🩸 Blood Bank Management System</p>
          <p style="margin-top:6px;">Email này được gửi tự động, vui lòng không reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"🩸 Ngân Hàng Máu" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🔐 Mật Khẩu Mới — Hệ Thống Ngân Hàng Máu",
    html,
  });
};

// ── Gửi thông báo chung ────────────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"🩸 Ngân Hàng Máu" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
