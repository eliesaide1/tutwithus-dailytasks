import { useLocation } from "react-router";

/** Router state carried by links so the destination can offer "Back to <where you were>". */
export type BackState = { from: string; fromLabel: string };

/**
 * State to put on a <Link> so the next page can return here, including the current
 * query string (e.g. the week you were looking at on My week).
 * Usage: <Link to="/tasks/3" state={backHere}>
 */
export function useBackHere(label: string): BackState {
  const { pathname, search } = useLocation();
  return { from: pathname + search, fromLabel: label };
}

/** Where the current page was opened from, if the link provided it. */
export function useBackTarget(): BackState | null {
  const state = useLocation().state as Partial<BackState> | null;
  return state?.from?.startsWith("/") && state.fromLabel ? { from: state.from, fromLabel: state.fromLabel } : null;
}
