package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type User struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name       string             `bson:"name" json:"name"`
	Email      string             `bson:"email" json:"email"`
	Password   string             `bson:"password" json:"-"` // not returned
	Role       string             `bson:"role" json:"role"`  // donor, hospital, admin
	Phone      string             `bson:"phone,omitempty" json:"phone,omitempty"`
	Address    string             `bson:"address,omitempty" json:"address,omitempty"`
	BloodType  string             `bson:"bloodType,omitempty" json:"bloodType,omitempty"`
	HealthInfo struct {
		Weight         float64 `bson:"weight,omitempty" json:"weight,omitempty"`
		Height         float64 `bson:"height,omitempty" json:"height,omitempty"`
		HasDiseases    bool    `bson:"hasDiseases" json:"hasDiseases"`
		DiseaseDetails string  `bson:"diseaseDetails,omitempty" json:"diseaseDetails,omitempty"`
	} `bson:"healthInfo,omitempty" json:"healthInfo,omitempty"`
	HospitalInfo struct {
		LicenseNumber    string `bson:"licenseNumber,omitempty" json:"licenseNumber,omitempty"`
		EmergencyContact string `bson:"emergencyContact,omitempty" json:"emergencyContact,omitempty"`
	} `bson:"hospitalInfo,omitempty" json:"hospitalInfo,omitempty"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
