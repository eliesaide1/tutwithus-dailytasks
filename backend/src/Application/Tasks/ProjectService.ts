// Projects: the top level of the task tree (like clients in DQtasks). Admins only (enforced by the controller).
import { z } from "zod";
import { Department, Project, Request, type UserDoc } from "../../Model";
import { badRequest, notFound, HttpError } from "../Common/errors";
import { parse, zRef, zText } from "../Common/validation";
import { logActivity } from "../Common/activity";
import { isId } from "../../Infrastructure/Database/database";

const projectInput = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code needs 2-8 characters.")
    .max(8, "Code needs 2-8 characters.")
    .regex(/^[A-Z0-9]+$/, "Code may only contain letters and digits."),
  name: z.string().trim().min(1, "Name is required.").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color.").default("#0b3b8c"),
  department: zRef,
  description: zText(1000),
  archived: z.boolean().default(false),
});

async function validate(body: z.infer<typeof projectInput>, exceptId?: string) {
  if (body.department && !(await Department.exists({ _id: body.department }))) throw badRequest("Choose a valid team.");
  const taken = await Project.findOne({ code: body.code }).select("_id");
  if (taken && String(taken._id) !== exceptId) throw new HttpError(409, `Code ${body.code} is already used.`);
}

export async function listProjects() {
  const [projects, counts] = await Promise.all([
    Project.find().sort({ archived: 1, name: 1 }).populate("department", "name").lean(),
    Request.aggregate<{ _id: unknown; total: number; open: number }>([
      {
        $group: {
          _id: "$project",
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ["$status", ["DONE", "CANCELLED"]] }, 0, 1] } },
        },
      },
    ]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c]));
  return {
    projects: projects.map((p) => {
      const dept = p.department as { _id: unknown; name: string } | null;
      return {
        id: String(p._id),
        code: p.code,
        name: p.name,
        color: p.color,
        description: p.description ?? null,
        archived: p.archived,
        department: dept ? { id: String(dept._id), name: dept.name } : null,
        openRequests: byId.get(String(p._id))?.open ?? 0,
        totalRequests: byId.get(String(p._id))?.total ?? 0,
      };
    }),
  };
}

export async function createProject(user: UserDoc, input: unknown) {
  const body = parse(projectInput, input);
  await validate(body);
  const p = await Project.create(body);
  await logActivity({ actor: user.id, entity: "Project", entityId: p.id, action: "created", summary: `created project ${p.code} – ${p.name}`, link: "/admin/projects" });
  return { id: p.id };
}

export async function updateProject(user: UserDoc, id: string, input: unknown) {
  if (!isId(id)) throw notFound("Project not found");
  const p = await Project.findById(id);
  if (!p) throw notFound("Project not found");
  const body = parse(projectInput, input);
  await validate(body, p.id);
  p.set(body);
  await p.save();
  await logActivity({ actor: user.id, entity: "Project", entityId: p.id, action: "updated", summary: `updated project ${p.code} – ${p.name}`, link: "/admin/projects" });
}

/** Projects with requests can only be archived, not deleted. */
export async function deleteProject(user: UserDoc, id: string) {
  if (!isId(id)) throw notFound("Project not found");
  const p = await Project.findById(id);
  if (!p) throw notFound("Project not found");
  if (await Request.exists({ project: p._id })) throw badRequest("This project has requests; archive it instead.");
  await p.deleteOne();
  await logActivity({ actor: user.id, entity: "Project", entityId: p.id, action: "deleted", summary: `deleted project ${p.code} – ${p.name}` });
}
