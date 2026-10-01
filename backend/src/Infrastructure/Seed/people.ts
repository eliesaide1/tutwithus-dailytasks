import bcrypt from "bcryptjs";
import { Department, User } from "../../Model";

export const DEFAULT_PASSWORD = "TutWithUs!2026";

export type People = Awaited<ReturnType<typeof seedPeople>>;

const h = (hours: number) => hours * 60;

// Team from the Team Work Schedule v9 (1 October 2026).
export async function seedPeople() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const [leadership, operations, technology, marketing, support] = await Department.insertMany([
    { name: "Executive Office", description: "Company direction, decisions, sales and partnerships.", color: "#0b2f6b", order: 0 },
    { name: "Project Management Office", description: "Planning, priorities, deadlines and cross-team coordination.", color: "#7c3aed", order: 1 },
    { name: "Technology", description: "Platform, website, infrastructure, security and AI integration.", color: "#0891b2", order: 2 },
    { name: "Marketing & Content", description: "Marketing calendar, social media, content creation and reports.", color: "#f5bd1f", order: 3 },
    { name: "Academic Operations", description: "Tutor onboarding and quality, client acquisition and follow-up.", color: "#059669", order: 4 },
  ]);
  const depts = { leadership: leadership!, operations: operations!, technology: technology!, marketing: marketing!, support: support! };

  const base = { passwordHash, mustChangePassword: true };

  const charbel = await User.create({
    ...base,
    email: "charbel@tutwithus.com",
    name: "Charbel Najm",
    title: "CEO",
    role: "ADMIN",
    timezone: "Asia/Riyadh",
    weeklyCapacityMins: h(14),
    department: depts.leadership._id,
    responsibilities:
      "CEO direction and support, with sales as the stated priority. Saturday: resolve decisions and dependencies on marketing, direct sales, website work and prerecorded B2B sessions.",
    urgentContact: "WhatsApp, 30-60 minutes' notice.",
    validUntil: new Date("2026-12-31T00:00:00Z"),
  });

  const gabriel = await User.create({
    ...base,
    email: "gabriel@tutwithus.com",
    name: "Gabriel Sabbagh",
    title: "Project Leader",
    role: "ADMIN",
    timezone: "Asia/Beirut",
    weeklyCapacityMins: h(21),
    manager: charbel._id,
    department: depts.operations._id,
    responsibilities:
      "Lead execution across the team, set priorities, coordinate assignments, track deadlines and unblock delivery. Maintain the action list and coordinate business decisions with the CEO and technical delivery with Elie.",
    urgentContact: "Weekday 17:30-19:30; weekend 12:00-15:00. Extensions by prior arrangement.",
  });

  const elie = await User.create({
    ...base,
    email: "elie@tutwithus.com",
    name: "Elie Saide",
    title: "CTO",
    role: "ADMIN",
    timezone: "Asia/Beirut",
    weeklyCapacityMins: h(30),
    manager: charbel._id,
    department: depts.technology._id,
    responsibilities:
      "Own technical strategy, architecture, platform development and maintenance, infrastructure, deployment, security, AI integration and code quality. Coordinate and mentor development. Priorities: UI/UX, frontend performance and reliability.",
    urgentContact: "WhatsApp for support at any time; where possible allow 1-3 hours for an urgent meeting.",
  });

  const thiago = await User.create({
    ...base,
    email: "thiago@tutwithus.com",
    name: "Thiago",
    title: "Social Media & Marketing Manager",
    role: "MEMBER",
    timezone: "Asia/Riyadh",
    weeklyCapacityMins: h(48),
    manager: gabriel._id,
    department: depts.marketing._id,
    responsibilities:
      "Sales and marketing: marketing calendar, content creation and monthly report. Bring completed outputs, campaign progress and the next dated deliverable.",
    urgentContact: "WhatsApp, under 30 minutes' notice usually possible.",
  });

  const silvana = await User.create({
    ...base,
    email: "silvana@tutwithus.com",
    name: "Silvana Haddad",
    title: "COO",
    role: "MEMBER",
    timezone: "Asia/Riyadh",
    weeklyCapacityMins: h(15),
    manager: gabriel._id,
    department: depts.support._id,
    responsibilities:
      "Tutors and customer support: client acquisition and follow-up with tutors/clients. Bring open cases, tutor follow-ups, unresolved issues and next actions.",
    urgentContact: "WhatsApp anytime for emergencies; attendance case by case. Fixed employment hours 07:00-15:30.",
  });

  const rodolphe = await User.create({
    ...base,
    email: "rodolphe@tutwithus.com",
    name: "Rodolphe Najm",
    title: "Cross-department Support",
    role: "MEMBER",
    timezone: "Asia/Riyadh",
    weeklyCapacityMins: h(9),
    manager: gabriel._id,
    department: depts.operations._id,
    responsibilities:
      "Support across departments. Agree two or three concrete deliverables, owners supported and due dates at the Saturday team meeting.",
    urgentContact: "Phone, at least 3 hours' same-day notice; avoid weekdays 08:00-16:00.",
    validUntil: new Date("2026-12-31T00:00:00Z"),
  });

  const theresa = await User.create({
    ...base,
    email: "theresa@tutwithus.com",
    name: "Theresa Ghanem",
    title: "Content Creator",
    role: "MEMBER",
    timezone: "Asia/Riyadh",
    manager: thiago._id,
    department: depts.marketing._id,
  });

  await Promise.all([
    Department.updateOne({ _id: depts.leadership._id }, { lead: charbel._id }),
    Department.updateOne({ _id: depts.operations._id }, { lead: gabriel._id }),
    Department.updateOne({ _id: depts.technology._id }, { lead: elie._id }),
    Department.updateOne({ _id: depts.marketing._id }, { lead: thiago._id }),
    Department.updateOne({ _id: depts.support._id }, { lead: silvana._id }),
  ]);

  return { charbel, gabriel, elie, thiago, silvana, rodolphe, theresa, depts };
}
