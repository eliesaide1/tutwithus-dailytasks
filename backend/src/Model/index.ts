// Model layer: MongoDB collections (Mongoose schemas), one file per entity.
// Enum-like string values are listed in Application/Shared/constants.ts.
export { User, type UserDoc } from "./User";
export { Department } from "./Department";
export { Availability } from "./Availability";
export { Meeting } from "./Meeting";
export { Project } from "./Project";
export { Request } from "./Request";
export { Task } from "./Task";
export { Comment } from "./Comment";
export { Counter, nextRequestNumber } from "./Counter";
export { Activity } from "./Activity";
export { Notification } from "./Notification";
export { Announcement } from "./Announcement";
