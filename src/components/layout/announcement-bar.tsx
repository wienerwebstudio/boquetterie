"use client";
import { useEffect, useState } from "react";

export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), 5000);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div className="bg-forest text-ivory">
      <div className="container-x flex h-9 items-center justify-center text-center">
        <p key={i} className="animate-fade-in truncate text-[12px] font-medium tracking-[0.04em] sm:text-[13px]" aria-live="polite">
          {messages[i]}
        </p>
      </div>
    </div>
  );
}
