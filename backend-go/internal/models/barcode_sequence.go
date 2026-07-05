package models

import (
	"time"
)

type BarcodeSequence struct {
	ID        string    `bson:"_id" json:"id"` // custom string as _id
	Value     int       `bson:"value" json:"value"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
