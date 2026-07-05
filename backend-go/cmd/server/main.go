package main

import (
	"bloodbank-go/internal/config"
	"bloodbank-go/internal/database"
	"bloodbank-go/internal/routes"
	"log"
)

func main() {
	cfg := config.LoadConfig()
	database.Connect(cfg.MongoURI)
	r := routes.SetupRouter()
	log.Printf("🚀 Golang donor backend running on port %s", cfg.Port)
	r.Run(":" + cfg.Port)
}
