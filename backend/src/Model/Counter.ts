import { Schema } from "mongoose";
import { defineModel } from "./base";

// Sequence numbers (request #ids).
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

export const Counter = defineModel("Counter", counterSchema);

/** Next request number (#1, #2 …), atomic. */
export async function nextRequestNumber() {
  const c = await Counter.findOneAndUpdate({ _id: "request" }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return c!.seq;
}
