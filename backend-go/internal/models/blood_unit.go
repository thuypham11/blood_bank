package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type BloodUnit struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Barcode         string             `bson:"barcode" json:"barcode"`
	Donor           primitive.ObjectID `bson:"donor" json:"donor"`
	DonationDate    time.Time          `bson:"donationDate" json:"donationDate"`
	BloodGroup      string             `bson:"bloodGroup" json:"bloodGroup"`
	ProductType     string             `bson:"productType" json:"productType"` // whole_blood, red_cells, platelets, plasma
	Quantity        int                `bson:"quantity" json:"quantity"`
	Status          string             `bson:"status" json:"status"`                   // quarantine, available, issued, expired, discarded
	ScreeningStatus string             `bson:"screeningStatus" json:"screeningStatus"` // pending, passed, failed
	Screening       struct {
		HIV        string              `bson:"hiv" json:"hiv"`
		HepatitisB string              `bson:"hepatitisB" json:"hepatitisB"`
		HepatitisC string              `bson:"hepatitisC" json:"hepatitisC"`
		Syphilis   string              `bson:"syphilis" json:"syphilis"`
		Malaria    string              `bson:"malaria" json:"malaria"`
		TestedAt   *time.Time          `bson:"testedAt,omitempty" json:"testedAt,omitempty"`
		TestedBy   *primitive.ObjectID `bson:"testedBy,omitempty" json:"testedBy,omitempty"`
	} `bson:"screening" json:"screening"`
	Facility   *primitive.ObjectID `bson:"facility,omitempty" json:"facility,omitempty"`
	QRCode     string              `bson:"qrCode,omitempty" json:"qrCode,omitempty"`
	ExpiryDate *time.Time          `bson:"expiryDate,omitempty" json:"expiryDate,omitempty"`
	CreatedAt  time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time           `bson:"updatedAt" json:"updatedAt"`
}
