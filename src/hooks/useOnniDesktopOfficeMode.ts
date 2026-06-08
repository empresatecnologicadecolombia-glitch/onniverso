import { useCallback, useEffect, useState } from "react";
import { isElectronDesktopApp } from "@/lib/deviceDetection";
import { readDesktopOfficeMode, writeDesktopOfficeMode } from "@/lib/onniDesktop/officeMode";

export function useOnniDesktopOfficeMode() {
  const [enabled, setEnabled] = useState(false);
  const available = isElectronDesktopApp();

  useEffect(() => {
    if (!available) {
      setEnabled(false);
      return;
    }
    setEnabled(readDesktopOfficeMode());
  }, [available]);

  const setOfficeMode = useCallback(
    (next: boolean) => {
      if (!available) return;
      writeDesktopOfficeMode(next);
      setEnabled(next);
    },
    [available],
  );

  const toggleOfficeMode = useCallback(() => {
    setOfficeMode(!enabled);
  }, [enabled, setOfficeMode]);

  return { available, enabled, setOfficeMode, toggleOfficeMode };
}
