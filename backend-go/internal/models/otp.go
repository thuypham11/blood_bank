package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type OTP struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	DonorID   primitive.ObjectID `bson:"donorId" json:"donorId"`
	Code      string             `bson:"code" json:"code"`
	ExpiresAt time.Time          `bson:"expiresAt" json:"expiresAt"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}
