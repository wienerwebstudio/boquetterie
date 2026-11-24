import { ClientMessages } from "@/i18n/scope";
import { TrackOnMount } from "@/components/analytics/track-on-mount";

/** Sends the texts this page's Client Components need (see src/i18n/scope.tsx). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ClientMessages ns={["reminders"]}>
      {/* The page is opened from the review request mail – every visit counts as a review click. */}
      <TrackOnMount event="review_clicked" props={{ platform: "blumora" }} />
      {children}
    </ClientMessages>
  );
}
