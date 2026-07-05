package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

var LabStaffPermissions = []string{
	"view_samples",
	"receive_samples",
	"enter_results",
	"submit_results",
	"approve_results",
	"view_basic_reports",
}

type LabStaff struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Facility     primitive.ObjectID `bson:"facility" json:"facility"`
	EmployeeCode string             `bson:"employeeCode" json:"employeeCode"`
	FullName     string             `bson:"fullName" json:"fullName"`
	Email        string             `bson:"email" json:"email"`
	Phone        string             `bson:"phone" json:"phone"`
	Password     string             `bson:"password" json:"-"` // not returned
	Permissions  []string           `bson:"permissions" json:"permissions"`
	IsActive     bool               `bson:"isActive" json:"isActive"`
	LastLogin    *time.Time         `bson:"lastLogin,omitempty" json:"lastLogin,omitempty"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}
