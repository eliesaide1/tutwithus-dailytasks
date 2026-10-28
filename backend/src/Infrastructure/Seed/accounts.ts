// Account rescue, for when nobody can sign in.
//
//   npm run accounts                                   list every account and its state
//   npm run accounts -- --set <email> '<password>'     set one account's password
//   npm run accounts -- --reset-all '<password>'        put every active account on one password
//
// The portal can normally reset a password from Admin → Users, but that needs an admin
// who is already signed in. When the admins themselves are locked out there is no route
// back in through the app, and this is it.
//
// It grants nothing new: running it requires a shell on the server, which already means
// the database URI and every secret are readable. What it avoids is a team locked out of
// its own portal with no way back.
import { connectDb, disconnectDb } from "../Database/database";
import { User } from "../../Model";
import { hashPassword } from "../Security/password";

const args = process.argv.slice(2);
const setIndex = args.indexOf("--set");
const resetIndex = args.indexOf("--reset-all");

/** The rules AuthService enforces when somebody changes their own password. */
function checkPassword(password: string) {
  if (password.length < 10) throw new Error("Use at least 10 characters.");
  if (!/[A-Za-z]/.test(password)) throw new Error("Include at least one letter.");
  if (!/[0-9]/.test(password)) throw new Error("Include at least one number.");
}

const yesNo = (v: unknown) => (v ? "yes" : "no");

async function list() {
  const users = await User.find().sort({ active: -1, email: 1 }).select("email name role active mustChangePassword lastLoginAt").lean();
  if (!users.length) {
    console.log("No accounts at all — the database is empty. Run `npm run seed`.");
    return;
  }
  console.log(`${"email".padEnd(30)}${"name".padEnd(18)}${"role".padEnd(8)}${"active".padEnd(8)}${"temp pw".padEnd(9)}last signed in`);
  console.log("-".repeat(96));
  for (const u of users) {
    console.log(
      u.email.padEnd(30) +
        String(u.name).slice(0, 17).padEnd(18) +
        String(u.role).padEnd(8) +
        yesNo(u.active).padEnd(8) +
        yesNo(u.mustChangePassword).padEnd(9) +
        (u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 16).replace("T", " ") : "never"),
    );
  }
  console.log(
    "\n`temp pw` yes means the account has never completed a first sign-in, so its password\n" +
      "is still the one it was created with and must be changed on the way in.",
  );
  await approvalChain();
}

/**
 * Who the approval steps actually resolve to.
 *
 * Both the in-app notification and the email go to whoever these flags name, so an empty
 * list here is why nobody was told — and it reads as "the email never arrived", which
 * sends you looking at the mail server instead of at the account.
 */
async function approvalChain() {
  const [requestApprovers, taskApprovers, skipRequest, skipTask] = await Promise.all([
    User.find({ active: true, canApproveRequests: true }).select("email").lean(),
    User.find({ active: true, canApproveTasks: true }).select("email").lean(),
    User.find({ active: true, skipsRequestApproval: true }).select("email").lean(),
    User.find({ active: true, skipsTaskApproval: true }).select("email").lean(),
  ]);
  const names = (list: { email: string }[]) => (list.length ? list.map((u) => u.email).join(", ") : "NOBODY — nothing can be approved");
  console.log("\nApproval chain");
  console.log("-".repeat(96));
  console.log(`  can approve requests   ${names(requestApprovers)}`);
  console.log(`  can approve tasks      ${names(taskApprovers)}`);
  console.log(`  requests open at once  ${skipRequest.length ? skipRequest.map((u) => u.email).join(", ") : "nobody"}`);
  console.log(`  tasks post at once     ${skipTask.length ? skipTask.map((u) => u.email).join(", ") : "nobody"}`);
  console.log(
    "\nA request is emailed to every request approver except its author, so a lone approver\n" +
      "raising one has nobody left to tell — the chain needs two people to work.",
  );
}

/**
 * Sets a password. The account is left needing to change it at first sign-in, so the
 * password typed into a shell — and visible in its history — is never the lasting one.
 */
async function setPassword(email: string, password: string) {
  checkPassword(password);
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    console.error(`No account uses ${email}. Run \`npm run accounts\` to see the addresses that exist.`);
    process.exitCode = 1;
    return;
  }
  user.passwordHash = await hashPassword(password);
  user.mustChangePassword = true;
  // A password set here is a way back in, so any session cut-off standing against this
  // account is lifted — otherwise the new password would be refused by the old stamp.
  user.sessionsValidFrom = undefined;
  await user.save();

  console.log(`Password set for ${user.email} (${user.name}).`);
  if (!user.active) console.warn("⚠ This account is deactivated, so it still cannot sign in. Reactivate it in Admin → Users.");
  console.log("They sign in with it once and are asked to choose their own straight away.");
}

/**
 * Puts every active account back on one shared password, each having to replace it at
 * first sign-in. For getting a whole team back in at once after a cutover, when it is no
 * longer clear who knows what.
 *
 * Deactivated accounts are skipped: they cannot sign in anyway, and an old duplicate the
 * migration sealed should stay sealed.
 *
 * The cost is a password everybody knows for as long as it takes them to sign in once.
 * That is worth it to end a lock-out and no worse than the one the accounts were created
 * with — but it is the reason each is forced to choose their own immediately.
 */
async function resetAll(password: string) {
  checkPassword(password);
  const users = await User.find({ active: true }).select("email name");
  if (!users.length) {
    console.log("No active accounts.");
    return;
  }
  const passwordHash = await hashPassword(password);
  await User.updateMany(
    { _id: { $in: users.map((u) => u._id) } },
    // Session cut-offs are lifted too, or the password just set would be refused by one.
    { $set: { passwordHash, mustChangePassword: true }, $unset: { sessionsValidFrom: "" } },
  );
  for (const u of users) console.log(`  ${u.email} (${u.name})`);
  console.log(
    `\n${users.length} account(s) now sign in with that password, and are asked to choose\n` +
      "their own straight away. Anyone still signed in stays signed in — this changes how\n" +
      "they get back in, not whether they are in now.",
  );
}

try {
  await connectDb();
  if (resetIndex !== -1) {
    const password = args[resetIndex + 1];
    if (!password) {
      console.error("Usage: npm run accounts -- --reset-all '<password>'");
      process.exitCode = 1;
    } else {
      await resetAll(password);
    }
  } else if (setIndex === -1) {
    await list();
  } else {
    const [email, password] = [args[setIndex + 1], args[setIndex + 2]];
    if (!email || !password) {
      console.error("Usage: npm run accounts -- --set <email> '<password>'");
      process.exitCode = 1;
    } else {
      await setPassword(email, password);
    }
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
