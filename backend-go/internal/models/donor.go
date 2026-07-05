package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type DonationHistory struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	DonationDate time.Time           `bson:"donationDate" json:"donationDate"`
	Facility     primitive.ObjectID  `bson:"facility" json:"facility"`
	BloodGroup   string              `bson:"bloodGroup" json:"bloodGroup"`
	Quantity     int                 `bson:"quantity" json:"quantity"`
	Remarks      string              `bson:"remarks,omitempty" json:"remarks,omitempty"`
	Verified     bool                `bson:"verified" json:"verified"`
	BloodUnitID  *primitive.ObjectID `bson:"bloodUnitId,omitempty" json:"bloodUnitId,omitempty"`
}

type IDCard struct {
	Number     string     `bson:"number,omitempty" json:"number,omitempty"`
	FullName   string     `bson:"fullName,omitempty" json:"fullName,omitempty"`
	BirthDate  *time.Time `bson:"birthDate,omitempty" json:"birthDate,omitempty"`
	Gender     string     `bson:"gender,omitempty" json:"gender,omitempty"`
	Home       string     `bson:"home,omitempty" json:"home,omitempty"`
	Address    string     `bson:"address,omitempty" json:"address,omitempty"`
	IssueDate  *time.Time `bson:"issueDate,omitempty" json:"issueDate,omitempty"`
	ExpiryDate *time.Time `bson:"expiryDate,omitempty" json:"expiryDate,omitempty"`
	ImageURL   string     `bson:"imageUrl,omitempty" json:"imageUrl,omitempty"`
	VerifiedAt *time.Time `bson:"verifiedAt,omitempty" json:"verifiedAt,omitempty"`
}

type PermanentAddress struct {
	Street  string `bson:"street,omitempty" json:"street,omitempty"`
	City    string `bson:"city,omitempty" json:"city,omitempty"`
	State   string `bson:"state,omitempty" json:"state,omitempty"`
	Pincode string `bson:"pincode,omitempty" json:"pincode,omitempty"`
}

type Donor struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	FullName string             `bson:"fullName" json:"fullName"`
	Email    string             `bson:"email" json:"email"`
	Password string             `bson:"password" json:"-"` // not returned
	Phone    string             `bson:"phone" json:"phone"`
	Role     string             `bson:"role" json:"role"` // donor
	Address  struct {
		Street  string `bson:"street" json:"street"`
		City    string `bson:"city" json:"city"`
		Ward    string `bson:"ward" json:"ward"`
		State   string `bson:"state" json:"state"`
		Pincode string `bson:"pincode" json:"pincode"`
	} `bson:"address" json:"address"`
	BloodGroup       string     `bson:"bloodGroup" json:"bloodGroup"`
	Age              int        `bson:"age" json:"age"`
	Gender           string     `bson:"gender" json:"gender"` // Male, Female
	Weight           float64    `bson:"weight" json:"weight"`
	LastDonationDate *time.Time `bson:"lastDonationDate,omitempty" json:"lastDonationDate,omitempty"`
	EligibleToDonate bool       `bson:"eligibleToDonate" json:"eligibleToDonate"`
	IDProof          struct {
		URL        string    `bson:"url,omitempty" json:"url,omitempty"`
		Filename   string    `bson:"filename,omitempty" json:"filename,omitempty"`
		UploadedAt time.Time `bson:"uploadedAt" json:"uploadedAt"`
	} `bson:"idProof,omitempty" json:"idProof,omitempty"`
	DonationHistory  []DonationHistory `bson:"donationHistory" json:"donationHistory"`
	BirthDate        *time.Time        `bson:"birthDate,omitempty" json:"birthDate,omitempty"`
	IDCard           IDCard            `bson:"idCard,omitempty" json:"idCard,omitempty"`
	PermanentAddress PermanentAddress  `bson:"permanentAddress,omitempty" json:"permanentAddress,omitempty"`
	IsIDVerified     bool              `bson:"isIdVerified" json:"isIdVerified"`
	LastLogin        *time.Time        `bson:"lastLogin,omitempty" json:"lastLogin,omitempty"`
	LoginAttempts    int               `bson:"loginAttempts" json:"loginAttempts"`
	LockUntil        *time.Time        `bson:"lockUntil,omitempty" json:"lockUntil,omitempty"`
	IsActive         bool              `bson:"isActive" json:"isActive"`
	CreatedAt        time.Time         `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time         `bson:"updatedAt" json:"updatedAt"`
}
