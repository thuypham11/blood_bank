package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type BloodCamp struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Hospital    primitive.ObjectID `bson:"hospital" json:"hospital"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Date        time.Time          `bson:"date" json:"date"`
	Time        struct {
		Start string `bson:"start" json:"start"`
		End   string `bson:"end" json:"end"`
	} `bson:"time" json:"time"`
	Location struct {
		Venue   string `bson:"venue" json:"venue"`
		Address string `bson:"address,omitempty" json:"address,omitempty"`
		Ward    string `bson:"ward,omitempty" json:"ward,omitempty"`
		City    string `bson:"city" json:"city"`
		State   string `bson:"state,omitempty" json:"state,omitempty"`
		Coords  struct {
			Lat float64 `bson:"lat" json:"lat"`
			Lng float64 `bson:"lng" json:"lng"`
		} `bson:"coordinates" json:"coordinates"`
	} `bson:"location" json:"location"`
	Organizer      string    `bson:"organizer,omitempty" json:"organizer,omitempty"`
	ExpectedDonors int       `bson:"expectedDonors" json:"expectedDonors"`
	ActualDonors   int       `bson:"actualDonors" json:"actualDonors"`
	Status         string    `bson:"status" json:"status"` // Upcoming, Ongoing, Completed, Cancelled
	CreatedAt      time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time `bson:"updatedAt" json:"updatedAt"`
}
