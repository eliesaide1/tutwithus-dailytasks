import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const notificationSchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    body: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  baseOptions(),
);
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = defineModel("Notification", notificationSchema);
