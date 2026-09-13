/**
 * components/forms/payor-billing-form.tsx — Payor billing details form.
 * Corrected structured fields per DESIGN.md §3.3: first_name, last_name,
 * email, phone (optional), address_line_one, address_line_two (optional),
 * city_municipality, state_province_region, country_code (default "PH"),
 * postal_code.
 *
 * Also owns:
 *  - Brand selection (fetched from GET /api/payment/brands — DESIGN.md §1.2).
 *  - Submitting to POST /api/payment/submit (task 5.4) and redirect handling
 *    (task 5.5): on success, a real `window.location` navigation to the
 *    off-origin DLT `payment_url` — never a framework client-side route push.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { Brand } from "../../lib/dlt-client";
import { computeVat, formatCents } from "../../lib/money";

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}

// Client-side pre-validation mirroring DLT's field limits (server remains
// authoritative — see api-reference.md "Payor details" / "Billing address").
const billingSchema = z.object({
  first_name: z.string().trim().min(1, "Required").max(50),
  last_name: z.string().trim().min(1, "Required").max(50),
  email: z.string().trim().min(1, "Required").email("Invalid email").max(100),
  phone: z.string().trim().max(16).optional(),
  address_line_one: z.string().trim().min(1, "Required").max(80),
  address_line_two: z.string().trim().max(80).optional(),
  city_municipality: z.string().trim().min(1, "Required").max(60),
  state_province_region: z.string().trim().min(1, "Required").max(40),
  country_code: z
    .string()
    .trim()
    .length(2, "2-letter code")
    .transform((v) => v.toUpperCase()),
  postal_code: z.string().trim().min(1, "Required").max(10),
});

export type PayorBillingDetails = z.infer<typeof billingSchema>;

interface PayorBillingFormProps {
  token: string;
  linkId: string;
  amountDisplay: string;
  /** VAT rate in basis points (e.g. 1200 = 12%). When provided, a VAT breakdown is shown. */
  vatRate?: number;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function PayorBillingForm({ token, linkId, amountDisplay, vatRate }: PayorBillingFormProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Derive VAT breakdown from the amount display string.
  // amountDisplay is a formatted string like "₱1,500.00" — we strip non-numeric
  // chars to recover the numeric value, then use integer-cents arithmetic.
  const vatBreakdown = useMemo(() => {
    if (vatRate == null || vatRate <= 0) return null;
    // Strip currency symbol and thousands separators, leaving "1500.00"
    const raw = amountDisplay.replace(/[^0-9.]/g, "");
    if (!/^\d+\.\d{2}$/.test(raw)) return null;
    return computeVat(raw, vatRate);
  }, [amountDisplay, vatRate]);

  const [fields, setFields] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address_line_one: "",
    address_line_two: "",
    city_municipality: "",
    state_province_region: "",
    country_code: "PH",
    postal_code: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Seed the CSRF cookie. This must happen in a client component because
  // cookies().set() is forbidden in Server Components (Next.js rule).
  useEffect(() => {
    fetch("/api/csrf").catch(() => {/* non-fatal; submit will catch missing token */});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBrands() {
      try {
        const res = await fetch(`/api/payment/brands?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setBrandsError(data.error || "Unable to load payment options");
          return;
        }
        setBrands(data as Brand[]);
      } catch {
        if (!cancelled) setBrandsError("Unable to load payment options");
      }
    }

    loadBrands();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function updateField<K extends keyof typeof fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = billingSchema.safeParse(fields);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setFormError("Please check the highlighted fields.");
      return;
    }

    if (!selectedBrand) {
      setFormError("Please select a payment method.");
      return;
    }

    setSubmitting(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/payment/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          token,
          payor: parsed.data,
          payment_brand: selectedBrand.value,
          payment_brand_code: selectedBrand.code,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save the token so /pay/verify/[link_id] can recover it after the
        // DLT redirect. sessionStorage persists for the tab lifetime, which
        // covers the round-trip through DLT's hosted checkout page.
        sessionStorage.setItem(`pay_token:${linkId}`, token);

        // Task 5.5: payment_url is off-origin (DLT's hosted page) — a real
        // browser navigation, not a Next.js router push.
        window.location.href = data.payment_url;
        return;
      }

      if (res.status === 503 && data.verify) {
        // DESIGN.md §1's 503 branch: don't resubmit, reconcile via /verify.
        // This is an on-origin route, so a normal client-side navigation is
        // fine here (unlike the off-origin payment_url redirect above).
        router.push(`/pay/${encodeURIComponent(token)}/verify`);
        return;
      }

      // 409 (conflict) / 401 (link unavailable) / other errors: show the
      // message, never auto-resubmit.
      setFormError(data.error || "Something went wrong. Please try again.");
      setSubmitting(false);
    } catch {
      setFormError("Network error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className={labelClass}>Payment method</p>
        {brandsError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{brandsError}</div>
        )}
        {!brandsError && brands === null && (
          <p className="text-sm text-slate-500">Loading payment methods…</p>
        )}
        {!brandsError && brands !== null && brands.length === 0 && (
          <p className="text-sm text-slate-500">No payment methods are currently available.</p>
        )}
        {brands && brands.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {brands.map((brand) => (
              <button
                type="button"
                key={brand.code}
                onClick={() => setSelectedBrand(brand)}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  selectedBrand?.code === brand.code
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {brand.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.image} alt="" className="h-4 w-auto" />
                )}
                {brand.value}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First name</label>
          <input
            className={inputClass}
            value={fields.first_name}
            maxLength={50}
            onChange={(e) => updateField("first_name", e.target.value)}
          />
          {fieldErrors.first_name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.first_name}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input
            className={inputClass}
            value={fields.last_name}
            maxLength={50}
            onChange={(e) => updateField("last_name", e.target.value)}
          />
          {fieldErrors.last_name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.last_name}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          className={inputClass}
          value={fields.email}
          maxLength={100}
          onChange={(e) => updateField("email", e.target.value)}
        />
        {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
      </div>

      <div>
        <label className={labelClass}>Phone (optional)</label>
        <input
          className={inputClass}
          value={fields.phone}
          maxLength={16}
          onChange={(e) => updateField("phone", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Address line 1</label>
        <input
          className={inputClass}
          value={fields.address_line_one}
          maxLength={80}
          onChange={(e) => updateField("address_line_one", e.target.value)}
        />
        {fieldErrors.address_line_one && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.address_line_one}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>Address line 2 (optional)</label>
        <input
          className={inputClass}
          value={fields.address_line_two}
          maxLength={80}
          onChange={(e) => updateField("address_line_two", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>City / Municipality</label>
          <input
            className={inputClass}
            value={fields.city_municipality}
            maxLength={60}
            onChange={(e) => updateField("city_municipality", e.target.value)}
          />
          {fieldErrors.city_municipality && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.city_municipality}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>State / Province / Region</label>
          <input
            className={inputClass}
            value={fields.state_province_region}
            maxLength={40}
            onChange={(e) => updateField("state_province_region", e.target.value)}
          />
          {fieldErrors.state_province_region && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.state_province_region}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Country code</label>
          <input
            className={inputClass}
            value={fields.country_code}
            maxLength={2}
            onChange={(e) => updateField("country_code", e.target.value.toUpperCase())}
          />
          {fieldErrors.country_code && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.country_code}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Postal code</label>
          <input
            className={inputClass}
            value={fields.postal_code}
            maxLength={10}
            onChange={(e) => updateField("postal_code", e.target.value)}
          />
          {fieldErrors.postal_code && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.postal_code}</p>
          )}
        </div>
      </div>

      {formError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
      )}

      {/* VAT breakdown — shown when merchant configured a vat_rate */}
      {vatBreakdown && vatRate != null && (
        <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Base amount (excl. VAT)</span>
            <span className="font-medium text-slate-800">{formatCents(vatBreakdown.baseCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT ({(vatRate / 100).toFixed(2).replace(/\.?0+$/, "")}%)</span>
            <span className="font-medium text-slate-800">{formatCents(vatBreakdown.vatCents)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCents(vatBreakdown.totalCents)}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Processing…" : `Pay ${amountDisplay}`}
      </button>
    </form>
  );
}
