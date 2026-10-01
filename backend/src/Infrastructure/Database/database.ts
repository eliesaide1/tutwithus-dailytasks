import mongoose from "mongoose";
import { config } from "../Config/config";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

/** True when `id` is a valid ObjectId string (guards route params before querying). */
export const isId = (id: unknown): id is string => typeof id === "string" && mongoose.isValidObjectId(id);
