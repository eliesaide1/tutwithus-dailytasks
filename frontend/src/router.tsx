// Every screen of the app and its URL. Screens live in src/screens/<name>-screen/ and are
// loaded on demand.
import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import { AP_RequireAuth } from "@/components/AP_RequireAuth";
import { AP_RequireRole } from "@/components/AP_RequireRole";
import { AP_AppLayout } from "@/components/AP_AppLayout";
import LoginScreen from "@/screens/login-screen/login-screen";
import { ForbiddenScreen, NotFoundScreen, RouteErrorScreen } from "@/screens/error-screen/error-screen";

const screen = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

export const router = createBrowserRouter([
  { path: "/login", Component: LoginScreen },
  {
    Component: AP_RequireAuth,
    errorElement: <RouteErrorScreen />,
    children: [
      {
        Component: AP_AppLayout,
        errorElement: <RouteErrorScreen />,
        children: [
          { path: "account", lazy: screen(() => import("@/screens/account-screen/account-screen")) },
          { path: "forbidden", Component: ForbiddenScreen },

          // Dashboard & team-wide
          { index: true, lazy: screen(() => import("@/screens/dashboard-screen/dashboard-screen")) },
          { path: "notifications", lazy: screen(() => import("@/screens/notifications-screen/notifications-screen")) },
          { path: "announcements", lazy: screen(() => import("@/screens/announcements-screen/announcements-screen")) },
          { path: "workload", lazy: screen(() => import("@/screens/workload-screen/workload-screen")) },

          // Tasks
          { path: "tasks", lazy: screen(() => import("@/screens/tasks-screen/tasks-screen")) },
          { path: "tasks/:number", lazy: screen(() => import("@/screens/request-screen/request-screen")) },
          { path: "my-week", lazy: screen(() => import("@/screens/my-week-screen/my-week-screen")) },

          // People
          { path: "org-chart", lazy: screen(() => import("@/screens/org-chart-screen/org-chart-screen")) },
          { path: "people", lazy: screen(() => import("@/screens/directory-screen/directory-screen")) },
          { path: "people/:id", lazy: screen(() => import("@/screens/profile-screen/profile-screen")) },
          // Self or manager: checked inside the screen.
          { path: "people/:id/edit", lazy: screen(() => import("@/screens/profile-edit-screen/profile-edit-screen")) },
          { path: "teams", lazy: screen(() => import("@/screens/teams-screen/teams-screen")) },
          { path: "teams/:id", lazy: screen(() => import("@/screens/team-screen/team-screen")) },

          // Schedule
          { path: "schedule", lazy: screen(() => import("@/screens/schedule-screen/schedule-screen")) },
          { path: "schedule/availability", lazy: screen(() => import("@/screens/availability-screen/availability-screen")) },

          // Managers
          {
            element: <AP_RequireRole gate="manager" />,
            children: [
              { path: "teams/new", lazy: screen(() => import("@/screens/team-form-screen/team-form-screen")) },
              { path: "teams/:id/edit", lazy: screen(() => import("@/screens/team-form-screen/team-form-screen")) },
              { path: "schedule/meetings/new", lazy: screen(() => import("@/screens/meeting-new-screen/meeting-new-screen")) },
              { path: "schedule/meetings/:id", lazy: screen(() => import("@/screens/meeting-edit-screen/meeting-edit-screen")) },
            ],
          },

          // Admins (Charbel, Elie, Gabriel)
          {
            element: <AP_RequireRole gate="admin" />,
            children: [
              { path: "tasks/new", lazy: screen(() => import("@/screens/new-request-screen/new-request-screen")) },
              { path: "admin/projects", lazy: screen(() => import("@/screens/projects-screen/projects-screen")) },
              { path: "admin/users", lazy: screen(() => import("@/screens/admin-users-screen/admin-users-screen")) },
              { path: "admin/users/new", lazy: screen(() => import("@/screens/admin-user-new-screen/admin-user-new-screen")) },
              { path: "admin/users/:id", lazy: screen(() => import("@/screens/admin-user-screen/admin-user-screen")) },
              { path: "admin/reports", lazy: screen(() => import("@/screens/done-report-screen/done-report-screen")) },
              { path: "admin/activity", lazy: screen(() => import("@/screens/activity-screen/activity-screen")) },
            ],
          },

          { path: "*", Component: NotFoundScreen },
        ],
      },
    ],
  },
]);
