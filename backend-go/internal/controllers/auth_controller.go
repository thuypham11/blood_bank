package controllers

import (
	"bloodbank-go/internal/config"
	"bloodbank-go/internal/database"
	"bloodbank-go/internal/models"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"time"
)

func Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("❌ Login binding error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
		return
	}

	// Tìm donor
	collection := database.GetCollection("donors")
	var donor models.Donor
	err := collection.FindOne(c.Request.Context(), bson.M{"email": req.Email}).Decode(&donor)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	// So sánh password
	if err := bcrypt.CompareHashAndPassword([]byte(donor.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
		return
	}

	// Tạo token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":   donor.ID.Hex(),
		"role": "donor",
		"exp":  time.Now().Add(time.Hour * 24 * 7).Unix(),
	})
	tokenString, err := token.SignedString([]byte(config.LoadConfig().JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"token":   tokenString,
		"user": gin.H{
			"id":    donor.ID.Hex(),
			"email": donor.Email,
			"role":  "donor",
		},
		"redirect": "/donor",
	})
}

func Register(c *gin.Context) {
	// Tương tự như Node.js
	c.JSON(http.StatusOK, gin.H{"message": "Register endpoint"})
}

func GetProfile(c *gin.Context) {
	// Sử dụng donor từ middleware
	donor, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	d := donor.(models.Donor)
	d.Password = ""
	c.JSON(http.StatusOK, gin.H{"user": d})
}
