import { Schema } from "mongoose";
import { baseOptions, defineModel } from "./base";

const { ObjectId } = Schema.Types;

const commentSchema = new Schema(
  {
    body: { type: String, required: true },
    author: { type: ObjectId, ref: "User", default: null },
    request: { type: ObjectId, ref: "Request", default: null, index: true },
    task: { type: ObjectId, ref: "Task", default: null },
    // Who was named in the comment with /p or /d. Stored as ids rather than parsed back
    // out of the text, so renaming a person or a department cannot break a past mention.
    mentions: {
      type: new Schema(
        {
          users: { type: [{ type: ObjectId, ref: "User" }], default: [] },
          departments: { type: [{ type: ObjectId, ref: "Department" }], default: [] },
        },
        { _id: false },
      ),
      default: () => ({ users: [], departments: [] }),
    },
  },
  baseOptions(),
);
// Being mentioned is one of the ways a request becomes visible to you.
commentSchema.index({ request: 1, "mentions.users": 1 });

export const Comment = defineModel("Comment", commentSchema);
