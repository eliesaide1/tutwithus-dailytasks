import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { GetAdminUser, UpdateAdminUser } from "@/Shared/SharedService";
import type { AccountUser } from "@/Shared/Types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { peopleKeys, useInvalidatePeople } from "@/hooks/usePeople";
import { AP_AccountForm } from "@/components/AP_AccountForm";
import { AP_AccountSecurity } from "@/components/AP_AccountSecurity";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";

export default function AdminUserScreen() {
  const { id = "" } = useParams();
  const q = useQuery({
    queryKey: peopleKeys.adminUser(id),
    queryFn: () => GetAdminUser(id),
  });
  useDocumentTitle(q.data?.user.name ?? "Manage account");
  const user = q.data?.user;

  return (
    <div className="max-w-3xl space-y-6">
      <AP_PageHeader
        title={user?.name ?? "Manage account"}
        description={
          <>
            Account settings ·{" "}
            <Link to={`/people/${id}`} className="text-brand-700 hover:underline">
              view profile
            </Link>
          </>
        }
      />
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
        {user && (
          <>
            <EditAccount user={user} />
            <AP_AccountSecurity user={user} />
          </>
        )}
      </AP_QueryState>
    </div>
  );
}

function EditAccount({ user }: { user: AccountUser }) {
  const invalidate = useInvalidatePeople();
  const update = useApiMutation((body: Record<string, unknown>) => UpdateAdminUser(user.id, body), {
    onSuccess: () => invalidate(),
  });
  return (
    <AP_AccountForm
      userId={user.id}
      submitLabel="Save changes"
      pending={update.isPending}
      success={update.isSuccess ? "Changes saved." : null}
      onSubmit={(body) => update.mutate(body)}
      values={{
        name: user.name,
        email: user.email,
        title: user.title,
        role: user.role,
        department: user.department ?? "",
        manager: user.manager ?? "",
        timezone: user.timezone,
        weeklyCapacityHours: user.weeklyCapacityMins / 60,
      }}
    />
  );
}
