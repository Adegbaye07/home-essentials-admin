"use client";

import { useEffect, useState } from "react";

const MD_QUERY = "(min-width: 768px)";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    function onChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMdUp(): boolean {
  return useMediaQuery(MD_QUERY);
}
