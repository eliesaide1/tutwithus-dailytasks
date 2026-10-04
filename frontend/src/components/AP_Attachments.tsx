import { useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import type { Attachment } from "@/Shared/Types";
import { AttachmentUrl, DeleteAttachment, UploadAttachment } from "@/Shared/SharedService";
import { cn } from "@/Shared/format";
import { AP_Button } from "./AP_Button";

/** Human file size: 1.4 MB, 812 KB. */
export function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip";

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/")) return <ImageIcon size={16} className="shrink-0 text-slate-400" />;
  return <FileText size={16} className="shrink-0 text-slate-400" />;
}

/**
 * The attachment list on a task, plus the picker to add more.
 *
 * `taskId` is null while a task is still being created: the picker then just collects
 * files and hands them to the parent, which uploads once the task has an id.
 */
export function AP_Attachments({
  taskId,
  attachments,
  canEdit,
  onChange,
  pending,
  onPendingChange,
}: {
  taskId: string | null;
  attachments?: Attachment[];
  canEdit: boolean;
  onChange?: () => void;
  /** Files chosen before the task exists. */
  pending?: File[];
  onPendingChange?: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files);
    if (input.current) input.current.value = ""; // allow re-picking the same file

    if (!taskId) {
      onPendingChange?.([...(pending ?? []), ...chosen]);
      return;
    }
    for (const file of chosen) {
      setBusy(file.name);
      setProgress(0);
      try {
        await UploadAttachment(taskId, file, setProgress);
      } catch {
        break; // SharedService already showed the alert
      } finally {
        setBusy(null);
      }
    }
    onChange?.();
  }

  async function remove(a: Attachment) {
    if (!taskId) return;
    setBusy(a.filename);
    try {
      await DeleteAttachment(taskId, a.id);
      onChange?.();
    } finally {
      setBusy(null);
    }
  }

  const list = attachments ?? [];
  const waiting = pending ?? [];
  const empty = list.length === 0 && waiting.length === 0;

  return (
    <div className="space-y-2">
      {!empty && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {list.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileIcon contentType={a.contentType} />
              <a
                href={AttachmentUrl(taskId!, a.id)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-slate-800 hover:text-brand-700 hover:underline"
                title={a.filename}
              >
                {a.filename}
              </a>
              <span className="shrink-0 text-xs text-slate-500">{formatBytes(a.size)}</span>
              <a href={AttachmentUrl(taskId!, a.id)} target="_blank" rel="noreferrer" className="shrink-0 p-1 text-slate-400 hover:text-brand-700" title="Download">
                <Download size={15} />
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(a)}
                  disabled={busy === a.filename}
                  className="shrink-0 p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"
                  title="Remove"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
          {waiting.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Paperclip size={16} className="shrink-0 text-slate-300" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs">{formatBytes(f.size)}</span>
              <span className="shrink-0 text-xs text-amber-600">uploads on save</span>
              <button
                type="button"
                onClick={() => onPendingChange?.(waiting.filter((_, j) => j !== i))}
                className="shrink-0 p-1 text-slate-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            Uploading {busy}… {Math.round(progress * 100)}%
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-700 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}

      {canEdit && (
        <>
          <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files)} />
          <AP_Button type="button" variant="secondary" onClick={() => input.current?.click()} disabled={!!busy} className={cn(empty && "w-full")}>
            <Upload size={15} /> Attach files
          </AP_Button>
          {empty && <p className="text-xs text-slate-400">PDF, Office documents, images, text or zip — up to 25 MB each.</p>}
        </>
      )}
    </div>
  );
}
