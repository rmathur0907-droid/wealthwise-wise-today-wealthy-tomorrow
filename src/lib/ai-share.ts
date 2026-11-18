import { useCallback, useEffect, useState } from "react";

const KEY = "ww.aiShare";
/** Whether the user allowed WealthWise AI chat to read their finance data (off until they opt in). */
export function useAiShare() {
  const [share, setShareState] = useState(false);
  useEffect(() => setShareState(window.localStorage.getItem(KEY) === "1"), []);
  const setShare = useCallback((v: boolean) => {
    setShareState(v);
    window.localStorage.setItem(KEY, v ? "1" : "0");
  }, []);
  return [share, setShare] as const;
}
