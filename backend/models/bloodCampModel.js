import mongoose from "mongoose";

const bloodCampSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Camp title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Camp date is required"],
    },
    time: {
      start: { type: String },
      end:   { type: String },
    },
    location: {
      venue:   { type: String, required: [true, "Venue name is required"] },
      address: { type: String },
      ward:    { type: String },   // phường / xã
      city:    { type: String, required: [true, "City is required"] },
      state:   { type: String },
      coordinates: {
        lat: { type: Number, default: 10.7769 },
        lng: { type: Number, default: 106.7009 },
      },
    },
    organizer:      { type: String },
    expectedDonors: { type: Number, default: 0 },
    actualDonors:   { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
      default: "Upcoming",
    },
  },
  { timestamps: true }
);

export default mongoose.model("BloodCamp", bloodCampSchema);
