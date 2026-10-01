// Shared Mongoose setup. Every document serialises with a string `id` (no `_id`/`__v`);
// references serialise as id strings unless populated.
import mongoose, { type InferSchemaType, type Schema } from "mongoose";

export function baseOptions(hide: string[] = []) {
  return {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        for (const key of hide) delete ret[key];
        return ret;
      },
    },
  } as const;
}

/** Register a model once (safe with hot reload). */
export const defineModel = <T extends Schema>(name: string, schema: T) =>
  (mongoose.models[name] as mongoose.Model<InferSchemaType<T>>) ?? mongoose.model(name, schema);
