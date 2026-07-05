package middlewares

import (
	"bloodbank-go/internal/config"
	"bloodbank-go/internal/database"
	"bloodbank-go/internal/models"
	//	"context"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"net/http"
	"strings"
)

func ProtectDonor() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "No token provided"})
			c.Abort()
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.LoadConfig().JWTSecret), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Lấy userID và role từ claims
		userID, ok := claims["id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid user ID"})
			c.Abort()
			return
		}
		role, ok := claims["role"].(string)
		if !ok || role != "donor" {
			c.JSON(http.StatusForbidden, gin.H{"message": "Not a donor"})
			c.Abort()
			return
		}

		// Tìm donor trong DB
		objID, err := primitive.ObjectIDFromHex(userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid user ID format"})
			c.Abort()
			return
		}
		var donor models.Donor
		collection := database.GetCollection("donors")
		err = collection.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&donor)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
			c.Abort()
			return
		}

		// Gán donor vào context
		c.Set("donor", donor)
		c.Set("donorID", objID)
		c.Next()
	}
}
