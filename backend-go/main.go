// backend-go/main.go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
)

type InviteRequest struct {
	ToEmail    string `json:"toEmail"`
	DonorName  string `json:"donorName"`
	Message    string `json:"message"`
	InviteLink string `json:"inviteLink"` // link đăng ký, có thể kèm referral code
}

func sendInviteEmail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req InviteRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Println("JSON decode error:", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	log.Printf("Received invite request: to=%s, from=%s", req.ToEmail, req.DonorName)

	fromEmail := "phamthithuy2005.giaothuy@gmail.com"
	password := "igbhdnetgoaclheu"
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := "Lời mời hiến máu từ " + req.DonorName
	body := fmt.Sprintf(`
        <h2>Lời mời tham gia hiến máu</h2>
        <p>Bạn của bạn <strong>%s</strong> đã mời bạn tham gia hiến máu cứu người.</p>
        <p>Lời nhắn: %s</p>
        <p>Đăng ký ngay tại: <a href="%s">%s</a></p>
        <p>Rất mong sự tham gia của bạn!</p>
    `, req.DonorName, req.Message, req.InviteLink, req.InviteLink)

	msg := []byte("To: " + req.ToEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-version: 1.0;\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\";\r\n" +
		"\r\n" + body)

	auth := smtp.PlainAuth("", fromEmail, password, smtpHost)
	err = smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{req.ToEmail}, msg)
	if err != nil {
		log.Println("Send email error:", err)
		http.Error(w, "Failed to send email: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Println("Email sent successfully to", req.ToEmail)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Invitation sent"})

}

func main() {
	http.HandleFunc("/invite", sendInviteEmail)
	log.Println("Golang service running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
