// One-off migrations for a database that already has data (the seed only runs on an
// empty one). Safe to run more than once: every step checks before it writes.
//
//   npm run migrate
import { connectDb, disconnectDb } from "../Database/database";
import { User } from "../../Model";

/**
 * Sign-in addresses moved to the real Titan mailboxes, so that approval emails reach an
 * inbox somebody actually opens. Matched on the old address rather than on name, because
 * names get edited in the app and an email is the one field that must stay exact.
 */
const EMAILS: [from: string, to: string][] = [
  ["charbel@tutwithus.com", "c.najm@tutwithus.com"],
  ["gabriel@tutwithus.com", "g.sabbagh@tutwithus.com"],
  ["elie@tutwithus.com", "e.saide@tutwithus.com"],
  ["thiago@tutwithus.com", "t.vanderlei@tutwithus.com"],
  ["silvana@tutwithus.com", "selhaddad@tutwithus.com"],
  ["rodolphe@tutwithus.com", "r.najm@tutwithus.com"],
  ["theresa@tutwithus.com", "t.ghanem@tutwithus.com"],
];

async function migrateEmails() {
  let moved = 0;
  for (const [from, to] of EMAILS) {
    const user = await User.findOne({ email: from });
    if (!user) continue;
    // Never collide with an account that already uses the new address.
    if (await User.exists({ email: to, _id: { $ne: user._id } })) {
      console.warn(`  skipped ${from}: ${to} is already in use by another account`);
      continue;
    }
    user.email = to;
    await user.save();
    console.log(`  ${from} -> ${to}`);
    moved += 1;
  }
  console.log(moved ? `Updated ${moved} sign-in address(es).` : "Sign-in addresses are already up to date.");
}

try {
  const conn = await connectDb();
  console.log(`Migrating "${conn.name}"…`);
  await migrateEmails();
  console.log("Done. Everyone signs in with their new address; passwords are unchanged.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
