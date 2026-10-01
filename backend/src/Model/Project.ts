import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

// Top-level grouping in the task tree (the "client" level in DQtasks).
const projectSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    description: String,
    color: { type: String, default: "#0b3b8c" },
    archived: { type: Boolean, default: false },
    department: { type: ObjectId, ref: "Department", default: null },
  },
  baseOptions(),
);

export const Project = defineModel("Project", projectSchema);
