import { type FormEvent } from "react";
import { CreateAnnouncement } from "@/Shared/SharedService";
import { formValues } from "@/Shared/SharedFunctions";
import { useApiMutation } from "@/hooks/useApiMutation";
import { AP_Button } from "./AP_Button";
import { AP_Checkbox } from "./AP_Checkbox";
import { AP_Field } from "./AP_Field";
import { AP_Input } from "./AP_Input";
import { AP_Textarea } from "./AP_Textarea";

/** Manager form to post a team announcement (optionally pinned / notifying everyone). */
export function AP_AnnouncementForm() {
  const create = useApiMutation(CreateAnnouncement, { invalidate: [["announcements"], ["dashboard"]] });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    create.mutate(formValues(form), { onSuccess: () => form.reset() });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 px-5 py-4">
      <AP_Field label="Title">
        <AP_Input name="title" required maxLength={160} />
      </AP_Field>
      <AP_Field label="Message">
        <AP_Textarea name="body" required rows={4} />
      </AP_Field>
      <div className="flex flex-wrap gap-4">
        <AP_Checkbox name="pinned" label="Pin to the top" />
        <AP_Checkbox name="notifyAll" label="Notify everyone" defaultChecked />
      </div>
      <AP_Button type="submit" disabled={create.isPending}>
        {create.isPending ? "Posting…" : "Post announcement"}
      </AP_Button>
    </form>
  );
}
