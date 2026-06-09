import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      userType: {
        type: String,
        enum: ["Admin", "Facility", "Donor"],
        required: true,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        // If null, it's a global broadcast for that userType (e.g. all Admins)
      },
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["info", "warning", "success", "error", "urgent", "reminder", "blood_request", "blood_expiring", "system"],
      default: "info",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    actionUrl: {
      type: String, // URL to navigate when clicked
    },
    relatedEntity: {
      entityType: String, // e.g. "Blood", "BloodRequest", "Facility"
      entityId: mongoose.Schema.Types.ObjectId,
    }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
