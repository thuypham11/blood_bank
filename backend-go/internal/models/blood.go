package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type ScreeningResult struct {
	HIV       string `bson:"hiv" json:"hiv"` // pending, negative, positive
	HBV       string `bson:"hbv" json:"hbv"`
	HCV       string `bson:"hcv" json:"hcv"`
	Hepatitis string `bson:"hepatitis" json:"hepatitis"`
	Syphilis  string `bson:"syphilis" json:"syphilis"`
}

type Blood struct {
	ID              primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	UnitCode        string              `bson:"unitCode,omitempty" json:"unitCode,omitempty"`
	Barcode         string              `bson:"barcode,omitempty" json:"barcode,omitempty"`
	BloodType       string              `bson:"bloodType,omitempty" json:"bloodType,omitempty"`
	BloodGroup      string              `bson:"bloodGroup,omitempty" json:"bloodGroup,omitempty"`
	Quantity        int                 `bson:"quantity" json:"quantity"`
	CollectionDate  time.Time           `bson:"collectionDate" json:"collectionDate"`
	ExpiryDate      *time.Time          `bson:"expiryDate,omitempty" json:"expiryDate,omitempty"`
	ExpirationDate  *time.Time          `bson:"expirationDate,omitempty" json:"expirationDate,omitempty"`
	BloodLab        *primitive.ObjectID `bson:"bloodLab,omitempty" json:"bloodLab,omitempty"`
	Hospital        *primitive.ObjectID `bson:"hospital,omitempty" json:"hospital,omitempty"`
	ComponentType   string              `bson:"componentType" json:"componentType"` // whole_blood, red_cells, platelets, plasma
	ParentUnit      *primitive.ObjectID `bson:"parentUnit,omitempty" json:"parentUnit,omitempty"`
	ParentBarcode   string              `bson:"parentBarcode,omitempty" json:"parentBarcode,omitempty"`
	SplitAt         *time.Time          `bson:"splitAt,omitempty" json:"splitAt,omitempty"`
	ScreeningResult ScreeningResult     `bson:"screeningResult" json:"screeningResult"`
	Status          string              `bson:"status" json:"status"` // pending_screening, qualified, available, etc.
	IssuedTo        string              `bson:"issuedTo,omitempty" json:"issuedTo,omitempty"`
	IssuedToName    string              `bson:"issuedToName,omitempty" json:"issuedToName,omitempty"`
	IssueReason     string              `bson:"issueReason,omitempty" json:"issueReason,omitempty"`
	IssueCode       string              `bson:"issueCode,omitempty" json:"issueCode,omitempty"`
	IssueRequestID  *primitive.ObjectID `bson:"issueRequestId,omitempty" json:"issueRequestId,omitempty"`
	IssuedAt        *time.Time          `bson:"issuedAt,omitempty" json:"issuedAt,omitempty"`
	CreatedAt       time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time           `bson:"updatedAt" json:"updatedAt"`
}
