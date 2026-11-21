import { Leaf, Truck, CalendarDays, Mail, Flower2, PenLine, ShieldCheck, Lock, Sparkles, Clock, MapPin, Gift, type LucideProps } from "lucide-react";

const map: Record<string, React.ComponentType<LucideProps>> = {
  leaf: Leaf, truck: Truck, calendar: CalendarDays, mail: Mail, flower: Flower2, pen: PenLine,
  shield: ShieldCheck, lock: Lock, sparkles: Sparkles, clock: Clock, pin: MapPin, gift: Gift,
};

export function TrustIcon({ name, className }: { name: string; className?: string }) {
  const Icon = map[name] ?? Sparkles;
  return <Icon className={className} strokeWidth={1.4} aria-hidden />;
}
