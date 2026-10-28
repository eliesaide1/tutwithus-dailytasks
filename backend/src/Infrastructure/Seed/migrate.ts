// One-off migrations for a database that already has data (the seed only runs on an
// empty one). Safe to run more than once: every step checks before it writes, and no step
// ever deletes anything.
//
//   npm run migrate
import { connectDb, disconnectDb } from "../Database/database";
import { Request, Task, User } from "../../Model";

/**
 * Sign-in addresses moved to the real Titan mailboxes, so that approval emails reach an
 * inbox somebody actually opens. Matched on the old address rather than on name, because
 * names get edited in the app and an email is the one field that must stay exact.
 *
 * The address is renamed **in place**, on the same account. Nothing is created and nothing
 * is deleted, so every task, request, comment and meeting stays attached: they all point
 * at the account's id, never at its email. The report at the end proves it.
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

const OLD = EMAILS.map(([from]) => from);
const NEW = EMAILS.map(([, to]) => to);

/** `npm run migrate -- --logout` ends every session again, even already-stamped ones. */
const forceLogout = process.argv.includes("--logout");

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

/**
 * End the sessions of everyone whose sign-in address moved.
 *
 * Renaming the address does not touch a session — it carries the account's id, so whoever
 * was signed in simply stays signed in, still as themselves. That is the wrong outcome
 * when the address moved underneath them: they should come back in through the new one.
 *
 * Stamped only where it is not already set, so re-running the migration does not throw
 * the whole team out a second time. `--logout` forces it for when that is the intent. Only
 * the seven accounts are touched; nobody else's session is disturbed.
 */
async function endSessions() {
  const filter = forceLogout ? { email: { $in: NEW } } : { email: { $in: NEW }, sessionsValidFrom: null };
  const people = await User.find(filter).select("name email");
  if (!people.length) {
    console.log("  none — every migrated account has already been signed out once.");
    return;
  }
  const at = new Date();
  await User.updateMany({ _id: { $in: people.map((p) => p._id) } }, { $set: { sessionsValidFrom: at } });
  for (const p of people) console.log(`  ${p.email} — signed out, signs back in with the new address`);
}

/** What an account holds. Used to show nothing was orphaned, and before deactivating one. */
async function holdings(id: unknown) {
  const [assigned, raisedTasks, owned, raisedRequests] = await Promise.all([
    Task.countDocuments({ assignee: id }),
    Task.countDocuments({ createdBy: id }),
    Request.countDocuments({ owner: id }),
    Request.countDocuments({ createdBy: id }),
  ]);
  return { assigned, raisedTasks, owned, raisedRequests };
}

/**
 * An old address must never sign in again. Normally there is nothing to do — the rename
 * means it no longer exists anywhere — but the rename is skipped when the new address is
 * already taken, which would leave a second, older account still holding the old address
 * and still able to sign in.
 *
 * Those are deactivated, not deleted: deleting an account would strand whatever it holds,
 * and `active: false` already refuses the sign-in and drops the session on the next
 * request. Anything it holds is printed, because a leftover holding real work needs a
 * person to decide where that work goes.
 */
async function sealOldAddresses() {
  const leftovers = await User.find({ email: { $in: OLD } });
  if (!leftovers.length) {
    console.log("  none — no account can sign in with an old address.");
    return;
  }
  for (const u of leftovers) {
    const h = await holdings(u._id);
    const held = h.assigned + h.raisedTasks + h.owned + h.raisedRequests;
    console.warn(`  ${u.email} (${u.name}) still existed — deactivating, not deleting.`);
    if (held) {
      console.warn(
        `    ⚠ it holds ${h.assigned} task(s) assigned, ${h.raisedTasks} raised, ` +
          `${h.owned} request(s) owned, ${h.raisedRequests} raised. Decide where that work goes.`,
      );
    }
    u.active = false;
    await u.save();
  }
}

/** Proof that the work is still attached to the people who own it. */
async function reportHoldings() {
  for (const [, to] of EMAILS) {
    const u = await User.findOne({ email: to }).select("name").lean();
    if (!u) {
      console.log(`  ${to.padEnd(28)} no account`);
      continue;
    }
    const h = await holdings(u._id);
    console.log(
      `  ${to.padEnd(28)} ${String(u.name).padEnd(18)} ` +
        `tasks ${h.assigned} assigned / ${h.raisedTasks} raised · requests ${h.owned} owned / ${h.raisedRequests} raised`,
    );
  }
}

try {
  const conn = await connectDb();
  console.log(`Migrating "${conn.name}"…\n`);
  console.log("Sign-in addresses:");
  await migrateEmails();
  console.log("\nOld addresses that can still sign in:");
  await sealOldAddresses();
  console.log("\nSessions still open on a moved address:");
  await endSessions();
  console.log("\nWhat each account holds:");
  await reportHoldings();
  console.log("\nDone. Everyone signs in with their new address; passwords are unchanged.");
  console.log("Sessions on the moved addresses are ended; re-run with -- --logout to repeat that.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
