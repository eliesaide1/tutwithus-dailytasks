import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Building2, User } from "lucide-react";
import { cn } from "@/Shared/format";
import { personWithTitle } from "@/Shared/SharedFunctions";
import { useLookups } from "@/hooks/useLookups";

export type Mentions = { users: string[]; departments: string[] };

type Choice = {
  id: string;
  /** Shown in the list, with the job title to tell people apart. */
  label: string;
  /** Written into the comment — the bare name, so the sentence reads normally. */
  text: string;
  kind: "p" | "d";
};

/**
 * Comment box that names people and departments: `/p` offers people, `/d` departments.
 *
 * What goes into the text is the plain name, so the comment reads normally to anybody —
 * including in the email it sends. The id travels separately in `mentions`, which is why
 * someone whose name merely appears in a sentence is never mailed, and why renaming a
 * person later cannot break a past mention.
 *
 * A mention is dropped again if its name is edited out of the text before sending, so
 * deleting what you typed also withdraws it.
 */
export function AP_MentionTextarea({
  name,
  value,
  onChange,
  onMentionsChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: Mentions) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  const { users, departments } = useLookups();
  const ref = useRef<HTMLTextAreaElement>(null);
  // Everything named so far. Filtered against the text on every change, so an edited-out
  // name stops being a mention.
  const [named, setNamed] = useState<Choice[]>([]);
  const [trigger, setTrigger] = useState<{ kind: "p" | "d"; query: string; at: number } | null>(null);
  const [active, setActive] = useState(0);

  const options: Choice[] = trigger
    ? (trigger.kind === "p"
        ? users.map((u) => ({ id: u.id, label: personWithTitle(u), text: u.name, kind: "p" as const }))
        : departments.map((d) => ({ id: d.id, label: d.name, text: d.name, kind: "d" as const }))
      ).filter((o) => o.label.toLowerCase().includes(trigger.query.toLowerCase()))
    : [];

  // The box is also cleared from outside after a comment is posted. Without this the
  // mentions from the one just sent stayed listed under an empty box, reading as though
  // they were about to be emailed all over again.
  useEffect(() => {
    setNamed((prev) => {
      const kept = prev.filter((c) => value.includes(`@${c.text}`));
      if (kept.length === prev.length) return prev;
      onMentionsChange({
        users: kept.filter((c) => c.kind === "p").map((c) => c.id),
        departments: kept.filter((c) => c.kind === "d").map((c) => c.id),
      });
      return kept;
    });
  }, [value, onMentionsChange]);

  /** Keep only the mentions whose name is still written in the text. */
  function sync(text: string, list: Choice[]) {
    const kept = list.filter((c) => text.includes(`@${c.text}`));
    setNamed(kept);
    onMentionsChange({
      users: kept.filter((c) => c.kind === "p").map((c) => c.id),
      departments: kept.filter((c) => c.kind === "d").map((c) => c.id),
    });
  }

  function handleChange(text: string, caret: number) {
    onChange(text);
    sync(text, named);
    // `/p` or `/d` at the start of a word, with whatever has been typed since.
    const match = /(^|\s)\/([pd])([^\s]*)$/.exec(text.slice(0, caret));
    setTrigger(match ? { kind: match[2] as "p" | "d", query: match[3] ?? "", at: caret - match[0].length + match[1]!.length } : null);
    setActive(0);
  }

  function pick(choice: Choice) {
    if (!trigger) return;
    const text = `${value.slice(0, trigger.at)}@${choice.text} ${value.slice(trigger.at + trigger.query.length + 2)}`;
    const list = named.some((c) => c.id === choice.id && c.kind === choice.kind) ? named : [...named, choice];
    onChange(text);
    sync(text, list);
    setTrigger(null);
    ref.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!trigger || !options.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      // Enter picks from the list rather than adding a line break, as in every other
      // mention box people have used.
      e.preventDefault();
      pick(options[active]!);
    } else if (e.key === "Escape") {
      setTrigger(null);
    }
  }

  return (
    <div className="relative">
      {/* The ids travel with the form; the textarea itself carries only what was written. */}
      <textarea
        ref={ref}
        name={name}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value, e.target.selectionStart)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setTrigger(null), 150)}
        className="field min-h-0 resize-y"
      />
      {trigger && options.length > 0 && (
        // Opens upward: the comment box is the last thing on a request page, so a list
        // dropping below it falls off the bottom of the window and cannot be scrolled to.
        <ul className="absolute bottom-full z-20 mb-1 max-h-56 w-full max-w-sm overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((o, i) => (
            <li key={`${o.kind}-${o.id}`}>
              <button
                type="button"
                // mousedown, because blur would close the list before a click lands.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm", i === active ? "bg-brand-50 text-brand-800" : "text-slate-700")}
              >
                {o.kind === "p" ? <User className="size-3.5 shrink-0" /> : <Building2 className="size-3.5 shrink-0" />}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-slate-400">
        Type <code className="font-semibold">/p</code> to name a person or <code className="font-semibold">/d</code> a department — they are emailed the
        comment and a link to this request.
      </p>
      {named.length > 0 && (
        <p className="mt-0.5 text-xs text-brand-700">Will be emailed: {named.map((c) => c.label).join(", ")}</p>
      )}
    </div>
  );
}
