package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type HealthDeclaration struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Donor       primitive.ObjectID `bson:"donor" json:"donor"`
	Appointment primitive.ObjectID `bson:"appointment" json:"appointment"`
	QRCode      string             `bson:"qrCode,omitempty" json:"qrCode,omitempty"`
	Answers     struct {
		UsedStimulants bool `bson:"usedStimulants" json:"usedStimulants"`
		UsedCannabis   bool `bson:"usedCannabis" json:"usedCannabis"`
		UsedCocaine    bool `bson:"usedCocaine" json:"usedCocaine"`
		UsedHeroin     bool `bson:"usedHeroin" json:"usedHeroin"`
		UsedCorticoids bool `bson:"usedCorticoids" json:"usedCorticoids"`
		HasFever       bool `bson:"hasFever" json:"hasFever"`
		HasCough       bool `bson:"hasCough" json:"hasCough"`
		HasInfection   bool `bson:"hasInfection" json:"hasInfection"`
		HasSkinDisease bool `bson:"hasSkinDisease" json:"hasSkinDisease"`
		HasAllergy     bool `bson:"hasAllergy" json:"hasAllergy"`
	} `bson:"answers" json:"answers"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	ExpiresAt time.Time `bson:"expiresAt" json:"expiresAt"`
}
