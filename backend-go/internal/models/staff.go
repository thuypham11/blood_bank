package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type Staff struct {
	ID        primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	Name      string              `bson:"name" json:"name"`
	Email     string              `bson:"email" json:"email"`
	Password  string              `bson:"password" json:"-"` // not returned
	Phone     string              `bson:"phone,omitempty" json:"phone,omitempty"`
	Facility  *primitive.ObjectID `bson:"facility,omitempty" json:"facility,omitempty"`
	Role      string              `bson:"role" json:"role"` // staff, manager
	IsActive  bool                `bson:"isActive" json:"isActive"`
	LastLogin *time.Time          `bson:"lastLogin,omitempty" json:"lastLogin,omitempty"`
	CreatedAt time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time           `bson:"updatedAt" json:"updatedAt"`
}
