import {
  Droplets,
  Home,
  Building2,
  Landmark,
  Sprout,
  HeartPulse,
  Recycle,
  BrainCircuit,
  CloudLightning,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react"
import type { Domain } from "@/lib/domains"

const ICONS: Record<Domain["icon"], LucideIcon> = {
  "water-energy": Droplets,
  home: Home,
  campus: Building2,
  city: Landmark,
  agriculture: Sprout,
  health: HeartPulse,
  waste: Recycle,
  "ai-social": BrainCircuit,
  climate: CloudLightning,
  inclusive: HeartHandshake,
}

export function DomainIcon({ icon, className }: { icon: Domain["icon"]; className?: string }) {
  const Icon = ICONS[icon]
  return <Icon className={className} strokeWidth={1.5} />
}
