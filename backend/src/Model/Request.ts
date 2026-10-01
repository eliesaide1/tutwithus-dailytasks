import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

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
  },
  baseOptions(),
);

export const Request = defineModel("Request", requestSchema);
