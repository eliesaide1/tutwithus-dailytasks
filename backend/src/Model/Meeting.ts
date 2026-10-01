import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const attendeeSchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["PENDING", "CONFIRMED", "DECLINED"], default: "CONFIRMED" },
  },
  { _id: false },
);

const meetingSchema = new Schema(
  {
    title: { type: String, required: true },
    purpose: String,
    agenda: String,
    recurrence: { type: String, enum: ["WEEKLY", "ONCE"], default: "WEEKLY" },
    dayOfWeek: { type: Number, min: 0, max: 6, default: null }, // WEEKLY
    date: { type: Date, default: null }, // ONCE: calendar date at UTC midnight
    startMinute: { type: Number, required: true },
    endMinute: { type: Number, required: true },
    timezone: { type: String, default: "Asia/Beirut" }, // zone the times are anchored to
    location: String,
    validFrom: Date,
    validUntil: Date,
    organizer: { type: ObjectId, ref: "User", default: null },
    attendees: { type: [attendeeSchema], default: [] },
  },
  baseOptions(),
);
meetingSchema.index({ "attendees.user": 1 });

export const Meeting = defineModel("Meeting", meetingSchema);
