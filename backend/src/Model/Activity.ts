import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const activitySchema = new Schema(
  {
    actor: { type: ObjectId, ref: "User", default: null },
    entity: { type: String, required: true }, // Request | Task | Meeting | User ...
    entityId: { type: String, required: true },
    action: { type: String, required: true }, // created | updated | status | deleted | published ...
    summary: { type: String, required: true },
    link: String,
  },
  baseOptions(),
);
activitySchema.index({ createdAt: -1 });

export const Activity = defineModel("Activity", activitySchema);
