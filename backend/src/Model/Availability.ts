import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

// Recurring weekly window, in the user's own timezone.
const availabilitySchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true, index: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    startMinute: { type: Number, min: 0, max: 1440, required: true },
    endMinute: { type: Number, min: 0, max: 1440, required: true }, // 1440 = 24:00
    kind: { type: String, enum: ["AVAILABLE", "WORK", "OFF", "UNSPECIFIED"], default: "AVAILABLE" },
    note: String,
  },
  baseOptions(),
);

export const Availability = defineModel("Availability", availabilitySchema);
