// Public homepage: a soft, calm, Apple-like design — light grey and white
// bands, one idea per section, generous white space, pill buttons, thin
// SVG icons. Every word and number comes from the data store
// (getSiteData), so admin edits change this page. There is deliberately
// no link to the admin panel anywhere on this page.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import { api } from "./api";
import {
displayPhone,
formatPrice,
lines,
mapsDirectionsUrl,
mapsEmbedUrl,
parseWhyPoints,
s,
telHref,
waLink,
type Deal,
type Settings,
type SiteData,
} from "./lib";
import {
dealDisplayTitle,
dealImageAlt,
dealImageSrc,
HERO_IMAGE,
HERO_IMAGE_ALT,
} from "./dealImages";
import {
ArrowUpRightIcon,
BatteryIcon,
CheckIcon,
ChevronDownIcon,
ChipIcon,
ClockIcon,
FacebookIcon,
InstagramIcon,
LaptopIcon,
MailIcon,
MapPinIcon,
MenuIcon,
MusicNoteIcon,
PhoneIcon,
ShieldCheckIcon,
StarIcon,
WhatsAppIcon,
WrenchIcon,
XIcon,
} from "./icons";

const NAV = [
  { label: "Deals", href: "#deals" },
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why" },
  { label: "Visit", href: "#visit" },
];

function SectionHeading({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      {sub ? <p className="mt-3 text-[17px] leading-relaxed text-[var(--dim)]">{sub}</p> : null}
    </div>
  );
}

/** The hero's one visual: the official HP photo of a model actually sold
 * here — background removed, so it sits directly on the page with a soft
 * shadow in both colour modes. */
function HeroVisual() {
  return (
    <img
      src={HERO_IMAGE}
      alt={HERO_IMAGE_ALT}
      className="hero-laptop mx-auto w-full max-w-[560px]"
      loading="eager"
    />
  );
}

function specLine(deal: Deal): string {
  return [deal.processor, deal.ram, deal.storage, deal.display]
    .filter((v) => v && v.trim() !== "")
    .join("  ·  ");
}

function DealCard({ settings, deal }: { settings: Settings; deal: Deal }) {
  const specs = specLine(deal);
  const title = dealDisplayTitle(deal);
  const imageSrc = dealImageSrc(deal);
  const message = `Assalam-o-Alaikum, I saw the ${title} on your website. Is it still available?`;
  return (
    <article className="deal-card flex flex-col overflow-hidden rounded-[24px] bg-[var(--surface)]">
      {imageSrc ? (
        <div className="flex aspect-[16/10] items-center justify-center px-6 pb-1 pt-7">
          <img
            src={imageSrc}
            alt={dealImageAlt(deal)}
            loading="lazy"
            className="laptop-img max-h-full w-full object-contain"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-7">
      {deal.brand ? (
        <p className="text-[13px] font-medium text-[var(--dim)]">{deal.brand}</p>
      ) : null}
      <h3 className="mt-1 text-xl font-semibold leading-snug tracking-tight">{title}</h3>
      {specs ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">{specs}</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
          Full specs on request — message us.
        </p>
      )}
      {deal.condition || deal.batteryNote ? (
        <p className="mt-1 text-sm text-[var(--dim)]">
          {[deal.condition, deal.batteryNote].filter((v) => v && v.trim() !== "").join("  ·  ")}
        </p>
      ) : null}
      <div className="mt-auto pt-6">
        {deal.price !== null ? (
          <>
            <p className="text-lg font-semibold">{formatPrice(deal.price)}</p>
            <p className="mt-0.5 text-xs text-[var(--dim)]">Confirm latest price on WhatsApp</p>
          </>
        ) : (
          <p className="text-lg font-semibold">Ask for price</p>
        )}
        {deal.badge ? (
          <p className="mt-3 inline-block rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-medium text-[var(--dim)]">
            {deal.badge}
          </p>
        ) : null}
        <div className="mt-4">
          <a
            href={waLink(settings, message)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Ask about ${title} on WhatsApp`}
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--wa)] hover:underline"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Ask on WhatsApp
          </a>
        </div>
      </div>
      </div>
    </article>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[17px] font-medium">{q}</span>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-[var(--dim)] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <p className="pb-6 pr-8 text-[15px] leading-relaxed text-[var(--dim)]">{a}</p> : null}
    </div>
  );
}

const SERVICE_ICONS = [WrenchIcon, ChipIcon, BatteryIcon, LaptopIcon, ShieldCheckIcon, CheckIcon];

export function Site() {
  const query = useQuery({ queryKey: ["site-data"], queryFn: () => api.getSiteData({}) });
  const [menuOpen, setMenuOpen] = useState(false);

  const data: SiteData | undefined = query.data;

  useEffect(() => {
    if (data) {
      const name = s(data.settings, "shop_name");
      const city = s(data.settings, "city");
      document.title = `${name} — Laptops in ${city} | ${s(data.settings, "tagline")}`;
    }
  }, [data]);

  if (query.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--dim)]">Loading…</p>
      </div>
    );
  }

  if (query.error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] px-6 text-center">
        <p className="text-2xl font-semibold tracking-tight">The page could not be loaded.</p>
        <p className="max-w-sm text-[15px] text-[var(--dim)]">
          Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  const settings = data.settings;
  const shopName = s(settings, "shop_name");
  const phone = displayPhone(settings);
  const email = s(settings, "email");
  const trust = lines(s(settings, "trust_items"));
  const why = parseWhyPoints(s(settings, "why_points")).slice(0, 3);
  const announcementOn =
    s(settings, "announcement_on") === "1" && s(settings, "announcement_text") !== "";
  const floatingOn = s(settings, "floating_whatsapp") === "1";
  const featured = data.deals.filter((d) => d.featured);
  const rest = data.deals.filter((d) => !d.featured);
  const orderedDeals = [...featured, ...rest];
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <SafeAreaTopScrim backgroundColor="var(--surface)" />

      {/* Slim announcement line — quiet, static, one line only */}
      {announcementOn ? (
        <div className="bg-[var(--surface-alt)] px-4 py-2 text-center text-[13px] text-[var(--dim)]">
          {s(settings, "announcement_text")}
        </div>
      ) : null}

      {/* Translucent sticky header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)]/60 bg-[var(--surface)]/70 pt-safe shadow-[var(--shadow-header)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-5">
          <a href="#top" className="truncate text-[17px] font-semibold tracking-tight">
            {shopName}
          </a>
          <nav aria-label="Sections" className="ml-auto hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--dim)] transition-colors hover:text-[var(--text)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href={telHref(settings)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 md:ml-0"
          >
            <PhoneIcon className="h-3.5 w-3.5" />
            Call
          </a>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--dim)] hover:bg-[var(--surface-alt)] md:hidden"
          >
            {menuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen ? (
          <nav aria-label="Sections mobile" className="border-t border-[var(--border)]/60 px-5 py-2 md:hidden">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-[15px] text-[var(--dim)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      <main id="top">
        {/* Hero — one headline, one sentence, two buttons, one visual */}
        <section className="bg-[var(--surface)]">
          <div className="hero-in mx-auto max-w-5xl px-5 pb-16 pt-16 text-center md:pb-24 md:pt-24">
              <h1 className="mx-auto max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
                {s(settings, "hero_headline")}
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--dim)] md:text-xl">
                {s(settings, "hero_subtext")}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#deals"
                  className="rounded-full bg-[var(--accent)] px-6 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Browse deals
                </a>
                <a
                  href={waLink(settings, "Assalam-o-Alaikum, I have a question about a laptop.")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-alt)] px-6 py-3 text-[15px] font-medium text-[var(--text)] transition-opacity hover:opacity-80"
                >
                  <WhatsAppIcon className="h-4.5 w-4.5 text-[var(--wa)]" />
                  WhatsApp us
                </a>
              </div>
              <p className="mx-auto mt-7 flex max-w-md items-center justify-center gap-1.5 text-sm text-[var(--dim)]">
                <ShieldCheckIcon className="h-4 w-4 shrink-0" />
                {s(settings, "warranty_note")}
              </p>
              <div className="mt-12 md:mt-16">
                <HeroVisual />
              </div>
          </div>
        </section>

        {/* Deals */}
        <section id="deals" className="scroll-mt-20">
          <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
                          <SectionHeading
                title="This week's deals"
                sub="Checked machines, ready at the counter. Stock moves fast — ask before you visit."
              />
              {orderedDeals.length === 0 ? (
                <p className="text-center text-[15px] text-[var(--dim)]">
                  The shelf is being restocked. Message us on WhatsApp for today's list.
                </p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {orderedDeals.map((deal) => (
                    <DealCard key={deal.id} settings={settings} deal={deal} />
                  ))}
                </div>
              )}
                      </div>
        </section>

        {/* Services — one soft white band, quiet two-column list */}
        <section id="services" className="scroll-mt-20 bg-[var(--surface)]">
          <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
                          <SectionHeading
                title="At the counter"
                sub="Sales, repairs and upgrades — under one roof, from the same people."
              />
              <div className="mx-auto grid max-w-3xl gap-x-12 gap-y-8 md:grid-cols-2">
                {data.services.map((service, i) => {
                  const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length] ?? WrenchIcon;
                  return (
                    <div key={service.id} className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-alt)] text-[var(--dim)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-[17px] font-semibold tracking-tight">{service.title}</h3>
                        <p className="mt-1 text-[15px] leading-relaxed text-[var(--dim)]">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
                      </div>
        </section>

        {/* Why NextGen — three short statements, centred */}
        <section id="why" className="scroll-mt-20">
          <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
                          <SectionHeading title="Why NextGen" />
              <div className="grid gap-10 text-center md:grid-cols-3 md:gap-8">
                {why.map((point) => (
                  <div key={point.title} className="mx-auto max-w-xs">
                    <h3 className="text-xl font-semibold tracking-tight">{point.title}</h3>
                    {point.text ? (
                      <p className="mt-2 text-[15px] leading-relaxed text-[var(--dim)]">
                        {point.text}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mx-auto mt-14 max-w-2xl text-center text-[15px] leading-relaxed text-[var(--dim)]">
                {s(settings, "about")}
              </p>
              {trust.length > 0 ? (
                <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
                  {trust.map((item) => (
                    <li
                      key={item}
                      className="inline-flex items-center gap-1.5 text-[13px] text-[var(--dim)]"
                    >
                      <CheckIcon className="h-3.5 w-3.5 text-[var(--wa)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
                      </div>
        </section>

        {/* Testimonials — a few very light cards */}
        <section className="bg-[var(--surface)]">
          <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
                          <SectionHeading title="From the counter" sub="What customers say, in their words." />
              <div className="grid gap-6 md:grid-cols-3">
                {data.testimonials.slice(0, 3).map((t) => (
                  <figure key={t.id} className="rounded-[24px] border border-[var(--card-ring)] bg-[var(--surface-alt)] p-7 shadow-[var(--shadow-card)]">
                    {t.rating !== null ? (
                      <p
                        className="flex gap-0.5 text-[var(--wa)]"
                        aria-label={`Rated ${t.rating} out of 5`}
                      >
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <StarIcon key={i} className="h-3.5 w-3.5" />
                        ))}
                      </p>
                    ) : null}
                    <blockquote className="mt-3 text-[17px] leading-relaxed">
                      “{t.body}”
                    </blockquote>
                    <figcaption className="mt-4 text-sm text-[var(--dim)]">
                      {t.name}
                      {t.role ? ` — ${t.role}` : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
                      </div>
        </section>

        {/* Visit — quiet address left, soft rounded map right */}
        <section id="visit" className="scroll-mt-20">
          <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
                          <SectionHeading title="Visit the shop" />
              <div className="grid items-start gap-10 md:grid-cols-2 md:gap-14">
                <div>
                  <p className="flex items-start gap-3">
                    <MapPinIcon className="mt-1 h-5 w-5 shrink-0 text-[var(--dim)]" />
                    <span>
                      <span className="block text-xl font-semibold tracking-tight">
                        {s(settings, "address")}
                      </span>
                      <span className="mt-1 block text-[15px] text-[var(--dim)]">
                        {s(settings, "city")}, Khyber Pakhtunkhwa {s(settings, "postal_code")}
                      </span>
                    </span>
                  </p>
                  <p className="mt-5 pl-8 text-[15px] leading-relaxed text-[var(--dim)]">
                    {s(settings, "landmarks")}
                  </p>
                  <p className="mt-5 flex items-start gap-3 text-[15px]">
                    <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dim)]" />
                    {s(settings, "hours_note")}
                  </p>
                  <p className="mt-3 flex items-start gap-3 text-[15px]">
                    <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dim)]" />
                    <a href={telHref(settings)} className="text-[var(--accent)] hover:underline">
                      {phone}
                    </a>
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3 pl-8">
                    <a
                      href={mapsDirectionsUrl(settings)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Get directions
                      <ArrowUpRightIcon className="h-4 w-4" />
                    </a>
                    <a
                      href={waLink(settings, "Assalam-o-Alaikum, I have a question about a laptop.")}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-5 py-2.5 text-sm font-medium shadow-[var(--shadow-card)] transition-opacity hover:opacity-80"
                    >
                      <WhatsAppIcon className="h-4 w-4 text-[var(--wa)]" />
                      WhatsApp us
                    </a>
                  </div>
                  <div className="mt-10 border-t border-[var(--border)] pl-8 pt-6">
                    <div className="flex flex-col gap-2.5">
                      {s(settings, "instagram_url") ? (
                        <a
                          href={s(settings, "instagram_url")}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2.5 text-[15px] text-[var(--dim)] hover:text-[var(--text)]"
                        >
                          <InstagramIcon className="h-5 w-5" /> {s(settings, "instagram_handle")}
                        </a>
                      ) : null}
                      {s(settings, "tiktok_url") ? (
                        <a
                          href={s(settings, "tiktok_url")}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2.5 text-[15px] text-[var(--dim)] hover:text-[var(--text)]"
                        >
                          <MusicNoteIcon className="h-5 w-5" /> {s(settings, "tiktok_handle")}
                        </a>
                      ) : null}
                      {s(settings, "facebook_url") ? (
                        <a
                          href={s(settings, "facebook_url")}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2.5 text-[15px] text-[var(--dim)] hover:text-[var(--text)]"
                        >
                          <FacebookIcon className="h-5 w-5" /> {s(settings, "facebook_name")}
                        </a>
                      ) : s(settings, "facebook_name") ? (
                        <span className="inline-flex items-center gap-2.5 text-[15px] text-[var(--dim)]">
                          <FacebookIcon className="h-5 w-5" /> {s(settings, "facebook_name")}
                        </span>
                      ) : null}
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="inline-flex items-center gap-2.5 text-[15px] text-[var(--dim)] hover:text-[var(--text)]"
                        >
                          <MailIcon className="h-5 w-5" /> {email}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[24px] border border-[var(--card-ring)] bg-[var(--surface-alt)] shadow-[var(--shadow-card)]">
                  <iframe
                    title={`Map — ${shopName}, ${s(settings, "maps_query")}`}
                    src={mapsEmbedUrl(settings)}
                    className="h-80 w-full md:h-full md:min-h-[420px]"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
                      </div>
        </section>

        {/* FAQ — minimal accordion, hairline dividers */}
        <section id="faq" className="scroll-mt-20 bg-[var(--surface)]">
          <div className="mx-auto max-w-3xl px-5 py-20 md:py-28">
                          <SectionHeading title="Questions, answered" />
              <div className="border-t border-[var(--border)]">
                {data.faqs.map((faq) => (
                  <FaqItem key={faq.id} q={faq.question} a={faq.answer} />
                ))}
              </div>
                      </div>
        </section>
      </main>

      {/* Footer — simple, small, quiet */}
      <footer>
        <div className="mx-auto max-w-5xl px-5 py-14 text-center">
          <p className="text-[15px] font-semibold tracking-tight">{shopName}</p>
          <p className="mt-1.5 text-[13px] text-[var(--dim)]">{s(settings, "tagline")}</p>
          <p className="mt-5 text-[13px] leading-relaxed text-[var(--dim)]">
            {s(settings, "address")}, {s(settings, "city")} {s(settings, "postal_code")}
            <br />
            Call / WhatsApp: {phone}
            {email ? (
              <>
                <br />
                {email}
              </>
            ) : null}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]">
            {s(settings, "instagram_url") ? (
              <a
                href={s(settings, "instagram_url")}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Instagram
              </a>
            ) : null}
            {s(settings, "tiktok_url") ? (
              <a
                href={s(settings, "tiktok_url")}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                TikTok
              </a>
            ) : null}
            {s(settings, "facebook_url") ? (
              <a
                href={s(settings, "facebook_url")}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Facebook
              </a>
            ) : null}
            <a href="#top" className="text-[var(--accent)] hover:underline">
              Back to top
            </a>
          </div>
          <p className="mt-8 text-xs text-[var(--dim)]">
            © {year} {shopName}. Run by {s(settings, "owner_name")}.
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp button — soft and round */}
      {floatingOn ? (
        <a
          href={waLink(settings, "Assalam-o-Alaikum, I have a question about a laptop.")}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--wa)] text-white shadow-[var(--shadow-pop)] transition-transform hover:scale-105"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      ) : null}
    </div>
  );
}
