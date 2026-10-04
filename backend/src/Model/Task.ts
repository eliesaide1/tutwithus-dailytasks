import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

// One uploaded file. The bytes live in object storage; only this metadata is in MongoDB.
const attachmentSchema = new Schema(
  {
    key: { type: String, required: true }, // storage key, server-generated
    filename: { type: String, required: true }, // original name, shown to people
    contentType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    uploadedBy: { type: ObjectId, ref: "User", default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    kind: { type: String, default: "General" },
    status: { type: String, enum: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"], default: "TODO" },
    estimateMins: Number,
    dueDate: Date,
    plannedWeek: Date, // Monday (UTC midnight) of the week it is planned for
    blocker: String,
    order: { type: Number, default: 0 },
    completedAt: Date,
    request: { type: ObjectId, ref: "Request", required: true, index: true },
    assignee: { type: ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: ObjectId, ref: "User", default: null },
    meeting: { type: ObjectId, ref: "Meeting", default: null },
    attachments: { type: [attachmentSchema], default: [] },
  },
  baseOptions(),
);

// Done report: tasks completed in a period.
taskSchema.index({ completedAt: -1 });

export const Task = defineModel("Task", taskSchema);
