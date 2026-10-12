// Custom inline SVG icons for the whole site and admin panel.
// Stroke icons are drawn on a 24x24 grid; brand glyphs (WhatsApp, Facebook)
// use filled paths. No emoji or unicode pictographs anywhere.

import type { ReactNode } from "react";

type IconProps = { className?: string };

function Stroke({
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function Filled({ className, d }: IconProps & { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </Stroke>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <Filled
      className={className}
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
    />
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Stroke>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Stroke>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z" />
      <path d="m9 11.5 2 2 4-4.5" />
    </Stroke>
  );
}

export function WrenchIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7Z" />
    </Stroke>
  );
}

export function ChipIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </Stroke>
  );
}

export function BatteryIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="2" y="8" width="16" height="8" rx="2" />
      <path d="M22 12v0a2 2 0 0 0-2-2v4a2 2 0 0 0 2-2ZM6 11v2" />
    </Stroke>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </Stroke>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M6 18 18 6M8 6h10v10" />
    </Stroke>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Stroke>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Stroke>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </Stroke>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </Stroke>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 5v14M5 12h14" />
    </Stroke>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="m4 12.5 5 5L20 6.5" />
    </Stroke>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </Stroke>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <Filled
      className={className}
      d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z"
    />
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </Stroke>
  );
}

export function MusicNoteIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Stroke>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <Filled
      className={className}
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Stroke>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="m6 9 6 6 6-6" />
    </Stroke>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Stroke>
  );
}

export function StoreIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 7 5.5 3h13L20 7M4 7h16M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 21v-6h6v6M4 7a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 4 0" />
    </Stroke>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12.6 3.5H21v8.4l-9.3 9.3a2 2 0 0 1-2.8 0L3.5 15.8a2 2 0 0 1 0-2.8Z" />
      <circle cx="16.5" cy="8" r="1.4" />
    </Stroke>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Stroke>
  );
}

export function QuoteIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M10 11H6a4 4 0 0 1 4-4V5a6 6 0 0 0-6 6v7h6v-7ZM21 11h-4a4 4 0 0 1 4-4V5a6 6 0 0 0-6 6v7h6v-7Z" />
    </Stroke>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3A2.5 2.5 0 1 1 12 12.5V14" />
      <circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none" />
    </Stroke>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Stroke>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 4l16 16M9.9 5.9A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.7M6 8A16.9 16.9 0 0 0 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Stroke>
  );
}

export function LaptopIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="5" y="4" width="14" height="10" rx="1" />
      <path d="M2 18h20M2 18l1.5-4h17L22 18" />
    </Stroke>
  );
}
