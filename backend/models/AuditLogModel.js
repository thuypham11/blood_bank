import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      // e.g., "CREATE_ADMIN", "UPDATE_BLOOD_STATUS", "APPROVE_HOSPITAL"
    },
    performedBy: {
      userType: {
        type: String,
        enum: ["Admin", "Facility", "Donor", "System"],
        required: true,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
      },
    },
    target: {
      targetType: {
        type: String, // e.g., "Blood", "Facility", "Admin", "BloodRequest"
        required: true,
      },
      targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },
    changes: {
      type: mongoose.Schema.Types.Mixed, 
      // object containing { before: {...}, after: {...} } or specific changed fields
    },
    description: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
