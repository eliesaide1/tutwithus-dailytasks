import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

// A request moves through three phases. Each is activated, filled in, then closed with
// an action (accept / finalize) or cancelled. A phase only opens once the one before it
// is done — except Support, which finishes at acceptance (handled by email, client side).
const acceptanceSchema = new Schema(
  {
    activated: { type: Boolean, default: false },
    // What the request is being accepted as, and the type it is filed under.
    acceptAs: { type: String, enum: ["NEW_REQUEST", "BUG", "SUPPORT", null], default: null },
    requestType: { type: String, enum: ["ENHANCEMENT", "SUPPORT", "FIX", "CONTENT", "OTHER", null], default: null },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "CANCELLED"], default: "PENDING" },
    actedBy: { type: ObjectId, ref: "User", default: null },
    actedAt: Date,
  },
  { _id: false },
);

const analysisSchema = new Schema(
  {
    activated: { type: Boolean, default: false },
    deliveryDate: Date,
    analysisHours: Number, // 8 h = 1 day
    developmentHours: Number,
    status: { type: String, enum: ["PENDING", "FINALIZED", "CANCELLED"], default: "PENDING" },
    actedBy: { type: ObjectId, ref: "User", default: null },
    actedAt: Date,
  },
  { _id: false },
);

const developmentSchema = new Schema(
  {
    activated: { type: Boolean, default: false },
    status: { type: String, enum: ["PENDING", "QA", "FINALIZED", "CANCELLED"], default: "PENDING" },
    qaAt: Date,
    actedBy: { type: ObjectId, ref: "User", default: null },
    actedAt: Date,
  },
  { _id: false },
);

// A request/ticket holding one or more tasks. `number` is the human-facing #id.
const requestSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ["TASK", "FEATURE", "BUG", "CONTENT", "SUPPORT"], default: "TASK" },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "WAITING_INFO", "WAITING_PREREQ", "DONE", "CANCELLED"],
      default: "OPEN",
    },
    dueDate: Date,
    closedAt: Date,
    project: { type: ObjectId, ref: "Project", required: true, index: true },
    createdBy: { type: ObjectId, ref: "User", default: null },
    owner: { type: ObjectId, ref: "User", default: null },
    phases: {
      type: new Schema(
        {
          acceptance: { type: acceptanceSchema, default: () => ({}) },
          analysis: { type: analysisSchema, default: () => ({}) },
          development: { type: developmentSchema, default: () => ({}) },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  baseOptions(),
);

export const Request = defineModel("Request", requestSchema);
