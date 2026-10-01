import { useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronsUp, Printer, Search, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/Shared/format";
import styles from "./AP_OrgChart.module.css";
import type { OrgPerson } from "@/Shared/Types";
import { AP_OrgChartCard } from "./AP_OrgChartCard";
import { AP_Avatar } from "./AP_Avatar";
import { buttonClass } from "./AP_Button";
import { useDeptCodes } from "@/hooks/useDeptCodes";

type OrgDepartment = { id: string; name: string; color?: string };

type DepthOption = "1" | "2" | "3" | "all";

type Props = {
  people: OrgPerson[];
  departments?: OrgDepartment[];
  /** Hide the toolbar (search/depth/filter/export); zoom controls stay. */
  compact?: boolean;
  initialDepth?: DepthOption;
  className?: string;
};

const ZOOM_STEPS = [0.5, 0.65, 0.8, 0.9, 1, 1.15, 1.3, 1.5];

/** Interactive org chart: search, depth, team filter, zoom/pan and print. */
export function AP_OrgChart({ people, departments = [], compact = false, initialDepth = "1", className }: Props) {
  const { labelOf } = useDeptCodes();
  const navigate = useNavigate();
  const [deptFilter, setDeptFilter] = useState("");
  const [depth, setDepth] = useState<DepthOption>(initialDepth);
  const [zoomIdx, setZoomIdx] = useState(4);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  // People visible after the team filter; managers outside the set make their reports roots.
  const visible = useMemo(
    () => (deptFilter ? people.filter((p) => p.departmentId === deptFilter) : people),
    [people, deptFilter],
  );

  const { roots, children, parent, depthOf } = useMemo(() => {
    const ids = new Set(visible.map((p) => p.id));
    const children = new Map<string, OrgPerson[]>();
    const parent = new Map<string, string>();
    const roots: OrgPerson[] = [];
    for (const p of visible) {
      if (p.managerId && ids.has(p.managerId) && p.managerId !== p.id) {
        const list = children.get(p.managerId) ?? [];
        list.push(p);
        children.set(p.managerId, list);
        parent.set(p.id, p.managerId);
      } else {
        roots.push(p);
      }
    }
    // Leaders (more reports) first among siblings, then by name.
    const byWeight = (a: OrgPerson, b: OrgPerson) =>
      (children.get(b.id)?.length ?? 0) - (children.get(a.id)?.length ?? 0) || a.name.localeCompare(b.name);
    roots.sort(byWeight);
    for (const list of children.values()) list.sort((a, b) => a.name.localeCompare(b.name));

    const depthOf = new Map<string, number>();
    const walk = (p: OrgPerson, d: number, seen: Set<string>) => {
      if (seen.has(p.id)) return; // guards against bad data cycles
      seen.add(p.id);
      depthOf.set(p.id, d);
      for (const c of children.get(p.id) ?? []) walk(c, d + 1, seen);
    };
    const seen = new Set<string>();
    for (const r of roots) walk(r, 0, seen);
    return { roots, children, parent, depthOf };
  }, [visible]);

  const expandedForDepth = useMemo(() => {
    const limit = depth === "all" ? Infinity : Number(depth);
    const set = new Set<string>();
    for (const [id, d] of depthOf) if (d < limit && children.has(id)) set.add(id);
    return set;
  }, [depth, depthOf, children]);

  // Manual expand/collapse is kept until the depth or team filter changes, which resets it.
  const viewKey = `${depth}|${deptFilter}`;
  const [manual, setManual] = useState<{ key: string; set: Set<string> } | null>(null);
  const expanded = manual?.key === viewKey ? manual.set : expandedForDepth;
  const setExpanded = (update: (prev: Set<string>) => Set<string>) =>
    setManual({ key: viewKey, set: update(expanded) });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── Canvas: centering, drag-to-pan ──
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [deptFilter]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    const el = canvasRef.current!;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    d.moved = true;
    const el = canvasRef.current!;
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  };
  const endDrag = () => {
    if (drag.current?.moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
    }
    drag.current = null;
  };

  // ── Jump to employee ──
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return visible
      .filter((p) => p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, visible]);

  const jumpTo = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      let cur = parent.get(id);
      while (cur) {
        next.add(cur);
        cur = parent.get(cur);
      }
      return next;
    });
    setFocusId(id);
    setQuery("");
    setSearchOpen(false);
  };

  useEffect(() => {
    if (!focusId) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`org-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
    const timer = setTimeout(() => setFocusId(null), 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [focusId]);

  const zoom = ZOOM_STEPS[zoomIdx]!;

  const renderNode = (p: OrgPerson, seen: Set<string>) => {
    if (seen.has(p.id)) return null;
    const nextSeen = new Set(seen).add(p.id);
    const kids = children.get(p.id) ?? [];
    const isOpen = expanded.has(p.id);
    return (
      <li key={p.id}>
        <AP_OrgChartCard
          person={p}
          reportCount={kids.length}
          open={isOpen}
          highlighted={focusId === p.id}
          onToggle={() => toggle(p.id)}
          onOpen={() => {
            if (!suppressClick.current) navigate(`/people/${p.id}`);
          }}
        />
        {isOpen && kids.length > 0 && <ul>{kids.map((k) => renderNode(k, nextSeen))}</ul>}
      </li>
    );
  };

  return (
    <div className={cn("org-chart-print", className)}>
      {/* Print: the shell hides its own chrome (.no-print); hide the toolbar and show the full chart. */}
      <style>{`@media print {
        .org-no-print { display: none !important; }
        .org-canvas { overflow: visible !important; height: auto !important; border: 0 !important; zoom: 0.75 !important; }
        body { background: #fff !important; }
      }`}</style>

      {!compact && (
        <div className="org-no-print mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) jumpTo(matches[0].id);
                if (e.key === "Escape") setSearchOpen(false);
              }}
              placeholder="Jump to an employee…"
              aria-label="Jump to an employee"
              className="field rounded-full pl-9"
            />
            {searchOpen && matches.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => jumpTo(m.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <AP_Avatar name={m.name} src={m.avatarUrl} size={24} />
                      <span className="font-medium text-slate-800">{m.name}</span>
                      <span className="truncate text-xs text-slate-500">{m.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="sr-only sm:not-sr-only">Levels</span>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as DepthOption)}
              className="field w-auto rounded-full py-1.5"
              aria-label="Levels expanded"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="all">All</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setExpanded(() => new Set())}
            className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
            title="Collapse all"
            aria-label="Collapse all"
          >
            <ChevronsUp className="size-4" />
          </button>

          {departments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="field w-auto rounded-full py-1.5"
              aria-label="Filter by team"
            >
              <option value="">All teams</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {labelOf(d.name, d.id)}
                </option>
              ))}
            </select>
          )}

          <button type="button" onClick={() => window.print()} className={cn(buttonClass("secondary"), "ml-auto rounded-full")}>
            <Printer className="size-4" /> Export
          </button>
        </div>
      )}

      <div className="relative">
        <div className="org-no-print absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 shadow-xs hover:bg-slate-50"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
            className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 shadow-xs hover:bg-slate-50"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
        </div>

        <div
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className={cn(
            "org-canvas cursor-grab overflow-auto rounded-xl border border-slate-200 bg-white select-none active:cursor-grabbing",
            compact ? "h-[420px]" : "h-[calc(100vh-17rem)] min-h-[420px]",
          )}
        >
          <div style={{ zoom }} className="flex w-max min-w-full justify-center gap-10 px-10 py-10">
            {roots.length === 0 ? (
              <p className="self-center text-sm text-slate-500">No people to show.</p>
            ) : (
              roots.map((r) => (
                <ul key={r.id} className={cn(styles.tree, styles.root)}>
                  {renderNode(r, new Set())}
                </ul>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
