package routes

import (
	"bloodbank-go/internal/controllers"
	"bloodbank-go/internal/middlewares"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"time"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// CORS using gin-contrib/cors
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	// ─── EMAIL ROUTES (gọi từ Node.js) ────────────────────────────
	r.POST("/invite", controllers.SendInviteEmail)
	r.POST("/send-otp", controllers.SendOtpEmail)
	// Auth routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/login", controllers.Login)
		auth.POST("/register", controllers.Register)
		auth.GET("/profile", middlewares.ProtectDonor(), controllers.GetProfile)
	}

	// Donor routes
	donor := r.Group("/api/donor")
	donor.Use(middlewares.ProtectDonor())
	{
		donor.POST("/check-appointment", controllers.CheckAppointment)
		donor.GET("/profile", controllers.GetDonorProfile)
		donor.PUT("/profile", controllers.UpdateDonorProfile)
		donor.GET("/stats", controllers.GetDonorStats)
		donor.GET("/history", controllers.GetDonorHistory)
		donor.GET("/test-results", controllers.GetDonorTestResults)
		donor.GET("/reminders", controllers.GetDonorReminders)
		donor.GET("/certificate/:donationId", controllers.GetDonationCertificate)
		donor.GET("/urgent-requests", controllers.GetUrgentBloodRequests)
		donor.GET("/camps", controllers.GetDonorCamps)
		donor.POST("/upload-id-card", controllers.UploadIdCard)
		donor.POST("/verify-id-card", controllers.VerifyAndSaveIdCard)
		donor.POST("/send-otp", controllers.SendOtp)
		donor.POST("/verify-otp", controllers.VerifyOtp)
		donor.POST("/check-location", controllers.CheckLocation)
		donor.POST("/health-declaration", controllers.SubmitHealthDeclaration)
		donor.POST("/invite", controllers.InviteFriend)
	}

	// Public routes
	r.GET("/api/donor/public/test-results/:email", controllers.GetPublicTestResults)

	return r
}
