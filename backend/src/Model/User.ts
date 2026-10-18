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
    // New-request approval. Flags rather than names, so the chain survives people
    // changing roles or leaving.
    canApproveRequests: { type: Boolean, default: false }, // may approve others' requests
    skipsRequestApproval: { type: Boolean, default: false }, // own requests open straight away
    canBypassApproval: { type: Boolean, default: false }, // may tick "bypass" when the approver is away
    // Tasks raised for other people. Named separately from request approval because the
    // two chains differ: requests take Gabriel or Elie, tasks take Gabriel.
    canApproveTasks: { type: Boolean, default: false },
    skipsTaskApproval: { type: Boolean, default: false }, // own tasks post straight away
  },
  baseOptions(["passwordHash"]),
);

export const User = defineModel("User", userSchema);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
