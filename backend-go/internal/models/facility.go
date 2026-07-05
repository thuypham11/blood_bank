package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type HistoryItem struct {
	EventType   string    `bson:"eventType" json:"eventType"`
	Description string    `bson:"description" json:"description"`
	Date        time.Time `bson:"date" json:"date"`
}

type Facility struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name             string             `bson:"name" json:"name"`
	Email            string             `bson:"email" json:"email"`
	Password         string             `bson:"password" json:"-"` // not returned
	Phone            string             `bson:"phone" json:"phone"`
	EmergencyContact string             `bson:"emergencyContact" json:"emergencyContact"`
	Address          struct {
		Street  string `bson:"street" json:"street"`
		City    string `bson:"city" json:"city"`
		Ward    string `bson:"ward" json:"ward"`
		State   string `bson:"state" json:"state"`
		Pincode string `bson:"pincode" json:"pincode"`
	} `bson:"address" json:"address"`
	RegistrationNumber string              `bson:"registrationNumber" json:"registrationNumber"`
	FacilityType       string              `bson:"facilityType" json:"facilityType"` // hospital, blood-lab, donation_staff
	Role               string              `bson:"role" json:"role"`                 // hospital, blood-lab
	FacilityCategory   string              `bson:"facilityCategory" json:"facilityCategory"`
	AssignedCamp       *primitive.ObjectID `bson:"assignedCamp,omitempty" json:"assignedCamp,omitempty"`
	Documents          struct {
		RegistrationProof struct {
			URL        string    `bson:"url,omitempty" json:"url,omitempty"`
			Filename   string    `bson:"filename,omitempty" json:"filename,omitempty"`
			UploadedAt time.Time `bson:"uploadedAt" json:"uploadedAt"`
		} `bson:"registrationProof" json:"registrationProof"`
	} `bson:"documents" json:"documents"`
	Status          string              `bson:"status" json:"status"` // pending, approved, rejected
	ApprovedBy      *primitive.ObjectID `bson:"approvedBy,omitempty" json:"approvedBy,omitempty"`
	ApprovedAt      *time.Time          `bson:"approvedAt,omitempty" json:"approvedAt,omitempty"`
	RejectionReason string              `bson:"rejectionReason,omitempty" json:"rejectionReason,omitempty"`
	OperatingHours  struct {
		Open        string   `bson:"open" json:"open"`
		Close       string   `bson:"close" json:"close"`
		WorkingDays []string `bson:"workingDays" json:"workingDays"`
	} `bson:"operatingHours" json:"operatingHours"`
	Is24x7            bool          `bson:"is24x7" json:"is24x7"`
	EmergencyServices bool          `bson:"emergencyServices" json:"emergencyServices"`
	History           []HistoryItem `bson:"history" json:"history"`
	LastLogin         *time.Time    `bson:"lastLogin,omitempty" json:"lastLogin,omitempty"`
	LoginAttempts     int           `bson:"loginAttempts" json:"loginAttempts"`
	LockUntil         *time.Time    `bson:"lockUntil,omitempty" json:"lockUntil,omitempty"`
	IsActive          bool          `bson:"isActive" json:"isActive"`
	CreatedAt         time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time     `bson:"updatedAt" json:"updatedAt"`
}
