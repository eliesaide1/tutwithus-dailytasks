// Removing the stored bytes when the task or request that owned them goes away.
// Kept separate from AttachmentService so the delete paths don't pull in its zod schemas.
import { deleteObject, isStorageConfigured } from "../../Infrastructure/Storage/storage";

type HasKey = { key?: string | null };

/** Best-effort: a storage failure must never stop a task or request from being deleted. */
export async function dropAttachments(attachments: readonly HasKey[] | null | undefined) {
  if (!attachments?.length || !isStorageConfigured()) return;
  await Promise.all(attachments.filter((a) => a.key).map((a) => deleteObject(a.key!)));
}
