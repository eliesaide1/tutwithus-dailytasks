import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const commentSchema = new Schema(
  {
    body: { type: String, required: true },
    author: { type: ObjectId, ref: "User", default: null },
    request: { type: ObjectId, ref: "Request", default: null, index: true },
    task: { type: ObjectId, ref: "Task", default: null },
  },
  baseOptions(),
);

export const Comment = defineModel("Comment", commentSchema);
