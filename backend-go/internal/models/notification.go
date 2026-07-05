package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type Notification struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Recipient struct {
		UserType string              `bson:"userType" json:"userType"` // Admin, Facility, Donor
		UserID   *primitive.ObjectID `bson:"userId,omitempty" json:"userId,omitempty"`
	} `bson:"recipient" json:"recipient"`
	Title         string `bson:"title" json:"title"`
	Message       string `bson:"message" json:"message"`
	Type          string `bson:"type" json:"type"` // info, warning, success, error, urgent, reminder, blood_request, blood_expiring, system
	IsRead        bool   `bson:"isRead" json:"isRead"`
	ActionURL     string `bson:"actionUrl,omitempty" json:"actionUrl,omitempty"`
	RelatedEntity struct {
		EntityType string              `bson:"entityType,omitempty" json:"entityType,omitempty"`
		EntityID   *primitive.ObjectID `bson:"entityId,omitempty" json:"entityId,omitempty"`
	} `bson:"relatedEntity,omitempty" json:"relatedEntity,omitempty"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
