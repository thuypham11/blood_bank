package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type DonationAppointment struct {
	ID                 primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	Donor              primitive.ObjectID  `bson:"donor" json:"donor"`
	Camp               primitive.ObjectID  `bson:"camp" json:"camp"`
	AppointmentDate    time.Time           `bson:"appointmentDate" json:"appointmentDate"`
	AppointmentTime    string              `bson:"appointmentTime" json:"appointmentTime"`
	Status             string              `bson:"status" json:"status"` // pending, confirmed, checked_in, completed, cancelled
	QRCode             string              `bson:"qrCode,omitempty" json:"qrCode,omitempty"`
	CheckInTime        *time.Time          `bson:"checkInTime,omitempty" json:"checkInTime,omitempty"`
	Notes              string              `bson:"notes,omitempty" json:"notes,omitempty"`
	CancellationReason string              `bson:"cancellationReason,omitempty" json:"cancellationReason,omitempty"`
	QueueNumber        *int                `bson:"queueNumber,omitempty" json:"queueNumber,omitempty"`
	BedNumber          string              `bson:"bedNumber,omitempty" json:"bedNumber,omitempty"`
	CalledAt           *time.Time          `bson:"calledAt,omitempty" json:"calledAt,omitempty"`
	CalledStatus       string              `bson:"calledStatus" json:"calledStatus"` // pending, called, in_progress, completed
	CompletedAt        *time.Time          `bson:"completedAt,omitempty" json:"completedAt,omitempty"`
	CompletedBy        *primitive.ObjectID `bson:"completedBy,omitempty" json:"completedBy,omitempty"`
	CreatedAt          time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time           `bson:"updatedAt" json:"updatedAt"`
}
