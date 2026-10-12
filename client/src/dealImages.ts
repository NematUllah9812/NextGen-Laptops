// Official manufacturer product photos for the deal models, hosted with
// the site so they can never break or be hotlink-blocked. Each photo has
// had its white studio background removed — the bundled files are WebP
// cutouts with transparency, so the laptop sits directly on the card in
// both light and dark mode (Site.tsx adds the soft drop shadow):
//   HP EliteBook 830 G7            — HP official product shot
//   Dell Latitude 5420             — Dell official product shot (dell.com)
//   Dell Latitude 5490             — Dell official product shot
//   Dell Latitude 7400 2-in-1      — Dell official shot, tent (360) mode
//   Dell Latitude 5520             — Dell official product shot
//   Microsoft Surface Laptop 3     — Microsoft official product shot
//     (the 10th Gen Intel Surface Laptop)
//
// A deal's stored imageUrl is either a full https URL the owner set in
// admin (used as-is) or one of these built-in keys. Older stored values
// used the ".jpg" spelling of the same key; both spellings resolve to
// the transparent cutout. Deals with no stored value fall back to
// matching by title, so every known model always shows its own photo.

import hpEliteBook830G7 from "./assets/hp-elitebook-830-g7.webp";
import dellLatitude5420 from "./assets/dell-latitude-5420.webp";
import dellLatitude5490 from "./assets/dell-latitude-5490.webp";
import dellLatitude7400 from "./assets/dell-latitude-7400-2in1.webp";
import dellLatitude5520 from "./assets/dell-latitude-5520.webp";
import surfaceLaptop3 from "./assets/microsoft-surface-laptop-3.webp";

export const BUILTIN_DEAL_IMAGES: Record<string, string> = {
  "hp-elitebook-830-g7.webp": hpEliteBook830G7,
  "dell-latitude-5420.webp": dellLatitude5420,
  "dell-latitude-5490.webp": dellLatitude5490,
  "dell-latitude-7400-2in1.webp": dellLatitude7400,
  "dell-latitude-5520.webp": dellLatitude5520,
  "microsoft-surface-laptop-3.webp": surfaceLaptop3,
};

type DealLike = { title: string; imageUrl: string };

const TITLE_MATCHES: Array<{ match: string; key: string }> = [
  { match: "830 G7", key: "hp-elitebook-830-g7.webp" },
  { match: "7400", key: "dell-latitude-7400-2in1.webp" },
  { match: "i5 11th Gen", key: "dell-latitude-5420.webp" },
  { match: "i7 11th Gen", key: "dell-latitude-5520.webp" },
  { match: "i5 8th Gen", key: "dell-latitude-5490.webp" },
  { match: "Surface", key: "microsoft-surface-laptop-3.webp" },
];

function builtinKeyFor(deal: DealLike): string | null {
  const stored = deal.imageUrl.trim();
  if (stored !== "" && !/^https?:\/\//i.test(stored)) {
    const base = stored.split("/").pop() ?? stored;
    if (base in BUILTIN_DEAL_IMAGES) return base;
    // Stored before the background removal: "….jpg" names the same photo.
    const asWebp = base.replace(/\.jpe?g$/i, ".webp");
    if (asWebp in BUILTIN_DEAL_IMAGES) return asWebp;
  }
  const byTitle = TITLE_MATCHES.find((m) => deal.title.includes(m.match));
  return byTitle ? byTitle.key : null;
}

/** The photo URL to render for a deal, or null when none is known. */
export function dealImageSrc(deal: DealLike): string | null {
  const stored = deal.imageUrl.trim();
  if (/^https?:\/\//i.test(stored)) return stored;
  const key = builtinKeyFor(deal);
  return key ? (BUILTIN_DEAL_IMAGES[key] ?? null) : null;
}

// Display names that agree with the photo on the card. The stored title
// stays exactly as the owner typed it (and stays what the admin edits);
// the generic Dell / Surface titles are shown with their Latitude /
// Surface Laptop model family so the name and the picture match.
const DISPLAY_TITLES: Array<{ match: string; display: string }> = [
  { match: "830 G7", display: "HP EliteBook 830 G7" },
  { match: "7400", display: "Dell Latitude 7400 2-in-1" },
  {
    match: "i5 11th Gen",
    display: "Dell Latitude 5420 — Core i5 (11th Gen)",
  },
  {
    match: "i7 11th Gen",
    display: "Dell Latitude 5520 — Core i7 (11th Gen)",
  },
  {
    match: "i5 8th Gen",
    display: "Dell Latitude 5490 — Core i5 (8th Gen)",
  },
  {
    match: "Surface",
    display: "Microsoft Surface Laptop — Core i5 (10th Gen)",
  },
];

export function dealDisplayTitle(deal: DealLike): string {
  const known = DISPLAY_TITLES.find((d) => deal.title.includes(d.match));
  return known ? known.display : deal.title;
}

/** Alt text naming the exact model in the photo. */
export function dealImageAlt(deal: DealLike): string {
  return `${dealDisplayTitle(deal)} — official product photo`;
}

/** The hero photo: the HP EliteBook 830 G7 cutout (background removed). */
export const HERO_IMAGE = hpEliteBook830G7;
export const HERO_IMAGE_ALT = "HP EliteBook 830 G7 — official product photo";
