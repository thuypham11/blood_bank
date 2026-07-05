package config

import (
	"github.com/joho/godotenv"
	"log"
	"os"
)

type Config struct {
	Port         string
	MongoURI     string
	JWTSecret    string
	EmailUser    string
	EmailPass    string
	FPTAPIKey    string
	GoServiceURL string // Golang service URL cho email
}

func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file, using system env")
	}
	return &Config{
		Port:         getEnv("PORT", "8080"),
		MongoURI:     getEnv("MONGO_URI", "mongodb://localhost:27017/bloodbank"),
		JWTSecret:    getEnv("JWT_SECRET", "your-secret-key"),
		EmailUser:    getEnv("EMAIL_USER", "phamthithuy2005.giaothuy@gmail.com"),
		EmailPass:    getEnv("EMAIL_PASS", "ebny otoh cmdm qvky"),
		FPTAPIKey:    getEnv("FPT_API_KEY", ""),
		GoServiceURL: getEnv("GO_SERVICE_URL", "http://localhost:8081"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
