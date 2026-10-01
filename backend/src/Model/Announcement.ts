import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    author: { type: ObjectId, ref: "User", default: null },
  },
  baseOptions(),
);

export const Announcement = defineModel("Announcement", announcementSchema);
