// Small reference lists every screen needs for dropdowns and avatars.
import { Department, Project, User } from "../../Model";

export async function getLookups() {
  const [users, departments, projects] = await Promise.all([
    User.find({ active: true }).sort({ name: 1 }).select("name title avatarUrl timezone department manager role weeklyCapacityMins"),
    Department.find().sort({ order: 1, name: 1 }).select("name color lead order"),
    Project.find().sort({ archived: 1, code: 1 }).select("code name color archived department"),
  ]);
  return { users, departments, projects };
}
