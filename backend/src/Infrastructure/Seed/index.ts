// Seeds MongoDB with the team from the October 2026 Team Work Schedule (v9), sample
// work items.
//   npm run seed            -> only runs on an empty database
//   npm run seed -- --reset -> drops THIS app's database (MONGODB_URI) first
import mongoose from "mongoose";
import { config } from "../Config/config";
import { connectDb, disconnectDb } from "../Database/database";
import { User } from "../../Model";
import { DEFAULT_PASSWORD, seedPeople } from "./people";
import { seedSchedule } from "./schedule";
import { seedWork } from "./work";

const reset = process.argv.includes("--reset");

try {
  const conn = await connectDb();
  if (reset) {
    console.log(`Dropping database "${conn.name}"…`);
    await conn.dropDatabase();
  } else if (await User.exists({})) {
    console.log(`Database "${conn.name}" already has data. Run "npm run seed -- --reset" to wipe and re-seed it.`);
    process.exit(0);
  }
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  const people = await seedPeople();
  await seedSchedule(people);
  await seedWork(people);

  console.log(`Seeded ${config.mongoUri.replace(/\/\/[^@]*@/, "//***@")}`);
  console.log(`Sign in with any team email (e.g. elie@tutwithus.com) and the password ${DEFAULT_PASSWORD}`);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
