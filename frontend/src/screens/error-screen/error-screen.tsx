import { isRouteErrorResponse, useRouteError } from "react-router";
import { AP_LinkButton } from "@/components/AP_LinkButton";

function ErrorScreen({ code, title, text }: { code: string; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-bold text-brand-200">{code}</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{text}</p>
      <AP_LinkButton to="/" className="mt-6">
        Back to dashboard
      </AP_LinkButton>
    </div>
  );
}

export function ForbiddenScreen() {
  return <ErrorScreen code="403" title="You don't have access to this page" text="Ask an admin to update your access if you need it." />;
}

export function NotFoundScreen() {
  return <ErrorScreen code="404" title="Page not found" text="The page you're looking for doesn't exist or was moved." />;
}

export function RouteErrorScreen() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundScreen />;
  console.error(error);
  return (
    <ErrorScreen
      code="Oops"
      title="Something went wrong"
      text={error instanceof Error ? error.message : "An unexpected error occurred. Try reloading the page."}
    />
  );
}
