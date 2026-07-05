package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type AuditLog struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Action      string             `bson:"action" json:"action"`
	PerformedBy struct {
		UserType string             `bson:"userType" json:"userType"`
		UserID   primitive.ObjectID `bson:"userId" json:"userId"`
		Name     string             `bson:"name,omitempty" json:"name,omitempty"`
	} `bson:"performedBy" json:"performedBy"`
	Target struct {
		TargetType string             `bson:"targetType" json:"targetType"`
		TargetID   primitive.ObjectID `bson:"targetId" json:"targetId"`
	} `bson:"target" json:"target"`
	Changes     interface{} `bson:"changes,omitempty" json:"changes,omitempty"`
	Description string      `bson:"description" json:"description"`
	IPAddress   string      `bson:"ipAddress,omitempty" json:"ipAddress,omitempty"`
	CreatedAt   time.Time   `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time   `bson:"updatedAt" json:"updatedAt"`
}
