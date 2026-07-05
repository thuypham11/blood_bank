package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type LabTestResult struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Facility  primitive.ObjectID `bson:"facility" json:"facility"`
	BloodUnit primitive.ObjectID `bson:"bloodUnit" json:"bloodUnit"`
	Results   struct {
		HIV       string `bson:"hiv" json:"hiv"` // pending, negative, positive
		HBV       string `bson:"hbv" json:"hbv"`
		HCV       string `bson:"hcv" json:"hcv"`
		Hepatitis string `bson:"hepatitis" json:"hepatitis"`
		Syphilis  string `bson:"syphilis" json:"syphilis"`
	} `bson:"results" json:"results"`
	Status      string              `bson:"status" json:"status"` // draft, submitted, approved
	EnteredBy   primitive.ObjectID  `bson:"enteredBy" json:"enteredBy"`
	SubmittedBy *primitive.ObjectID `bson:"submittedBy,omitempty" json:"submittedBy,omitempty"`
	SubmittedAt *time.Time          `bson:"submittedAt,omitempty" json:"submittedAt,omitempty"`
	ApprovedBy  *primitive.ObjectID `bson:"approvedBy,omitempty" json:"approvedBy,omitempty"`
	ApprovedAt  *time.Time          `bson:"approvedAt,omitempty" json:"approvedAt,omitempty"`
	CreatedAt   time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time           `bson:"updatedAt" json:"updatedAt"`
}
