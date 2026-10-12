// Admin panel, reached only by typing the /admin route (no link to it
// exists anywhere on the public site). Login is checked on the server;
// the returned session token is kept in this browser and sent with every
// admin action. Layout: a grouped sidebar, one clean section at a time,
// a Save button per section with a visible confirmation.

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import { dealImageSrc } from "./dealImages";
import { formatPrice, s } from "./lib";
import {
CheckIcon,
EyeIcon,
EyeOffIcon,
GridIcon,
HelpIcon,
LogoutIcon,
MapPinIcon,
PencilIcon,
PhoneIcon,
PlusIcon,
QuoteIcon,
SlidersIcon,
StoreIcon,
TagIcon,
TrashIcon,
WhatsAppIcon,
WrenchIcon,
XIcon,
} from "./icons";

type AdminData = ApiResponse<typeof api, "getAdminData">;
type Deal = AdminData["deals"][number];
type Service = AdminData["services"][number];
type Testimonial = AdminData["testimonials"][number];
type Faq = AdminData["faqs"][number];

const TOKEN_KEY = "nextgen-admin-token";

type SectionId =
  | "overview"
  | "identity"
  | "contact"
  | "location"
  | "socials"
  | "deals"
  | "services"
  | "testimonials"
  | "faqs"
  | "homepage";

const NAV_GROUPS: Array<{
  group: string;
  items: Array<{ id: SectionId; label: string; icon: ReactNode }>;
}> = [
  {
    group: "Start",
    items: [{ id: "overview", label: "Overview", icon: <GridIcon className="h-4.5 w-4.5" /> }],
  },
  {
    group: "Shop details",
    items: [
      { id: "identity", label: "Shop Identity", icon: <StoreIcon className="h-4.5 w-4.5" /> },
      { id: "contact", label: "Contact", icon: <PhoneIcon className="h-4.5 w-4.5" /> },
      { id: "location", label: "Location & Hours", icon: <MapPinIcon className="h-4.5 w-4.5" /> },
      { id: "socials", label: "Socials", icon: <WhatsAppIcon className="h-4.5 w-4.5" /> },
    ],
  },
  {
    group: "Content",
    items: [
      { id: "deals", label: "Deals / Inventory", icon: <TagIcon className="h-4.5 w-4.5" /> },
      { id: "services", label: "Services", icon: <WrenchIcon className="h-4.5 w-4.5" /> },
      { id: "testimonials", label: "Testimonials", icon: <QuoteIcon className="h-4.5 w-4.5" /> },
      { id: "faqs", label: "FAQs", icon: <HelpIcon className="h-4.5 w-4.5" /> },
      { id: "homepage", label: "Homepage Settings", icon: <SlidersIcon className="h-4.5 w-4.5" /> },
    ],
  },
];

// ---------------------------------------------------------------------------
// Small form primitives
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";
const labelCls =
  "mb-1 block text-xs font-medium text-[var(--dim)]";

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
      {help ? <p className="mt-1 text-xs leading-relaxed text-[var(--dim)]">{help}</p> : null}
    </div>
  );
}

function SaveBar({
  onSave,
  saving,
  saved,
  error,
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        <CheckIcon className="h-4 w-4" />
        {saving ? "Saving…" : "Save changes"}
      </button>
      {saved ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
          <CheckIcon className="h-4 w-4" /> Saved — the website is updated.
        </span>
      ) : null}
      {error ? <span className="text-sm font-medium text-[var(--danger)]">{error}</span> : null}
    </div>
  );
}

function SectionShell({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--dim)]">{blurb}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Settings sections (identity / contact / location / socials / homepage)
// ---------------------------------------------------------------------------

type FieldDef = {
  key: string;
  label: string;
  help?: string;
  multiline?: boolean;
  toggle?: boolean;
};

function SettingsForm({
  token,
  settings,
  fields,
  cols,
}: {
  token: string;
  settings: Record<string, string>;
  fields: FieldDef[];
  cols?: boolean;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.key] = settings[f.key] ?? "";
    return init;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.updateSettings({ token, values }),
    onSuccess: (res) => {
      if (res.ok) {
        setSaved(true);
        setError(null);
        void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
        void queryClient.invalidateQueries({ queryKey: ["site-data"] });
      } else {
        setSaved(false);
        setError(res.error ?? "Could not save. Please try again.");
      }
    },
    onError: () => setError("Could not save. Please check your connection and try again."),
  });

  const set = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <div>
      <div className={cols ? "grid gap-5 sm:grid-cols-2" : "grid gap-5"}>
        {fields.map((f) => (
          <div key={f.key} className={f.multiline ? "sm:col-span-2" : undefined}>
            <Field label={f.label} help={f.help}>
              {f.toggle ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={values[f.key] === "1"}
                  aria-label={f.label}
                  onClick={() => set(f.key, values[f.key] === "1" ? "0" : "1")}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    values[f.key] === "1" ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      values[f.key] === "1" ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              ) : f.multiline ? (
                <textarea
                  aria-label={f.label}
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={4}
                  className={inputCls}
                />
              ) : (
                <input
                  aria-label={f.label}
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={inputCls}
                />
              )}
            </Field>
          </div>
        ))}
      </div>
      <SaveBar
        onSave={() => mutation.mutate()}
        saving={mutation.isPending}
        saved={saved}
        error={error}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.adminLogin({ username: username.trim(), password }),
    onSuccess: (res) => {
      if (res.ok && res.token) {
        onLogin(res.token);
      } else {
        setError(res.error ?? "Login failed.");
      }
    },
    onError: () => setError("Could not reach the server. Please try again."),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">Admin</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Shop admin login</h1>
        <p className="mt-1 text-sm text-[var(--dim)]">Sign in to edit the website content.</p>
        <div className="mt-5 grid gap-4">
          <Field label="Username">
            <input
              aria-label="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Password">
            <input
              aria-label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        {error ? <p className="mt-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-5 w-full bg-[var(--accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Checking…" : "Log in"}
        </button>
        <a href="#/" className="mt-4 block text-center font-mono text-xs text-[var(--dim)] hover:text-[var(--accent)]">
          Back to the website
        </a>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deals CRUD
// ---------------------------------------------------------------------------

function DealForm({
  token,
  deal,
  nextSort,
  onClose,
  onSaved,
}: {
  token: string;
  deal: Deal | null;
  nextSort: number;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(deal?.title ?? "");
  const [brand, setBrand] = useState(deal?.brand ?? "");
  const [processor, setProcessor] = useState(deal?.processor ?? "");
  const [ram, setRam] = useState(deal?.ram ?? "");
  const [storage, setStorage] = useState(deal?.storage ?? "");
  const [display, setDisplay] = useState(deal?.display ?? "");
  const [condition, setCondition] = useState(deal?.condition ?? "Used");
  const [batteryNote, setBatteryNote] = useState(deal?.batteryNote ?? "");
  const [imageUrl, setImageUrl] = useState(deal?.imageUrl ?? "");
  const [price, setPrice] = useState(deal?.price !== null && deal ? String(deal.price) : "");
  const [badge, setBadge] = useState(deal?.badge ?? "");
  const [featured, setFeatured] = useState(deal?.featured ?? false);
  const [active, setActive] = useState(deal?.active ?? true);
  const [sortOrder, setSortOrder] = useState(String(deal?.sortOrder ?? nextSort));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const priceTrim = price.trim();
      let priceValue: number | null = null;
      if (priceTrim !== "") {
        const n = Number(priceTrim.replace(/,/g, ""));
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
          throw new Error("Price must be a whole number of rupees, or left empty for Ask for price.");
        }
        priceValue = n;
      }
      if (title.trim() === "") throw new Error("Title is required.");
      return api.saveDeal({
        token,
        id: deal?.id ?? null,
        title,
        brand,
        processor,
        ram,
        storage,
        display,
        condition,
        batteryNote,
        imageUrl,
        price: priceValue,
        badge,
        featured,
        active,
        sortOrder: Number(sortOrder) || 0,
      });
    },
    onSuccess: (res) => {
      if (res.ok) {
        void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
        void queryClient.invalidateQueries({ queryKey: ["site-data"] });
        onSaved(deal ? "Deal updated." : "Deal added.");
        onClose();
      } else {
        setError(res.error ?? "Could not save the deal.");
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save the deal."),
  });

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">{deal ? "Edit deal" : "Add a deal"}</h3>
        <button type="button" onClick={onClose} aria-label="Close deal form" className="p-1 text-[var(--dim)] hover:text-[var(--text)]">
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title">
            <input aria-label="Deal title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="HP EliteBook 830 G7" />
          </Field>
        </div>
        <Field label="Brand">
          <input aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} placeholder="HP, Dell, Microsoft" />
        </Field>
        <Field label="Processor">
          <input aria-label="Processor" value={processor} onChange={(e) => setProcessor(e.target.value)} className={inputCls} placeholder="Core i5 11th Gen" />
        </Field>
        <Field label="RAM">
          <input aria-label="RAM" value={ram} onChange={(e) => setRam(e.target.value)} className={inputCls} placeholder="16GB" />
        </Field>
        <Field label="Storage">
          <input aria-label="Storage" value={storage} onChange={(e) => setStorage(e.target.value)} className={inputCls} placeholder="256GB SSD" />
        </Field>
        <Field label="Display">
          <input aria-label="Display" value={display} onChange={(e) => setDisplay(e.target.value)} className={inputCls} placeholder="13 inch, 2K touch" />
        </Field>
        <Field label="Condition">
          <input aria-label="Condition" value={condition} onChange={(e) => setCondition(e.target.value)} className={inputCls} placeholder="Used, New" />
        </Field>
        <Field label="Battery note">
          <input aria-label="Battery note" value={batteryNote} onChange={(e) => setBatteryNote(e.target.value)} className={inputCls} placeholder="4+ hours battery backup" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Image URL" help="The product photo shown on the deal card. The built-in file names (for example dell-latitude-5420.webp) use the official manufacturer photo hosted with the site, with its background removed. Paste a full https:// image link to use a different photo, or leave empty for no photo.">
            <input aria-label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputCls} placeholder="dell-latitude-5420.webp or https://…" />
          </Field>
          {dealImageSrc({ title, imageUrl }) ? (
            <div className="mt-3 flex aspect-[16/10] max-w-xs items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3">
              <img
                src={dealImageSrc({ title, imageUrl }) ?? ""}
                alt={`${title || "Deal"} — current product photo preview`}
                className="laptop-img max-h-full w-full object-contain"
              />
            </div>
          ) : null}
        </div>
        <Field label="Price (PKR)" help="Numbers only. Leave empty to show Ask for price.">
          <input aria-label="Price in PKR" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="68000" />
        </Field>
        <Field label="Badge / tag text">
          <input aria-label="Badge text" value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls} placeholder="As posted, 2-in-1 Touch" />
        </Field>
        <Field label="Sort order" help="Lower numbers appear first.">
          <input aria-label="Sort order" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex flex-wrap items-end gap-5 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-[#0066cc]" />
            Featured (shown first)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#0066cc]" />
            Visible on website
          </label>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {mutation.isPending ? "Saving…" : deal ? "Save deal" : "Add deal"}
        </button>
        <button type="button" onClick={onClose} className="border border-[var(--border)] px-4 py-2.5 text-sm font-medium">
          Cancel
        </button>
      </div>
    </div>
  );
}

function DealsSection({ token, deals }: { token: string; deals: Deal[] }) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<Deal | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteDeal({ token, id }),
    onSuccess: (res) => {
      if (res.ok) {
        setNotice("Deal deleted.");
        void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
        void queryClient.invalidateQueries({ queryKey: ["site-data"] });
      }
      setConfirmDeleteId(null);
    },
  });

  const nextSort = deals.length > 0 ? Math.max(...deals.map((d) => d.sortOrder)) + 1 : 1;

  return (
    <SectionShell title="Deals / Inventory" blurb="Laptops shown on the homepage, in order. Featured deals appear first. Hide a deal instead of deleting it if it is only out of stock for a while.">
      {notice ? (
        <p className="mb-4 inline-flex items-center gap-1.5 border border-[var(--accent)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--accent)]">
          <CheckIcon className="h-4 w-4" /> {notice}
        </p>
      ) : null}
      {editor === null ? (
        <button type="button" onClick={() => { setEditor("new"); setNotice(null); }} className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white">
          <PlusIcon className="h-4 w-4" /> Add a deal
        </button>
      ) : (
        <div className="mb-5">
          <DealForm
            token={token}
            deal={editor === "new" ? null : editor}
            nextSort={nextSort}
            onClose={() => setEditor(null)}
            onSaved={(msg) => setNotice(msg)}
          />
        </div>
      )}
      <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
        {deals.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--dim)]">No deals yet. Add the first one above.</p>
        ) : (
          deals.map((deal) => (
            <div key={deal.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--border)] px-4 py-3 last:border-0">
              {dealImageSrc(deal) ? (
                <span className="flex h-12 w-16 shrink-0 items-center justify-center px-1.5 py-1">
                  <img src={dealImageSrc(deal) ?? ""} alt={`${deal.title} photo`} className="laptop-img max-h-full w-full object-contain" />
                </span>
              ) : null}
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-sm font-semibold">{deal.title}</p>
                <p className="font-mono text-xs text-[var(--dim)]">
                  {[deal.processor, deal.ram, deal.storage].filter(Boolean).join(" · ") || "Specs on request"}
                </p>
              </div>
              <span className="text-sm font-semibold">
                {deal.price !== null ? formatPrice(deal.price) : "Ask for price"}
              </span>
              {deal.featured ? (
                <span className="rounded-full bg-[var(--surface-alt)] px-2 py-0.5 text-[11px] font-medium text-[var(--dim)]">Featured</span>
              ) : null}
              <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${deal.active ? "text-[var(--accent)]" : "text-[var(--dim)]"}`}>
                {deal.active ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeOffIcon className="h-3.5 w-3.5" />}
                {deal.active ? "Visible" : "Hidden"}
              </span>
              {confirmDeleteId === deal.id ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--danger)]">Delete this deal?</span>
                  <button type="button" onClick={() => deleteMutation.mutate(deal.id)} className="bg-[var(--danger)] px-2.5 py-1 text-xs font-semibold text-white">Yes, delete</button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="border border-[var(--border)] px-2.5 py-1 text-xs font-medium">Keep</button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <button type="button" aria-label={`Edit ${deal.title}`} onClick={() => { setEditor(deal); setNotice(null); }} className="p-2 text-[var(--dim)] hover:text-[var(--accent)]">
                    <PencilIcon className="h-4.5 w-4.5" />
                  </button>
                  <button type="button" aria-label={`Delete ${deal.title}`} onClick={() => setConfirmDeleteId(deal.id)} className="p-2 text-[var(--dim)] hover:text-[var(--danger)]">
                    <TrashIcon className="h-4.5 w-4.5" />
                  </button>
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Generic two/three-field CRUD sections (services, testimonials, FAQs)
// ---------------------------------------------------------------------------

type SimpleItem = {
  id: number;
  sortOrder: number;
  [key: string]: string | number | null;
};

function SimpleCrudSection<T extends SimpleItem>({
  title,
  blurb,
  addLabel,
  items,
  fields,
  renderSummary,
  onSave,
  onDelete,
}: {
  title: string;
  blurb: string;
  addLabel: string;
  items: T[];
  fields: Array<{
    key: string;
    label: string;
    multiline?: boolean;
    placeholder?: string;
    numeric?: boolean;
    help?: string;
  }>;
  renderSummary: (item: T) => ReactNode;
  onSave: (id: number | null, values: Record<string, string>) => Promise<{ ok: boolean; error: string | null }>;
  onDelete: (id: number) => Promise<{ ok: boolean; error: string | null }>;
}) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<T | "new" | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openEditor = (item: T | "new") => {
    setEditor(item);
    setError(null);
    setNotice(null);
    const init: Record<string, string> = {};
    for (const f of fields) {
      const v = item === "new" ? "" : item[f.key];
      init[f.key] = v === null || v === undefined ? "" : String(v);
    }
    init.sortOrder = item === "new" ? String(items.length + 1) : String(item.sortOrder);
    setValues(init);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await onSave(editor === "new" || editor === null ? null : editor.id, values);
    setBusy(false);
    if (res.ok) {
      setNotice(editor === "new" ? "Added." : "Updated.");
      setEditor(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      void queryClient.invalidateQueries({ queryKey: ["site-data"] });
    } else {
      setError(res.error ?? "Could not save.");
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    const res = await onDelete(id);
    setBusy(false);
    setConfirmDeleteId(null);
    if (res.ok) {
      setNotice("Deleted.");
      void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      void queryClient.invalidateQueries({ queryKey: ["site-data"] });
    }
  };

  return (
    <SectionShell title={title} blurb={blurb}>
      {notice ? (
        <p className="mb-4 inline-flex items-center gap-1.5 border border-[var(--accent)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--accent)]">
          <CheckIcon className="h-4 w-4" /> {notice}
        </p>
      ) : null}
      {editor === null ? (
        <button type="button" onClick={() => openEditor("new")} className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white">
          <PlusIcon className="h-4 w-4" /> {addLabel}
        </button>
      ) : (
        <div className="mb-5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{editor === "new" ? addLabel : "Edit"}</h3>
            <button type="button" onClick={() => setEditor(null)} aria-label="Close form" className="p-1 text-[var(--dim)] hover:text-[var(--text)]">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid gap-4">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} help={f.help}>
                {f.multiline ? (
                  <textarea aria-label={f.label} value={values[f.key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} rows={3} className={inputCls} placeholder={f.placeholder} />
                ) : (
                  <input aria-label={f.label} value={values[f.key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} className={inputCls} placeholder={f.placeholder} inputMode={f.numeric ? "numeric" : undefined} />
                )}
              </Field>
            ))}
            <Field label="Sort order" help="Lower numbers appear first.">
              <input aria-label="Sort order" inputMode="numeric" value={values.sortOrder ?? ""} onChange={(e) => setValues((p) => ({ ...p, sortOrder: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          {error ? <p className="mt-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => void save()} disabled={busy} className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditor(null)} className="border border-[var(--border)] px-4 py-2.5 text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--dim)]">Nothing here yet. Add the first one above.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--border)] px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1 basis-56">{renderSummary(item)}</div>
              {confirmDeleteId === item.id ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--danger)]">Delete this?</span>
                  <button type="button" onClick={() => void remove(item.id)} disabled={busy} className="bg-[var(--danger)] px-2.5 py-1 text-xs font-semibold text-white">Yes, delete</button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="border border-[var(--border)] px-2.5 py-1 text-xs font-medium">Keep</button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <button type="button" aria-label="Edit item" onClick={() => openEditor(item)} className="p-2 text-[var(--dim)] hover:text-[var(--accent)]">
                    <PencilIcon className="h-4.5 w-4.5" />
                  </button>
                  <button type="button" aria-label="Delete item" onClick={() => setConfirmDeleteId(item.id)} className="p-2 text-[var(--dim)] hover:text-[var(--danger)]">
                    <TrashIcon className="h-4.5 w-4.5" />
                  </button>
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function Overview({
  data,
  go,
}: {
  data: AdminData;
  go: (section: SectionId) => void;
}) {
  const counts: Array<{ label: string; value: number; section: SectionId; note: string }> = [
    { label: "Deals on the site", value: data.deals.filter((d) => d.active).length, section: "deals", note: `${data.deals.length} total in inventory` },
    { label: "Services", value: data.services.length, section: "services", note: "Shown in At the Counter" },
    { label: "Testimonials", value: data.testimonials.length, section: "testimonials", note: "Shown in From the Counter" },
    { label: "FAQs", value: data.faqs.length, section: "faqs", note: "Shown in Questions, Answered" },
  ];
  return (
    <SectionShell title="Overview" blurb="Everything on the website, in one place. Pick a section on the left to edit it — changes go live as soon as you save.">
      <div className="grid grid-cols-2 gap-3">
        {counts.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => go(c.section)}
            className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--accent)]"
          >
            <span className="block font-display text-3xl font-semibold">{c.value}</span>
            <span className="mt-1 block text-sm font-semibold">{c.label}</span>
            <span className="mt-0.5 block font-mono text-[11px] text-[var(--dim)]">{c.note}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--dim)]">Currently on the site</p>
        <p className="mt-2 text-sm leading-relaxed">
          <strong>{s(data.settings, "shop_name")}</strong> — {s(data.settings, "tagline")}
          <br />
          WhatsApp: <span className="font-mono">{s(data.settings, "whatsapp_number")}</span> · Call:{" "}
          <span className="font-mono">{s(data.settings, "phone_number")}</span>
          <br />
          {s(data.settings, "address")}, {s(data.settings, "city")} {s(data.settings, "postal_code")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => go("contact")} className="border-2 border-[var(--text)] px-4 py-2 text-sm font-semibold">
            Edit contact details
          </button>
          <button type="button" onClick={() => go("deals")} className="border-2 border-[var(--text)] px-4 py-2 text-sm font-semibold">
            Edit deals
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Admin root
// ---------------------------------------------------------------------------

export function AdminApp() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [section, setSection] = useState<SectionId>("overview");

  const dataQuery = useQuery({
    queryKey: ["admin-data", token],
    queryFn: () => api.getAdminData({ token: token ?? "" }),
    enabled: token !== null,
  });

  useEffect(() => {
    if (dataQuery.data && !dataQuery.data.ok && token !== null) {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
      } catch {
        // storage unavailable; the in-memory token is cleared below anyway
      }
      setToken(null);
    }
  }, [dataQuery.data, token]);

  const handleLogin = (newToken: string) => {
    try {
      window.localStorage.setItem(TOKEN_KEY, newToken);
    } catch {
      // session will last for this tab only
    }
    setToken(newToken);
  };

  const logout = () => {
    if (token) {
      void api.adminLogout({ token }).catch(() => undefined);
    }
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    setToken(null);
    queryClient.removeQueries({ queryKey: ["admin-data"] });
  };

  if (token === null) {
    return <Login onLogin={handleLogin} />;
  }

  if (dataQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <p className="font-mono text-sm text-[var(--dim)]">Loading the panel…</p>
      </div>
    );
  }

  if (dataQuery.error || !dataQuery.data?.ok) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] px-6 text-center">
        <p className="font-display text-2xl font-semibold">The panel could not be loaded.</p>
        <button type="button" onClick={() => void dataQuery.refetch()} className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white">
          Try again
        </button>
        <button type="button" onClick={logout} className="font-mono text-xs text-[var(--dim)] underline">
          Log out and start over
        </button>
      </div>
    );
  }

  const data = dataQuery.data;
  const settings = data.settings;

  const navButton = (id: SectionId, label: string, icon: ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setSection(id)}
      aria-current={section === id ? "page" : undefined}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
        section === id
          ? "bg-[var(--text)] font-semibold text-[var(--bg)]"
          : "font-medium text-[var(--dim)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <div className="mx-auto flex max-w-7xl flex-col md:min-h-screen md:flex-row">
        {/* Sidebar */}
        <aside className="border-b border-[var(--border)] bg-[var(--surface)] pt-safe md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
          <div className="flex items-center gap-3 px-4 pb-2 pt-4 md:pt-6">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold leading-tight">{s(settings, "shop_name")}</p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--dim)]">Admin panel</p>
            </div>
            <button type="button" onClick={logout} aria-label="Log out" className="ml-auto inline-flex items-center gap-1.5 border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--dim)] hover:text-[var(--danger)] md:hidden">
              <LogoutIcon className="h-4 w-4" /> Log out
            </button>
          </div>
          <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:overflow-visible md:px-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.group} className="flex shrink-0 gap-1 md:mb-4 md:block">
                <p className="hidden px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--dim)] md:block">
                  {group.group}
                </p>
                {group.items.map((item) => (
                  <span key={item.id} className="block shrink-0 md:shrink">
                    {navButton(item.id, item.label, item.icon)}
                  </span>
                ))}
              </div>
            ))}
          </nav>
          <div className="hidden border-t border-[var(--border)] p-3 md:block">
            <a href="#/" className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-[var(--dim)] hover:text-[var(--accent)]">
              <EyeIcon className="h-4.5 w-4.5" /> View website
            </a>
            <button type="button" onClick={logout} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-[var(--dim)] hover:text-[var(--danger)]">
              <LogoutIcon className="h-4.5 w-4.5" /> Log out
            </button>
          </div>
        </aside>

        {/* Section content */}
        <main className="flex-1 px-4 py-6 pb-safe md:px-8 md:py-8">
          {section === "overview" ? <Overview data={data} go={setSection} /> : null}

          {section === "identity" ? (
            <SectionShell title="Shop Identity" blurb="The name, tagline and story of the shop. The shop name appears in the masthead, the footer and the browser tab title.">
              <SettingsForm
                token={token}
                settings={settings}
                fields={[
                  { key: "shop_name", label: "Shop name" },
                  { key: "tagline", label: "Tagline" },
                  { key: "owner_name", label: "Owner name" },
                  { key: "hero_headline", label: "Hero headline", help: "The big headline at the top of the homepage." },
                  { key: "hero_subtext", label: "Hero subtext", multiline: true },
                  { key: "about", label: "About the shop", multiline: true, help: "Shown in the Why NextGen section." },
                ]}
              />
            </SectionShell>
          ) : null}

          {section === "contact" ? (
            <SectionShell title="Contact" blurb="These two numbers power every call and WhatsApp button on the site, including the floating button and the button on each deal. Change them here and the whole site follows.">
              <SettingsForm
                token={token}
                settings={settings}
                fields={[
                  {
                    key: "whatsapp_number",
                    label: "WhatsApp number",
                    help: "Digits only, with the country code and no plus sign, spaces or dashes — for example 923215744034. Every WhatsApp button on the site uses this number.",
                  },
                  {
                    key: "phone_number",
                    label: "Call / phone number",
                    help: "Shown on the site and used for tap-to-call. It can be different from the WhatsApp number.",
                  },
                  { key: "email", label: "Email (optional)" },
                ]}
              />
            </SectionShell>
          ) : null}

          {section === "location" ? (
            <SectionShell title="Location & Hours" blurb="The address block, the map and the directions button all read from here.">
              <SettingsForm
                token={token}
                settings={settings}
                cols
                fields={[
                  { key: "address", label: "Full address" },
                  { key: "city", label: "City" },
                  { key: "postal_code", label: "Postal code" },
                  {
                    key: "maps_query",
                    label: "Google Maps search text",
                    help: "The map and the Get Directions button search Google Maps for exactly this text.",
                  },
                  { key: "landmarks", label: "Landmarks / how to find the shop", multiline: true },
                  { key: "hours_note", label: "Hours note", help: "Free text — for example Call or WhatsApp to confirm today's hours." },
                  { key: "warranty_note", label: "Warranty note", multiline: true, help: "Shown under the hero buttons and near the deals." },
                ]}
              />
            </SectionShell>
          ) : null}

          {section === "socials" ? (
            <SectionShell title="Socials" blurb="Links and handles shown in the Visit section and the footer. Leave a URL empty to hide that network.">
              <SettingsForm
                token={token}
                settings={settings}
                cols
                fields={[
                  { key: "instagram_url", label: "Instagram URL" },
                  { key: "instagram_handle", label: "Instagram handle" },
                  { key: "tiktok_url", label: "TikTok URL" },
                  { key: "tiktok_handle", label: "TikTok handle" },
                  { key: "facebook_url", label: "Facebook URL" },
                  { key: "facebook_name", label: "Facebook page name" },
                ]}
              />
            </SectionShell>
          ) : null}

          {section === "deals" ? <DealsSection token={token} deals={data.deals} /> : null}

          {section === "services" ? (
            <SimpleCrudSection<Service>
              title="Services"
              blurb="The services listed in the At the Counter section of the homepage."
              addLabel="Add a service"
              items={data.services}
              fields={[
                { key: "title", label: "Title", placeholder: "Laptop Repair" },
                { key: "description", label: "Description", multiline: true, placeholder: "What the service covers, in one or two sentences." },
              ]}
              renderSummary={(item) => (
                <span>
                  <span className="block truncate text-sm font-semibold">{item.title}</span>
                  <span className="block truncate text-xs text-[var(--dim)]">{item.description}</span>
                </span>
              )}
              onSave={(id, values) => {
                if ((values.title ?? "").trim() === "") {
                  return Promise.resolve({ ok: false, error: "Title is required." });
                }
                return api.saveService({
                  token,
                  id,
                  title: values.title ?? "",
                  description: values.description ?? "",
                  sortOrder: Number(values.sortOrder) || 0,
                });
              }}
              onDelete={(id) => api.deleteService({ token, id })}
            />
          ) : null}

          {section === "testimonials" ? (
            <SimpleCrudSection<Testimonial>
              title="Testimonials"
              blurb="Customer words shown in the From the Counter section. Rating is optional — leave it empty for no stars."
              addLabel="Add a testimonial"
              items={data.testimonials}
              fields={[
                { key: "name", label: "Name", placeholder: "Hassan Khan" },
                { key: "role", label: "Role / where from", placeholder: "COMSATS University, Abbottabad" },
                { key: "body", label: "What they said", multiline: true },
                { key: "rating", label: "Rating (1 to 5, optional)", numeric: true },
              ]}
              renderSummary={(item) => (
                <span>
                  <span className="block truncate text-sm font-semibold">
                    {item.name}
                    {item.role ? <span className="font-normal text-[var(--dim)]"> — {item.role}</span> : null}
                  </span>
                  <span className="block truncate text-xs text-[var(--dim)]">{item.body}</span>
                </span>
              )}
              onSave={(id, values) => {
                if ((values.name ?? "").trim() === "" || (values.body ?? "").trim() === "") {
                  return Promise.resolve({ ok: false, error: "Name and text are both required." });
                }
                const ratingRaw = (values.rating ?? "").trim();
                let rating: number | null = null;
                if (ratingRaw !== "") {
                  const n = Number(ratingRaw);
                  if (!Number.isInteger(n) || n < 1 || n > 5) {
                    return Promise.resolve({ ok: false, error: "Rating must be a whole number from 1 to 5, or empty." });
                  }
                  rating = n;
                }
                return api.saveTestimonial({
                  token,
                  id,
                  name: values.name ?? "",
                  role: values.role ?? "",
                  body: values.body ?? "",
                  rating,
                  sortOrder: Number(values.sortOrder) || 0,
                });
              }}
              onDelete={(id) => api.deleteTestimonial({ token, id })}
            />
          ) : null}

          {section === "faqs" ? (
            <SimpleCrudSection<Faq>
              title="FAQs"
              blurb="Questions and answers at the bottom of the homepage."
              addLabel="Add a question"
              items={data.faqs}
              fields={[
                { key: "question", label: "Question" },
                { key: "answer", label: "Answer", multiline: true },
              ]}
              renderSummary={(item) => (
                <span>
                  <span className="block truncate text-sm font-semibold">{item.question}</span>
                  <span className="block truncate text-xs text-[var(--dim)]">{item.answer}</span>
                </span>
              )}
              onSave={(id, values) => {
                if ((values.question ?? "").trim() === "" || (values.answer ?? "").trim() === "") {
                  return Promise.resolve({ ok: false, error: "Question and answer are both required." });
                }
                return api.saveFaq({
                  token,
                  id,
                  question: values.question ?? "",
                  answer: values.answer ?? "",
                  sortOrder: Number(values.sortOrder) || 0,
                });
              }}
              onDelete={(id) => api.deleteFaq({ token, id })}
            />
          ) : null}

          {section === "homepage" ? (
            <SectionShell title="Homepage Settings" blurb="The announcement strip, the trust bar, the Why NextGen points and the floating WhatsApp button.">
              <SettingsForm
                token={token}
                settings={settings}
                fields={[
                  { key: "announcement_on", label: "Show announcement strip", toggle: true, help: "The scrolling strip at the very top of the homepage." },
                  { key: "announcement_text", label: "Announcement text", multiline: true },
                  { key: "floating_whatsapp", label: "Floating WhatsApp button", toggle: true, help: "The round button fixed at the bottom corner of the homepage." },
                  {
                    key: "trust_items",
                    label: "Trust bar items",
                    multiline: true,
                    help: "One item per line. Shown as the checklist under the hero.",
                  },
                  {
                    key: "why_points",
                    label: "Why NextGen points",
                    multiline: true,
                    help: "One point per line, in the form: Heading | Sentence. Example: Checked first | Every machine is tested before sale.",
                  },
                ]}
              />
            </SectionShell>
          ) : null}
        </main>
      </div>
    </div>
  );
}
