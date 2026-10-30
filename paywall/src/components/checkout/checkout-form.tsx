/**
 * components/checkout/checkout-form.tsx — Full checkout form (left pane).
 * Replaces the old PayorBillingForm with the new two-column checkout design.
 *
 * Responsibilities:
 *  - Fetches brands from GET /api/payment/brands (same logic as before).
 *  - Renders PaymentMethodTabs for card vs e-wallet selection.
 *  - Billing address fields (same Zod schema as before).
 *  - Submits to POST /api/payment/submit; on success navigates to payment_url.
 *  - On 503 ambiguous, redirects to /pay/[token]/verify.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { Brand } from "../../lib/dlt-client";
import { PaymentMethodTabs } from "./payment-method-tabs";

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}

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

interface CheckoutFormProps {
  token: string;
  linkId: string;
  amountDisplay: string;
  /** VAT rate in basis points (e.g. 1200 = 12%). */
  vatRate?: number;
  merchantTransactionId: string;
}

const inputClass =
  "w-full text-sm bg-slate-50/70 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 transition-all duration-150 outline-none focus:border-[#0052FF] focus:ring-[3px] focus:ring-[rgba(0,82,255,0.15)]";
const labelClass = "block text-xs font-medium text-slate-700 mb-1";

export function CheckoutForm({
  token,
  linkId,
  amountDisplay,
}: CheckoutFormProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

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

  // Seed the CSRF cookie.
  useEffect(() => {
    fetch("/api/csrf").catch(() => {});
  }, []);

  // Load brands.
  useEffect(() => {
    let cancelled = false;

    async function loadBrands() {
      try {
        const res = await fetch(
          `/api/payment/brands?token=${encodeURIComponent(token)}`
        );
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
        sessionStorage.setItem(`pay_token:${linkId}`, token);
        window.location.href = data.payment_url;
        return;
      }

      if (res.status === 503 && data.verify) {
        router.push(`/pay/${encodeURIComponent(token)}/verify`);
        return;
      }

      setFormError(data.error || "Something went wrong. Please try again.");
      setSubmitting(false);
    } catch {
      setFormError("Network error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="lg:col-span-7 xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-7"
      data-purpose="payment-form-pane"
    >
      <form
        className="space-y-7"
        id="checkout-form"
        onSubmit={handleSubmit}
      >
        {/* Header */}
        <div className="border-b border-slate-100 pb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Complete your payment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your details and choose a payment method to complete this
            order.
          </p>
        </div>

        {/* Section 1: Contact Information */}
        <div className="space-y-3.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Contact Information
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`${inputClass} ${fieldErrors.email ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : ""}`}
                value={fields.email}
                maxLength={100}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                Phone number{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className={inputClass}
                placeholder="+63 917 123 4567"
                value={fields.phone}
                maxLength={16}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Payment Methods */}
        {brandsError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {brandsError}
          </div>
        )}
        {!brandsError && brands === null && (
          <div className="space-y-4 pt-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Payment method
            </label>
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <svg
                className="w-4 h-4 animate-spin text-[#0052FF]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading payment methods…
            </div>
          </div>
        )}
        {!brandsError && brands !== null && brands.length === 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            No payment methods are currently available.
          </div>
        )}
        {brands && brands.length > 0 && (
          <PaymentMethodTabs
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            amountDisplay={amountDisplay}
          />
        )}

        {/* Section 3: Billing Address */}
        <div className="space-y-4 pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Billing Address
          </label>

          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="first-name">
                First name
              </label>
              <input
                id="first-name"
                name="firstName"
                type="text"
                className={`${inputClass} ${fieldErrors.first_name ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : ""}`}
                placeholder="e.g. Juan"
                value={fields.first_name}
                maxLength={50}
                onChange={(e) => updateField("first_name", e.target.value)}
                required
              />
              {fieldErrors.first_name && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.first_name}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="last-name">
                Last name
              </label>
              <input
                id="last-name"
                name="lastName"
                type="text"
                className={`${inputClass} ${fieldErrors.last_name ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : ""}`}
                placeholder="e.g. Dela Cruz"
                value={fields.last_name}
                maxLength={50}
                onChange={(e) => updateField("last_name", e.target.value)}
                required
              />
              {fieldErrors.last_name && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className={labelClass} htmlFor="address-1">
              Address line 1
            </label>
            <input
              id="address-1"
              name="address1"
              type="text"
              className={`${inputClass} ${fieldErrors.address_line_one ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : ""}`}
              placeholder="Unit, Street name, Barangay"
              value={fields.address_line_one}
              maxLength={80}
              onChange={(e) => updateField("address_line_one", e.target.value)}
              required
            />
            {fieldErrors.address_line_one && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.address_line_one}
              </p>
            )}
          </div>

          {/* Address Line 2 */}
          <div>
            <label className={labelClass} htmlFor="address-2">
              Address line 2{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="address-2"
              name="address2"
              type="text"
              className={inputClass}
              placeholder="Apartment, suite, landmark"
              value={fields.address_line_two}
              maxLength={80}
              onChange={(e) => updateField("address_line_two", e.target.value)}
            />
          </div>

          {/* City & Province */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="city">
                City / Municipality
              </label>
              <input
                id="city"
                name="city"
                type="text"
                className={`${inputClass} ${fieldErrors.city_municipality ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : ""}`}
                placeholder="e.g. Makati"
                value={fields.city_municipality}
                maxLength={60}
                onChange={(e) =>
                  updateField("city_municipality", e.target.value)
                }
                required
              />
              {fieldErrors.city_municipality && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.city_municipality}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="province">
                State / Province / Region
              </label>
              <input
                id="province"
                name="province"
                type="text"
                className={`${inputClass} ${fieldErrors.state_province_region ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : ""}`}
                placeholder="e.g. Metro Manila"
                value={fields.state_province_region}
                maxLength={40}
                onChange={(e) =>
                  updateField("state_province_region", e.target.value)
                }
                required
              />
              {fieldErrors.state_province_region && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.state_province_region}
                </p>
              )}
            </div>
          </div>

          {/* Country & Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="country">
                Country
              </label>
              <div className="relative">
                <select
                  id="country"
                  name="country"
                  className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                  value={fields.country_code}
                  onChange={(e) => updateField("country_code", e.target.value)}
                >
                  <option value="PH">Philippines (PH)</option>
                  <option value="US">United States (US)</option>
                  <option value="SG">Singapore (SG)</option>
                  <option value="JP">Japan (JP)</option>
                  <option value="KR">South Korea (KR)</option>
                  <option value="HK">Hong Kong (HK)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="GB">United Kingdom (GB)</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {fieldErrors.country_code && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.country_code}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="postal-code">
                Postal code
              </label>
              <input
                id="postal-code"
                name="postalCode"
                type="text"
                className={`${inputClass} ${fieldErrors.postal_code ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : ""}`}
                placeholder="e.g. 1200"
                value={fields.postal_code}
                maxLength={10}
                onChange={(e) => updateField("postal_code", e.target.value)}
                required
              />
              {fieldErrors.postal_code && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.postal_code}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Error */}
        {formError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            {formError}
          </div>
        )}

        {/* Section: CTA Button */}
        <div className="pt-4 space-y-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-xl bg-[#0052FF] hover:bg-[#0045d8] active:scale-[0.99] text-white font-semibold text-base transition duration-150 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Processing…</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-blue-100"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    fillRule="evenodd"
                  />
                </svg>
                <span>Proceed to Pay {amountDisplay}</span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-slate-400 pt-1">
            By confirming your payment, you agree to our{" "}
            <a
              className="underline text-slate-600 hover:text-slate-900"
              href="#"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              className="underline text-slate-600 hover:text-slate-900"
              href="#"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </form>
    </div>
  );
}
