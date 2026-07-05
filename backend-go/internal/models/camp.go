package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type Camp struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Hospital    primitive.ObjectID `bson:"hospital" json:"hospital"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Location    struct {
		Address string `bson:"address" json:"address"`
		City    string `bson:"city" json:"city"`
		State   string `bson:"state" json:"state"`
	} `bson:"location" json:"location"`
	Date             time.Time `bson:"date" json:"date"`
	EndDate          time.Time `bson:"enddate" json:"enddate"`
	Capacity         int       `bson:"capacity" json:"capacity"`
	RegisteredDonors []struct {
		Donor        primitive.ObjectID `bson:"donor" json:"donor"`
		RegisteredAt time.Time          `bson:"registeredAt" json:"registeredAt"`
	} `bson:"registeredDonors" json:"registeredDonors"`
	Status    string    `bson:"status" json:"status"` // upcoming, completed, cancelled
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
