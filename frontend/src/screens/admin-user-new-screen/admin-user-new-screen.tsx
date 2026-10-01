import { useState } from "react";
import { CreateAdminUser } from "@/Shared/SharedService";
import type { CreatedAccount } from "@/Shared/Types";
import { useInvalidatePeople } from "@/hooks/usePeople";
import { AP_AccountForm } from "@/components/AP_AccountForm";
import { AP_TempPassword } from "@/components/AP_TempPassword";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Card } from "@/components/AP_Card";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";

export default function AdminUserNewScreen() {
  useDocumentTitle("New account");
  const invalidate = useInvalidatePeople();
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const create = useApiMutation((body: Record<string, unknown>) => CreateAdminUser(body), {
    onSuccess: (res) => {
      setCreated(res);
      void invalidate();
    },
  });

  return (
    <div className="max-w-3xl">
      <AP_PageHeader title="New account" description="A temporary password is generated; the person sets their own at first sign-in." />
      {created ? (
        <AP_Card className="p-6">
          <AP_TempPassword message={`Account created for ${created.user.name}.`} email={created.user.email} password={created.tempPassword} />
          <div className="mt-5 flex gap-2">
            <AP_LinkButton to={`/people/${created.user.id}`}>View profile</AP_LinkButton>
            <AP_LinkButton to="/admin/users" variant="secondary">
              Back to users
            </AP_LinkButton>
          </div>
        </AP_Card>
      ) : (
        <AP_AccountForm
          submitLabel="Create account"
          pending={create.isPending}
          onSubmit={(body) => create.mutate(body)}
          values={{
            name: "",
            email: "",
            title: "",
            role: "MEMBER",
            department: "",
            manager: "",
            timezone: "Asia/Beirut",
            weeklyCapacityHours: 0,
          }}
        />
      )}
    </div>
  );
}
