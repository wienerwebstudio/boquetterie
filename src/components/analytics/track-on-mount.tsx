"use client";
import { useEffect, useRef } from "react";
import { track, type EventName, type TrackProps } from "./track";

/**
 * Fires one event when mounted – lets Server Components report a page visit
 * without importing `track` themselves. Props must not contain personal data.
 */
export function TrackOnMount({ event, props }: { event: EventName; props?: TrackProps }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, props);
  }, [event, props]);
  return null;
}
