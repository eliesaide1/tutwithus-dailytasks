import { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true }, // job title on the org chart, e.g. "CTO"
    role: { type: String, enum: ["ADMIN", "MANAGER", "MEMBER"], default: "MEMBER" },
    avatarUrl: String,
    phone: String,
    whatsapp: String,
    bio: String,
    responsibilities: String,
    urgentContact: String,
    timezone: { type: String, default: "Asia/Beirut" }, // IANA zone
    weeklyCapacityMins: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    validUntil: Date,
    lastLoginAt: Date,
    manager: { type: ObjectId, ref: "User", default: null },
    department: { type: ObjectId, ref: "Department", default: null },
  },
  baseOptions(["passwordHash"]),
);

export const User = defineModel("User", userSchema);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
