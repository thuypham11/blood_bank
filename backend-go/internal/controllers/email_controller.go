package controllers

import (
	//	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	//	"strings"

	"github.com/gin-gonic/gin"

	"bloodbank-go/internal/config"
)

type InviteRequest struct {
	ToEmail    string `json:"toEmail"`
	DonorName  string `json:"donorName"`
	Message    string `json:"message"`
	InviteLink string `json:"inviteLink"`
}

type OTPRequest struct {
	ToEmail   string `json:"toEmail"`
	OtpCode   string `json:"otpCode"`
	DonorName string `json:"donorName"`
}

// SendInviteEmail gửi email mời bạn bè
func SendInviteEmail(c *gin.Context) {
	var req InviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	cfg := config.LoadConfig()
	if cfg.EmailUser == "" || cfg.EmailPass == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Email configuration missing"})
		return
	}

	subject := "Lời mời hiến máu từ " + req.DonorName
	body := fmt.Sprintf(`
        <h2>Lời mời tham gia hiến máu</h2>
        <p>Bạn của bạn <strong>%s</strong> đã mời bạn tham gia hiến máu cứu người.</p>
        <p>Lời nhắn: %s</p>
        <p>Đăng ký ngay tại: <a href="%s">%s</a></p>
        <p>Rất mong sự tham gia của bạn!</p>
    `, req.DonorName, req.Message, req.InviteLink, req.InviteLink)

	err := sendEmail(cfg.EmailUser, cfg.EmailPass, req.ToEmail, subject, body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Invitation sent"})
}

// SendOtpEmail gửi mã OTP
func SendOtpEmail(c *gin.Context) {
	var req OTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	cfg := config.LoadConfig()
	if cfg.EmailUser == "" || cfg.EmailPass == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Email configuration missing"})
		return
	}

	subject := "Mã OTP xác thực hiến máu"
	body := fmt.Sprintf(`
        <h2>Xác thực đăng ký hiến máu</h2>
        <p>Chào <strong>%s</strong>,</p>
        <p>Mã OTP của bạn là: <strong style="font-size: 24px;">%s</strong></p>
        <p>Mã có hiệu lực trong 5 phút.</p>
        <p>Vui lòng nhập mã này để hoàn tất đặt lịch hiến máu.</p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    `, req.DonorName, req.OtpCode)

	err := sendEmail(cfg.EmailUser, cfg.EmailPass, req.ToEmail, subject, body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP email: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "OTP sent"})
}

// sendEmail gửi email qua SMTP Gmail
func sendEmail(fromEmail, password, toEmail, subject, body string) error {
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	msg := []byte("To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-version: 1.0;\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\";\r\n" +
		"\r\n" + body)

	auth := smtp.PlainAuth("", fromEmail, password, smtpHost)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
}
