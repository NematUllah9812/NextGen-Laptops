// Shared types and link/format helpers for the public site and admin panel.
// Every contact link on the site is derived from the stored settings, so an
// admin edit to the WhatsApp or phone number updates the whole site.

import { api, type ApiResponse } from "./api";

export type SiteData = ApiResponse<typeof api, "getSiteData">;
export type Settings = SiteData["settings"];
export type Deal = SiteData["deals"][number];
export type Service = SiteData["services"][number];
export type Testimonial = SiteData["testimonials"][number];
export type Faq = SiteData["faqs"][number];

export function s(settings: Settings, key: string): string {
  return settings[key] ?? "";
}

/** Digits-only international number, e.g. "923215744034". */
export function waDigits(settings: Settings): string {
  return s(settings, "whatsapp_number").replace(/\D/g, "");
}

export function waLink(settings: Settings, text?: string): string {
  const base = `https://wa.me/${waDigits(settings)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** tel: href from the display phone number ("0321-5744034" -> "+923215744034"). */
export function telHref(settings: Settings): string {
  let digits = s(settings, "phone_number").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return `tel:+${digits}`;
}

export function displayPhone(settings: Settings): string {
  return s(settings, "phone_number");
}

export function mapsEmbedUrl(settings: Settings): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(s(settings, "maps_query"))}&output=embed`;
}

export function mapsDirectionsUrl(settings: Settings): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s(settings, "maps_query"))}`;
}

export function formatPrice(price: number): string {
  return `Rs ${price.toLocaleString("en-US")}`;
}

export function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export type WhyPoint = { title: string; text: string };

export function parseWhyPoints(value: string): WhyPoint[] {
  return lines(value).map((line) => {
    const idx = line.indexOf("|");
    if (idx === -1) return { title: line, text: "" };
    return { title: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() };
  });
}

/** Today's date in the shop's timezone, printed like a newspaper dateline. */
export function dateline(): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Karachi",
    }).format(new Date());
  } catch {
    return new Date().toDateString();
  }
}
