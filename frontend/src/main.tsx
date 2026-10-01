import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import SharedService from "@/Shared/SharedService";
import { meQueryKey } from "@/hooks/useAuth";
import { AP_AlertHost } from "@/components/AP_AlertHost";
import { router } from "@/router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // A failed request is reported once in the alert; don't repeat it with retries.
      retry: false,
    },
  },
});

// Session expired: forget the user so the route guard returns to /login.
// Temporary password: refresh the session so the guard redirects to /account.
SharedService.setSessionHandler((reason) => {
  if (reason === "expired") queryClient.setQueryData(meQueryKey, null);
  else void queryClient.invalidateQueries({ queryKey: meQueryKey });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <AP_AlertHost />
    </QueryClientProvider>
  </StrictMode>,
);
