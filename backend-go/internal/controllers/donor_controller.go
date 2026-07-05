package controllers

import (
	"fmt"

	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"bloodbank-go/internal/database"
	"bloodbank-go/internal/models"
)

// ==================== GET DONOR PROFILE ====================
func GetDonorProfile(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid donor data"})
		return
	}

	// Populate donationHistory.facility (fetch facility names)
	facilityIDs := []primitive.ObjectID{}
	for _, dh := range donor.DonationHistory {
		if dh.Facility != primitive.NilObjectID {
			facilityIDs = append(facilityIDs, dh.Facility)
		}
	}

	facilityMap := make(map[primitive.ObjectID]models.Facility)
	if len(facilityIDs) > 0 {
		var facilities []models.Facility
		collection := database.DB.Collection("facilities")
		cursor, err := collection.Find(c.Request.Context(), bson.M{"_id": bson.M{"$in": facilityIDs}})
		if err == nil {
			cursor.All(c.Request.Context(), &facilities)
			for _, f := range facilities {
				facilityMap[f.ID] = f
			}
		}
	}

	// Build profile
	profile := gin.H{
		"_id":              donor.ID,
		"fullName":         donor.FullName,
		"email":            donor.Email,
		"phone":            donor.Phone,
		"bloodGroup":       donor.BloodGroup,
		"age":              donor.Age,
		"gender":           donor.Gender,
		"weight":           donor.Weight,
		"address":          donor.Address,
		"totalDonations":   len(donor.DonationHistory),
		"lastDonationDate": donor.LastDonationDate,
		"eligibleToDonate": donor.EligibleToDonate,
		"birthDate":        donor.BirthDate,
		"isIdVerified":     donor.IsIDVerified,
		"idCard":           donor.IDCard,
		"permanentAddress": donor.PermanentAddress,
		"createdAt":        donor.CreatedAt,
		"updatedAt":        donor.UpdatedAt,
	}

	if donor.LastDonationDate != nil {
		next := donor.LastDonationDate.AddDate(0, 0, 90)
		profile["nextEligibleDate"] = next
	} else {
		profile["nextEligibleDate"] = nil
	}

	// Donation history with facility name
	history := []gin.H{}
	for _, dh := range donor.DonationHistory {
		facilityName := "N/A"
		if f, ok := facilityMap[dh.Facility]; ok {
			facilityName = f.Name
		}
		history = append(history, gin.H{
			"id":           dh.ID,
			"donationDate": dh.DonationDate,
			"facility":     facilityName,
			"city":         "",
			"state":        "",
			"bloodGroup":   dh.BloodGroup,
			"quantity":     dh.Quantity,
			"remarks":      dh.Remarks,
			"verified":     dh.Verified,
		})
	}
	profile["donationHistory"] = history

	c.JSON(http.StatusOK, gin.H{"donor": profile})
}

// ==================== UPDATE DONOR PROFILE ====================
func UpdateDonorProfile(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid donor data"})
		return
	}

	var req struct {
		FullName string `json:"fullName"`
		Phone    string `json:"phone"`
		Address  struct {
			Street  string `json:"street"`
			City    string `json:"city"`
			State   string `json:"state"`
			Pincode string `json:"pincode"`
		} `json:"address"`
		Age      int     `json:"age"`
		Gender   string  `json:"gender"`
		Weight   float64 `json:"weight"`
		Password string  `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
		return
	}

	update := bson.M{}
	if req.FullName != "" {
		update["fullName"] = req.FullName
	}
	if req.Phone != "" {
		update["phone"] = req.Phone
	}
	if req.Address.Street != "" || req.Address.City != "" || req.Address.State != "" {
		update["address"] = req.Address
	}
	if req.Age > 0 {
		update["age"] = req.Age
	}
	if req.Gender != "" {
		update["gender"] = req.Gender
	}
	if req.Weight > 0 {
		update["weight"] = req.Weight
	}
	if req.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to hash password"})
			return
		}
		update["password"] = string(hashed)
	}
	update["updatedAt"] = time.Now()

	collection := database.DB.Collection("donors")
	_, err := collection.UpdateOne(
		c.Request.Context(),
		bson.M{"_id": donor.ID},
		bson.M{"$set": update},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update donor"})
		return
	}

	// Fetch updated donor
	var updatedDonor models.Donor
	collection.FindOne(c.Request.Context(), bson.M{"_id": donor.ID}).Decode(&updatedDonor)

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"donor": gin.H{
			"fullName": updatedDonor.FullName,
			"email":    updatedDonor.Email,
			"phone":    updatedDonor.Phone,
			"address":  updatedDonor.Address,
			"age":      updatedDonor.Age,
			"gender":   updatedDonor.Gender,
			"weight":   updatedDonor.Weight,
		},
	})
}

// ==================== UPLOAD ID CARD ====================
func UploadIdCard(c *gin.Context) {
	// In production, handle file upload + OCR
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"number":     "012345678901",
			"fullName":   "NGUYEN VAN A",
			"birthDate":  "1990-01-01",
			"gender":     "Nam",
			"home":       "Hanoi",
			"address":    "123 Street",
			"issueDate":  "2020-01-01",
			"expiryDate": "2030-01-01",
		},
		"message": "Đã trích xuất thông tin. Vui lòng kiểm tra lại.",
	})
}

// ==================== VERIFY AND SAVE ID CARD ====================
func VerifyAndSaveIdCard(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Invalid donor data"})
		return
	}

	var req struct {
		IDCardData struct {
			Number     string `json:"number"`
			FullName   string `json:"fullName"`
			BirthDate  string `json:"birthDate"`
			Gender     string `json:"gender"`
			Home       string `json:"home"`
			Address    string `json:"address"`
			IssueDate  string `json:"issueDate"`
			ExpiryDate string `json:"expiryDate"`
		} `json:"idCardData"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request"})
		return
	}
	if req.IDCardData.Number == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Thiếu thông tin CCCD"})
		return
	}

	// Check duplicate
	collection := database.DB.Collection("donors")
	var existing models.Donor
	err := collection.FindOne(c.Request.Context(), bson.M{
		"idCard.number": req.IDCardData.Number,
		"_id":           bson.M{"$ne": donor.ID},
	}).Decode(&existing)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Số CCCD này đã được đăng ký bởi người khác"})
		return
	}

	// Parse dates
	parseDate := func(s string) *time.Time {
		if s == "" {
			return nil
		}
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil
		}
		return &t
	}

	gender := req.IDCardData.Gender
	if gender == "Nam" {
		gender = "Male"
	} else if gender == "Nữ" {
		gender = "Female"
	}

	update := bson.M{
		"fullName":  req.IDCardData.FullName,
		"gender":    gender,
		"birthDate": parseDate(req.IDCardData.BirthDate),
		"permanentAddress": models.PermanentAddress{
			Street:  req.IDCardData.Address,
			City:    "",
			State:   "",
			Pincode: "",
		},
		"idCard": models.IDCard{
			Number:     req.IDCardData.Number,
			FullName:   req.IDCardData.FullName,
			BirthDate:  parseDate(req.IDCardData.BirthDate),
			Gender:     req.IDCardData.Gender,
			Home:       req.IDCardData.Home,
			Address:    req.IDCardData.Address,
			IssueDate:  parseDate(req.IDCardData.IssueDate),
			ExpiryDate: parseDate(req.IDCardData.ExpiryDate),
			VerifiedAt: nil,
		},
		"isIdVerified": true,
		"updatedAt":    time.Now(),
	}

	_, err = collection.UpdateOne(
		c.Request.Context(),
		bson.M{"_id": donor.ID},
		bson.M{"$set": update},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Lỗi lưu thông tin CCCD"})
		return
	}

	// Fetch updated donor
	var updatedDonor models.Donor
	collection.FindOne(c.Request.Context(), bson.M{"_id": donor.ID}).Decode(&updatedDonor)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xác thực CCCD thành công!",
		"donor":   updatedDonor,
	})
}

// ==================== BLOOD CAMPS ====================
func GetDonorCamps(c *gin.Context) {
	// Luôn lọc với status = "Ongoing"
	filter := bson.M{"status": "Ongoing"}

	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	skip, _ := strconv.ParseInt(page, 10, 64)
	lim, _ := strconv.ParseInt(limit, 10, 64)
	skip = (skip - 1) * lim

	collection := database.DB.Collection("bloodcamps")
	cursor, err := collection.Find(c.Request.Context(), filter, options.Find().
		SetSort(bson.D{{Key: "date", Value: 1}}).
		SetSkip(skip).
		SetLimit(lim))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch blood camps"})
		return
	}
	var camps []models.BloodCamp
	if err = cursor.All(c.Request.Context(), &camps); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to decode camps"})
		return
	}

	total, _ := collection.CountDocuments(c.Request.Context(), filter)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"camps": camps,
			"pagination": gin.H{
				"total":       total,
				"currentPage": page,
				"totalPages":  (total + lim - 1) / lim,
			},
		},
	})
}

// ==================== TEST RESULTS ====================
func GetDonorTestResults(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid donor data"})
		return
	}

	// ✅ KHỞI TẠO MẢNG RỖNG
	results := []gin.H{}

	for _, dh := range donor.DonationHistory {
		if dh.BloodUnitID == nil || *dh.BloodUnitID == primitive.NilObjectID {
			continue
		}
		var bloodUnit models.BloodUnit
		collection := database.DB.Collection("bloodunits")
		err := collection.FindOne(c.Request.Context(), bson.M{"_id": *dh.BloodUnitID}).Decode(&bloodUnit)
		if err != nil {
			// Nếu không tìm thấy bloodUnit, vẫn tiếp tục
			continue
		}
		results = append(results, gin.H{
			"donationDate":    dh.DonationDate,
			"bloodGroup":      dh.BloodGroup,
			"barcode":         bloodUnit.Barcode,
			"productType":     bloodUnit.ProductType,
			"screeningStatus": bloodUnit.ScreeningStatus,
			"screening":       bloodUnit.Screening,
		})
	}

	// ✅ LUÔN TRẢ VỀ MẢNG (có thể rỗng)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

// ==================== REMINDERS ====================
func GetDonorReminders(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid donor data"})
		return
	}

	reminders := []gin.H{}
	today := time.Now()
	if donor.LastDonationDate != nil {
		nextEligible := donor.LastDonationDate.AddDate(0, 0, 90)
		daysLeft := int(nextEligible.Sub(today).Hours() / 24)
		if daysLeft <= 0 {
			reminders = append(reminders, gin.H{
				"type":     "ELIGIBLE",
				"message":  "Bạn đã sẵn sàng hiến máu lại!",
				"priority": "high",
			})
		} else if daysLeft <= 30 {
			reminders = append(reminders, gin.H{
				"type":     "UPCOMING",
				"message":  fmt.Sprintf("Bạn có thể hiến máu sau %d ngày nữa.", daysLeft),
				"priority": "medium",
			})
		}
	} else {
		reminders = append(reminders, gin.H{
			"type":     "FIRST_TIME",
			"message":  "Hãy đăng ký hiến máu lần đầu tiên!",
			"priority": "high",
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "reminders": reminders})
}

// ==================== CERTIFICATE ====================
func GetDonationCertificate(c *gin.Context) {
	donationID := c.Param("donationId")
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid donor data"})
		return
	}

	objID, err := primitive.ObjectIDFromHex(donationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid donation ID"})
		return
	}

	var donation models.DonationHistory
	found := false
	for _, dh := range donor.DonationHistory {
		if dh.ID == objID {
			donation = dh
			found = true
			break
		}
	}
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "Donation not found"})
		return
	}

	// Fetch facility name
	var facility models.Facility
	if donation.Facility != primitive.NilObjectID {
		collection := database.DB.Collection("facilities")
		collection.FindOne(c.Request.Context(), bson.M{"_id": donation.Facility}).Decode(&facility)
	}

	facilityName := "Điểm hiến máu"
	if facility.Name != "" {
		facilityName = facility.Name
	}

	certificate := gin.H{
		"donorName":         donor.FullName,
		"bloodGroup":        donation.BloodGroup,
		"donationDate":      donation.DonationDate,
		"quantity":          donation.Quantity,
		"facilityName":      facilityName,
		"certificateNumber": fmt.Sprintf("CERT-%s", donationID[len(donationID)-8:]),
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "certificate": certificate})
}

// ==================== URGENT REQUESTS ====================
func GetUrgentBloodRequests(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid donor data"})
		return
	}

	collection := database.DB.Collection("bloodrequests")
	filter := bson.M{
		"bloodType": donor.BloodGroup,
		"status":    "pending",
		"createdAt": bson.M{"$gte": time.Now().Add(-48 * time.Hour)},
	}
	cursor, err := collection.Find(c.Request.Context(), filter, options.Find().SetLimit(5))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch urgent requests"})
		return
	}
	var requests []models.BloodRequest
	cursor.All(c.Request.Context(), &requests)

	// Populate hospital name
	for i, req := range requests {
		if req.HospitalID != primitive.NilObjectID {
			var facility models.Facility
			collectionFac := database.DB.Collection("facilities")
			collectionFac.FindOne(c.Request.Context(), bson.M{"_id": req.HospitalID}).Decode(&facility)
			// We cannot assign directly, but we'll add a field in response
			requests[i].Notes = facility.Name // temporary hack
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "urgentRequests": requests})
}

// ==================== STATS ====================
func GetDonorStats(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized: Donor ID missing from request."})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Invalid donor data"})
		return
	}

	collection := database.DB.Collection("donors")
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": donor.ID}}},
		{{Key: "$project", Value: bson.M{
			"totalDonations":   bson.M{"$size": "$donationHistory"},
			"lastDonationDate": bson.M{"$max": "$donationHistory.donationDate"},
			"weight":           1,
			"age":              1,
		}}},
	}
	cursor, err := collection.Aggregate(c.Request.Context(), pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch donor statistics."})
		return
	}
	var results []gin.H
	if err = cursor.All(c.Request.Context(), &results); err != nil || len(results) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Donor profile not found."})
		return
	}
	stats := results[0]

	totalDonations, _ := stats["totalDonations"].(int)
	lastDonationDate, _ := stats["lastDonationDate"].(time.Time)
	weight, _ := stats["weight"].(float64)
	age, _ := stats["age"].(int)

	eligibilityStatus := "Eligible"
	var nextEligibleDonationDate interface{} = nil
	if !lastDonationDate.IsZero() {
		next := lastDonationDate.AddDate(0, 0, 90)
		nextEligibleDonationDate = next
		if next.After(time.Now()) {
			remainingDays := int(next.Sub(time.Now()).Hours() / 24)
			eligibilityStatus = fmt.Sprintf("Ineligible (Cooldown: %d days remaining)", remainingDays)
		}
	}
	if age < 18 || age > 65 {
		eligibilityStatus = "Ineligible (Age constraint)"
	} else if weight < 45 {
		eligibilityStatus = "Ineligible (Weight constraint)"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"dashboard": gin.H{
			"totalDonations":           totalDonations,
			"lastDonationDate":         lastDonationDate,
			"nextEligibleDonationDate": nextEligibleDonationDate,
			"eligibilityStatus":        eligibilityStatus,
		},
	})
}

// ==================== DONATION HISTORY (PAGINATED) ====================
func GetDonorHistory(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized: Donor ID missing from request."})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Invalid donor data"})
		return
	}

	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")
	skip, _ := strconv.ParseInt(page, 10, 64)
	lim, _ := strconv.ParseInt(limit, 10, 64)
	skip = (skip - 1) * lim

	collection := database.DB.Collection("donors")
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": donor.ID}}},
		{{Key: "$addFields", Value: bson.M{"totalHistoryLength": bson.M{"$size": "$donationHistory"}}}},
		{{Key: "$unwind", Value: "$donationHistory"}},
		{{Key: "$sort", Value: bson.M{"donationHistory.donationDate": -1}}},
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: lim}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "facilities",
			"localField":   "donationHistory.facility",
			"foreignField": "_id",
			"as":           "facilityDetails",
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":      0,
			"donation": "$donationHistory",
			"total":    "$totalHistoryLength",
			"facility": bson.M{"$arrayElemAt": []interface{}{"$facilityDetails", 0}},
		}}},
	}
	cursor, err := collection.Aggregate(c.Request.Context(), pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch donation history."})
		return
	}
	var results []gin.H
	cursor.All(c.Request.Context(), &results)

	total := 0
	if len(results) > 0 {
		if t, ok := results[0]["total"].(int); ok {
			total = t
		}
	}

	history := []gin.H{}
	for _, item := range results {
		donation, _ := item["donation"].(bson.M)
		facility, _ := item["facility"].(bson.M)
		facilityName := "N/A"
		if fname, ok := facility["name"].(string); ok {
			facilityName = fname
		}
		city := ""
		state := ""
		if addr, ok := facility["address"].(bson.M); ok {
			if c, ok := addr["city"].(string); ok {
				city = c
			}
			if s, ok := addr["state"].(string); ok {
				state = s
			}
		}
		history = append(history, gin.H{
			"id":           donation["_id"],
			"donationDate": donation["donationDate"],
			"bloodGroup":   donation["bloodGroup"],
			"quantity":     donation["quantity"],
			"remarks":      donation["remarks"],
			"verified":     donation["verified"],
			"facility":     facilityName,
			"city":         city,
			"state":        state,
		})
	}

	totalPages := (total + int(lim) - 1) / int(lim)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"history": history,
		"pagination": gin.H{
			"total":       total,
			"currentPage": page,
			"totalPages":  totalPages,
		},
	})
}

// ==================== SEND OTP ====================
func SendOtp(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Invalid donor data"})
		return
	}

	// Delete old OTPs
	collection := database.DB.Collection("otps")
	collection.DeleteMany(c.Request.Context(), bson.M{"donorId": donor.ID})

	// Generate OTP
	otpCode := fmt.Sprintf("%06d", rand.Intn(900000)+100000)
	expiresAt := time.Now().Add(5 * time.Minute)

	_, err := collection.InsertOne(c.Request.Context(), bson.M{
		"donorId":   donor.ID,
		"code":      otpCode,
		"expiresAt": expiresAt,
		"createdAt": time.Now(),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to save OTP"})
		return
	}

	// In production, send email via external service.
	// For now, just log.
	fmt.Printf("OTP for %s: %s\n", donor.Email, otpCode)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Mã OTP đã được gửi đến email của bạn"})
}

// ==================== VERIFY OTP ====================
func VerifyOtp(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Invalid donor data"})
		return
	}

	var req struct {
		OtpCode string `json:"otpCode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request"})
		return
	}

	collection := database.DB.Collection("otps")
	var otpRecord struct {
		Code      string    `bson:"code"`
		ExpiresAt time.Time `bson:"expiresAt"`
	}
	err := collection.FindOne(c.Request.Context(), bson.M{
		"donorId": donor.ID,
		"code":    req.OtpCode,
	}).Decode(&otpRecord)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Mã OTP không hợp lệ"})
		return
	}
	if otpRecord.ExpiresAt.Before(time.Now()) {
		collection.DeleteOne(c.Request.Context(), bson.M{"donorId": donor.ID, "code": req.OtpCode})
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Mã OTP đã hết hạn"})
		return
	}

	// Delete OTP after verification
	collection.DeleteOne(c.Request.Context(), bson.M{"donorId": donor.ID, "code": req.OtpCode})

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Xác thực thành công"})
}

// ==================== CHECK LOCATION (simplified) ====================
func CheckLocation(c *gin.Context) {
	// In real implementation, you'd validate appointment and location.
	// For now, always return success.
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã đến đúng địa điểm, có thể khai báo y tế"})
}

// ==================== SUBMIT HEALTH DECLARATION (placeholder) ====================
func SubmitHealthDeclaration(c *gin.Context) {
	// Implement similar to Node.js
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Khai báo y tế thành công"})
}

// ==================== INVITE FRIEND ====================
func InviteFriend(c *gin.Context) {
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid donor data"})
		return
	}

	var req struct {
		ToEmail string `json:"toEmail" binding:"required"`
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
		return
	}

	// In production, send email invitation.
	fmt.Printf("Donor %s invited %s with message: %s\n", donor.FullName, req.ToEmail, req.Message)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã gửi lời mời!",
	})
}

// ==================== PUBLIC TEST RESULTS ====================
func GetPublicTestResults(c *gin.Context) {
	email := c.Param("email")
	collection := database.DB.Collection("donors")
	var donor models.Donor
	err := collection.FindOne(c.Request.Context(), bson.M{"email": email}).Decode(&donor)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Donor not found"})
		return
	}

	var results []gin.H
	for _, dh := range donor.DonationHistory {
		if dh.BloodUnitID == nil || *dh.BloodUnitID == primitive.NilObjectID {
			continue
		}
		var bloodUnit models.BloodUnit
		collectionBU := database.DB.Collection("bloodunits")
		err := collectionBU.FindOne(c.Request.Context(), bson.M{"_id": *dh.BloodUnitID}).Decode(&bloodUnit)
		if err != nil {
			continue
		}
		results = append(results, gin.H{
			"donationDate":    dh.DonationDate,
			"bloodGroup":      dh.BloodGroup,
			"barcode":         bloodUnit.Barcode,
			"productType":     bloodUnit.ProductType,
			"screeningStatus": bloodUnit.ScreeningStatus,
			"screening":       bloodUnit.Screening,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

func CheckAppointment(c *gin.Context) {
	// Lấy donor từ context (middleware đã gán)
	donorVal, exists := c.Get("donor")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Donor not found"})
		return
	}
	donor, ok := donorVal.(models.Donor)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Invalid donor data"})
		return
	}

	var req struct {
		CampID          string `json:"campId"`
		AppointmentDate string `json:"appointmentDate"`
		AppointmentTime string `json:"appointmentTime"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request"})
		return
	}

	// Kiểm tra camp tồn tại và có status "Ongoing"
	campID, err := primitive.ObjectIDFromHex(req.CampID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid camp ID"})
		return
	}

	collection := database.DB.Collection("bloodcamps")
	var camp models.BloodCamp
	err = collection.FindOne(c.Request.Context(), bson.M{"_id": campID, "status": "Ongoing"}).Decode(&camp)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Camp not found or not ongoing"})
		return
	}

	// Kiểm tra ngày
	appointmentDate, err := time.Parse("2006-01-02", req.AppointmentDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid date format"})
		return
	}
	// So sánh với camp.Date (chỉ so ngày)
	campDate := camp.Date.Truncate(24 * time.Hour)
	if appointmentDate.Truncate(24*time.Hour) != campDate {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Appointment date must match camp date"})
		return
	}

	// Kiểm tra trùng lịch (donor đã đặt lịch cho camp này chưa)
	appointmentColl := database.DB.Collection("donationappointments")
	var existingAppointment models.DonationAppointment
	err = appointmentColl.FindOne(c.Request.Context(), bson.M{
		"donor":  donor.ID,
		"camp":   campID,
		"status": bson.M{"$in": []string{"pending", "confirmed", "checked_in"}},
	}).Decode(&existingAppointment)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Bạn đã đặt lịch cho điểm hiến máu này rồi"})
		return
	} else if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Có thể đặt lịch"})
}
