import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: String,
    color: { type: String, default: "#0b3b8c" },
    order: { type: Number, default: 0 },
    lead: { type: ObjectId, ref: "User", default: null },
  },
  baseOptions(),
);

export const Department = defineModel("Department", departmentSchema);
