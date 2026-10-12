// Seed data for the NextGen Laptops site — copied exactly from the
// original artifact's server actions (SEED_* constants and the settings
// allow-list). Seeding only happens when the store is empty, so admin
// edits are never overwritten.

export const SETTING_KEYS = [
  // Shop identity
  "shop_name",
  "tagline",
  "owner_name",
  "about",
  "hero_headline",
  "hero_subtext",
  // Contact
  "whatsapp_number",
  "phone_number",
  "email",
  // Location & hours
  "address",
  "landmarks",
  "city",
  "postal_code",
  "maps_query",
  "hours_note",
  "warranty_note",
  // Socials
  "instagram_url",
  "instagram_handle",
  "tiktok_url",
  "tiktok_handle",
  "facebook_url",
  "facebook_name",
  // Homepage content & settings
  "announcement_text",
  "announcement_on",
  "floating_whatsapp",
  "trust_items",
  "why_points",
];

export const SETTING_KEY_SET = new Set(SETTING_KEYS);

export const SEED_SETTINGS = {
  shop_name: "NextGen Laptops",
  tagline: "Performance, Quality, Trust",
  owner_name: "Ashar Mehmood",
  about:
    "NextGen Laptops is a laptop shop in Jadoon Plaza Phase 2, Mandian, Abbottabad, run by Ashar Mehmood. We sell new and used laptops for students, freelancers, designers and offices, and we repair and upgrade machines at the same counter. Every used laptop is checked before it is sold, and posted prices are confirmed on WhatsApp before you visit.",
  hero_headline: "Laptops that earn their keep.",
  hero_subtext:
    "New and used laptops, repairs and upgrades from a single counter in Jadoon Plaza, Mandian — checked machines, honest prices, and a 15-day cashback warranty on used stock, as posted.",
  whatsapp_number: "923215744034",
  phone_number: "0321-5744034",
  email: "",
  address: "Jadoon Plaza Phase 2, Mansehra Road, Mandian",
  landmarks:
    "Opposite De Minister Cafe, above H&A clothing store, near COMSATS University Abbottabad Campus, opposite the Army Burn Hall College area.",
  city: "Abbottabad",
  postal_code: "22010",
  maps_query: "Jadoon Plaza Phase 2, Mandian, Abbottabad",
  hours_note: "Call or WhatsApp to confirm today's hours.",
  warranty_note:
    "Check warranty on every used machine, with a 15-day cashback warranty as posted on our TikTok.",
  instagram_url: "https://www.instagram.com/nextgen_laptops_abbottabad",
  instagram_handle: "@nextgen_laptops_abbottabad",
  tiktok_url: "https://www.tiktok.com/@nextgen_5.6",
  tiktok_handle: "@nextgen_5.6",
  facebook_url: "",
  facebook_name: "NextGen Laptops Atd",
  announcement_text:
    "Fresh stock this week — student deals on Dell and HP. Message us on WhatsApp for today's list.",
  announcement_on: "1",
  floating_whatsapp: "1",
  trust_items: [
    "Checked machines, tested before sale",
    "15-day cashback warranty on used laptops",
    "Student-friendly prices near COMSATS",
    "Repairs and upgrades at the same counter",
  ].join("\n"),
  why_points: [
    "Checked before it is sold|Every used laptop is tested at the counter — screen, battery, keyboard and ports — before it goes on the shelf.",
    "Prices confirmed up front|The price we quote on WhatsApp is the price at the counter. No surprises when you arrive.",
    "One counter for everything|Sales, repairs, RAM and SSD upgrades and accessories — bring the machine back to the same people who sold it.",
    "Built for students|Stock picked for COMSATS coursework, freelancing and design work, at prices a student budget can carry.",
  ].join("\n"),
};;

export const KNOWN_DEAL_IMAGES = [
  { match: "830 G7", imageUrl: "hp-elitebook-830-g7.webp" },
  { match: "7400", imageUrl: "dell-latitude-7400-2in1.webp" },
  { match: "i5 11th Gen", imageUrl: "dell-latitude-5420.webp" },
  { match: "i7 11th Gen", imageUrl: "dell-latitude-5520.webp" },
  { match: "i5 8th Gen", imageUrl: "dell-latitude-5490.webp" },
  { match: "Surface", imageUrl: "microsoft-surface-laptop-3.webp" },
];;

export const SEED_DEALS = [
  {
    title: "HP EliteBook 830 G7",
    brand: "HP",
    processor: "Core i5",
    ram: "16GB",
    storage: "256GB SSD",
    display: "13 inch",
    condition: "Used",
    batteryNote: "",
    imageUrl: "hp-elitebook-830-g7.webp",
    price: 68000,
    badge: "As posted",
    featured: 1,
    active: 1,
    sortOrder: 1,
  },
  {
    title: "Dell Laptop — Core i5 11th Gen",
    brand: "Dell",
    processor: "Core i5 11th Gen",
    ram: "16GB",
    storage: "256GB SSD",
    display: "",
    condition: "Used · original Type-C charger included",
    batteryNote: "",
    imageUrl: "dell-latitude-5420.webp",
    price: 59000,
    badge: "As posted",
    featured: 1,
    active: 1,
    sortOrder: 2,
  },
  {
    title: "Dell Laptop — Core i5 8th Gen",
    brand: "Dell",
    processor: "Core i5 8th Gen",
    ram: "",
    storage: "",
    display: "",
    condition: "Used",
    batteryNote: "4+ hours battery backup",
    imageUrl: "dell-latitude-5490.webp",
    price: 42000,
    badge: "As posted",
    featured: 1,
    active: 1,
    sortOrder: 3,
  },
  {
    title: "Dell Latitude 7400 2-in-1",
    brand: "Dell",
    processor: "",
    ram: "",
    storage: "",
    display: "Touch, 360 convertible",
    condition: "Used",
    batteryNote: "",
    imageUrl: "dell-latitude-7400-2in1.webp",
    price: null,
    badge: "2-in-1 Touch",
    featured: 0,
    active: 1,
    sortOrder: 4,
  },
  {
    title: "Dell Laptop — Core i7 11th Gen",
    brand: "Dell",
    processor: "Core i7 11th Gen",
    ram: "16GB",
    storage: "256GB SSD",
    display: "",
    condition: "Used",
    batteryNote: "5+ hours battery backup",
    imageUrl: "dell-latitude-5520.webp",
    price: null,
    badge: "",
    featured: 0,
    active: 1,
    sortOrder: 5,
  },
  {
    title: "Microsoft Surface",
    brand: "Microsoft",
    processor: "Core i5 10th Gen",
    ram: "",
    storage: "",
    display: "2K touch display",
    condition: "Used",
    batteryNote: "",
    imageUrl: "microsoft-surface-laptop-3.webp",
    price: null,
    badge: "2K Touch",
    featured: 0,
    active: 1,
    sortOrder: 6,
  },
];;

export const SEED_SERVICES = [
  {
    title: "New & Used Laptop Sales",
    description:
      "Business laptops, ultrabooks, 2-in-1s and Surfaces in stock — checked used machines and new stock, priced for Abbottabad.",
    sortOrder: 1,
  },
  {
    title: "Laptop Repair",
    description:
      "Screen, keyboard, battery and board-level faults diagnosed at the counter. Bring the machine in, or message a photo of the problem first.",
    sortOrder: 2,
  },
  {
    title: "RAM & SSD Upgrades",
    description:
      "More memory and a fast SSD can give an old laptop years more life. Upgrades fitted while you wait, where parts allow.",
    sortOrder: 3,
  },
  {
    title: "Gaming PCs & Builds",
    description:
      "Gaming laptops and custom PC builds matched to your games and your budget — no oversold parts.",
    sortOrder: 4,
  },
  {
    title: "Accessories",
    description:
      "Chargers (including original Type-C), batteries, bags, mice, keyboards and the small things that keep a setup working.",
    sortOrder: 5,
  },
  {
    title: "Student Deals & Advice",
    description:
      "Near COMSATS and Burn Hall: tell us your course and budget and we will point you at the machine that fits — even if it is the cheaper one.",
    sortOrder: 6,
  },
];;

export const SEED_TESTIMONIALS = [
  {
    name: "COMSATS Student",
    role: "COMSATS University, Abbottabad",
    body: "Bought a Dell Latitude with a Core i7 11th Gen. The rates were better than the rest of the market, and the machine has run exactly as described. Recommended for price and quality.",
    rating: null,
    sortOrder: 1,
  },
  {
    name: "Hassan Khan",
    role: "Customer",
    body: "A youth-run shop worth supporting — wide inventory on the shelf and prices that compete with the bigger markets.",
    rating: null,
    sortOrder: 2,
  },
  {
    name: "Walk-in Customer",
    role: "Visited the shop in Mandian",
    body: "Good price, good quality. Worth the visit if you are buying a laptop in Abbottabad.",
    rating: null,
    sortOrder: 3,
  },
];;

export const SEED_FAQS = [
  {
    question: "Do used laptops come with a warranty?",
    answer:
      "Yes. Used machines carry a check warranty, with a 15-day cashback warranty as posted on our TikTok. Confirm the exact cover for the machine you pick when you message us.",
    sortOrder: 1,
  },
  {
    question: "Are the prices on this page final?",
    answer:
      "Prices shown were posted on our socials, and stock moves fast in Mandian. Message us on WhatsApp to confirm the latest price and availability before you visit.",
    sortOrder: 2,
  },
  {
    question: "Can you upgrade my current laptop instead of selling me a new one?",
    answer:
      "Often, yes. A RAM or SSD upgrade can make an older laptop feel new again. Bring it to the counter and we will tell you honestly whether it is worth it.",
    sortOrder: 3,
  },
  {
    question: "Do you build gaming PCs?",
    answer:
      "Yes — gaming laptops and custom PC builds matched to your games and your budget. Message us what you play and what you can spend.",
    sortOrder: 4,
  },
  {
    question: "Where exactly is the shop?",
    answer:
      "Jadoon Plaza Phase 2, Mansehra Road, Mandian, Abbottabad — opposite De Minister Cafe, above the H&A clothing store, near COMSATS University.",
    sortOrder: 5,
  },
];;
