import { useEffect, useRef } from "react";
import SharedService from "@/Shared/SharedService";
import { useAlert } from "@/hooks/useAlert";
import { AP_Alert } from "./AP_Alert";

/**
 * Mounted once at the top of the app. Registers itself with SharedService so any
 * backend error (or SharedService.showAlert call) pops up here.
 */
export function AP_AlertHost() {
  const { isVisible, message, title, buttons, showAlert, hideAlert } = useAlert();

  const showAlertRef = useRef(showAlert);
  const current = useRef({ isVisible, message });
  useEffect(() => {
    showAlertRef.current = showAlert;
    current.current = { isVisible, message };
  });

  // Register the callback exactly once.
  useEffect(() => {
    SharedService.setAlertHandler((msg, btns, alertTitle) => {
      // The same error twice in a row (e.g. a retried request) shows a single alert.
      if (current.current.isVisible && current.current.message === msg) return;
      showAlertRef.current(msg, btns, alertTitle);
    });
  }, []);

  return (
    <AP_Alert isVisible={isVisible} hideAlert={hideAlert} title={title} buttons={buttons}>
      {message}
    </AP_Alert>
  );
}
