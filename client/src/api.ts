// Standalone RPC client — a small fetch-based replacement for the
// original artifact's @hatch/space-sdk createActionClient.
//
// Same contract as before: `api.<actionName>(args)` POSTs
// { action, args } to /actions and resolves with the parsed JSON
// response, so Site.tsx / Admin.tsx / lib.ts work unchanged.

export interface Deal {
  id: number;
  title: string;
  brand: string;
  processor: string;
  ram: string;
  storage: string;
  display: string;
  condition: string;
  batteryNote: string;
  imageUrl: string;
  price: number | null;
  badge: string;
  featured: boolean;
  active: boolean;
  sortOrder: number;
}

export interface Service {
  id: number;
  title: string;
  description: string;
  sortOrder: number;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  body: string;
  rating: number | null;
  sortOrder: number;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface SiteData {
  settings: Record<string, string>;
  deals: Deal[];
  services: Service[];
  testimonials: Testimonial[];
  faqs: Faq[];
}

export interface AdminData {
  ok: boolean;
  error: string | null;
  settings: Record<string, string>;
  deals: Deal[];
  services: Service[];
  testimonials: Testimonial[];
  faqs: Faq[];
}

export interface OkResult {
  ok: boolean;
  error: string | null;
}

export interface SaveResult extends OkResult {
  id: number | null;
}

async function call<T>(action: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch("/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, args }),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body: unknown = await res.json();
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
      ) {
        message = (body as { error: string }).error;
      }
    } catch {
      // keep the status-based message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  getSiteData: (args: Record<string, never> = {}) =>
    call<SiteData>("getSiteData", args),
  seedInitialData: (args: Record<string, never> = {}) =>
    call<{ seeded: boolean }>("seedInitialData", args),
  ensureDealImages: (args: Record<string, never> = {}) =>
    call<{ updated: number }>("ensureDealImages", args),
  adminLogin: (args: { username: string; password: string }) =>
    call<{ ok: boolean; token: string | null; error: string | null }>(
      "adminLogin",
      args,
    ),
  adminLogout: (args: { token: string }) => call<OkResult>("adminLogout", args),
  checkSession: (args: { token: string }) =>
    call<{ ok: boolean }>("checkSession", args),
  getAdminData: (args: { token: string }) =>
    call<AdminData>("getAdminData", args),
  updateSettings: (args: { token: string; values: Record<string, string> }) =>
    call<OkResult>("updateSettings", args),
  saveDeal: (args: {
    token: string;
    id: number | null;
    title: string;
    brand: string;
    processor: string;
    ram: string;
    storage: string;
    display: string;
    condition: string;
    batteryNote: string;
    imageUrl: string;
    price: number | null;
    badge: string;
    featured: boolean;
    active: boolean;
    sortOrder: number;
  }) => call<SaveResult>("saveDeal", args),
  deleteDeal: (args: { token: string; id: number }) =>
    call<OkResult>("deleteDeal", args),
  saveService: (args: {
    token: string;
    id: number | null;
    title: string;
    description: string;
    sortOrder: number;
  }) => call<SaveResult>("saveService", args),
  deleteService: (args: { token: string; id: number }) =>
    call<OkResult>("deleteService", args),
  saveTestimonial: (args: {
    token: string;
    id: number | null;
    name: string;
    role: string;
    body: string;
    rating: number | null;
    sortOrder: number;
  }) => call<SaveResult>("saveTestimonial", args),
  deleteTestimonial: (args: { token: string; id: number }) =>
    call<OkResult>("deleteTestimonial", args),
  saveFaq: (args: {
    token: string;
    id: number | null;
    question: string;
    answer: string;
    sortOrder: number;
  }) => call<SaveResult>("saveFaq", args),
  deleteFaq: (args: { token: string; id: number }) =>
    call<OkResult>("deleteFaq", args),
};

// Type helpers with the same shape the original client used:
//   ApiResponse<typeof api, "getSiteData">  ->  the action's result type
//   ApiRequest<typeof api, "saveDeal">      ->  the action's argument type
export type ApiResponse<
  Client,
  Name extends keyof Client,
> = Client[Name] extends (...args: never[]) => Promise<infer R> ? R : never;

export type ApiRequest<
  Client,
  Name extends keyof Client,
> = Client[Name] extends (args: infer A) => Promise<unknown> ? A : never;
