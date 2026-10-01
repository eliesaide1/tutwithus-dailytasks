import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { GetAdminUsers } from "@/Shared/SharedService";
import { peopleKeys } from "@/hooks/usePeople";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_AdminUsersTable } from "@/components/AP_AdminUsersTable";

export default function AdminUsersScreen() {
  useDocumentTitle("Users & access");
  const q = useQuery({ queryKey: peopleKeys.adminUsers, queryFn: GetAdminUsers });
  const users = q.data?.users ?? [];

  return (
    <>
      <AP_PageHeader
        title="Users & access"
        count={q.data ? users.length : undefined}
        description="Create accounts, set roles, reset passwords."
        actions={
          <AP_LinkButton to="/admin/users/new">
            <UserPlus className="size-4" /> New account
          </AP_LinkButton>
        }
      />
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
        <AP_AdminUsersTable users={users} />
      </AP_QueryState>
    </>
  );
}
