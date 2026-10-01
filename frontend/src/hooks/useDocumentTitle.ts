import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · TutWithUs Team` : "TutWithUs Team";
  }, [title]);
}
