package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type Admin struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name        string             `bson:"name" json:"name"`
	Email       string             `bson:"email" json:"email"`
	Password    string             `bson:"password" json:"-"` // not returned
	Role        string             `bson:"role" json:"role"`  // admin, superadmin
	Department  string             `bson:"department" json:"department"`
	Permissions []string           `bson:"permissions" json:"permissions"`
	LastLogin   *time.Time         `bson:"lastLogin,omitempty" json:"lastLogin,omitempty"`
	IsActive    bool               `bson:"isActive" json:"isActive"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}
