import { AP_Tabs } from "./AP_Tabs";

const TABS = [
  { key: "directory", label: "Directory", to: "/people" },
  { key: "chart", label: "Org Chart", to: "/org-chart" },
];

/** The "Directory | Org Chart" switch shown on both people screens. */
export function AP_DirectoryTabs({ active }: { active: "directory" | "chart" }) {
  return <AP_Tabs active={active} items={TABS} />;
}
