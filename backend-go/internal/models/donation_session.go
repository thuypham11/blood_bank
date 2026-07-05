package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type QueueItem struct {
	Donor       primitive.ObjectID `bson:"donor" json:"donor"`
	Appointment primitive.ObjectID `bson:"appointment,omitempty" json:"appointment,omitempty"`
	Status      string             `bson:"status" json:"status"` // waiting, called, donating, completed, skipped
	Position    int                `bson:"position" json:"position"`
	CalledAt    *time.Time         `bson:"calledAt,omitempty" json:"calledAt,omitempty"`
	StartedAt   *time.Time         `bson:"startedAt,omitempty" json:"startedAt,omitempty"`
	CompletedAt *time.Time         `bson:"completedAt,omitempty" json:"completedAt,omitempty"`
	Barcode     string             `bson:"barcode,omitempty" json:"barcode,omitempty"`
	Notes       string             `bson:"notes,omitempty" json:"notes,omitempty"`
}

type DonationSession struct {
	ID              primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	Camp            primitive.ObjectID  `bson:"camp" json:"camp"`
	Staff           *primitive.ObjectID `bson:"staff,omitempty" json:"staff,omitempty"`
	Date            time.Time           `bson:"date" json:"date"`
	Status          string              `bson:"status" json:"status"` // active, completed, cancelled
	Queue           []QueueItem         `bson:"queue" json:"queue"`
	CurrentServing  int                 `bson:"currentServing" json:"currentServing"`
	TotalDonors     int                 `bson:"totalDonors" json:"totalDonors"`
	CompletedDonors int                 `bson:"completedDonors" json:"completedDonors"`
	CreatedAt       time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time           `bson:"updatedAt" json:"updatedAt"`
}
