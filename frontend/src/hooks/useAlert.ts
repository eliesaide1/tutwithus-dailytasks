import { useCallback, useState } from "react";
import type { AlertButton } from "@/Shared/SharedService";

const DEFAULT_BUTTONS: AlertButton[] = [{ title: "OK" }];

/** State for the app-wide alert (see AP_AlertHost). */
export function useAlert() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [buttons, setButtons] = useState<AlertButton[]>(DEFAULT_BUTTONS);

  const showAlert = useCallback((msg: string, btns?: AlertButton[], alertTitle = "") => {
    setMessage(msg);
    setTitle(alertTitle);
    setButtons(btns?.length ? btns : DEFAULT_BUTTONS);
    setIsVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setIsVisible(false);
    setMessage("");
    setTitle("");
    setButtons(DEFAULT_BUTTONS);
  }, []);

  return { isVisible, message, title, buttons, showAlert, hideAlert };
}
