package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type HandoverTimeline struct {
	Status string              `bson:"status" json:"status"`
	Label  string              `bson:"label" json:"label"`
	Date   time.Time           `bson:"date" json:"date"`
	Actor  *primitive.ObjectID `bson:"actor,omitempty" json:"actor,omitempty"`
	Note   string              `bson:"note,omitempty" json:"note,omitempty"`
}

type BloodRequest struct {
	ID               primitive.ObjectID   `bson:"_id,omitempty" json:"id,omitempty"`
	HospitalID       primitive.ObjectID   `bson:"hospitalId" json:"hospitalId"`
	LabID            primitive.ObjectID   `bson:"labId" json:"labId"`
	BloodType        string               `bson:"bloodType" json:"bloodType"`
	Units            int                  `bson:"units" json:"units"`
	Status           string               `bson:"status" json:"status"`                 // pending, accepted, rejected, completed
	HandoverStatus   string               `bson:"handoverStatus" json:"handoverStatus"` // requested, received, preparing, packed, shipping, confirmed
	HandoverTimeline []HandoverTimeline   `bson:"handoverTimeline" json:"handoverTimeline"`
	ProcessedAt      *time.Time           `bson:"processedAt,omitempty" json:"processedAt,omitempty"`
	ProcessedBy      *primitive.ObjectID  `bson:"processedBy,omitempty" json:"processedBy,omitempty"`
	IssuedAt         *time.Time           `bson:"issuedAt,omitempty" json:"issuedAt,omitempty"`
	IssueCode        string               `bson:"issueCode,omitempty" json:"issueCode,omitempty"`
	FulfilledVolume  int                  `bson:"fulfilledVolume" json:"fulfilledVolume"`
	FulfilledUnits   int                  `bson:"fulfilledUnits" json:"fulfilledUnits"`
	FulfilledUnitIDs []primitive.ObjectID `bson:"fulfilledUnitIds" json:"fulfilledUnitIds"`
	ConfirmedAt      *time.Time           `bson:"confirmedAt,omitempty" json:"confirmedAt,omitempty"`
	RejectionReason  string               `bson:"rejectionReason,omitempty" json:"rejectionReason,omitempty"`
	Notes            string               `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt        time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time            `bson:"updatedAt" json:"updatedAt"`
}
