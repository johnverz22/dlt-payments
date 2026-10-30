import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, useNavigate, UNSAFE_withComponentProps, Outlet, UNSAFE_withErrorBoundaryProps, useRouteError, isRouteErrorResponse, useLoaderData, Meta, Links, ScrollRestoration, Scripts, data, createSessionStorage, redirect, useActionData, useNavigation, Form, Link, useFetcher, useLocation, useMatches, NavLink, useSearchParams, useBlocker, useRevalidator } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import crypto, { randomBytes, timingSafeEqual } from "node:crypto";
import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, Info, X, Loader2, AlertTriangle, ServerCrash, Clock, ShieldAlert, RefreshCw, Home, LogIn, ChevronDown, EyeOff, Eye, Moon, Sun, Check, Circle, KeyRound, PanelLeftOpen, PanelLeftClose, Menu, LayoutDashboard, ReceiptText, User, Store, Users, LogOut, TrendingUp, Activity, CheckCircle, XCircle, ArrowRight, UserPlus, BarChart3, FileText, Download, History, ChevronLeft, ChevronRight, ArrowLeft, FileJson, ChevronUp, Mail, ImageIcon, Upload, Trash2, ArrowDownToLine, ArrowUpFromLine, CreditCard, Wallet, QrCode, Boxes, UserMinus } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cva } from "class-variance-authority";
import { z } from "zod";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import * as Dialog from "@radix-ui/react-dialog";
import { DateTime } from "luxon";
import Decimal from "decimal.js";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as Tooltip$1, Bar, Cell, PieChart, Pie } from "recharts";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import PDFDocument from "pdfkit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
const streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders
    });
  }
  const rootLoaderData = routerContext.staticHandlerContext.loaderData?.root;
  const nonce = rootLoaderData?.nonce;
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");
    let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    let timeoutId = setTimeout(
      () => abort(),
      streamTimeout + 1e3
    );
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url, nonce }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = void 0;
              callback();
            }
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
function getSecurityHeaders(nonce) {
  return {
    "Content-Security-Policy": [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https:`,
      `connect-src 'self'`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const ToastContext = React.createContext({ toast: () => {
} });
let nextId = 1;
function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const toast = React.useCallback((variant, title, description) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-3), { id, variant, title, description }]);
  }, []);
  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return /* @__PURE__ */ jsx(ToastContext.Provider, { value: { toast }, children: /* @__PURE__ */ jsxs(ToastPrimitive.Provider, { swipeDirection: "right", duration: 5e3, children: [
    children,
    toasts.map((t) => {
      const Icon = t.variant === "success" ? CheckCircle2 : t.variant === "error" ? AlertCircle : Info;
      return /* @__PURE__ */ jsxs(
        ToastPrimitive.Root,
        {
          onOpenChange: (open) => !open && dismiss(t.id),
          className: cn(
            "pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-card",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right-5",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-80",
            t.variant === "success" && "border-line bg-surface text-success-ink",
            t.variant === "error" && "border-line bg-surface text-danger-ink",
            t.variant === "info" && "border-line bg-surface text-ink"
          ),
          children: [
            /* @__PURE__ */ jsx(Icon, { className: "mt-0.5 size-5 shrink-0", "aria-hidden": true }),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsx(ToastPrimitive.Title, { className: "text-sm font-semibold text-ink", children: t.title }),
              t.description && /* @__PURE__ */ jsx(ToastPrimitive.Description, { className: "mt-0.5 text-xs text-ink-2", children: t.description })
            ] }),
            /* @__PURE__ */ jsx(
              ToastPrimitive.Close,
              {
                className: "rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
                "aria-label": "Dismiss notification",
                children: /* @__PURE__ */ jsx(X, { className: "size-4", "aria-hidden": true })
              }
            )
          ]
        },
        t.id
      );
    }),
    /* @__PURE__ */ jsx(ToastPrimitive.Viewport, { className: "fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none" })
  ] }) });
}
function useToast() {
  const { toast } = React.useContext(ToastContext);
  return {
    toast,
    success: (title, description) => toast("success", title, description),
    error: (title, description) => toast("error", title, description),
    info: (title, description) => toast("info", title, description)
  };
}
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
        danger: "bg-danger text-on-danger hover:brightness-95 dark:hover:brightness-110",
        "danger-outline": "border border-line bg-surface text-danger-ink hover:bg-danger-subtle"
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-4 [&_svg]:size-4",
        lg: "h-10 px-5 [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-4"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => /* @__PURE__ */ jsxs(
    "button",
    {
      ref,
      className: cn(buttonVariants({ variant, size }), className),
      disabled: disabled || loading,
      "aria-busy": loading || void 0,
      ...props,
      children: [
        loading && /* @__PURE__ */ jsx(Loader2, { className: "animate-spin", "aria-hidden": true }),
        children
      ]
    }
  )
);
Button.displayName = "Button";
const TONE_CONFIG = {
  default: { Icon: AlertTriangle, iconBg: "bg-surface-2 text-ink-3" },
  danger: { Icon: ShieldAlert, iconBg: "bg-danger-subtle text-danger-ink" },
  warning: { Icon: Clock, iconBg: "bg-warning-subtle text-warning-ink" }
};
function ErrorPage({
  title,
  description,
  tone = "default",
  icon: CustomIcon,
  primaryAction,
  secondaryAction,
  className,
  compact
}) {
  const navigate = useNavigate();
  const { Icon, iconBg } = TONE_CONFIG[tone];
  const FinalIcon = CustomIcon ?? Icon;
  function handleAction(action2) {
    if (action2.onClick) {
      action2.onClick();
    } else if (action2.to) {
      navigate(action2.to);
    }
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-10" : "min-h-[60vh] py-20",
        className
      ),
      role: "alert",
      children: [
        /* @__PURE__ */ jsx("div", { className: cn("flex size-14 items-center justify-center rounded-full", iconBg), children: /* @__PURE__ */ jsx(FinalIcon, { className: "size-7", "aria-hidden": true }) }),
        /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold text-ink", children: title }),
        description && /* @__PURE__ */ jsx("p", { className: "max-w-md text-sm leading-relaxed text-ink-3", children: description }),
        (primaryAction || secondaryAction) && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap items-center justify-center gap-2", children: [
          primaryAction && /* @__PURE__ */ jsxs(
            Button,
            {
              variant: "primary",
              onClick: () => handleAction(primaryAction),
              children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: "size-4", "aria-hidden": true }),
                primaryAction.label
              ]
            }
          ),
          secondaryAction && /* @__PURE__ */ jsxs(
            Button,
            {
              variant: "secondary",
              onClick: () => handleAction(secondaryAction),
              children: [
                secondaryAction.to === "/" && /* @__PURE__ */ jsx(Home, { className: "size-4", "aria-hidden": true }),
                secondaryAction.to === "/login" && /* @__PURE__ */ jsx(LogIn, { className: "size-4", "aria-hidden": true }),
                !secondaryAction.to && !secondaryAction.onClick && /* @__PURE__ */ jsx(Home, { className: "size-4", "aria-hidden": true }),
                secondaryAction.label
              ]
            }
          )
        ] })
      ]
    }
  );
}
function SessionExpiredError({ returnTo }) {
  const loginUrl = "/login?reason=expired" + (returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "");
  return /* @__PURE__ */ jsx(
    ErrorPage,
    {
      tone: "warning",
      icon: LogIn,
      title: "Your session has expired",
      description: "For security, you need to sign in again to continue.",
      primaryAction: { label: "Sign in again", to: loginUrl }
    }
  );
}
function ForbiddenError() {
  return /* @__PURE__ */ jsx(
    ErrorPage,
    {
      tone: "danger",
      icon: ShieldAlert,
      title: "You don't have permission to do this",
      description: "Your account role doesn't allow this action. Contact your administrator if you need access.",
      primaryAction: { label: "Go to dashboard", to: "/" }
    }
  );
}
function NotFoundError({
  resource = "page"
} = {}) {
  return /* @__PURE__ */ jsx(
    ErrorPage,
    {
      tone: "default",
      icon: AlertTriangle,
      title: `This ${resource} isn't available`,
      description: "It may have been removed, or you may not have access to it.",
      primaryAction: { label: "Go to dashboard", to: "/" }
    }
  );
}
function RateLimitedError({ retryAfter }) {
  return /* @__PURE__ */ jsx(
    ErrorPage,
    {
      tone: "warning",
      icon: Clock,
      title: "Too many requests",
      description: retryAfter ? `Please wait ${retryAfter} ${retryAfter === 1 ? "second" : "seconds"} before trying again.` : "Please wait a moment before trying again.",
      primaryAction: { label: "Go to dashboard", to: "/" }
    }
  );
}
function ServerError() {
  return /* @__PURE__ */ jsx(
    ErrorPage,
    {
      tone: "danger",
      icon: ServerCrash,
      title: "Something went wrong",
      description: "We're having trouble right now. Try again in a moment. If the problem persists, contact DLT support.",
      primaryAction: { label: "Try again", onClick: () => window.location.reload() },
      secondaryAction: { label: "Go to dashboard", to: "/" }
    }
  );
}
const links = () => [{
  rel: "icon",
  href: "/favicon.ico",
  sizes: "any"
}, {
  rel: "icon",
  href: "/favicon-32x32.png",
  type: "image/png",
  sizes: "32x32"
}, {
  rel: "icon",
  href: "/favicon-16x16.png",
  type: "image/png",
  sizes: "16x16"
}, {
  rel: "apple-touch-icon",
  href: "/apple-touch-icon.png"
}, {
  rel: "manifest",
  href: "/site.webmanifest"
}, {
  rel: "preconnect",
  href: "https://fonts.googleapis.com"
}, {
  rel: "preconnect",
  href: "https://fonts.gstatic.com",
  crossOrigin: "anonymous"
}, {
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
}];
async function loader$f({
  request
}) {
  const nonce = randomBytes(16).toString("base64");
  return data({
    nonce
  }, {
    headers: getSecurityHeaders(nonce)
  });
}
const headers = ({
  loaderHeaders
}) => {
  return loaderHeaders;
};
const themeInitScript = `
(function(){
  function apply(theme){
    var dark = theme === 'dark' || (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }
  try {
    var m = document.cookie.match(/(?:^|;)\\s*dlt-theme=(light|dark|system)/);
    var theme = m && m[1];
    if (!theme) {
      var legacy = null;
      try { legacy = localStorage.getItem('theme'); } catch(e) {}
      theme = (legacy === 'dark' || legacy === 'light') ? legacy : 'system';
      document.cookie = 'dlt-theme=' + theme + ';path=/;max-age=31536000;SameSite=Lax';
      try { localStorage.removeItem('theme'); } catch(e) {}
    }
    apply(theme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
      var mm = document.cookie.match(/(?:^|;)\\s*dlt-theme=(light|dark|system)/);
      if (!mm || mm[1] === 'system') apply('system');
    });
  } catch(e) {}
})();
`.trim();
function Layout({
  children
}) {
  let nonce = "";
  try {
    const loaderData = useLoaderData();
    if (loaderData && loaderData.nonce) {
      nonce = loaderData.nonce;
    }
  } catch (e) {
  }
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {}), /* @__PURE__ */ jsx("script", {
        nonce: nonce || void 0,
        dangerouslySetInnerHTML: {
          __html: themeInitScript
        }
      })]
    }), /* @__PURE__ */ jsxs("body", {
      className: "font-sans antialiased",
      children: [children, /* @__PURE__ */ jsx(ScrollRestoration, {
        nonce: nonce || void 0
      }), /* @__PURE__ */ jsx(Scripts, {
        nonce: nonce || void 0
      })]
    })]
  });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsx(ToastProvider, {
    children: /* @__PURE__ */ jsx(Outlet, {})
  });
});
const ErrorBoundary$2 = UNSAFE_withErrorBoundaryProps(function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return /* @__PURE__ */ jsx(NotFoundError, {});
    }
    if (error.status === 401) {
      return /* @__PURE__ */ jsx(ServerError, {});
    }
    return /* @__PURE__ */ jsx(ServerError, {});
  }
  return /* @__PURE__ */ jsx(ServerError, {});
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary$2,
  Layout,
  default: root,
  headers,
  links,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
const envSchema = z.object({
  // DLT API
  DLT_ORIGIN: z.string().url("DLT_ORIGIN must be a valid URL"),
  DLT_PORTAL_CLIENT_ID: z.string().min(1, "DLT_PORTAL_CLIENT_ID is required"),
  DLT_PORTAL_CLIENT_SECRET: z.string().min(1, "DLT_PORTAL_CLIENT_SECRET is required"),
  DLT_APPLICATION_CODE: z.string().default("merchant_portal"),
  // App
  APP_ORIGIN: z.string().url("APP_ORIGIN must be a valid URL"),
  APP_BASE_PATH: z.string().optional(),
  // Session
  SESSION_SECRETS: z.string().min(1, "SESSION_SECRETS is required").transform((s) => s.split(",")),
  // Redis (optional in dev)
  REDIS_URL: z.string().url().optional(),
  // Defaults
  DEFAULT_TIMEZONE: z.string().default("Asia/Manila"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});
try {
  process.loadEnvFile?.();
} catch {
}
function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. See above for details.");
  }
  return result.data;
}
const env = loadEnv();
const CSRF_TOKEN_LENGTH = 32;
function generateCsrfToken() {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}
function validateCsrfToken(submitted, session) {
  if (!submitted || submitted.length !== session.length) return false;
  try {
    return timingSafeEqual(Buffer.from(submitted), Buffer.from(session));
  } catch {
    return false;
  }
}
function isSameOrigin(request, appOrigin) {
  if (process.env.NODE_ENV === "development") return true;
  const origin = request.headers.get("Origin");
  if (origin) return origin === appOrigin;
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  return fetchSite === "same-origin" || fetchSite === "none";
}
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
function getEncryptionKey(secret) {
  return crypto.scryptSync(secret, "salt", 32);
}
function encrypt(text) {
  const secret = env.SESSION_SECRETS[0];
  if (!secret) throw new Error("No session secret configured");
  const key = getEncryptionKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}:0`;
}
function decrypt(text) {
  try {
    const parts = text.split(":");
    if (parts.length !== 4) return null;
    const [ivHex, authTagHex, encryptedHex, keyIndexStr] = parts;
    const keyIndex = parseInt(keyIndexStr, 10);
    const secret = env.SESSION_SECRETS[keyIndex] || env.SESSION_SECRETS[0];
    if (!secret) return null;
    const key = getEncryptionKey(secret);
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    return null;
  }
}
const globalForStore = globalThis;
const memoryStore = globalForStore.__sessionMemoryStore ?? /* @__PURE__ */ new Map();
globalForStore.__sessionMemoryStore = memoryStore;
const sessionStorage = createSessionStorage({
  cookie: {
    // __Host- prefix requires Secure, which browsers reject over HTTP.
    // Use a plain name in development so sessions work on http://localhost:3000.
    name: env.NODE_ENV === "production" ? "__Host-sid" : "sid",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    secrets: env.SESSION_SECRETS
  },
  async createData(data2, expires) {
    const id = crypto.randomUUID();
    const encrypted = encrypt(JSON.stringify(data2));
    memoryStore.set(id, { data: encrypted, expires });
    return id;
  },
  async readData(id) {
    const record = memoryStore.get(id);
    if (!record) return null;
    if (record.expires && record.expires < /* @__PURE__ */ new Date()) {
      memoryStore.delete(id);
      return null;
    }
    const decrypted = decrypt(record.data);
    return decrypted ? JSON.parse(decrypted) : null;
  },
  async updateData(id, data2, expires) {
    const encrypted = encrypt(JSON.stringify(data2));
    memoryStore.set(id, { data: encrypted, expires });
  },
  async deleteData(id) {
    memoryStore.delete(id);
  }
});
const { getSession, commitSession, destroySession } = sessionStorage;
async function requireUser(request) {
  const session = await getSession(request.headers.get("Cookie"));
  const pat = session.get("pat");
  const expiresAt = session.get("expiresAt");
  const user = session.get("user");
  if (!pat || !expiresAt || !user) {
    const url = new URL(request.url);
    throw redirect(`/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }
  if (new Date(expiresAt) < /* @__PURE__ */ new Date()) {
    const url = new URL(request.url);
    throw redirect(`/login?reason=expired&returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }
  let csrfSecret = session.get("csrfSecret");
  let csrfSetCookie = null;
  if (!csrfSecret) {
    csrfSecret = generateCsrfToken();
    session.set("csrfSecret", csrfSecret);
    csrfSetCookie = await commitSession(session);
  }
  return { pat, expiresAt, user, csrfSecret, csrfSetCookie };
}
function ok(data2) {
  return { ok: true, data: data2 };
}
function err(error) {
  return { ok: false, error };
}
const REDACTED_KEYS = /* @__PURE__ */ new Set([
  "authorization",
  "password",
  "current_password",
  "password_confirmation",
  "token",
  "otp",
  "value",
  "oauth_client_secret",
  "access_token"
]);
function redact(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val);
  }
  return result;
}
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = process.env.LOG_LEVEL ?? "info";
function log(level, message, meta2) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;
  const entry2 = {
    level,
    message,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...meta2 ? { meta: redact(meta2) } : {}
  };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(JSON.stringify(entry2));
}
const logger = {
  debug: (msg, meta2) => log("debug", msg, meta2),
  info: (msg, meta2) => log("info", msg, meta2),
  warn: (msg, meta2) => log("warn", msg, meta2),
  error: (msg, meta2) => log("error", msg, meta2)
};
const DEFAULT_READ_TIMEOUT_MS$1 = 1e4;
const DEFAULT_MUTATION_TIMEOUT_MS = 15e3;
const MAX_READ_RETRIES$1 = 2;
async function parseDltError(response) {
  const retryAfter = response.headers.get("Retry-After");
  const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : void 0;
  try {
    const body = await response.json();
    return {
      status: response.status,
      errorCode: body.error_code ?? void 0,
      message: body.message ?? `DLT error ${response.status}`,
      fieldErrors: body.errors ?? void 0,
      retryAfterSeconds: retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds : void 0
    };
  } catch {
    return {
      status: response.status,
      message: `DLT error ${response.status}`,
      retryAfterSeconds: retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds : void 0
    };
  }
}
async function dltFetch(options) {
  const { method, path: path2, bearer, body, multipart, timeoutMs } = options;
  const url = new URL(path2, env.DLT_ORIGIN);
  const headers2 = {
    Accept: "application/json"
  };
  if (bearer) {
    headers2["Authorization"] = `Bearer ${bearer}`;
  }
  let fetchBody;
  if (multipart) {
    fetchBody = multipart;
  } else if (body !== void 0) {
    headers2["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }
  const timeout = timeoutMs ?? (method === "GET" ? DEFAULT_READ_TIMEOUT_MS$1 : DEFAULT_MUTATION_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url.toString(), {
      method,
      headers: headers2,
      body: fetchBody,
      signal: controller.signal
    });
    clearTimeout(timer);
    if (response.status === 204) {
      return ok(void 0);
    }
    if (!response.ok) {
      return err(await parseDltError(response));
    }
    const json = await response.json();
    return ok(json.data);
  } catch (error) {
    clearTimeout(timer);
    const message = error instanceof DOMException && error.name === "AbortError" ? `DLT request timed out after ${timeout}ms` : `DLT network error: ${error instanceof Error ? error.message : "unknown"}`;
    logger.error(message, { method, path: path2.replace(/\/\d+/g, "/:id") });
    return err({ status: 0, message });
  }
}
async function dltGet(path2, bearer) {
  for (let attempt = 0; attempt <= MAX_READ_RETRIES$1; attempt++) {
    const result = await dltFetch({ method: "GET", path: path2, bearer });
    if (result.ok) return result;
    const { status } = result.error;
    const isRetryable = status === 0 || status === 502 || status === 503 || status === 504;
    if (!isRetryable || attempt === MAX_READ_RETRIES$1) return result;
    const baseDelay = Math.pow(2, attempt) * 500;
    const jitter = Math.random() * 500;
    await new Promise((r) => setTimeout(r, baseDelay + jitter));
  }
  return err({ status: 0, message: "Exhausted retries" });
}
async function dltGetEnvelope(path2, bearer) {
  const url = new URL(path2, env.DLT_ORIGIN);
  const headers2 = {
    Accept: "application/json",
    Authorization: `Bearer ${bearer}`
  };
  for (let attempt = 0; attempt <= MAX_READ_RETRIES$1; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_READ_TIMEOUT_MS$1);
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: headers2,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) {
        const dltErr = await parseDltError(response);
        const isRetryable = dltErr.status === 0 || dltErr.status === 502 || dltErr.status === 503 || dltErr.status === 504;
        if (!isRetryable || attempt === MAX_READ_RETRIES$1) return err(dltErr);
      } else {
        const json = await response.json();
        return ok(json);
      }
    } catch (error) {
      clearTimeout(timer);
      const message = error instanceof DOMException && error.name === "AbortError" ? `DLT request timed out after ${DEFAULT_READ_TIMEOUT_MS$1}ms` : `DLT network error: ${error instanceof Error ? error.message : "unknown"}`;
      logger.error(message, { method: "GET", path: path2.replace(/\/\d+/g, "/:id") });
      if (attempt === MAX_READ_RETRIES$1) return err({ status: 0, message });
    }
    const baseDelay = Math.pow(2, attempt) * 500;
    const jitter = Math.random() * 500;
    await new Promise((r) => setTimeout(r, baseDelay + jitter));
  }
  return err({ status: 0, message: "Exhausted retries" });
}
async function dltMutate(options) {
  return dltFetch(options);
}
async function dltLoginCall(path2, body) {
  const credentials = Buffer.from(
    `${env.DLT_PORTAL_CLIENT_ID}:${env.DLT_PORTAL_CLIENT_SECRET}`
  ).toString("base64");
  const url = new URL(path2, env.DLT_ORIGIN);
  const headers2 = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${credentials}`,
    "X-DLT-Application": env.DLT_APPLICATION_CODE
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_MUTATION_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: headers2,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!response.ok) {
      return err(await parseDltError(response));
    }
    const json = await response.json();
    return ok(json.data);
  } catch (error) {
    clearTimeout(timer);
    return err({
      status: 0,
      message: error instanceof Error ? error.message : "Login network error"
    });
  }
}
const loginUserSchema = z.object({
  id: z.number(),
  reference_id: z.string(),
  merchant_reference_id: z.string(),
  merchant_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.number(),
  email: z.string(),
  email_verified_at: z.string().nullable(),
  created_at: z.string()
});
const loginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_at: z.string(),
  user: loginUserSchema
});
const userProfileSchema = z.object({
  id: z.number(),
  reference_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.enum(["administrator", "developer"]),
  username: z.string(),
  pending_email: z.string().nullable().optional(),
  pending_email_expires_at: z.string().nullable().optional(),
  email_verified_at: z.string().nullable(),
  is_active: z.boolean(),
  merchant: z.object({
    id: z.number(),
    reference_id: z.string(),
    name: z.string()
  })
});
const merchantServiceSchema = z.object({
  id: z.number(),
  code: z.string(),
  type: z.string(),
  is_active: z.boolean()
});
const merchantSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_person: z.string().nullable(),
  email: z.string().nullable(),
  dial_code: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  website: z.string().nullable(),
  logo_url: z.string().nullable(),
  currency: z.string(),
  is_active: z.boolean(),
  services: z.array(merchantServiceSchema),
  created_at: z.string(),
  updated_at: z.string()
});
const transactionSchema = z.object({
  id: z.number(),
  merchant_transaction_id: z.string(),
  amount: z.string().nullable(),
  currency: z.string().nullable(),
  status: z.enum(["PAID", "PENDING", "REJECTED"]),
  payment_brand: z.string().nullable(),
  payment_method: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  history_available: z.boolean()
});
const paginationMetaSchema = z.object({
  current_page: z.number(),
  per_page: z.number(),
  total: z.number(),
  last_page: z.number()
});
z.object({
  data: z.array(transactionSchema),
  meta: paginationMetaSchema
});
const historyCoverageSchema = z.object({
  merchant_request: z.enum(["captured", "not_captured", "purged"]),
  dlt_response: z.enum(["captured", "not_captured", "purged"]),
  merchant_webhook_request: z.enum(["captured", "not_captured", "purged"]),
  merchant_webhook_response: z.enum(["captured", "not_captured", "purged"])
});
const historyDeliverySchema = z.object({
  state: z.string(),
  duration_ms: z.number().nullable(),
  body_capture_status: z.enum([
    "no_response",
    "empty",
    "omitted_oversize",
    "omitted_unsupported_content_type",
    "omitted_binary",
    "omitted_sensitive",
    "captured",
    "captured_sanitized",
    "captured_invalid_json_text"
  ]).nullable()
});
const historyResponseSchema = z.object({
  is_repeated_request: z.boolean().nullable(),
  capture_stage: z.string().nullable(),
  body_capture_status: z.string().nullable()
});
const historyOmissionSchema = z.object({
  field_path: z.string(),
  reason_code: z.string()
});
const jsonValueSchema = z.lazy(
  () => z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema)
  ])
);
const historyItemSchema = z.object({
  id: z.string(),
  transaction_id: z.number(),
  event_type: z.string(),
  direction: z.string(),
  captured_at: z.string(),
  capture_format: z.string(),
  capture_status: z.enum(["available", "omitted", "unavailable", "purged"]),
  event_id: z.string().nullable(),
  attempt_number: z.number().nullable(),
  http_status: z.number().nullable(),
  delivery: historyDeliverySchema.nullable(),
  response: historyResponseSchema.nullable(),
  payload: jsonValueSchema.nullable(),
  omissions: z.array(historyOmissionSchema),
  retain_until: z.string().nullable(),
  purged_at: z.string().nullable()
});
const metricsSchema = z.object({
  currency: z.string(),
  timezone: z.string(),
  from: z.string(),
  to: z.string(),
  as_of: z.string(),
  date_basis: z.string(),
  collection_total: z.string(),
  transaction_count: z.number(),
  successful_count: z.number(),
  pending_count: z.number(),
  rejected_count: z.number(),
  success_rate_percent: z.string().nullable()
});
const chartBucketSchema = z.object({
  period: z.string(),
  from: z.string(),
  to: z.string(),
  partial: z.boolean(),
  collection_total: z.string(),
  transaction_count: z.number(),
  successful_count: z.number(),
  pending_count: z.number(),
  rejected_count: z.number(),
  success_rate_percent: z.string().nullable()
});
const chartsSchema = z.object({
  currency: z.string(),
  timezone: z.string(),
  from: z.string(),
  to: z.string(),
  as_of: z.string(),
  date_basis: z.string(),
  interval: z.enum(["day", "month", "year"]),
  totals: z.object({
    collection_total: z.string(),
    transaction_count: z.number(),
    successful_count: z.number(),
    pending_count: z.number(),
    rejected_count: z.number(),
    success_rate_percent: z.string().nullable()
  }),
  buckets: z.array(chartBucketSchema)
});
const teamMemberSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.enum(["administrator", "developer"]),
  is_active: z.boolean(),
  joined_at: z.string().nullable()
});
const teamInvitationSchema = z.object({
  id: z.string(),
  // UUID
  email: z.string(),
  role: z.enum(["administrator", "developer"]),
  status: z.enum(["pending", "accepted", "expired", "revoked"]),
  invited_by: z.number().optional(),
  sent: z.boolean().optional(),
  created_at: z.string(),
  expires_at: z.string().nullable()
});
z.object({
  id: z.number(),
  label: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  rotation_deadline: z.string().nullable(),
  replaces: z.number().nullable()
});
z.object({
  has_authentication_token: z.boolean(),
  has_secret_key: z.boolean(),
  updated_at: z.string().nullable()
});
const currencyItemSchema = z.object({
  cc: z.string(),
  name: z.string(),
  symbol: z.string()
});
const dltLogoSrc = "/assets/dlt-upmII3t2.png";
function DltLogo({
  size = 32,
  showText = true,
  tone = "dark",
  tile = false,
  invertDark = false,
  compact = false,
  className
}) {
  const img = /* @__PURE__ */ jsx(
    "img",
    {
      src: dltLogoSrc,
      alt: "DLT logo",
      width: size,
      height: size,
      className: cn(
        "shrink-0 rounded-md",
        invertDark && "dark:brightness-0 dark:invert"
      ),
      "aria-hidden": showText ? true : void 0
    }
  );
  return /* @__PURE__ */ jsxs("div", { className: cn("flex items-center gap-2", className), children: [
    tile ? /* @__PURE__ */ jsx("span", { className: "flex shrink-0 items-center justify-center rounded-lg bg-white p-1", children: img }) : img,
    showText && (compact ? /* @__PURE__ */ jsxs(
      "span",
      {
        className: cn(
          "whitespace-nowrap text-sm font-bold tracking-tight",
          tone === "dark" ? "text-white" : "text-ink"
        ),
        children: [
          "DLT Portal",
          " ",
          /* @__PURE__ */ jsx(
            "span",
            {
              className: cn(
                "text-[10px] font-medium tracking-widest uppercase",
                tone === "dark" ? "text-sidebar-muted" : "text-ink-3"
              ),
              children: "· Merchant"
            }
          )
        ]
      }
    ) : /* @__PURE__ */ jsxs("div", { className: "flex flex-col leading-none", children: [
      /* @__PURE__ */ jsx(
        "span",
        {
          className: cn(
            "text-sm font-bold tracking-tight",
            tone === "dark" ? "text-white" : "text-ink"
          ),
          children: "DLT Portal"
        }
      ),
      /* @__PURE__ */ jsx(
        "span",
        {
          className: cn(
            "mt-0.5 text-[10px] font-medium tracking-widest uppercase",
            tone === "dark" ? "text-sidebar-muted" : "text-ink-3"
          ),
          children: "Merchant"
        }
      )
    ] }))
  ] });
}
const VARIANTS = {
  info: { classes: "border-line bg-info-subtle text-info-ink", Icon: Info },
  success: { classes: "border-line bg-success-subtle text-success-ink", Icon: CheckCircle2 },
  warning: { classes: "border-line bg-warning-subtle text-warning-ink", Icon: AlertTriangle },
  danger: { classes: "border-line bg-danger-subtle text-danger-ink", Icon: AlertCircle }
};
function Callout({
  variant = "info",
  role,
  className,
  children
}) {
  const { classes, Icon } = VARIANTS[variant];
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role,
      className: cn("flex items-start gap-2.5 rounded-lg border p-3.5 text-sm", classes, className),
      children: [
        /* @__PURE__ */ jsx(Icon, { className: "mt-0.5 size-4 shrink-0", "aria-hidden": true }),
        /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1 [&_a]:font-medium [&_a]:underline", children })
      ]
    }
  );
}
function FormField({
  label,
  name,
  hint,
  error,
  required,
  className,
  children
}) {
  const generated = React.useId();
  const id = name ?? generated;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || void 0;
  const control = React.cloneElement(children, {
    id,
    name: children.props.name ?? id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"]
  });
  return /* @__PURE__ */ jsxs("div", { className: cn("space-y-1.5", className), children: [
    /* @__PURE__ */ jsxs("label", { htmlFor: id, className: "block text-sm font-medium text-ink-2", children: [
      label,
      required && /* @__PURE__ */ jsx("span", { className: "ml-1 text-danger", "aria-hidden": true, children: "*" })
    ] }),
    control,
    hint && !error && /* @__PURE__ */ jsx("p", { id: hintId, className: "text-xs text-ink-3", children: hint }),
    error && /* @__PURE__ */ jsx("p", { id: errorId, className: "text-xs text-danger-ink", role: "alert", children: error })
  ] });
}
function ReadOnlyField({
  label,
  value,
  className
}) {
  return /* @__PURE__ */ jsxs("div", { className: cn("space-y-1.5", className), children: [
    /* @__PURE__ */ jsx("span", { className: "block text-sm font-medium text-ink-2", children: label }),
    /* @__PURE__ */ jsxs("div", { className: "flex h-9 items-center gap-2 rounded-lg bg-surface-2 px-3 text-sm text-ink-2", children: [
      /* @__PURE__ */ jsxs(
        "svg",
        {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          className: "size-3.5 shrink-0 text-ink-3",
          "aria-hidden": true,
          children: [
            /* @__PURE__ */ jsx("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }),
            /* @__PURE__ */ jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
          ]
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "truncate", children: value ?? "—" })
    ] })
  ] });
}
const controlClass = "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors placeholder:text-ink-3/70 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3 aria-[invalid=true]:border-danger";
const Input = React.forwardRef(
  ({ className, invalid, ...props }, ref) => /* @__PURE__ */ jsx(
    "input",
    {
      ref,
      "aria-invalid": invalid || void 0,
      className: cn(controlClass, "h-9", invalid && "border-danger", className),
      ...props
    }
  )
);
Input.displayName = "Input";
const Select = React.forwardRef(
  ({ className, invalid, children, ...props }, ref) => /* @__PURE__ */ jsxs("div", { className: cn("relative overflow-visible", className), children: [
    /* @__PURE__ */ jsx(
      "select",
      {
        ref,
        "aria-invalid": invalid || void 0,
        className: cn(
          controlClass,
          "h-9 cursor-pointer appearance-none pr-8",
          invalid && "border-danger"
        ),
        ...props,
        children
      }
    ),
    /* @__PURE__ */ jsx(
      ChevronDown,
      {
        className: "pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3",
        "aria-hidden": true
      }
    )
  ] })
);
Select.displayName = "Select";
const Textarea = React.forwardRef(
  ({ className, invalid, ...props }, ref) => /* @__PURE__ */ jsx(
    "textarea",
    {
      ref,
      "aria-invalid": invalid || void 0,
      className: cn(controlClass, "py-2", invalid && "border-danger", className),
      ...props
    }
  )
);
Textarea.displayName = "Textarea";
const PasswordInput = React.forwardRef(
  ({ className, invalid, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          ref,
          type: show ? "text" : "password",
          "aria-invalid": invalid || void 0,
          className: cn(controlClass, "h-9 pr-10", invalid && "border-danger", className),
          ...props
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => setShow((s) => !s),
          className: "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 transition-colors hover:text-ink-2",
          "aria-label": show ? "Hide password" : "Show password",
          "aria-pressed": show,
          children: show ? /* @__PURE__ */ jsx(EyeOff, { className: "size-4", "aria-hidden": true }) : /* @__PURE__ */ jsx(Eye, { className: "size-4", "aria-hidden": true })
        }
      )
    ] });
  }
);
PasswordInput.displayName = "PasswordInput";
const COOKIE_NAME = "dlt-theme";
function resolveDark(theme) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function applyThemePreference(theme) {
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
function setThemePreference(theme) {
  document.cookie = `${COOKIE_NAME}=${theme};path=/;max-age=31536000;SameSite=Lax`;
  try {
    localStorage.removeItem("theme");
  } catch {
  }
  applyThemePreference(theme);
}
function isDarkNow() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}
function useIsDark() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const update = () => setDark(isDarkNow());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}
function ThemeToggle() {
  const dark = useIsDark();
  const Icon = dark ? Moon : Sun;
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick: () => setThemePreference(dark ? "light" : "dark"),
      className: "text-ink-2 hover:bg-surface-2 hover:text-ink inline-flex size-9 items-center justify-center rounded-lg transition-colors",
      "aria-label": dark ? "Switch to light theme" : "Switch to dark theme",
      "aria-pressed": dark,
      children: /* @__PURE__ */ jsx(Icon, { className: "size-4", "aria-hidden": true })
    }
  );
}
const meta$9 = () => [{
  title: "Login | DLT Portal"
}];
async function loader$e({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  let csrfSecret = session.get("csrfSecret");
  let headers2 = new Headers();
  if (!csrfSecret) {
    csrfSecret = generateCsrfToken();
    session.set("csrfSecret", csrfSecret);
    headers2.set("Set-Cookie", await commitSession(session));
  }
  const url = new URL(request.url);
  const reason = url.searchParams.get("reason");
  const returnTo = url.searchParams.get("returnTo");
  return data({
    csrfToken: csrfSecret,
    reason,
    returnTo
  }, {
    headers: headers2
  });
}
async function action$7({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  const csrfSecret = session.get("csrfSecret");
  if (!isSameOrigin(request, env.APP_ORIGIN)) {
    return data({
      error: "Invalid origin."
    }, {
      status: 403
    });
  }
  const formData = await request.formData();
  const csrf = formData.get("csrfToken");
  if (typeof csrf !== "string" || typeof csrfSecret !== "string" || !validateCsrfToken(csrf, csrfSecret)) {
    return data({
      error: "Invalid CSRF token."
    }, {
      status: 403
    });
  }
  const email = formData.get("email");
  const password = formData.get("password");
  const returnTo = formData.get("returnTo");
  if (typeof email !== "string" || typeof password !== "string") {
    return data({
      error: "Email and password are required."
    }, {
      status: 400
    });
  }
  const loginResult = await dltLoginCall("/api/v1/auth/login", {
    username: email,
    password
  });
  if (!loginResult.ok) {
    const error = loginResult.error;
    if (error.status === 401 && error.errorCode === "INVALID_CREDENTIALS") {
      return data({
        error: "Wrong email or password"
      }, {
        status: 401
      });
    }
    if (error.status === 401 && error.errorCode === "ECOSYSTEM_CLIENT_UNAUTHENTICATED") {
      return data({
        error: "Service unavailable"
      }, {
        status: 503
      });
    }
    if (error.status === 403) {
      return data({
        error: "Your account isn't eligible"
      }, {
        status: 403
      });
    }
    if (error.status === 429) {
      return data({
        error: `Too many attempts. Try again in ${error.retryAfterSeconds || 60} seconds.`
      }, {
        status: 429
      });
    }
    if (error.status === 503) {
      return data({
        error: "Service temporarily unavailable"
      }, {
        status: 503
      });
    }
    return data({
      error: error.message || "Login failed."
    }, {
      status: 400
    });
  }
  const parsedLogin = loginResponseSchema.safeParse(loginResult.data);
  if (!parsedLogin.success) {
    return data({
      error: "Unexpected login response format."
    }, {
      status: 500
    });
  }
  const {
    access_token,
    expires_at
  } = parsedLogin.data;
  const profileResult = await dltGet("/api/v1/portal/me", access_token);
  if (!profileResult.ok) {
    return data({
      error: "Failed to retrieve profile."
    }, {
      status: 400
    });
  }
  const parsedProfile = userProfileSchema.safeParse(profileResult.data);
  if (!parsedProfile.success) {
    return data({
      error: "Unexpected profile response format."
    }, {
      status: 500
    });
  }
  session.set("pat", access_token);
  session.set("expiresAt", expires_at);
  session.set("user", {
    id: parsedProfile.data.id,
    email: parsedProfile.data.email,
    firstName: parsedProfile.data.first_name,
    lastName: parsedProfile.data.last_name,
    role: parsedProfile.data.role,
    merchantId: parsedProfile.data.merchant.id,
    merchantName: parsedProfile.data.merchant.name
  });
  const safeReturnTo = typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return redirect(safeReturnTo, {
    headers: {
      "Set-Cookie": await commitSession(session)
    }
  });
}
const public_login = UNSAFE_withComponentProps(function LoginPage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  let bannerMessage = null;
  if (loaderData.reason === "expired") {
    bannerMessage = "Your session has expired. Please sign in again.";
  } else if (loaderData.reason === "password_changed") {
    bannerMessage = "Your password has been changed. Please sign in again.";
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4 py-10",
    children: [/* @__PURE__ */ jsx("div", {
      className: "fixed right-4 top-4",
      children: /* @__PURE__ */ jsx(ThemeToggle, {})
    }), /* @__PURE__ */ jsxs("div", {
      className: "w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 shadow-card",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "mb-8 flex flex-col items-center gap-4 text-center",
        children: [/* @__PURE__ */ jsx(DltLogo, {
          size: 44,
          showText: false
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-semibold text-ink",
            children: "Sign in to DLT Portal"
          }), /* @__PURE__ */ jsx("p", {
            className: "mt-1 text-sm text-ink-3",
            children: "Merchant payments dashboard"
          })]
        })]
      }), bannerMessage && /* @__PURE__ */ jsx(Callout, {
        variant: "info",
        className: "mb-5",
        children: bannerMessage
      }), actionData?.error && /* @__PURE__ */ jsx(Callout, {
        variant: "danger",
        role: "alert",
        className: "mb-5",
        children: actionData.error
      }), /* @__PURE__ */ jsxs(Form, {
        method: "post",
        className: "space-y-5",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "csrfToken",
          value: loaderData.csrfToken
        }), loaderData.returnTo && /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "returnTo",
          value: loaderData.returnTo
        }), /* @__PURE__ */ jsx(FormField, {
          label: "Email address",
          name: "email",
          required: true,
          children: /* @__PURE__ */ jsx(Input, {
            type: "email",
            autoComplete: "username",
            required: true
          })
        }), /* @__PURE__ */ jsxs("div", {
          className: "space-y-1.5",
          children: [/* @__PURE__ */ jsx(FormField, {
            label: "Password",
            name: "password",
            required: true,
            children: /* @__PURE__ */ jsx(PasswordInput, {
              autoComplete: "current-password",
              required: true
            })
          }), /* @__PURE__ */ jsx("div", {
            className: "text-right",
            children: /* @__PURE__ */ jsx(Link, {
              to: "/forgot-password",
              className: "text-xs font-medium text-primary hover:text-primary-hover hover:underline",
              children: "Forgot password?"
            })
          })]
        }), /* @__PURE__ */ jsx(Button, {
          type: "submit",
          size: "lg",
          loading: isSubmitting,
          className: "w-full",
          children: isSubmitting ? "Signing in…" : "Sign in"
        })]
      })]
    })]
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7,
  default: public_login,
  loader: loader$e,
  meta: meta$9
}, Symbol.toStringTag, { value: "Module" }));
const meta$8 = () => [{
  title: "Forgot Password | DLT Portal"
}];
async function loader$d({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  let csrfSecret = session.get("csrfSecret");
  let headers2 = new Headers();
  if (!csrfSecret) {
    csrfSecret = generateCsrfToken();
    session.set("csrfSecret", csrfSecret);
    headers2.set("Set-Cookie", await commitSession(session));
  }
  return data({
    csrfToken: csrfSecret
  }, {
    headers: headers2
  });
}
async function action$6({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  const csrfSecret = session.get("csrfSecret");
  if (!isSameOrigin(request, env.APP_ORIGIN)) {
    return data({
      error: "Invalid origin.",
      success: false,
      message: ""
    }, {
      status: 403
    });
  }
  const formData = await request.formData();
  const csrf = formData.get("csrfToken");
  if (typeof csrf !== "string" || typeof csrfSecret !== "string" || !validateCsrfToken(csrf, csrfSecret)) {
    return data({
      error: "Invalid CSRF token.",
      success: false,
      message: ""
    }, {
      status: 403
    });
  }
  const email = formData.get("email");
  if (typeof email !== "string") {
    return data({
      error: "Email is required.",
      success: false,
      message: ""
    }, {
      status: 400
    });
  }
  const reset_url = `${env.APP_ORIGIN}/reset-password`;
  const url = new URL("/api/v1/auth/reset-password/reset-link", env.DLT_ORIGIN);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        reset_url
      })
    });
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
        return data({
          error: `Too many attempts. Try again in ${seconds} seconds.`,
          success: false,
          message: ""
        }, {
          status: 429
        });
      }
    }
  } catch (error) {
  }
  return data({
    success: true,
    message: "If the account exists, a password reset link has been sent.",
    error: null
  });
}
const public_forgotPassword = UNSAFE_withComponentProps(function ForgotPasswordPage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return /* @__PURE__ */ jsxs("div", {
    className: "flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4 py-10",
    children: [/* @__PURE__ */ jsx("div", {
      className: "fixed right-4 top-4",
      children: /* @__PURE__ */ jsx(ThemeToggle, {})
    }), /* @__PURE__ */ jsxs("div", {
      className: "w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 shadow-card",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "mb-8 flex flex-col items-center gap-4 text-center",
        children: [/* @__PURE__ */ jsx(DltLogo, {
          size: 44,
          showText: false
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-semibold text-ink",
            children: "Forgot password"
          }), /* @__PURE__ */ jsx("p", {
            className: "mt-1 text-sm text-ink-3",
            children: "Enter your email and we'll send you a reset link."
          })]
        })]
      }), actionData?.error && /* @__PURE__ */ jsx(Callout, {
        variant: "danger",
        role: "alert",
        className: "mb-5",
        children: actionData.error
      }), actionData?.success ? /* @__PURE__ */ jsxs("div", {
        className: "space-y-5",
        children: [/* @__PURE__ */ jsx(Callout, {
          variant: "success",
          children: actionData.message
        }), /* @__PURE__ */ jsx(Link, {
          to: "/login",
          className: cn(buttonVariants({
            variant: "secondary",
            size: "lg"
          }), "w-full"),
          children: "Back to sign in"
        })]
      }) : /* @__PURE__ */ jsxs(Form, {
        method: "post",
        className: "space-y-5",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "csrfToken",
          value: loaderData.csrfToken
        }), /* @__PURE__ */ jsx(FormField, {
          label: "Email address",
          name: "email",
          required: true,
          children: /* @__PURE__ */ jsx(Input, {
            type: "email",
            autoComplete: "email",
            required: true
          })
        }), /* @__PURE__ */ jsx(Button, {
          type: "submit",
          size: "lg",
          loading: isSubmitting,
          className: "w-full",
          children: isSubmitting ? "Sending…" : "Send reset link"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-center text-sm",
          children: /* @__PURE__ */ jsx(Link, {
            to: "/login",
            className: "font-medium text-primary hover:text-primary-hover hover:underline",
            children: "Back to sign in"
          })
        })]
      })]
    })]
  });
});
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: public_forgotPassword,
  loader: loader$d,
  meta: meta$8
}, Symbol.toStringTag, { value: "Module" }));
const PASSWORD_RULES = [
  {
    key: "length",
    label: "12–128 characters",
    test: (p) => p.length >= 12 && p.length <= 128
  },
  { key: "upper", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "Number", test: (p) => /[0-9]/.test(p) },
  { key: "symbol", label: "Symbol (!@#$%^&*…)", test: (p) => /[^A-Za-z0-9]/.test(p) }
];
function passwordScore(password) {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}
const STRENGTH_LABEL = ["Very weak", "Weak", "Fair", "Good", "Strong", "Strong"];
function PasswordRules({ password }) {
  if (!password) return null;
  return /* @__PURE__ */ jsx("ul", { className: "animate-in fade-in space-y-1 duration-200", "aria-label": "Password requirements", children: PASSWORD_RULES.map((rule) => {
    const passing = rule.test(password);
    return /* @__PURE__ */ jsxs(
      "li",
      {
        className: cn(
          "flex items-center gap-1.5 text-xs transition-colors",
          passing ? "text-success-ink" : "text-ink-2"
        ),
        children: [
          passing ? /* @__PURE__ */ jsx(Check, { className: "text-success size-3.5", "aria-hidden": true }) : /* @__PURE__ */ jsx(Circle, { className: "text-ink-3 size-3.5", "aria-hidden": true }),
          rule.label
        ]
      },
      rule.key
    );
  }) });
}
function PasswordStrengthMeter({ password }) {
  const score = passwordScore(password);
  if (!password) return null;
  const level = score;
  const tone = level <= 2 ? "bg-danger" : level === 3 ? "bg-warning" : "bg-success";
  return /* @__PURE__ */ jsxs("div", { "aria-live": "polite", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "flex gap-1",
        role: "meter",
        "aria-valuemin": 0,
        "aria-valuemax": 5,
        "aria-valuenow": level,
        "aria-label": "Password strength",
        children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": true,
            className: cn("h-1 flex-1 rounded-full", i < level ? tone : "bg-surface-2")
          },
          i
        ))
      }
    ),
    /* @__PURE__ */ jsx("p", { className: "text-ink-3 mt-1 text-xs", children: STRENGTH_LABEL[level] })
  ] });
}
function PasswordMatchHint({
  password,
  confirmation
}) {
  if (!confirmation) return null;
  const match = password === confirmation;
  return /* @__PURE__ */ jsx(
    "p",
    {
      className: cn(
        "flex items-center gap-1 text-xs",
        match ? "text-success-ink" : "text-danger-ink"
      ),
      role: match ? void 0 : "alert",
      children: match ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Check, { className: "size-3.5", "aria-hidden": true }),
        " Passwords match"
      ] }) : "Passwords do not match"
    }
  );
}
const meta$7 = () => [{
  title: "Reset Password | DLT Portal"
}];
async function loader$c({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  let csrfSecret = session.get("csrfSecret");
  let headers2 = new Headers();
  if (!csrfSecret) {
    csrfSecret = generateCsrfToken();
    session.set("csrfSecret", csrfSecret);
    headers2.set("Set-Cookie", await commitSession(session));
  }
  return data({
    csrfToken: csrfSecret
  }, {
    headers: headers2
  });
}
async function action$5({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  const csrfSecret = session.get("csrfSecret");
  if (!isSameOrigin(request, env.APP_ORIGIN)) {
    return data({
      error: "Invalid origin."
    }, {
      status: 403
    });
  }
  const formData = await request.formData();
  const csrf = formData.get("csrfToken");
  if (typeof csrf !== "string" || typeof csrfSecret !== "string" || !validateCsrfToken(csrf, csrfSecret)) {
    return data({
      error: "Invalid CSRF token."
    }, {
      status: 403
    });
  }
  const email = formData.get("email");
  const token = formData.get("token");
  const password = formData.get("password");
  const password_confirmation = formData.get("password_confirmation");
  if (typeof email !== "string" || typeof token !== "string" || typeof password !== "string" || typeof password_confirmation !== "string") {
    return data({
      error: "All fields are required."
    }, {
      status: 400
    });
  }
  if (password !== password_confirmation) {
    return data({
      error: "Passwords do not match."
    }, {
      status: 400
    });
  }
  const url = new URL("/api/v1/auth/reset-password/new-password", env.DLT_ORIGIN);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        token,
        password,
        password_confirmation
      })
    });
    if (!response.ok) {
      if (response.status === 400) {
        return data({
          error: "The reset link is invalid or has expired. Please request a new one."
        }, {
          status: 400
        });
      }
      return data({
        error: "Failed to reset password. Please try again."
      }, {
        status: 400
      });
    }
  } catch (error) {
    return data({
      error: "Network error. Please try again later."
    }, {
      status: 500
    });
  }
  return redirect("/login?reason=password_changed");
}
const public_resetPassword = UNSAFE_withComponentProps(function ResetPasswordPage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramEmail = params.get("email");
    const paramToken = params.get("token");
    if (paramEmail && paramToken) {
      setEmail(paramEmail);
      setToken(paramToken);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  if (!email || !token) {
    return /* @__PURE__ */ jsxs("div", {
      className: "flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4",
      children: [/* @__PURE__ */ jsx("div", {
        className: "fixed right-4 top-4",
        children: /* @__PURE__ */ jsx(ThemeToggle, {})
      }), /* @__PURE__ */ jsxs("div", {
        className: "w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 text-center shadow-card",
        children: [/* @__PURE__ */ jsx(Callout, {
          variant: "danger",
          role: "alert",
          children: "Reset link is missing or invalid."
        }), /* @__PURE__ */ jsx("a", {
          href: "/forgot-password",
          className: "mt-4 inline-block text-sm font-medium text-primary hover:text-primary-hover hover:underline",
          children: "Request a new link"
        })]
      })]
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4 py-10",
    children: [/* @__PURE__ */ jsx("div", {
      className: "fixed right-4 top-4",
      children: /* @__PURE__ */ jsx(ThemeToggle, {})
    }), /* @__PURE__ */ jsxs("div", {
      className: "w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 shadow-card",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "mb-8 flex flex-col items-center gap-4 text-center",
        children: [/* @__PURE__ */ jsx(DltLogo, {
          size: 44,
          showText: false
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-semibold text-ink",
            children: "Reset password"
          }), /* @__PURE__ */ jsxs("p", {
            className: "mt-1 text-sm text-ink-3",
            children: ["For ", email]
          })]
        })]
      }), actionData?.error && /* @__PURE__ */ jsxs(Callout, {
        variant: "danger",
        role: "alert",
        className: "mb-5",
        children: [actionData.error, actionData.error.includes("expired") && /* @__PURE__ */ jsx("div", {
          className: "mt-1",
          children: /* @__PURE__ */ jsx("a", {
            href: "/forgot-password",
            className: "underline",
            children: "Request a new link"
          })
        })]
      }), /* @__PURE__ */ jsxs(Form, {
        method: "post",
        className: "space-y-5",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "csrfToken",
          value: loaderData.csrfToken
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "email",
          value: email
        }), /* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "token",
          value: token
        }), /* @__PURE__ */ jsx(FormField, {
          label: "New password",
          name: "password",
          required: true,
          children: /* @__PURE__ */ jsx(PasswordInput, {
            autoComplete: "new-password",
            required: true,
            minLength: 12,
            maxLength: 128,
            onChange: (e) => setPassword(e.target.value)
          })
        }), /* @__PURE__ */ jsx("div", {
          className: "rounded-lg bg-surface-2 p-3.5",
          children: /* @__PURE__ */ jsx(PasswordRules, {
            password
          })
        }), /* @__PURE__ */ jsx(PasswordStrengthMeter, {
          password
        }), /* @__PURE__ */ jsx(FormField, {
          label: "Confirm new password",
          name: "password_confirmation",
          required: true,
          children: /* @__PURE__ */ jsx(PasswordInput, {
            autoComplete: "new-password",
            required: true,
            minLength: 12,
            maxLength: 128,
            onChange: (e) => setConfirmation(e.target.value)
          })
        }), /* @__PURE__ */ jsx(PasswordMatchHint, {
          password,
          confirmation
        }), /* @__PURE__ */ jsx(Button, {
          type: "submit",
          size: "lg",
          loading: isSubmitting,
          className: "w-full",
          children: isSubmitting ? "Resetting…" : "Reset password"
        })]
      })]
    })]
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: public_resetPassword,
  loader: loader$c,
  meta: meta$7
}, Symbol.toStringTag, { value: "Module" }));
const teamMemberListSchema = z.object({
  data: z.array(teamMemberSchema),
  meta: paginationMetaSchema
});
const teamInvitationListSchema = z.object({
  data: z.array(teamInvitationSchema),
  meta: paginationMetaSchema
});
const DEFAULT_READ_TIMEOUT_MS = 1e4;
const MAX_READ_RETRIES = 2;
async function dltGetPaginated(path2, bearer, schema) {
  const url = new URL(path2, env.DLT_ORIGIN);
  for (let attempt = 0; attempt <= MAX_READ_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_READ_TIMEOUT_MS);
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${bearer}`
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) {
        const retryAfter = response.headers.get("Retry-After");
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : void 0;
        let errorBody = {};
        try {
          errorBody = await response.json();
        } catch {
        }
        const dltErr = {
          status: response.status,
          errorCode: errorBody.error_code,
          message: errorBody.message ?? `DLT error ${response.status}`,
          fieldErrors: errorBody.errors,
          retryAfterSeconds: retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds : void 0
        };
        const isRetryable = [502, 503, 504].includes(response.status);
        if (!isRetryable || attempt === MAX_READ_RETRIES) {
          return { ok: false, error: dltErr };
        }
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      const json = await response.json();
      const parsed = schema.safeParse({ data: json.data, meta: json.meta });
      if (!parsed.success) {
        logger.error("DLT paginated response schema mismatch", {
          path: path2,
          issues: parsed.error.issues
        });
        return {
          ok: false,
          error: { status: 0, message: "Unexpected response shape from DLT" }
        };
      }
      return { ok: true, data: parsed.data };
    } catch (error) {
      clearTimeout(timer);
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      const message = isAbort ? `DLT request timed out after ${DEFAULT_READ_TIMEOUT_MS}ms` : `DLT network error: ${error instanceof Error ? error.message : "unknown"}`;
      logger.error(message, { path: path2 });
      if (attempt === MAX_READ_RETRIES) {
        return { ok: false, error: { status: 0, message } };
      }
      const delay = Math.pow(2, attempt) * 500 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return { ok: false, error: { status: 0, message: "Exhausted retries" } };
}
async function getMembers(pat, params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  const path2 = `/api/v1/portal/team/members?${qs.toString()}`;
  return dltGetPaginated(path2, pat, teamMemberListSchema);
}
async function updateMemberRole(pat, memberId, role) {
  const result = await dltMutate({
    method: "PATCH",
    path: `/api/v1/portal/team/members/${memberId}/role`,
    bearer: pat,
    body: { role }
  });
  if (!result.ok) return result;
  const parsed = teamMemberSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Unexpected response shape from DLT" } };
  }
  return { ok: true, data: parsed.data };
}
async function removeMember(pat, memberId) {
  return dltMutate({
    method: "DELETE",
    path: `/api/v1/portal/team/members/${memberId}`,
    bearer: pat
  });
}
async function getInvitations(pat, params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.status) qs.set("status", params.status);
  const path2 = `/api/v1/portal/team/invitations?${qs.toString()}`;
  return dltGetPaginated(path2, pat, teamInvitationListSchema);
}
async function createInvitation(pat, email, role) {
  const result = await dltMutate({
    method: "POST",
    path: "/api/v1/portal/team/invitations",
    bearer: pat,
    body: { email, role }
  });
  if (!result.ok) return result;
  const parsed = teamInvitationSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Unexpected response shape from DLT" } };
  }
  return { ok: true, data: parsed.data };
}
async function resendInvitation(pat, invitationId) {
  const result = await dltMutate({
    method: "POST",
    path: `/api/v1/portal/team/invitations/${invitationId}/resend`,
    bearer: pat
  });
  if (!result.ok) return result;
  const parsed = teamInvitationSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Unexpected response shape from DLT" } };
  }
  return { ok: true, data: parsed.data };
}
async function revokeInvitation(pat, invitationId) {
  return dltMutate({
    method: "DELETE",
    path: `/api/v1/portal/team/invitations/${invitationId}`,
    bearer: pat
  });
}
async function acceptInvitation(payload) {
  const result = await dltLoginCall(
    "/api/v1/portal/team/invitations/accept",
    payload
  );
  if (!result.ok) return result;
  const parsed = teamMemberSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Unexpected response shape from DLT" } };
  }
  return { ok: true, data: parsed.data };
}
function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className
}) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      role: "radiogroup",
      "aria-label": ariaLabel,
      className: cn(
        "flex overflow-x-auto rounded-lg border border-line bg-surface p-0.5",
        // Hide scrollbar visually but keep it functional
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      ),
      children: options.map((opt) => {
        const selected = opt.value === value;
        return /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            role: "radio",
            "aria-checked": selected,
            onClick: () => onChange(opt.value),
            className: cn(
              // shrink-0 so buttons keep their natural width and the container scrolls
              "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              selected ? "bg-primary text-on-primary" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            ),
            children: opt.label
          },
          opt.value
        );
      })
    }
  );
}
const meta$6 = () => [{
  title: "Accept Invitation | DLT Portal"
}];
async function action$4({
  request
}) {
  const form = await request.formData();
  const flow = form.get("flow");
  const token = form.get("token")?.trim() ?? "";
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return {
      ok: false,
      error: "Invalid or missing invitation token. Please use the link from your invitation email."
    };
  }
  if (flow === "new_account") {
    const firstName = form.get("first_name").trim();
    const lastName = form.get("last_name").trim();
    const password = form.get("password");
    const passwordConfirmation = form.get("password_confirmation");
    if (!firstName || !lastName) {
      return {
        ok: false,
        error: "First name and last name are required."
      };
    }
    if (password !== passwordConfirmation) {
      return {
        ok: false,
        error: "Passwords do not match."
      };
    }
    const result = await acceptInvitation({
      token,
      first_name: firstName,
      last_name: lastName,
      password,
      password_confirmation: passwordConfirmation
    });
    if (!result.ok) {
      return mapAcceptError(result.error);
    }
    return {
      ok: true,
      message: "Invitation accepted. Log in to continue."
    };
  }
  if (flow === "existing_account") {
    const currentPassword = form.get("current_password");
    if (!currentPassword) {
      return {
        ok: false,
        error: "Current password is required."
      };
    }
    const result = await acceptInvitation({
      token,
      current_password: currentPassword
    });
    if (!result.ok) {
      return mapAcceptError(result.error);
    }
    return {
      ok: true,
      message: "Invitation accepted. Log in to continue."
    };
  }
  return {
    ok: false,
    error: "Invalid form submission."
  };
}
function mapAcceptError(error) {
  if (error.status === 410) {
    return {
      ok: false,
      terminal: true,
      error: "This invitation has expired, been revoked, or already been used. Please ask an administrator to send a new invitation."
    };
  }
  if (error.status === 404) {
    return {
      ok: false,
      error: "Invitation not found. Please use the link from your latest invitation email."
    };
  }
  if (error.status === 409) {
    if (error.errorCode === "MEMBER_ALREADY_EXISTS") {
      return {
        ok: false,
        error: "This account is already a member of the merchant."
      };
    }
    return {
      ok: false,
      error: error.message
    };
  }
  if (error.status === 429) {
    return {
      ok: false,
      error: "Too many attempts. Please wait before trying again."
    };
  }
  if (error.fieldErrors) {
    const firstField = Object.values(error.fieldErrors)[0]?.[0];
    return {
      ok: false,
      error: firstField ?? error.message,
      fieldErrors: error.fieldErrors
    };
  }
  return {
    ok: false,
    error: error.message
  };
}
const public_team_invitations_accept = UNSAFE_withComponentProps(function AcceptInvitationPage() {
  const fetcher = useFetcher();
  const [token, setToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [flow, setFlow] = useState("new_account");
  const [password, setPassword] = useState("");
  const tokenInputRef = useRef(null);
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[#&]token=([a-f0-9]{64})(?:&|$)/);
    if (match && match[1]) {
      setToken(match[1]);
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", cleanUrl);
    } else {
      setTokenError("No valid invitation token found in this link. Please use the button from your invitation email.");
    }
  }, []);
  const actionData = fetcher.data;
  const isSubmitting = fetcher.state === "submitting";
  const succeeded = actionData?.ok === true;
  const isTerminal = !actionData?.ok && "terminal" in (actionData ?? {}) && actionData.terminal;
  return /* @__PURE__ */ jsxs("div", {
    className: "flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4 py-10",
    children: [/* @__PURE__ */ jsx("div", {
      className: "fixed right-4 top-4",
      children: /* @__PURE__ */ jsx(ThemeToggle, {})
    }), /* @__PURE__ */ jsxs("div", {
      className: "w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 shadow-card",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "mb-6 flex flex-col items-center gap-4 text-center",
        children: [/* @__PURE__ */ jsx(DltLogo, {
          size: 44,
          showText: false
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col items-center gap-2",
          children: [/* @__PURE__ */ jsx("div", {
            className: "flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary",
            children: /* @__PURE__ */ jsx(KeyRound, {
              className: "size-5",
              "aria-hidden": true
            })
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("h1", {
              className: "text-2xl font-semibold text-ink",
              children: "Accept invitation"
            }), /* @__PURE__ */ jsx("p", {
              className: "mt-1 text-sm text-ink-3",
              children: "Join your merchant team on DLT Portal"
            })]
          })]
        })]
      }), tokenError && /* @__PURE__ */ jsx(Callout, {
        variant: "danger",
        role: "alert",
        children: tokenError
      }), succeeded && /* @__PURE__ */ jsxs("div", {
        className: "space-y-5",
        children: [/* @__PURE__ */ jsx(Callout, {
          variant: "success",
          children: actionData.message
        }), /* @__PURE__ */ jsx("a", {
          href: "/login",
          className: cn(buttonVariants({
            size: "lg"
          }), "w-full"),
          children: "Go to sign in"
        })]
      }), isTerminal && /* @__PURE__ */ jsx(Callout, {
        variant: "warning",
        role: "alert",
        children: actionData.error
      }), !tokenError && !succeeded && !isTerminal && token && /* @__PURE__ */ jsxs("div", {
        className: "space-y-5",
        children: [/* @__PURE__ */ jsx(SegmentedControl, {
          ariaLabel: "Join as a new or existing account",
          value: flow,
          onChange: setFlow,
          options: [{
            value: "new_account",
            label: "New account"
          }, {
            value: "existing_account",
            label: "Existing account"
          }],
          className: "w-full [&>button]:flex-1"
        }), actionData && !actionData.ok && /* @__PURE__ */ jsx(Callout, {
          variant: "danger",
          role: "alert",
          children: actionData.error
        }), /* @__PURE__ */ jsxs(fetcher.Form, {
          method: "POST",
          className: "space-y-4",
          noValidate: true,
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "flow",
            value: flow
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "token",
            value: token,
            ref: tokenInputRef
          }), flow === "new_account" ? /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsxs("div", {
              className: "grid grid-cols-2 gap-3",
              children: [/* @__PURE__ */ jsx(FormField, {
                label: "First name",
                name: "first_name",
                required: true,
                children: /* @__PURE__ */ jsx(Input, {
                  required: true,
                  maxLength: 50,
                  autoComplete: "given-name"
                })
              }), /* @__PURE__ */ jsx(FormField, {
                label: "Last name",
                name: "last_name",
                required: true,
                children: /* @__PURE__ */ jsx(Input, {
                  required: true,
                  maxLength: 50,
                  autoComplete: "family-name"
                })
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsx(FormField, {
                label: "Password",
                name: "password",
                required: true,
                children: /* @__PURE__ */ jsx(PasswordInput, {
                  required: true,
                  maxLength: 128,
                  autoComplete: "new-password",
                  onChange: (e) => setPassword(e.target.value)
                })
              }), /* @__PURE__ */ jsx(PasswordRules, {
                password
              })]
            }), /* @__PURE__ */ jsx(FormField, {
              label: "Confirm password",
              name: "password_confirmation",
              required: true,
              children: /* @__PURE__ */ jsx(PasswordInput, {
                required: true,
                maxLength: 128,
                autoComplete: "new-password"
              })
            })]
          }) : /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsx("p", {
              className: "text-sm text-ink-2",
              children: "You already have a DLT account (detached). Enter your current password to join this merchant."
            }), /* @__PURE__ */ jsx(FormField, {
              label: "Current password",
              name: "current_password",
              required: true,
              children: /* @__PURE__ */ jsx(PasswordInput, {
                required: true,
                maxLength: 128,
                autoComplete: "current-password"
              })
            })]
          }), /* @__PURE__ */ jsx(Button, {
            type: "submit",
            size: "lg",
            loading: isSubmitting,
            className: "w-full",
            children: flow === "new_account" ? "Create account & join" : "Confirm & join"
          })]
        })]
      }), !tokenError && !token && /* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-center py-8 text-ink-3",
        children: [/* @__PURE__ */ jsxs("svg", {
          className: "size-5 animate-spin",
          viewBox: "0 0 24 24",
          fill: "none",
          "aria-hidden": true,
          children: [/* @__PURE__ */ jsx("circle", {
            className: "opacity-25",
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            strokeWidth: "4"
          }), /* @__PURE__ */ jsx("path", {
            className: "opacity-75",
            fill: "currentColor",
            d: "M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          })]
        }), /* @__PURE__ */ jsx("span", {
          className: "ml-2 text-sm",
          children: "Loading invitation…"
        })]
      }), /* @__PURE__ */ jsxs("p", {
        className: "mt-6 text-center text-xs text-ink-3",
        children: ["Already a member?", " ", /* @__PURE__ */ jsx("a", {
          href: "/login",
          className: "font-medium text-primary hover:underline",
          children: "Sign in"
        })]
      })]
    })]
  });
});
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: public_team_invitations_accept,
  meta: meta$6
}, Symbol.toStringTag, { value: "Module" }));
function SessionExpiryNotice({ expiresAt }) {
  const [minutesLeft, setMinutesLeft] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const expiryDate = new Date(expiresAt).getTime();
    const checkExpiry = () => {
      const now = Date.now();
      const diffMs = expiryDate - now;
      const diffMins = Math.ceil(diffMs / 6e4);
      if (diffMs <= 0) {
        navigate(`/login?reason=expired&returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      } else if (diffMins <= 5) {
        setMinutesLeft(diffMins);
      } else {
        setMinutesLeft(null);
      }
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 1e4);
    return () => clearInterval(interval);
  }, [expiresAt, navigate, location]);
  if (minutesLeft === null) return null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role: "status",
      className: "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-line bg-warning-subtle px-4 py-3 text-warning-ink shadow-card",
      children: [
        /* @__PURE__ */ jsx(Clock, { className: "size-5", "aria-hidden": true }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Session expiring soon" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs", children: [
            "Your session will expire in ",
            minutesLeft,
            " minute",
            minutesLeft !== 1 ? "s" : "",
            "."
          ] })
        ] })
      ]
    }
  );
}
const menuContentClass = cn(
  "z-50 min-w-[220px] rounded-xl border border-line bg-surface p-1 shadow-card"
);
const menuItemClass = cn(
  "flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none transition-colors",
  "data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
);
const menuSeparatorClass = "my-1 h-px bg-line";
async function loader$b({
  request
}) {
  const session = await requireUser(request);
  return {
    user: session.user,
    expiresAt: session.expiresAt
  };
}
const NAV_GROUPS = [{
  label: "Overview",
  items: [{
    name: "Dashboard",
    to: "/",
    icon: LayoutDashboard,
    end: true
  }, {
    name: "Transactions",
    to: "/transactions",
    icon: ReceiptText,
    end: false
  }]
}, {
  label: "Account",
  items: [{
    name: "User profile",
    to: "/settings/profile",
    icon: User,
    end: false
  }, {
    name: "Merchant profile",
    to: "/settings/merchant",
    icon: Store,
    end: false
  }, {
    name: "Team",
    to: "/settings/team",
    icon: Users,
    end: false
  }]
}];
function getInitials(firstName, lastName) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}
function SidebarNav({
  collapsed,
  onNavigate
}) {
  return /* @__PURE__ */ jsx("nav", {
    className: "flex-1 overflow-y-auto px-3 py-4",
    "aria-label": "Main",
    children: NAV_GROUPS.map((group, gi) => /* @__PURE__ */ jsxs("div", {
      className: gi > 0 ? "mt-6" : "",
      children: [/* @__PURE__ */ jsx("p", {
        className: cn("text-sidebar-muted mb-1.5 px-3 text-[10px] font-semibold tracking-widest uppercase", collapsed && "sr-only"),
        children: group.label
      }), /* @__PURE__ */ jsx("ul", {
        className: "space-y-0.5",
        children: group.items.map((item) => /* @__PURE__ */ jsx("li", {
          children: /* @__PURE__ */ jsxs(NavLink, {
            to: item.to,
            end: item.end,
            onClick: onNavigate,
            title: collapsed ? item.name : void 0,
            className: ({
              isActive
            }) => cn("group text-sidebar-ink relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150", collapsed && "justify-center px-0", isActive ? "bg-sidebar-active before:bg-sidebar-accent text-white before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-full" : "hover:bg-sidebar-hover hover:text-white"),
            children: [/* @__PURE__ */ jsx(item.icon, {
              className: "size-4 shrink-0",
              "aria-hidden": true
            }), !collapsed && item.name]
          })
        }, item.to))
      })]
    }, group.label))
  });
}
function UserMenu({
  user
}) {
  return /* @__PURE__ */ jsxs(DropdownMenu.Root, {
    children: [/* @__PURE__ */ jsx(DropdownMenu.Trigger, {
      asChild: true,
      children: /* @__PURE__ */ jsx("button", {
        className: "flex items-center gap-2 rounded-full text-left",
        "aria-label": `Account menu for ${user.firstName} ${user.lastName}`,
        children: /* @__PURE__ */ jsx(Avatar.Root, {
          className: "bg-primary-subtle text-primary inline-flex size-8 items-center justify-center rounded-full",
          children: /* @__PURE__ */ jsx(Avatar.Fallback, {
            className: "text-xs font-semibold",
            children: getInitials(user.firstName, user.lastName)
          })
        })
      })
    }), /* @__PURE__ */ jsx(DropdownMenu.Portal, {
      children: /* @__PURE__ */ jsxs(DropdownMenu.Content, {
        className: menuContentClass,
        sideOffset: 8,
        align: "end",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "px-3 py-2",
          children: [/* @__PURE__ */ jsxs("p", {
            className: "text-ink text-sm font-semibold",
            children: [user.firstName, " ", user.lastName]
          }), /* @__PURE__ */ jsx("p", {
            className: "text-ink-3 truncate text-xs",
            children: user.email
          }), /* @__PURE__ */ jsx("span", {
            className: "bg-primary-subtle text-primary mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            children: user.role
          })]
        }), /* @__PURE__ */ jsx(DropdownMenu.Separator, {
          className: menuSeparatorClass
        }), /* @__PURE__ */ jsx(DropdownMenu.Item, {
          asChild: true,
          children: /* @__PURE__ */ jsxs(NavLink, {
            to: "/settings/profile",
            className: menuItemClass,
            children: [/* @__PURE__ */ jsx(User, {
              className: "text-ink-3 size-4 shrink-0",
              "aria-hidden": true
            }), "Profile"]
          })
        }), /* @__PURE__ */ jsx(DropdownMenu.Separator, {
          className: menuSeparatorClass
        }), /* @__PURE__ */ jsx(DropdownMenu.Item, {
          asChild: true,
          children: /* @__PURE__ */ jsx(Form, {
            action: "/logout",
            method: "post",
            children: /* @__PURE__ */ jsxs("button", {
              type: "submit",
              className: cn(menuItemClass, "text-danger-ink data-[highlighted]:bg-danger-subtle w-full"),
              children: [/* @__PURE__ */ jsx(LogOut, {
                className: "size-4 shrink-0",
                "aria-hidden": true
              }), "Sign out"]
            })
          })
        })]
      })
    })]
  });
}
const app_layout = UNSAFE_withComponentProps(function AppLayout() {
  const {
    user,
    expiresAt
  } = useLoaderData();
  const matches = useMatches();
  const merchantName = matches.map((m) => m.loaderData).find((d) => !!d && typeof d === "object" && "merchant" in d)?.merchant?.name ?? user.merchantName;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });
  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {
      }
      return next;
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "bg-page text-ink flex h-screen flex-col overflow-hidden",
    children: [/* @__PURE__ */ jsx("a", {
      href: "#main-content",
      className: "bg-primary text-on-primary sr-only z-[60] rounded-lg px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3",
      children: "Skip to content"
    }), /* @__PURE__ */ jsxs("div", {
      className: "flex min-h-0 flex-1",
      children: [/* @__PURE__ */ jsxs("aside", {
        className: cn("border-sidebar-line bg-sidebar hidden shrink-0 flex-col border-r transition-[width] duration-200 lg:flex", collapsed ? "w-[68px]" : "w-64"),
        "aria-label": "Sidebar",
        children: [/* @__PURE__ */ jsx("div", {
          className: cn("border-sidebar-line flex h-14 shrink-0 items-center border-b", collapsed ? "justify-center px-2" : "justify-between px-5"),
          children: /* @__PURE__ */ jsx(Link, {
            to: "/",
            "aria-label": "Go to dashboard",
            children: /* @__PURE__ */ jsx(DltLogo, {
              size: 32,
              showText: !collapsed,
              tile: true
            })
          })
        }), /* @__PURE__ */ jsx(SidebarNav, {
          collapsed
        }), /* @__PURE__ */ jsx("div", {
          className: "border-sidebar-line shrink-0 border-t p-3",
          children: /* @__PURE__ */ jsx("button", {
            onClick: toggleCollapsed,
            className: "text-sidebar-muted hover:bg-sidebar-hover flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:text-white",
            "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar",
            "aria-pressed": collapsed,
            children: collapsed ? /* @__PURE__ */ jsx(PanelLeftOpen, {
              className: "size-4",
              "aria-hidden": true
            }) : /* @__PURE__ */ jsxs(Fragment, {
              children: [/* @__PURE__ */ jsx(PanelLeftClose, {
                className: "size-4",
                "aria-hidden": true
              }), "Collapse"]
            })
          })
        })]
      }), /* @__PURE__ */ jsx(Dialog.Root, {
        open: mobileMenuOpen,
        onOpenChange: setMobileMenuOpen,
        children: /* @__PURE__ */ jsxs(Dialog.Portal, {
          children: [/* @__PURE__ */ jsx(Dialog.Overlay, {
            className: "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/60 duration-200 lg:hidden"
          }), /* @__PURE__ */ jsxs(Dialog.Content, {
            className: "bg-sidebar data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left fixed inset-y-0 left-0 z-50 flex w-64 flex-col duration-200 focus:outline-none lg:hidden",
            "aria-label": "Navigation",
            children: [/* @__PURE__ */ jsx(Dialog.Title, {
              className: "sr-only",
              children: "Navigation menu"
            }), /* @__PURE__ */ jsx(Dialog.Description, {
              className: "sr-only",
              children: "Main navigation for DLT Portal"
            }), /* @__PURE__ */ jsxs("div", {
              className: "border-sidebar-line flex h-14 shrink-0 items-center justify-between border-b px-5",
              children: [/* @__PURE__ */ jsx(Link, {
                to: "/",
                "aria-label": "Go to dashboard",
                children: /* @__PURE__ */ jsx(DltLogo, {
                  size: 32,
                  showText: true,
                  tile: true
                })
              }), /* @__PURE__ */ jsx(Dialog.Close, {
                className: "text-sidebar-muted hover:bg-sidebar-hover rounded-md p-1.5 transition-colors hover:text-white",
                "aria-label": "Close navigation",
                children: /* @__PURE__ */ jsx(X, {
                  className: "size-5",
                  "aria-hidden": true
                })
              })]
            }), /* @__PURE__ */ jsx(SidebarNav, {
              onNavigate: () => setMobileMenuOpen(false)
            })]
          })]
        })
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex min-w-0 flex-1 flex-col overflow-hidden",
        children: [/* @__PURE__ */ jsxs("header", {
          className: "border-line bg-surface flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:px-6",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "flex min-w-0 items-center gap-3 lg:hidden",
            children: [/* @__PURE__ */ jsx("button", {
              onClick: () => setMobileMenuOpen(true),
              className: "text-ink-2 hover:bg-surface-2 rounded-lg p-2 transition-colors",
              "aria-label": "Open navigation",
              "aria-haspopup": "dialog",
              "aria-expanded": mobileMenuOpen,
              children: /* @__PURE__ */ jsx(Menu, {
                className: "size-5",
                "aria-hidden": true
              })
            }), /* @__PURE__ */ jsx(Link, {
              to: "/",
              "aria-label": "Go to dashboard",
              children: /* @__PURE__ */ jsx(DltLogo, {
                size: 24,
                showText: true,
                compact: true,
                tone: "surface",
                invertDark: true
              })
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "ml-auto flex items-center gap-2 sm:gap-3",
            children: [/* @__PURE__ */ jsx("span", {
              className: "text-ink-2 hidden text-sm md:inline-block",
              children: merchantName
            }), /* @__PURE__ */ jsx(ThemeToggle, {}), /* @__PURE__ */ jsx(UserMenu, {
              user
            })]
          })]
        }), /* @__PURE__ */ jsx("main", {
          id: "main-content",
          className: "flex-1 overflow-x-hidden overflow-y-auto",
          tabIndex: -1,
          children: /* @__PURE__ */ jsx("div", {
            className: "mx-auto w-full max-w-[1200px] p-4 sm:p-6 lg:p-8",
            children: /* @__PURE__ */ jsx(Outlet, {})
          })
        })]
      })]
    }), /* @__PURE__ */ jsx(SessionExpiryNotice, {
      expiresAt
    })]
  });
});
const ErrorBoundary$1 = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2() {
  const error = useRouteError();
  const location = useLocation();
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 401:
        return /* @__PURE__ */ jsx(SessionExpiredError, {
          returnTo: location.pathname + location.search
        });
      case 403:
        return /* @__PURE__ */ jsx(ForbiddenError, {});
      case 404:
        return /* @__PURE__ */ jsx(NotFoundError, {});
      case 429: {
        const retryAfter = typeof error.data === "object" && error.data !== null && "retryAfter" in error.data ? error.data.retryAfter : void 0;
        return /* @__PURE__ */ jsx(RateLimitedError, {
          retryAfter
        });
      }
      case 500:
      case 502:
      case 503:
      case 504:
        return /* @__PURE__ */ jsx(ServerError, {});
      default:
        return /* @__PURE__ */ jsx(ServerError, {});
    }
  }
  return /* @__PURE__ */ jsx(ServerError, {});
});
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary$1,
  default: app_layout,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
async function getMerchant(pat) {
  const result = await dltGet("/api/v1/portal/merchant", pat);
  if (!result.ok) return result;
  const parsed = merchantSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid merchant response" } };
  }
  return { ok: true, data: parsed.data };
}
async function patchMerchant(pat, fields) {
  const result = await dltMutate({
    method: "PATCH",
    path: "/api/v1/portal/merchant",
    bearer: pat,
    body: fields
  });
  if (!result.ok) return result;
  const parsed = merchantSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid merchant response" } };
  }
  return { ok: true, data: parsed.data };
}
const logoUrlSchema = z.object({ url: z.string().nullable() });
async function getMerchantLogo(pat) {
  const result = await dltGet("/api/v1/portal/merchant/logo", pat);
  if (!result.ok) return result;
  const parsed = logoUrlSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid logo response" } };
  }
  return { ok: true, data: parsed.data };
}
async function uploadMerchantLogo(pat, file) {
  const formData = new FormData();
  formData.append("file", file);
  const result = await dltMutate({
    method: "POST",
    path: "/api/v1/portal/merchant/logo",
    bearer: pat,
    multipart: formData
  });
  if (!result.ok) return result;
  const parsed = logoUrlSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid logo response" } };
  }
  return { ok: true, data: parsed.data };
}
async function deleteMerchantLogo(pat) {
  return dltMutate({
    method: "DELETE",
    path: "/api/v1/portal/merchant/logo",
    bearer: pat
  });
}
async function getMetrics(pat, filters) {
  const params = new URLSearchParams();
  params.set("currency", filters.currency);
  params.set("from", filters.from);
  params.set("to", filters.to);
  if (filters.timezone) params.set("timezone", filters.timezone);
  if (filters.payment_brand) params.set("payment_brand", filters.payment_brand);
  const result = await dltGet(
    `/api/v1/portal/collections/metrics?${params.toString()}`,
    pat
  );
  if (!result.ok) return result;
  const parsed = metricsSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid metrics response" } };
  }
  return { ok: true, data: parsed.data };
}
async function getCharts(pat, filters) {
  const params = new URLSearchParams();
  params.set("currency", filters.currency);
  params.set("from", filters.from);
  params.set("to", filters.to);
  params.set("interval", filters.interval);
  if (filters.timezone) params.set("timezone", filters.timezone);
  if (filters.payment_brand) params.set("payment_brand", filters.payment_brand);
  const result = await dltGet(
    `/api/v1/portal/collections/charts?${params.toString()}`,
    pat
  );
  if (!result.ok) return result;
  const parsed = chartsSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid charts response" } };
  }
  return { ok: true, data: parsed.data };
}
const transactionListEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(transactionSchema),
  meta: paginationMetaSchema
});
const transactionDetailEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: transactionSchema
});
const historyListEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(historyItemSchema),
  meta: z.object({
    current_page: z.number(),
    per_page: z.number(),
    total: z.number(),
    last_page: z.number(),
    coverage: historyCoverageSchema
  })
});
z.object({
  success: z.boolean(),
  message: z.string(),
  data: historyItemSchema
});
async function listTransactions(pat, filters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  if (filters.merchant_transaction_id)
    params.set("merchant_transaction_id", filters.merchant_transaction_id);
  if (filters.query) params.set("query", filters.query);
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.payment_brand) params.set("payment_brand", filters.payment_brand);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));
  const path2 = `/api/v1/portal/collections/transactions?${params.toString()}`;
  const result = await dltGetEnvelope(path2, pat);
  if (!result.ok) return result;
  const parsed = transactionListEnvelopeSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid transaction list response" } };
  }
  return { ok: true, data: { data: parsed.data.data, meta: parsed.data.meta } };
}
async function getTransaction(pat, id) {
  const result = await dltGetEnvelope(`/api/v1/portal/collections/transactions/${id}`, pat);
  if (!result.ok) return result;
  const parsed = transactionDetailEnvelopeSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid transaction response" } };
  }
  return { ok: true, data: parsed.data.data };
}
async function listTransactionHistory(pat, transactionId, page = 1, perPage = 25) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  const path2 = `/api/v1/portal/collections/transactions/${transactionId}/history?${params.toString()}`;
  const result = await dltGetEnvelope(path2, pat);
  if (!result.ok) return result;
  const parsed = historyListEnvelopeSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid history response" } };
  }
  return { ok: true, data: parsed.data };
}
let currencyCache = null;
async function getCurrencyCatalogue() {
  const now = Date.now();
  if (currencyCache && currencyCache.expiresAt > now) {
    return { ok: true, data: currencyCache.data };
  }
  const result = await dltGet("/api/v1/json/currency", "");
  if (!result.ok) return result;
  const parsed = z.array(currencyItemSchema).safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid currency catalogue response" } };
  }
  currencyCache = { data: parsed.data, expiresAt: now + 60 * 60 * 1e3 };
  return { ok: true, data: parsed.data };
}
const DEFAULT_TZ$3 = "Asia/Manila";
function formatTimestamp(iso, tz = DEFAULT_TZ$3, format = "short") {
  if (!iso) return "—";
  const dt = DateTime.fromISO(iso, { zone: tz });
  if (!dt.isValid) return "—";
  return format === "long" ? dt.toFormat("MMM d, yyyy h:mm:ss a ZZZZ") : dt.toFormat("MMM d, yyyy h:mm a");
}
function autoInterval(from, to, tz = DEFAULT_TZ$3) {
  const start = DateTime.fromISO(from, { zone: tz });
  const end = DateTime.fromISO(to, { zone: tz });
  const days = end.diff(start, "days").days;
  const months = end.diff(start, "months").months;
  if (days <= 62) return "day";
  if (months <= 24) return "month";
  return "year";
}
const BUCKET_LIMITS = {
  day: 366,
  month: 120,
  year: 10
};
function estimateBuckets(from, to, interval, tz = "Asia/Manila") {
  const start = DateTime.fromISO(from, { zone: tz });
  const end = DateTime.fromISO(to, { zone: tz });
  switch (interval) {
    case "day":
      return Math.ceil(end.diff(start, "days").days);
    case "month":
      return Math.ceil(end.diff(start, "months").months);
    case "year":
      return Math.ceil(end.diff(start, "years").years);
  }
}
function validateInterval(from, to, interval, tz) {
  const buckets = estimateBuckets(from, to, interval, tz);
  const limit = BUCKET_LIMITS[interval];
  return { valid: buckets <= limit, buckets, limit };
}
function formatMoney(amount, currency, locale = "en-PH") {
  if (amount === null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount));
}
function formatPercent(value) {
  if (value === null) return "No transactions";
  return `${Number(value).toFixed(2)}%`;
}
function PageHeader({
  title,
  description,
  actions,
  className
}) {
  return /* @__PURE__ */ jsxs("div", { className: cn("flex flex-wrap items-start justify-between gap-3", className), children: [
    /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold text-ink", children: title }),
      description && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-ink-3", children: description })
    ] }),
    actions && /* @__PURE__ */ jsx("div", { className: "flex min-w-0 flex-wrap items-center gap-2", children: actions })
  ] });
}
function Card({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn("rounded-xl border border-line bg-surface shadow-card", className),
      ...props
    }
  );
}
function CardHeader({
  className,
  title,
  description,
  action: action2,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn("flex items-start justify-between gap-3 border-b border-line px-5 py-4", className),
      ...props,
      children: [
        title !== void 0 || description !== void 0 ? /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-ink", children: title }),
          description && /* @__PURE__ */ jsx("p", { className: "mt-0.5 text-xs text-ink-3", children: description })
        ] }) : children,
        action2 && /* @__PURE__ */ jsx("div", { className: "shrink-0", children: action2 })
      ]
    }
  );
}
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-ink-2",
        primary: "bg-primary-subtle text-primary",
        success: "bg-success-subtle text-success-ink",
        warning: "bg-warning-subtle text-warning-ink",
        danger: "bg-danger-subtle text-danger-ink",
        "danger-solid": "bg-danger text-on-danger"
      }
    },
    defaultVariants: { variant: "neutral" }
  }
);
function Badge({ className, variant, dot, children, ...props }) {
  return /* @__PURE__ */ jsxs("span", { className: cn(badgeVariants({ variant }), className), ...props, children: [
    dot && /* @__PURE__ */ jsx(
      "span",
      {
        "aria-hidden": true,
        className: cn("size-1.5 rounded-full", {
          "bg-ink-3": variant === "neutral" || variant == null,
          "bg-primary": variant === "primary",
          "bg-success": variant === "success",
          "bg-warning": variant === "warning",
          "bg-danger": variant === "danger" || variant === "danger-solid",
          "bg-on-danger": variant === "danger-solid"
        })
      }
    ),
    children
  ] });
}
const TX_STATUS_VARIANT = {
  PAID: "success",
  PENDING: "warning",
  REJECTED: "danger"
};
function StatusPill({ status }) {
  return /* @__PURE__ */ jsx(Badge, { variant: TX_STATUS_VARIANT[status], dot: true, children: status });
}
const INV_STATUS_VARIANT = {
  pending: "warning",
  accepted: "success",
  expired: "neutral",
  revoked: "danger"
};
function InvitationStatusPill({
  status
}) {
  return /* @__PURE__ */ jsx(Badge, { variant: INV_STATUS_VARIANT[status], dot: true, children: status.charAt(0).toUpperCase() + status.slice(1) });
}
function Tooltip({
  content,
  children,
  side = "top",
  className
}) {
  return /* @__PURE__ */ jsx(TooltipPrimitive.Provider, { delayDuration: 200, children: /* @__PURE__ */ jsxs(TooltipPrimitive.Root, { children: [
    /* @__PURE__ */ jsx(TooltipPrimitive.Trigger, { asChild: true, children }),
    /* @__PURE__ */ jsx(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
      TooltipPrimitive.Content,
      {
        side,
        sideOffset: 6,
        className: cn(
          "z-50 max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-2 shadow-card",
          className
        ),
        children: [
          content,
          /* @__PURE__ */ jsx(TooltipPrimitive.Arrow, { className: "fill-surface" })
        ]
      }
    ) })
  ] }) });
}
function InfoTip({ content, label }) {
  return /* @__PURE__ */ jsx(Tooltip, { content, children: /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      "aria-label": label ?? "More information",
      className: "inline-flex size-4 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink-2",
      children: /* @__PURE__ */ jsx(Info, { className: "size-3.5", "aria-hidden": true })
    }
  ) });
}
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "aria-hidden": true,
      className: cn("animate-pulse rounded-md bg-surface-2", className),
      ...props
    }
  );
}
function ChartSkeleton({ className }) {
  return /* @__PURE__ */ jsxs("div", { className: cn("space-y-3", className), "aria-hidden": true, children: [
    /* @__PURE__ */ jsx("div", { className: "flex h-[180px] items-end gap-2 border-b border-l border-line px-3 pb-0", children: [55, 80, 40, 95, 65, 75, 50, 88, 60, 70, 45, 85].map((h, i) => /* @__PURE__ */ jsx(
      "div",
      {
        className: "flex-1 animate-pulse rounded-t-sm bg-surface-2",
        style: { height: `${h}%`, animationDelay: `${i * 60}ms` }
      },
      i
    )) }),
    /* @__PURE__ */ jsx("div", { className: "flex justify-between px-3", children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-2.5 w-10" }, i)) })
  ] });
}
function EmptyState({
  icon: Icon,
  title,
  description,
  action: action2,
  className,
  compact
}) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        compact ? "py-8" : "py-16",
        className
      ),
      children: [
        Icon && /* @__PURE__ */ jsx("div", { className: "mb-1 flex size-11 items-center justify-center rounded-full bg-surface-2 text-ink-3", children: /* @__PURE__ */ jsx(Icon, { className: "size-5", "aria-hidden": true }) }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-ink", children: title }),
        description && /* @__PURE__ */ jsx("p", { className: "max-w-sm text-sm text-ink-3", children: description }),
        action2 && /* @__PURE__ */ jsx("div", { className: "mt-2", children: action2 })
      ]
    }
  );
}
const meta$5 = () => [{
  title: "Dashboard | DLT Portal"
}];
const DEFAULT_TZ$2 = "Asia/Manila";
const STATUS_FILL = {
  PAID: "var(--success)",
  PENDING: "var(--warning)",
  REJECTED: "var(--danger)"
};
const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--ink)",
  boxShadow: "var(--shadow-card)"
};
function getPresetRange(preset, tz) {
  const now = DateTime.now().setZone(tz);
  const iso = (dt) => dt.toISO({
    suppressMilliseconds: true
  });
  switch (preset) {
    case "today":
      return {
        from: iso(now.startOf("day")),
        to: iso(now.plus({
          days: 1
        }).startOf("day"))
      };
    case "last7":
      return {
        from: iso(now.minus({
          days: 6
        }).startOf("day")),
        to: iso(now.plus({
          days: 1
        }).startOf("day"))
      };
    case "last30":
      return {
        from: iso(now.minus({
          days: 29
        }).startOf("day")),
        to: iso(now.plus({
          days: 1
        }).startOf("day"))
      };
    case "this_month":
      return {
        from: iso(now.startOf("month")),
        to: iso(now.plus({
          months: 1
        }).startOf("month"))
      };
    case "last_month": {
      const lm = now.minus({
        months: 1
      }).startOf("month");
      return {
        from: iso(lm),
        to: iso(lm.plus({
          months: 1
        }))
      };
    }
    default:
      return {
        from: iso(now.minus({
          days: 6
        }).startOf("day")),
        to: iso(now.plus({
          days: 1
        }).startOf("day"))
      };
  }
}
function classifyDltError(error) {
  if (error.status === 503 || error.errorCode === "SERVICE_UNAVAILABLE") {
    return {
      message: "The reporting service is temporarily unavailable. This may be due to a currency catalogue outage or a data integrity issue. Please try again in a moment.",
      kind: "service_unavailable"
    };
  }
  if (error.status === 403 || error.errorCode === "MERCHANT_SCOPE_MISMATCH") {
    return {
      message: "Access denied: your account does not have permission to view this merchant’s data.",
      kind: "scope_mismatch"
    };
  }
  if (error.status === 422 || error.errorCode === "VALIDATION_ERROR") {
    return {
      message: `The selected filters are invalid: ${error.message}`,
      kind: "validation"
    };
  }
  return {
    message: error.message,
    kind: "generic"
  };
}
async function loader$a({
  request
}) {
  const {
    pat
  } = await requireUser(request);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || DEFAULT_TZ$2;
  const preset = url.searchParams.get("preset") || "last30";
  const urlCurrency = url.searchParams.get("currency");
  const merchantResult = await getMerchant(pat);
  const merchantCurrency = merchantResult.ok ? merchantResult.data.currency : "PHP";
  const currency = urlCurrency || merchantCurrency;
  const {
    from,
    to
  } = getPresetRange(preset, tz);
  const interval = autoInterval(from, to, tz);
  const intervalValidation = validateInterval(from, to, interval, tz);
  const intervalOk = intervalValidation.valid;
  const intervalError = intervalOk ? null : `This range requires ${intervalValidation.buckets} ${interval} buckets, exceeding the API limit of ${intervalValidation.limit}. Chart data may be unavailable — try a shorter range.`;
  const [metricsResult, chartsResult, txResult, currencyResult] = await Promise.all([
    getMetrics(pat, {
      currency,
      from,
      to,
      timezone: tz
    }),
    getCharts(pat, {
      currency,
      from,
      to,
      interval,
      timezone: tz
    }),
    // Recent list is unfiltered per §9.2 (transactions?per_page=10); its
    // meta.total also tells us whether the merchant has ever transacted.
    listTransactions(pat, {
      per_page: 10,
      page: 1
    }),
    getCurrencyCatalogue()
  ]);
  const currencies = currencyResult.ok ? currencyResult.data : [{
    cc: merchantCurrency,
    name: merchantCurrency,
    symbol: merchantCurrency
  }];
  const metricsErr = metricsResult.ok ? null : classifyDltError(metricsResult.error);
  const chartsErr = chartsResult.ok ? null : classifyDltError(chartsResult.error);
  return {
    metrics: metricsResult.ok ? metricsResult.data : null,
    metricsError: metricsErr ? {
      message: metricsErr.message,
      kind: metricsErr.kind
    } : null,
    charts: chartsResult.ok ? chartsResult.data : null,
    chartsError: chartsErr ? {
      message: chartsErr.message,
      kind: chartsErr.kind
    } : null,
    recentTransactions: txResult.ok ? txResult.data.data : [],
    totalTransactions: txResult.ok ? txResult.data.meta.total : null,
    currencies,
    currency,
    from,
    to,
    preset,
    tz,
    interval,
    intervalOk,
    intervalError
  };
}
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  spark,
  info,
  className
}) {
  const toneClasses = {
    primary: "bg-primary-subtle text-primary",
    success: "bg-success-subtle text-success-ink",
    warning: "bg-warning-subtle text-warning-ink",
    danger: "bg-danger-subtle text-danger-ink",
    neutral: "bg-surface-2 text-ink-3"
  }[tone];
  return /* @__PURE__ */ jsxs(Card, {
    className: cn("flex flex-col justify-between p-4 sm:p-5", className),
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex items-center justify-between gap-2",
      children: [/* @__PURE__ */ jsxs("p", {
        className: "text-ink-3 flex items-center gap-1 text-xs font-medium sm:text-sm",
        children: [label, info && /* @__PURE__ */ jsx(InfoTip, {
          label: `About ${label}`,
          content: info
        })]
      }), /* @__PURE__ */ jsx("span", {
        className: cn("flex size-7 items-center justify-center rounded-lg sm:size-8", toneClasses),
        children: /* @__PURE__ */ jsx(Icon, {
          className: "size-4",
          "aria-hidden": true
        })
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: "mt-2 flex items-end justify-between gap-3",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "min-w-0",
        children: [/* @__PURE__ */ jsx("p", {
          className: "tnum text-ink truncate text-xl font-semibold sm:text-2xl",
          children: value
        }), sub && /* @__PURE__ */ jsx("p", {
          className: "text-ink-3 mt-1 text-xs",
          children: sub
        })]
      }), spark && /* @__PURE__ */ jsx("div", {
        className: "hidden h-9 w-24 shrink-0 sm:block",
        "aria-hidden": true,
        children: spark
      })]
    })]
  });
}
function LegendDot({
  color,
  label
}) {
  return /* @__PURE__ */ jsxs("span", {
    className: "text-ink-3 inline-flex items-center gap-1.5 text-xs",
    children: [/* @__PURE__ */ jsx("span", {
      className: "size-2 rounded-full",
      style: {
        background: color
      },
      "aria-hidden": true
    }), label]
  });
}
function ChartCard({
  title,
  legend,
  children,
  empty,
  onAdjustRange
}) {
  return /* @__PURE__ */ jsxs(Card, {
    children: [/* @__PURE__ */ jsx(CardHeader, {
      title,
      action: legend ? /* @__PURE__ */ jsx("div", {
        className: "flex flex-wrap items-center gap-x-3 gap-y-1",
        children: legend
      }) : void 0,
      className: "flex-col items-start gap-2 sm:flex-row sm:items-center"
    }), /* @__PURE__ */ jsx("div", {
      className: "p-5 pt-4",
      children: empty ? /* @__PURE__ */ jsx(EmptyState, {
        compact: true,
        icon: BarChart3,
        title: "No data for this period",
        description: "Try widening the date range or changing the currency.",
        action: onAdjustRange && /* @__PURE__ */ jsx(Button, {
          variant: "secondary",
          size: "sm",
          onClick: onAdjustRange,
          children: "Use last 30 days"
        })
      }) : children
    })]
  });
}
function ReportingErrorCallout({
  label,
  message,
  kind
}) {
  const variant = kind === "service_unavailable" ? "warning" : "danger";
  return /* @__PURE__ */ jsxs(Callout, {
    variant,
    role: "alert",
    children: [/* @__PURE__ */ jsxs("span", {
      className: "font-medium",
      children: [label, ":"]
    }), " ", message]
  });
}
const CHECKLIST_DISMISS_KEY = "dlt-onboarding-checklist-dismissed";
function FirstRunChecklist() {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(CHECKLIST_DISMISS_KEY) === "1");
    } catch {
    }
  }, []);
  if (dismissed) return null;
  const items = [{
    icon: Store,
    label: "Complete merchant profile",
    to: "/settings/merchant"
  }, {
    icon: UserPlus,
    label: "Invite a teammate",
    to: "/settings/team"
  }];
  return /* @__PURE__ */ jsx(Card, {
    className: "border-primary/30 bg-primary-subtle/40",
    children: /* @__PURE__ */ jsxs("div", {
      className: "flex items-start gap-4 p-5",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "min-w-0 flex-1",
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-ink text-sm font-semibold",
          children: "Get started with DLT Portal"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-ink-3 mt-0.5 text-xs",
          children: "Finish these steps to start accepting payments."
        }), /* @__PURE__ */ jsx("ul", {
          className: "mt-3 flex flex-wrap gap-2",
          children: items.map(({
            icon: Icon,
            label,
            to
          }) => /* @__PURE__ */ jsx("li", {
            children: /* @__PURE__ */ jsxs(Link, {
              to,
              className: "border-line bg-surface text-ink hover:bg-surface-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              children: [/* @__PURE__ */ jsx(Icon, {
                className: "text-primary size-3.5",
                "aria-hidden": true
              }), label]
            })
          }, to))
        })]
      }), /* @__PURE__ */ jsx("button", {
        type: "button",
        "aria-label": "Dismiss checklist",
        onClick: () => {
          setDismissed(true);
          try {
            localStorage.setItem(CHECKLIST_DISMISS_KEY, "1");
          } catch {
          }
        },
        className: "text-ink-3 hover:bg-surface hover:text-ink rounded-md p-1 transition-colors",
        children: /* @__PURE__ */ jsx(X, {
          className: "size-4",
          "aria-hidden": true
        })
      })]
    })
  });
}
const PRESETS = [{
  value: "today",
  label: "Today"
}, {
  value: "last7",
  label: "Last 7 days"
}, {
  value: "last30",
  label: "Last 30 days"
}, {
  value: "this_month",
  label: "This month"
}, {
  value: "last_month",
  label: "Last month"
}];
const app__index = UNSAFE_withComponentProps(function DashboardPage() {
  const {
    metrics,
    metricsError,
    charts,
    chartsError,
    recentTransactions,
    totalTransactions,
    currencies,
    currency,
    from,
    to,
    preset,
    tz,
    interval,
    intervalOk,
    intervalError
  } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  function setPreset(p) {
    setSearchParams((prev) => {
      prev.set("preset", p);
      return prev;
    });
  }
  function setCurrency(c) {
    setSearchParams((prev) => {
      prev.set("currency", c);
      return prev;
    });
  }
  function refresh() {
    setSearchParams((prev) => {
      prev.set("_t", String(Date.now()));
      return prev;
    });
  }
  const kpi = metrics;
  const buckets = charts?.buckets ?? [];
  const collectionChartData = buckets.map((b) => ({
    period: b.period,
    amount: new Decimal(b.collection_total || "0").toNumber(),
    partial: b.partial
  }));
  const statusChartData = buckets.map((b) => ({
    period: b.period,
    PAID: b.successful_count,
    PENDING: b.pending_count,
    REJECTED: b.rejected_count,
    partial: b.partial
  }));
  const successRateData = buckets.map((b) => ({
    period: b.period,
    // null success_rate_percent means empty bucket — render gap, not 0% (§10.3)
    rate: b.success_rate_percent !== null ? new Decimal(b.success_rate_percent).toNumber() : null,
    partial: b.partial
  }));
  const donutData = kpi ? [{
    name: "PAID",
    value: kpi.successful_count,
    fill: STATUS_FILL.PAID
  }, {
    name: "PENDING",
    value: kpi.pending_count,
    fill: STATUS_FILL.PENDING
  }, {
    name: "REJECTED",
    value: kpi.rejected_count,
    fill: STATUS_FILL.REJECTED
  }] : [];
  const asOf = charts?.as_of ?? metrics?.as_of;
  const noTransactions = kpi != null && kpi.transaction_count === 0;
  const lifetimeEmpty = totalTransactions === 0;
  const periodEmpty = noTransactions && totalTransactions !== null && totalTransactions > 0;
  const txLinkParams = new URLSearchParams({
    currency,
    from,
    to
  });
  const displayCurrency = kpi?.currency ?? currency;
  return /* @__PURE__ */ jsxs("div", {
    className: "space-y-4 sm:space-y-6",
    children: [/* @__PURE__ */ jsx(PageHeader, {
      title: "Dashboard",
      actions: (
        /* Mobile: Select + refresh on one row, segmented control below (full
           width). sm+: all three in a single horizontal row. */
        /* @__PURE__ */ jsxs("div", {
          className: "flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsx(Select, {
              value: currency,
              onChange: (e) => setCurrency(e.target.value),
              "aria-label": "Currency",
              className: "min-w-0 flex-1 sm:w-[180px] sm:flex-none",
              children: currencies.map((c) => /* @__PURE__ */ jsxs("option", {
                value: c.cc,
                children: [c.cc, " — ", c.name]
              }, c.cc))
            }), /* @__PURE__ */ jsx(Button, {
              variant: "secondary",
              size: "icon",
              onClick: refresh,
              "aria-label": "Refresh dashboard data",
              className: "shrink-0 sm:hidden",
              children: /* @__PURE__ */ jsx(RefreshCw, {
                className: cn(isLoading && "animate-spin"),
                "aria-hidden": true
              })
            })]
          }), /* @__PURE__ */ jsx(SegmentedControl, {
            ariaLabel: "Date range",
            options: [...PRESETS],
            value: preset,
            onChange: setPreset,
            className: "w-full sm:w-auto"
          }), /* @__PURE__ */ jsx(Button, {
            variant: "secondary",
            size: "icon",
            onClick: refresh,
            "aria-label": "Refresh dashboard data",
            className: "hidden shrink-0 sm:flex",
            children: /* @__PURE__ */ jsx(RefreshCw, {
              className: cn(isLoading && "animate-spin"),
              "aria-hidden": true
            })
          })]
        })
      )
    }), asOf && /* @__PURE__ */ jsxs("p", {
      className: "text-ink-3 flex items-center gap-1.5 text-xs",
      children: ["As of ", DateTime.fromISO(asOf).setZone(tz).toFormat("HH:mm"), /* @__PURE__ */ jsx(InfoTip, {
        label: "About this timestamp",
        content: "Numbers reflect a creation-time cohort and may change as pending items resolve."
      })]
    }), intervalError && !intervalOk && /* @__PURE__ */ jsxs(Callout, {
      variant: "warning",
      role: "alert",
      children: [/* @__PURE__ */ jsxs("span", {
        className: "font-medium",
        children: ["Date range too wide for ", interval, " buckets:"]
      }), " ", intervalError]
    }), metricsError && /* @__PURE__ */ jsx(ReportingErrorCallout, {
      label: "Could not load metrics",
      message: metricsError.message,
      kind: metricsError.kind
    }), chartsError && /* @__PURE__ */ jsx(ReportingErrorCallout, {
      label: "Could not load chart data",
      message: chartsError.message,
      kind: chartsError.kind
    }), periodEmpty && /* @__PURE__ */ jsxs(Callout, {
      variant: "info",
      children: [/* @__PURE__ */ jsx("span", {
        className: "font-medium",
        children: "No transactions in this period."
      }), " Your account has", " ", (totalTransactions ?? 0).toLocaleString("en-PH"), " transaction", totalTransactions === 1 ? "" : "s", " in total — try a wider date range such as", " ", /* @__PURE__ */ jsx("button", {
        type: "button",
        className: "underline",
        onClick: () => setPreset("last30"),
        children: "Last 30 days"
      }), "."]
    }), lifetimeEmpty && /* @__PURE__ */ jsx(FirstRunChecklist, {}), /* @__PURE__ */ jsx("div", {
      className: "grid grid-cols-2 gap-3 sm:gap-4",
      children: isLoading && !kpi ? /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsxs("div", {
          className: "contents lg:grid lg:grid-cols-[3.5fr_2.5fr] lg:gap-4",
          children: [/* @__PURE__ */ jsx(Skeleton, {
            className: "col-span-2 h-[118px] rounded-xl lg:col-span-1"
          }), /* @__PURE__ */ jsx(Skeleton, {
            className: "h-[118px] rounded-xl"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "contents lg:grid lg:grid-cols-[3fr_1.5fr_1.5fr] lg:gap-4",
          children: [/* @__PURE__ */ jsx(Skeleton, {
            className: "h-[118px] rounded-xl"
          }), /* @__PURE__ */ jsx(Skeleton, {
            className: "h-[118px] rounded-xl"
          }), /* @__PURE__ */ jsx(Skeleton, {
            className: "h-[118px] rounded-xl"
          })]
        })]
      }) : /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsxs("div", {
          className: "contents lg:grid lg:grid-cols-[3.5fr_2.5fr] lg:gap-4",
          children: [/* @__PURE__ */ jsx(KpiCard, {
            label: "Total Collected",
            value: formatMoney(kpi?.collection_total ?? null, displayCurrency),
            sub: "Gross, before fees",
            info: "Gross successful collections before fees — not net settlement or refundable balance.",
            icon: TrendingUp,
            tone: "primary",
            className: "col-span-2 lg:col-span-1",
            spark: collectionChartData.length > 1 ? /* @__PURE__ */ jsx(ResponsiveContainer, {
              width: "100%",
              height: "100%",
              children: /* @__PURE__ */ jsx(AreaChart, {
                data: collectionChartData,
                margin: {
                  top: 2,
                  bottom: 2,
                  left: 0,
                  right: 0
                },
                children: /* @__PURE__ */ jsx(Area, {
                  type: "monotone",
                  dataKey: "amount",
                  stroke: "var(--chart-1)",
                  fill: "var(--chart-1)",
                  fillOpacity: 0.15,
                  strokeWidth: 1.5,
                  isAnimationActive: false
                })
              })
            }) : void 0
          }), /* @__PURE__ */ jsx(KpiCard, {
            label: "Transactions",
            value: kpi ? kpi.transaction_count.toLocaleString("en-PH") : "—",
            icon: Activity,
            tone: "neutral"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "contents lg:grid lg:grid-cols-[3fr_1.5fr_1.5fr] lg:gap-4",
          children: [/* @__PURE__ */ jsx(KpiCard, {
            label: "Success Rate",
            value: kpi && kpi.transaction_count > 0 ? formatPercent(kpi.success_rate_percent) : "—",
            sub: noTransactions ? periodEmpty ? "None in this period" : "No transactions yet" : void 0,
            icon: CheckCircle,
            tone: "success",
            spark: successRateData.some((d) => d.rate !== null) ? /* @__PURE__ */ jsx(ResponsiveContainer, {
              width: "100%",
              height: "100%",
              children: /* @__PURE__ */ jsx(LineChart, {
                data: successRateData,
                margin: {
                  top: 2,
                  bottom: 2,
                  left: 0,
                  right: 0
                },
                children: /* @__PURE__ */ jsx(Line, {
                  type: "monotone",
                  dataKey: "rate",
                  stroke: "var(--success)",
                  strokeWidth: 1.5,
                  dot: false,
                  connectNulls: false,
                  isAnimationActive: false
                })
              })
            }) : void 0
          }), /* @__PURE__ */ jsx(KpiCard, {
            label: "Pending",
            value: kpi ? kpi.pending_count.toLocaleString("en-PH") : "—",
            icon: Clock,
            tone: "warning"
          }), /* @__PURE__ */ jsx(KpiCard, {
            label: "Rejected",
            value: kpi ? kpi.rejected_count.toLocaleString("en-PH") : "—",
            icon: XCircle,
            tone: "danger"
          })]
        })]
      })
    }), isLoading && !charts ? /* @__PURE__ */ jsxs("div", {
      className: "grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2",
      children: [/* @__PURE__ */ jsx(Card, {
        className: "p-5",
        children: /* @__PURE__ */ jsx(ChartSkeleton, {})
      }), /* @__PURE__ */ jsx(Card, {
        className: "p-5",
        children: /* @__PURE__ */ jsx(ChartSkeleton, {})
      })]
    }) : /* @__PURE__ */ jsxs("div", {
      className: "grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2",
      children: [/* @__PURE__ */ jsx(ChartCard, {
        title: `Collection Trend (${currency})`,
        empty: buckets.length === 0,
        onAdjustRange: () => setPreset("last30"),
        legend: /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsx(LegendDot, {
            color: "var(--chart-1)",
            label: "Collected"
          }), /* @__PURE__ */ jsx(LegendDot, {
            color: "var(--chart-partial)",
            label: "Partial period"
          })]
        }),
        children: /* @__PURE__ */ jsx("div", {
          className: "h-[160px] sm:h-[200px]",
          children: /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: "100%",
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: collectionChartData,
              children: [/* @__PURE__ */ jsx(CartesianGrid, {
                strokeDasharray: "3 3",
                stroke: "var(--line)",
                vertical: false
              }), /* @__PURE__ */ jsx(XAxis, {
                dataKey: "period",
                tick: {
                  fontSize: 11
                },
                tickLine: false,
                axisLine: {
                  stroke: "var(--line)"
                },
                minTickGap: 24
              }), /* @__PURE__ */ jsx(YAxis, {
                tick: {
                  fontSize: 11
                },
                tickLine: false,
                axisLine: false
              }), /* @__PURE__ */ jsx(Tooltip$1, {
                cursor: {
                  fill: "var(--surface-2)"
                },
                contentStyle: TOOLTIP_STYLE,
                formatter: (v) => new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency
                }).format(Number(v)),
                labelFormatter: (label, payload) => {
                  const partial = payload?.[0]?.payload?.partial;
                  return partial ? `${label} (partial period)` : label;
                }
              }), /* @__PURE__ */ jsx(Bar, {
                dataKey: "amount",
                fill: "var(--chart-1)",
                radius: [3, 3, 0, 0],
                isAnimationActive: false,
                children: collectionChartData.map((entry2, idx) => /* @__PURE__ */ jsx(Cell, {
                  fill: entry2.partial ? "var(--chart-partial)" : "var(--chart-1)"
                }, idx))
              })]
            })
          })
        })
      }), /* @__PURE__ */ jsx(ChartCard, {
        title: "Transaction Volume by Status",
        empty: buckets.length === 0,
        onAdjustRange: () => setPreset("last30"),
        legend: /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsx(LegendDot, {
            color: "var(--success)",
            label: "Paid"
          }), /* @__PURE__ */ jsx(LegendDot, {
            color: "var(--warning)",
            label: "Pending"
          }), /* @__PURE__ */ jsx(LegendDot, {
            color: "var(--danger)",
            label: "Rejected"
          })]
        }),
        children: /* @__PURE__ */ jsx("div", {
          className: "h-[160px] sm:h-[200px]",
          children: /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: "100%",
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: statusChartData,
              children: [/* @__PURE__ */ jsx(CartesianGrid, {
                strokeDasharray: "3 3",
                stroke: "var(--line)",
                vertical: false
              }), /* @__PURE__ */ jsx(XAxis, {
                dataKey: "period",
                tick: {
                  fontSize: 11
                },
                tickLine: false,
                axisLine: {
                  stroke: "var(--line)"
                },
                minTickGap: 24
              }), /* @__PURE__ */ jsx(YAxis, {
                tick: {
                  fontSize: 11
                },
                tickLine: false,
                axisLine: false,
                allowDecimals: false
              }), /* @__PURE__ */ jsx(Tooltip$1, {
                cursor: {
                  fill: "var(--surface-2)"
                },
                contentStyle: TOOLTIP_STYLE,
                labelFormatter: (label, payload) => {
                  const partial = payload?.[0]?.payload?.partial;
                  return partial ? `${label} (partial period)` : label;
                }
              }), /* @__PURE__ */ jsx(Bar, {
                dataKey: "PAID",
                stackId: "a",
                fill: "var(--success)",
                isAnimationActive: false
              }), /* @__PURE__ */ jsx(Bar, {
                dataKey: "PENDING",
                stackId: "a",
                fill: "var(--warning)",
                isAnimationActive: false
              }), /* @__PURE__ */ jsx(Bar, {
                dataKey: "REJECTED",
                stackId: "a",
                fill: "var(--danger)",
                radius: [3, 3, 0, 0],
                isAnimationActive: false
              })]
            })
          })
        })
      }), /* @__PURE__ */ jsx(ChartCard, {
        title: "Success Rate Trend (%)",
        empty: buckets.length === 0,
        onAdjustRange: () => setPreset("last30"),
        legend: /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsx(LegendDot, {
            color: "var(--success)",
            label: "Success rate"
          }), /* @__PURE__ */ jsx(LegendDot, {
            color: "var(--chart-partial)",
            label: "Partial period"
          })]
        }),
        children: /* @__PURE__ */ jsx("div", {
          className: "h-[150px] sm:h-[180px]",
          children: /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: "100%",
            children: /* @__PURE__ */ jsxs(LineChart, {
              data: successRateData,
              children: [/* @__PURE__ */ jsx(CartesianGrid, {
                strokeDasharray: "3 3",
                stroke: "var(--line)",
                vertical: false
              }), /* @__PURE__ */ jsx(XAxis, {
                dataKey: "period",
                tick: {
                  fontSize: 11
                },
                tickLine: false,
                axisLine: {
                  stroke: "var(--line)"
                },
                minTickGap: 24
              }), /* @__PURE__ */ jsx(YAxis, {
                domain: [0, 100],
                tick: {
                  fontSize: 11
                },
                tickLine: false,
                axisLine: false
              }), /* @__PURE__ */ jsx(Tooltip$1, {
                cursor: {
                  stroke: "var(--line-strong)"
                },
                contentStyle: TOOLTIP_STYLE,
                formatter: (v) => `${Number(v).toFixed(2)}%`,
                labelFormatter: (label, payload) => {
                  const partial = payload?.[0]?.payload?.partial;
                  return partial ? `${label} (partial period)` : label;
                }
              }), /* @__PURE__ */ jsx(Line, {
                type: "monotone",
                dataKey: "rate",
                stroke: "var(--success)",
                strokeWidth: 2,
                dot: false,
                connectNulls: false,
                isAnimationActive: false
              })]
            })
          })
        })
      }), /* @__PURE__ */ jsx(ChartCard, {
        title: "Status Mix",
        empty: !kpi || kpi.transaction_count === 0,
        onAdjustRange: () => setPreset("last30"),
        children: /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col items-center gap-4 sm:flex-row sm:gap-6",
          children: [/* @__PURE__ */ jsx("div", {
            className: "h-[140px] w-[140px] shrink-0",
            children: /* @__PURE__ */ jsx(ResponsiveContainer, {
              width: "100%",
              height: "100%",
              children: /* @__PURE__ */ jsxs(PieChart, {
                children: [/* @__PURE__ */ jsx(Pie, {
                  data: donutData,
                  cx: "50%",
                  cy: "50%",
                  innerRadius: 44,
                  outerRadius: 62,
                  dataKey: "value",
                  strokeWidth: 2,
                  stroke: "var(--surface)",
                  isAnimationActive: false,
                  children: donutData.map((entry2, i) => /* @__PURE__ */ jsx(Cell, {
                    fill: entry2.fill
                  }, i))
                }), /* @__PURE__ */ jsx(Tooltip$1, {
                  contentStyle: TOOLTIP_STYLE
                })]
              })
            })
          }), /* @__PURE__ */ jsxs("ul", {
            className: "w-full space-y-2 sm:flex-1",
            children: [donutData.map((d) => /* @__PURE__ */ jsxs("li", {
              className: "flex items-center justify-between gap-2 text-sm",
              children: [/* @__PURE__ */ jsxs("span", {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsx("span", {
                  className: "size-2.5 rounded-full",
                  style: {
                    background: d.fill
                  },
                  "aria-hidden": true
                }), /* @__PURE__ */ jsx("span", {
                  className: "text-ink-2",
                  children: d.name
                })]
              }), /* @__PURE__ */ jsx("span", {
                className: "tnum text-ink font-semibold",
                children: d.value
              })]
            }, d.name)), charts?.totals && kpi && /* @__PURE__ */ jsxs("li", {
              className: "border-line text-ink-3 mt-3 border-t pt-2 text-xs",
              children: ["Chart total: ", charts.totals.transaction_count.toLocaleString("en-PH"), " txns", charts.totals.success_rate_percent !== null && /* @__PURE__ */ jsxs(Fragment, {
                children: [" · ", formatPercent(charts.totals.success_rate_percent), " success"]
              })]
            })]
          })]
        })
      })]
    }), /* @__PURE__ */ jsxs(Card, {
      children: [/* @__PURE__ */ jsx(CardHeader, {
        title: "Recent Transactions",
        action: /* @__PURE__ */ jsxs(Link, {
          to: `/transactions?${txLinkParams.toString()}`,
          className: "text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-medium",
          children: ["View all ", /* @__PURE__ */ jsx(ArrowRight, {
            className: "size-3",
            "aria-hidden": true
          })]
        })
      }), recentTransactions.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
        compact: true,
        icon: Activity,
        title: "No transactions yet",
        description: "New collection transactions will appear here."
      }) : /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsx("ul", {
          className: "divide-line divide-y sm:hidden",
          children: recentTransactions.map((tx) => /* @__PURE__ */ jsx("li", {
            children: /* @__PURE__ */ jsxs(Link, {
              to: `/transactions/${tx.id}`,
              className: "hover:bg-surface-2/60 block px-5 py-3 transition-colors",
              children: [/* @__PURE__ */ jsxs("div", {
                className: "flex items-center justify-between gap-2",
                children: [/* @__PURE__ */ jsx("span", {
                  className: "text-primary min-w-0 truncate font-mono text-xs",
                  children: tx.merchant_transaction_id
                }), /* @__PURE__ */ jsx(StatusPill, {
                  status: tx.status
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "mt-1.5 flex items-baseline justify-between gap-2",
                children: [/* @__PURE__ */ jsx("span", {
                  className: "tnum text-ink text-sm font-medium",
                  children: tx.amount !== null && tx.currency ? formatMoney(tx.amount, tx.currency) : "—"
                }), /* @__PURE__ */ jsx("span", {
                  className: "text-ink-3 shrink-0 text-xs",
                  children: formatTimestamp(tx.created_at, tz)
                })]
              }), tx.payment_brand && /* @__PURE__ */ jsx("p", {
                className: "text-ink-3 mt-0.5 text-xs",
                children: tx.payment_brand
              })]
            })
          }, tx.id))
        }), /* @__PURE__ */ jsx("div", {
          className: "hidden overflow-x-auto py-1 sm:block",
          children: /* @__PURE__ */ jsxs("table", {
            className: "w-full text-sm",
            children: [/* @__PURE__ */ jsx("thead", {
              children: /* @__PURE__ */ jsxs("tr", {
                className: "border-line bg-surface-2 text-ink-3 border-b text-left text-xs font-medium tracking-wider uppercase",
                children: [/* @__PURE__ */ jsx("th", {
                  className: "px-5 py-3",
                  children: "Reference"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-5 py-3",
                  children: "Amount"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-5 py-3",
                  children: "Status"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-5 py-3",
                  children: "Brand"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-5 py-3",
                  children: "Created"
                })]
              })
            }), /* @__PURE__ */ jsx("tbody", {
              className: "divide-line divide-y",
              children: recentTransactions.map((tx) => /* @__PURE__ */ jsxs("tr", {
                className: "hover:bg-surface-2/60 transition-colors",
                children: [/* @__PURE__ */ jsx("td", {
                  className: "px-5 py-3",
                  children: /* @__PURE__ */ jsx(Link, {
                    to: `/transactions/${tx.id}`,
                    className: "text-primary font-mono text-xs hover:underline",
                    children: tx.merchant_transaction_id
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "tnum text-ink px-5 py-3",
                  children: tx.amount !== null && tx.currency ? formatMoney(tx.amount, tx.currency) : "—"
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-5 py-3",
                  children: /* @__PURE__ */ jsx(StatusPill, {
                    status: tx.status
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "text-ink-2 px-5 py-3",
                  children: tx.payment_brand ?? "—"
                }), /* @__PURE__ */ jsx("td", {
                  className: "text-ink-3 px-5 py-3",
                  children: formatTimestamp(tx.created_at, tz)
                })]
              }, tx.id))
            })]
          })
        })]
      })]
    })]
  });
});
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app__index,
  loader: loader$a,
  meta: meta$5
}, Symbol.toStringTag, { value: "Module" }));
function parseTransactionFilters(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const per_page = [10, 25, 50, 100].includes(
    parseInt(searchParams.get("per_page") ?? "25", 10)
  ) ? parseInt(searchParams.get("per_page"), 10) : 25;
  const from = searchParams.get("from") ?? void 0;
  const to = searchParams.get("to") ?? void 0;
  const pairedDates = from && to ? { from, to } : {};
  const status = searchParams.get("status");
  const merchant_transaction_id = searchParams.get("merchant_transaction_id") ?? void 0;
  const query = searchParams.get("query") ?? void 0;
  const currency = searchParams.get("currency") ?? void 0;
  const payment_brand = searchParams.get("payment_brand") ?? void 0;
  return {
    ...pairedDates,
    ...status ? { status } : {},
    ...merchant_transaction_id ? { merchant_transaction_id } : {},
    ...query ? { query } : {},
    ...currency ? { currency } : {},
    ...payment_brand ? { payment_brand } : {},
    page,
    per_page
  };
}
function DataTable({
  children,
  className,
  minWidth = "640px"
}) {
  return /* @__PURE__ */ jsx("div", { className: cn("overflow-x-auto rounded-xl border border-line bg-surface", className), children: /* @__PURE__ */ jsx("table", { className: "w-full text-sm", style: { minWidth }, children }) });
}
function THead({ children }) {
  return /* @__PURE__ */ jsx("thead", { className: "sticky top-0 z-10 bg-surface-2", children: /* @__PURE__ */ jsx("tr", { className: "border-b border-line text-left text-xs font-medium uppercase tracking-wider text-ink-3", children }) });
}
function Th({
  children,
  className,
  align = "left"
}) {
  return /* @__PURE__ */ jsx(
    "th",
    {
      scope: "col",
      className: cn("px-4 py-3", align === "right" && "text-right", align === "center" && "text-center", className),
      children
    }
  );
}
function TBody({ children }) {
  return /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-line", children });
}
function Tr({
  children,
  className,
  onClick,
  interactive
}) {
  return /* @__PURE__ */ jsx(
    "tr",
    {
      className: cn(
        "transition-colors hover:bg-surface-2/60",
        interactive && "cursor-pointer focus-visible:bg-surface-2",
        className
      ),
      onClick,
      onKeyDown: interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : void 0,
      tabIndex: interactive ? 0 : void 0,
      role: interactive ? "link" : void 0,
      children
    }
  );
}
function Td({
  children,
  className,
  align = "left",
  colSpan
}) {
  return /* @__PURE__ */ jsx(
    "td",
    {
      colSpan,
      className: cn(
        "px-4 py-3 text-ink-2",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      ),
      children
    }
  );
}
const meta$4 = () => [{
  title: "Transactions | DLT Portal"
}];
const DEFAULT_TZ$1 = "Asia/Manila";
function dateToFrom(dateValue) {
  return DateTime.fromISO(dateValue, {
    zone: DEFAULT_TZ$1
  }).startOf("day").toISO({
    suppressMilliseconds: true
  });
}
function dateToTo(dateValue) {
  return DateTime.fromISO(dateValue, {
    zone: DEFAULT_TZ$1
  }).plus({
    days: 1
  }).startOf("day").toISO({
    suppressMilliseconds: true
  });
}
function isoToDateInput(iso) {
  return DateTime.fromISO(iso).setZone(DEFAULT_TZ$1).toISODate() ?? "";
}
function isoToDateInputExclusive(iso) {
  return DateTime.fromISO(iso).setZone(DEFAULT_TZ$1).minus({
    days: 1
  }).toISODate() ?? "";
}
async function loader$9({
  request
}) {
  const {
    pat
  } = await requireUser(request);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || DEFAULT_TZ$1;
  const filters = parseTransactionFilters(url.searchParams);
  const [txResult, currencyResult] = await Promise.all([listTransactions(pat, filters), getCurrencyCatalogue()]);
  const currencies = currencyResult.ok ? currencyResult.data : [];
  return {
    transactions: txResult.ok ? txResult.data.data : [],
    paginationMeta: txResult.ok ? txResult.data.meta : null,
    error: txResult.ok ? null : txResult.error.message,
    filters,
    tz,
    currencies
  };
}
const app_transactions__index = UNSAFE_withComponentProps(function TransactionsPage() {
  const {
    transactions,
    paginationMeta,
    error,
    filters,
    tz,
    currencies
  } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    error: toastError
  } = useToast();
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isLoading = navigation.state === "loading";
  const merchantIdRef = useRef(null);
  const brandRef = useRef(null);
  const [merchantIdInput, setMerchantIdInput] = useState(filters.merchant_transaction_id ?? "");
  const [brandInput, setBrandInput] = useState(filters.payment_brand ?? "");
  const [fromInput, setFromInput] = useState(filters.from ? isoToDateInput(filters.from) : "");
  const [toInput, setToInput] = useState(filters.to ? isoToDateInputExclusive(filters.to) : "");
  useEffect(() => {
    setMerchantIdInput(filters.merchant_transaction_id ?? "");
  }, [filters.merchant_transaction_id]);
  useEffect(() => {
    setBrandInput(filters.payment_brand ?? "");
  }, [filters.payment_brand]);
  useEffect(() => {
    setFromInput(filters.from ? isoToDateInput(filters.from) : "");
  }, [filters.from]);
  useEffect(() => {
    setToInput(filters.to ? isoToDateInputExclusive(filters.to) : "");
  }, [filters.to]);
  function setFilter(key, value) {
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set("page", "1");
      return prev;
    });
  }
  function setDateRange(fromVal, toVal) {
    setSearchParams((prev) => {
      if (fromVal && toVal) {
        prev.set("from", dateToFrom(fromVal));
        prev.set("to", dateToTo(toVal));
      } else {
        prev.delete("from");
        prev.delete("to");
      }
      prev.set("page", "1");
      return prev;
    });
  }
  function debounceSet(ref, key, value) {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => {
      setFilter(key, value || void 0);
    }, 400);
  }
  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }
  function setPage(page) {
    setSearchParams((prev) => {
      prev.set("page", String(page));
      return prev;
    });
  }
  async function handleCsvExport() {
    if (csvLoading) return;
    setCsvLoading(true);
    try {
      const params = new URLSearchParams(searchParams);
      params.delete("page");
      params.delete("per_page");
      const res = await fetch(`/transactions/export.csv?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body.message === "string" ? body.message : "Export failed";
        if (res.status === 401) {
          toastError("Session expired", "Please sign in again.");
        } else if (res.status === 403) {
          toastError("No permission", "You do not have permission to export transactions.");
        } else {
          toastError("Export failed", msg);
        }
        return;
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = nameMatch?.[1] ?? "dlt-transactions.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastError("Export failed", "A network error occurred. Please try again.");
    } finally {
      setCsvLoading(false);
    }
  }
  async function handlePdfExport() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const params = new URLSearchParams(searchParams);
      params.delete("page");
      params.delete("per_page");
      params.set("timezone", tz);
      window.location.assign(`/transactions/pdf?${params.toString()}`);
    } finally {
      setTimeout(() => setPdfLoading(false), 2e3);
    }
  }
  const hasFilters = filters.from || filters.to || filters.status || filters.merchant_transaction_id || filters.currency || filters.payment_brand;
  return /* @__PURE__ */ jsxs("div", {
    className: "space-y-5",
    children: [/* @__PURE__ */ jsx(PageHeader, {
      title: "Transactions",
      actions: /* @__PURE__ */ jsxs("div", {
        className: "flex flex-wrap items-center gap-2",
        children: [/* @__PURE__ */ jsxs(Button, {
          variant: "secondary",
          onClick: handlePdfExport,
          disabled: pdfLoading,
          loading: pdfLoading,
          "aria-label": "Export PDF report",
          children: [/* @__PURE__ */ jsx(FileText, {
            "aria-hidden": true
          }), " ", pdfLoading ? "Generating…" : "Export PDF"]
        }), /* @__PURE__ */ jsxs(Button, {
          variant: "secondary",
          onClick: handleCsvExport,
          disabled: csvLoading,
          loading: csvLoading,
          "aria-label": "Export CSV",
          children: [/* @__PURE__ */ jsx(Download, {
            "aria-hidden": true
          }), " ", csvLoading ? "Exporting…" : "Export CSV"]
        })]
      })
    }), /* @__PURE__ */ jsxs(Card, {
      className: "p-3 sm:p-2",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "grid grid-cols-2 gap-2 sm:hidden",
        children: [/* @__PURE__ */ jsx("div", {
          className: "col-span-2",
          children: /* @__PURE__ */ jsx(Input, {
            type: "text",
            "aria-label": "Filter by merchant transaction ID",
            placeholder: "Merchant Tx ID…",
            maxLength: 100,
            value: merchantIdInput,
            onChange: (e) => {
              setMerchantIdInput(e.target.value);
              debounceSet(merchantIdRef, "merchant_transaction_id", e.target.value);
            }
          })
        }), /* @__PURE__ */ jsx("div", {
          className: "col-span-2",
          children: /* @__PURE__ */ jsx(Input, {
            type: "text",
            "aria-label": "Filter by payment brand",
            placeholder: "Payment brand…",
            maxLength: 100,
            value: brandInput,
            onChange: (e) => {
              setBrandInput(e.target.value);
              debounceSet(brandRef, "payment_brand", e.target.value);
            }
          })
        }), /* @__PURE__ */ jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsx("label", {
            htmlFor: "filter-from-m",
            className: "block text-xs font-medium text-ink-3",
            children: "From"
          }), /* @__PURE__ */ jsx(Input, {
            id: "filter-from-m",
            type: "date",
            value: fromInput,
            max: toInput || void 0,
            onChange: (e) => {
              const val = e.target.value;
              setFromInput(val);
              setDateRange(val, toInput);
            }
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsx("label", {
            htmlFor: "filter-to-m",
            className: "block text-xs font-medium text-ink-3",
            children: "To"
          }), /* @__PURE__ */ jsx(Input, {
            id: "filter-to-m",
            type: "date",
            value: toInput,
            min: fromInput || void 0,
            onChange: (e) => {
              const val = e.target.value;
              setToInput(val);
              setDateRange(fromInput, val);
            }
          })]
        }), /* @__PURE__ */ jsxs(Select, {
          value: filters.status ?? "",
          onChange: (e) => setFilter("status", e.target.value || void 0),
          "aria-label": "Filter by status",
          children: [/* @__PURE__ */ jsx("option", {
            value: "",
            children: "All statuses"
          }), /* @__PURE__ */ jsx("option", {
            value: "PAID",
            children: "PAID"
          }), /* @__PURE__ */ jsx("option", {
            value: "PENDING",
            children: "PENDING"
          }), /* @__PURE__ */ jsx("option", {
            value: "REJECTED",
            children: "REJECTED"
          })]
        }), /* @__PURE__ */ jsxs(Select, {
          value: filters.currency ?? "",
          onChange: (e) => setFilter("currency", e.target.value || void 0),
          "aria-label": "Filter by currency",
          children: [/* @__PURE__ */ jsx("option", {
            value: "",
            children: "All currencies"
          }), currencies.map((c) => /* @__PURE__ */ jsxs("option", {
            value: c.cc,
            children: [c.cc, " — ", c.name]
          }, c.cc))]
        }), hasFilters && /* @__PURE__ */ jsx("div", {
          className: "col-span-2",
          children: /* @__PURE__ */ jsxs(Button, {
            variant: "ghost",
            onClick: clearFilters,
            className: "w-full",
            children: [/* @__PURE__ */ jsx(X, {
              "aria-hidden": true
            }), " Clear filters"]
          })
        })]
      }), /* @__PURE__ */ jsx("div", {
        className: "hidden overflow-x-auto sm:block",
        children: /* @__PURE__ */ jsxs("div", {
          className: "flex flex-nowrap items-end gap-3 px-2 py-2",
          children: [/* @__PURE__ */ jsx("div", {
            className: "min-w-[160px] flex-1",
            children: /* @__PURE__ */ jsx(Input, {
              type: "text",
              "aria-label": "Filter by merchant transaction ID",
              placeholder: "Merchant Tx ID…",
              maxLength: 100,
              value: merchantIdInput,
              onChange: (e) => {
                setMerchantIdInput(e.target.value);
                debounceSet(merchantIdRef, "merchant_transaction_id", e.target.value);
              }
            })
          }), /* @__PURE__ */ jsx("div", {
            className: "min-w-[140px] flex-1",
            children: /* @__PURE__ */ jsx(Input, {
              type: "text",
              "aria-label": "Filter by payment brand",
              placeholder: "Payment brand…",
              maxLength: 100,
              value: brandInput,
              onChange: (e) => {
                setBrandInput(e.target.value);
                debounceSet(brandRef, "payment_brand", e.target.value);
              }
            })
          }), /* @__PURE__ */ jsxs("div", {
            className: "space-y-1 shrink-0",
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "filter-from",
              className: "block text-xs font-medium text-ink-3",
              children: "From"
            }), /* @__PURE__ */ jsx(Input, {
              id: "filter-from",
              type: "date",
              value: fromInput,
              max: toInput || void 0,
              onChange: (e) => {
                const val = e.target.value;
                setFromInput(val);
                setDateRange(val, toInput);
              }
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "space-y-1 shrink-0",
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "filter-to",
              className: "block text-xs font-medium text-ink-3",
              children: "To"
            }), /* @__PURE__ */ jsx(Input, {
              id: "filter-to",
              type: "date",
              value: toInput,
              min: fromInput || void 0,
              onChange: (e) => {
                const val = e.target.value;
                setToInput(val);
                setDateRange(fromInput, val);
              }
            })]
          }), /* @__PURE__ */ jsxs(Select, {
            value: filters.status ?? "",
            onChange: (e) => setFilter("status", e.target.value || void 0),
            "aria-label": "Filter by status",
            children: [/* @__PURE__ */ jsx("option", {
              value: "",
              children: "All statuses"
            }), /* @__PURE__ */ jsx("option", {
              value: "PAID",
              children: "PAID"
            }), /* @__PURE__ */ jsx("option", {
              value: "PENDING",
              children: "PENDING"
            }), /* @__PURE__ */ jsx("option", {
              value: "REJECTED",
              children: "REJECTED"
            })]
          }), /* @__PURE__ */ jsxs(Select, {
            value: filters.currency ?? "",
            onChange: (e) => setFilter("currency", e.target.value || void 0),
            "aria-label": "Filter by currency",
            children: [/* @__PURE__ */ jsx("option", {
              value: "",
              children: "All currencies"
            }), currencies.map((c) => /* @__PURE__ */ jsxs("option", {
              value: c.cc,
              children: [c.cc, " — ", c.name]
            }, c.cc))]
          }), hasFilters && /* @__PURE__ */ jsxs(Button, {
            variant: "ghost",
            onClick: clearFilters,
            className: "shrink-0",
            children: [/* @__PURE__ */ jsx(X, {
              "aria-hidden": true
            }), " Clear"]
          })]
        })
      })]
    }), error && /* @__PURE__ */ jsxs(Callout, {
      variant: "danger",
      role: "alert",
      children: ["Failed to load transactions: ", error]
    }), /* @__PURE__ */ jsx("div", {
      className: cn("transition-opacity", isLoading && "opacity-60"),
      "aria-busy": isLoading,
      children: transactions.length === 0 ? /* @__PURE__ */ jsx(Card, {
        children: /* @__PURE__ */ jsx(EmptyState, {
          icon: ReceiptText,
          title: "No transactions found",
          description: error ? "Failed to load transactions." : hasFilters ? "Nothing matches the current filters." : "Transactions will appear here once payments start flowing.",
          action: hasFilters && !error ? /* @__PURE__ */ jsx(Button, {
            variant: "secondary",
            size: "sm",
            onClick: clearFilters,
            children: "Clear filters"
          }) : void 0
        })
      }) : /* @__PURE__ */ jsxs(DataTable, {
        children: [/* @__PURE__ */ jsxs(THead, {
          children: [/* @__PURE__ */ jsx(Th, {
            children: "Merchant Reference"
          }), /* @__PURE__ */ jsx(Th, {
            children: "Amount"
          }), /* @__PURE__ */ jsx(Th, {
            children: "Status"
          }), /* @__PURE__ */ jsx(Th, {
            children: "Brand"
          }), /* @__PURE__ */ jsx(Th, {
            children: "Created"
          }), /* @__PURE__ */ jsx(Th, {
            children: "History"
          })]
        }), /* @__PURE__ */ jsx(TBody, {
          children: transactions.map((tx) => /* @__PURE__ */ jsxs(Tr, {
            interactive: true,
            onClick: () => navigate(`/transactions/${tx.id}`),
            children: [/* @__PURE__ */ jsx(Td, {
              children: /* @__PURE__ */ jsx(Link, {
                to: `/transactions/${tx.id}`,
                onClick: (e) => e.stopPropagation(),
                className: "font-mono text-xs text-primary hover:underline",
                children: tx.merchant_transaction_id
              })
            }), /* @__PURE__ */ jsx(Td, {
              className: "tnum text-ink",
              children: tx.amount !== null && tx.currency ? formatMoney(tx.amount, tx.currency) : "—"
            }), /* @__PURE__ */ jsx(Td, {
              children: /* @__PURE__ */ jsx(StatusPill, {
                status: tx.status
              })
            }), /* @__PURE__ */ jsx(Td, {
              children: tx.payment_brand ?? "—"
            }), /* @__PURE__ */ jsx(Td, {
              className: "text-ink-3",
              children: formatTimestamp(tx.created_at, tz)
            }), /* @__PURE__ */ jsx(Td, {
              children: tx.history_available ? /* @__PURE__ */ jsx(Tooltip, {
                content: "History available",
                children: /* @__PURE__ */ jsx("span", {
                  className: "inline-flex text-primary",
                  "aria-label": "History available",
                  role: "img",
                  children: /* @__PURE__ */ jsx(History, {
                    className: "size-4",
                    "aria-hidden": true
                  })
                })
              }) : /* @__PURE__ */ jsx("span", {
                className: "text-ink-3",
                children: "—"
              })
            })]
          }, tx.id))
        })]
      })
    }), paginationMeta && /* @__PURE__ */ jsxs("div", {
      className: "flex flex-wrap items-center justify-between gap-3",
      children: [/* @__PURE__ */ jsx("p", {
        className: "text-xs text-ink-3",
        children: paginationMeta.last_page > 1 ? /* @__PURE__ */ jsxs(Fragment, {
          children: ["Page ", /* @__PURE__ */ jsx("span", {
            className: "tnum",
            children: paginationMeta.current_page
          }), " of", " ", /* @__PURE__ */ jsx("span", {
            className: "tnum",
            children: paginationMeta.last_page
          }), " ", "· ", /* @__PURE__ */ jsx("span", {
            className: "tnum",
            children: paginationMeta.total
          }), " total"]
        }) : /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsx("span", {
            className: "tnum",
            children: paginationMeta.total
          }), " total"]
        })
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-3",
        children: [paginationMeta.last_page > 1 && /* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-1.5",
          children: [/* @__PURE__ */ jsxs(Button, {
            variant: "secondary",
            size: "sm",
            onClick: () => setPage(paginationMeta.current_page - 1),
            disabled: paginationMeta.current_page <= 1,
            "aria-label": "Previous page",
            children: [/* @__PURE__ */ jsx(ChevronLeft, {
              "aria-hidden": true
            }), " Prev"]
          }), /* @__PURE__ */ jsxs(Button, {
            variant: "secondary",
            size: "sm",
            onClick: () => setPage(paginationMeta.current_page + 1),
            disabled: paginationMeta.current_page >= paginationMeta.last_page,
            "aria-label": "Next page",
            children: ["Next ", /* @__PURE__ */ jsx(ChevronRight, {
              "aria-hidden": true
            })]
          })]
        }), /* @__PURE__ */ jsxs(Select, {
          value: String(filters.per_page),
          onChange: (e) => setFilter("per_page", e.target.value),
          "aria-label": "Rows per page",
          children: [/* @__PURE__ */ jsx("option", {
            value: "10",
            children: "10 / page"
          }), /* @__PURE__ */ jsx("option", {
            value: "25",
            children: "25 / page"
          }), /* @__PURE__ */ jsx("option", {
            value: "50",
            children: "50 / page"
          }), /* @__PURE__ */ jsx("option", {
            value: "100",
            children: "100 / page"
          })]
        })]
      })]
    })]
  });
});
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_transactions__index,
  loader: loader$9,
  meta: meta$4
}, Symbol.toStringTag, { value: "Module" }));
const CSV_ROW_CAP = 5e4;
const PDF_ROW_CAP = 5e3;
const PER_PAGE = 100;
async function fetchAllTransactionPages(pat, filters, cap) {
  const rows = [];
  let page = 1;
  let lastPage = 1;
  let metaTotal = 0;
  do {
    const result = await listTransactions(pat, {
      ...filters,
      page,
      per_page: PER_PAGE
    });
    if (!result.ok) {
      if (result.error.status === 429) {
        const delay = (result.error.retryAfterSeconds ?? 5) * 1e3;
        await new Promise((r) => setTimeout(r, delay));
        const retry = await listTransactions(pat, {
          ...filters,
          page,
          per_page: PER_PAGE
        });
        if (!retry.ok) {
          return {
            ok: false,
            status: retry.error.status,
            message: retry.error.message
          };
        }
        lastPage = retry.data.meta.last_page;
        metaTotal = retry.data.meta.total;
        rows.push(...retry.data.data);
      } else {
        return {
          ok: false,
          status: result.error.status,
          message: result.error.message
        };
      }
    } else {
      lastPage = result.data.meta.last_page;
      metaTotal = result.data.meta.total;
      rows.push(...result.data.data);
    }
    if (rows.length >= cap) {
      const capped = rows.slice(0, cap);
      return {
        ok: true,
        rows: capped,
        capped: true,
        totalFetched: rows.length,
        metaTotal,
        newestDate: capped[0]?.created_at ?? null,
        oldestDate: capped[capped.length - 1]?.created_at ?? null
      };
    }
    page++;
  } while (page <= lastPage);
  return {
    ok: true,
    rows,
    capped: false,
    totalFetched: rows.length,
    metaTotal,
    newestDate: rows[0]?.created_at ?? null,
    oldestDate: rows[rows.length - 1]?.created_at ?? null
  };
}
const FORMULA_INJECTION_RE = /^[=+\-@\t\r]/;
function csvTextField(value) {
  if (value === null || value === void 0) return "";
  const s = String(value);
  const guarded = FORMULA_INJECTION_RE.test(s) ? `'${s}` : s;
  if (guarded.includes(",") || guarded.includes('"') || guarded.includes("\n") || guarded.includes("\r")) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}
function csvVerbatimField(value) {
  if (value === null || value === void 0) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
const CSV_HEADER = "id,merchant_transaction_id,amount,currency,status,payment_brand,created_at,updated_at,history_available";
const BOM = "\uFEFF";
function transactionToCsvRow(tx) {
  return [
    csvVerbatimField(tx.id),
    csvTextField(tx.merchant_transaction_id),
    csvVerbatimField(tx.amount),
    // null → ''
    csvVerbatimField(tx.currency),
    csvVerbatimField(tx.status),
    csvTextField(tx.payment_brand),
    // formula-guard
    csvVerbatimField(tx.created_at),
    csvVerbatimField(tx.updated_at),
    csvVerbatimField(tx.history_available)
  ].join(",");
}
const REPORT_TZ$1 = "Asia/Singapore";
function slugify$1(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
async function loader$8({
  request
}) {
  const {
    pat,
    user
  } = await requireUser(request);
  const url = new URL(request.url);
  const rawFilters = parseTransactionFilters(url.searchParams);
  const filters = {
    from: rawFilters.from,
    to: rawFilters.to,
    status: rawFilters.status,
    merchant_transaction_id: rawFilters.merchant_transaction_id,
    currency: rawFilters.currency,
    payment_brand: rawFilters.payment_brand,
    query: rawFilters.query
  };
  const result = await fetchAllTransactionPages(pat, filters, CSV_ROW_CAP);
  if (!result.ok) {
    if (result.status === 401) {
      throw data({
        message: "Session expired. Please sign in again."
      }, {
        status: 401
      });
    }
    if (result.status === 403) {
      throw data({
        message: "You do not have permission to export transactions."
      }, {
        status: 403
      });
    }
    throw data({
      message: result.message || "Failed to fetch transactions."
    }, {
      status: result.status || 500
    });
  }
  const {
    rows,
    capped,
    totalFetched
  } = result;
  logger.info("csv_export", {
    userId: user.id,
    merchantId: user.merchantId,
    filters: JSON.stringify(filters),
    rowCount: rows.length,
    capped
  });
  const slug = slugify$1(user.merchantName) || "merchant";
  const stamp = DateTime.now().setZone(REPORT_TZ$1).toFormat("yyyyMMdd-HHmm");
  const filename = `dlt-transactions_${slug}_${stamp}.csv`;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(BOM));
      controller.enqueue(encoder.encode(CSV_HEADER + "\r\n"));
      for (const tx of rows) {
        controller.enqueue(encoder.encode(transactionToCsvRow(tx) + "\r\n"));
      }
      if (capped) {
        controller.enqueue(encoder.encode(`# Export limited to ${rows.length.toLocaleString()} rows (cap: ${CSV_ROW_CAP.toLocaleString()}). Total matched: ${totalFetched.toLocaleString()}. Narrow your filters.\r
`));
      }
      controller.close();
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private"
    }
  });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname$1, "../../assets/dlt.png");
if (!fs.existsSync(LOGO_PATH)) {
  throw new Error(`[pdf.ts] Logo asset not found at ${LOGO_PATH}. Fix before generating PDFs.`);
}
const A4_W = 595.28;
const A4_H = 841.89;
const MM = 2.8346;
const MARGIN = Math.round(18 * MM);
const C = {
  ink: "#111827",
  // gray-900
  ink2: "#374151",
  // gray-700  ≥ 9:1 on white
  ink3: "#6B7280",
  // gray-500  ≥ 4.5:1 on white  (was #9CA3AF → fixed)
  border: "#E5E7EB",
  // gray-200
  headerBg: "#F9FAFB",
  // gray-50   (table header only, very light)
  zebra: "#F9FAFB",
  // gray-50
  white: "#FFFFFF",
  brand: "#172d99",
  // brand-800 (matches DESIGN_SYSTEM.md)
  // status
  paid: "#166534",
  // green-800
  paidBg: "#DCFCE7",
  pending: "#92400E",
  rejected: "#991B1B",
  notCap: "#374151",
  notCapBg: "#F3F4F6",
  purged: "#991B1B",
  purgedBg: "#FEE2E2",
  amber: "#92400E",
  amberBg: "#FEF3C7"
};
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomAlphanum(n) {
  let result = "";
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * ALPHANUM.length);
    result += ALPHANUM[idx];
  }
  return result;
}
function makeReportRef(kind) {
  const stamp = DateTime.now().setZone(REPORT_TZ).toFormat("yyyyMMdd-HHmmss");
  return `DLT-${kind}-${stamp}-${randomAlphanum(4)}`;
}
const BRAND_LABELS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  jcb: "JCB",
  discover: "Discover",
  diners: "Diners",
  gcash: "GCash",
  maya: "Maya",
  paymaya: "Maya",
  "qr ph": "QR Ph",
  "qr_ph": "QR Ph",
  grabpay: "GrabPay",
  shopeepay: "ShopeePay",
  unionpay: "UnionPay"
};
function brandLabel(raw) {
  if (!raw) return "—";
  const key = raw.toLowerCase().trim();
  return BRAND_LABELS[key] ?? raw;
}
function formatMoneyStr(amount) {
  if (amount === null || amount === void 0) return "—";
  let dec;
  try {
    dec = new Decimal(amount);
  } catch {
    return "—";
  }
  const fixed = dec.toFixed(2);
  const [intPart, fracPart] = fixed.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${formatted}.${fracPart}`;
}
const REPORT_TZ = "Asia/Singapore";
function fmtListDate(iso) {
  if (!iso) return "—";
  const dt = DateTime.fromISO(iso, { zone: REPORT_TZ });
  return dt.isValid ? dt.toFormat("d MMM yyyy, h:mm a") : "—";
}
function fmtDetailDate(iso) {
  if (!iso) return "—";
  const dt = DateTime.fromISO(iso, { zone: REPORT_TZ });
  return dt.isValid ? dt.toFormat("d MMM yyyy, h:mm:ss a 'SGT'") : "—";
}
function fmtDate$1(iso) {
  if (!iso) return "—";
  const dt = DateTime.fromISO(iso, { zone: REPORT_TZ });
  return dt.isValid ? dt.toFormat("d MMM yyyy") : "—";
}
function fmtGenerated(now) {
  return now.toFormat("d MMM yyyy, h:mm a 'SGT'");
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function makeFilename(merchantName, prefix) {
  const slug = slugify(merchantName) || "merchant";
  const stamp = DateTime.now().setZone(REPORT_TZ).toFormat("yyyyMMdd-HHmm");
  return `${prefix}_${slug}_${stamp}.pdf`;
}
function truncate(s, max) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
function computeSummary(rows) {
  const byStatus = {
    PAID: { count: 0, amount: new Decimal(0) },
    PENDING: { count: 0, amount: new Decimal(0) },
    REJECTED: { count: 0, amount: new Decimal(0) }
  };
  const byCurrencyStatus = {};
  for (const tx of rows) {
    const s = tx.status;
    byStatus[s].count++;
    if (tx.amount !== null) {
      byStatus[s].amount = byStatus[s].amount.plus(new Decimal(tx.amount));
    }
    const cc = tx.currency ?? "_unknown";
    if (!byCurrencyStatus[cc]) {
      byCurrencyStatus[cc] = {
        count: 0,
        PAID: { count: 0, amount: new Decimal(0) },
        PENDING: { count: 0, amount: new Decimal(0) },
        REJECTED: { count: 0, amount: new Decimal(0) }
      };
    }
    const entry2 = byCurrencyStatus[cc];
    entry2.count++;
    entry2[s].count++;
    if (tx.amount !== null) {
      entry2[s].amount = entry2[s].amount.plus(new Decimal(tx.amount));
    }
  }
  return { total: rows.length, byStatus, byCurrencyStatus };
}
function describeFilters(filters, tz = REPORT_TZ) {
  const pairs = [];
  if (filters.from && filters.to) {
    const from = DateTime.fromISO(filters.from, { zone: tz });
    const to = DateTime.fromISO(filters.to, { zone: tz });
    const label = `${from.isValid ? from.toFormat("d MMM yyyy") : filters.from} – ${to.isValid ? to.toFormat("d MMM yyyy") : filters.to} (${tz})`;
    pairs.push(["Date range", label]);
  } else if (filters.from) {
    pairs.push(["Date range", `From ${fmtDate$1(filters.from)} (${tz})`]);
  } else if (filters.to) {
    pairs.push(["Date range", `To ${fmtDate$1(filters.to)} (${tz})`]);
  } else {
    pairs.push(["Date range", "All dates"]);
  }
  if (filters.status) pairs.push(["Status", filters.status]);
  if (filters.currency) pairs.push(["Currency", filters.currency]);
  if (filters.payment_brand) pairs.push(["Payment brand", brandLabel(filters.payment_brand)]);
  if (filters.merchant_transaction_id) pairs.push(["Merchant Tx ID", filters.merchant_transaction_id]);
  if (filters.query) pairs.push(["Search", filters.query]);
  return pairs;
}
function fillRect(doc, x, y, w, h, color) {
  doc.rect(x, y, w, h).fillColor(color).fill();
}
function hRule(doc, x, y, w, color = C.border, lw = 0.5) {
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(lw).strokeColor(color).stroke();
}
function drawPageHeader(doc, title, pageW, margin, meta2, showTitle = true) {
  const LOGO_H = 44;
  const topY = margin - 18;
  if (showTitle) {
    doc.image(LOGO_PATH, margin, topY, { height: LOGO_H, width: LOGO_H });
    const TITLE_FONT_L1 = 19;
    const TITLE_FONT_L2 = 18;
    const LINE_H = 22;
    const lastSpace = title.lastIndexOf(" ");
    const titleLine1 = lastSpace > 0 ? title.slice(0, lastSpace) : title;
    const titleLine2 = lastSpace > 0 ? title.slice(lastSpace + 1) : "";
    const titleX = margin + LOGO_H + 10;
    const titleY = topY + 2;
    doc.font("Helvetica-Bold").fontSize(TITLE_FONT_L1).fillColor(C.ink).text(titleLine1, titleX, titleY, { lineBreak: false });
    if (titleLine2) {
      doc.font("Helvetica-Bold").fontSize(TITLE_FONT_L2).fillColor(C.ink).text(titleLine2, titleX, titleY + LINE_H, { lineBreak: false });
    }
  }
  if (meta2 && showTitle) {
    const META_W = 210;
    const metaX = pageW - margin - META_W;
    const META_FONT = 7.5;
    const ROW_GAP = 13;
    let my = topY;
    const drawMetaRow = (label, value) => {
      doc.font("Helvetica").fontSize(META_FONT).fillColor(C.ink3);
      const labelW = doc.widthOfString(label + "  ");
      doc.font("Helvetica-Bold").fontSize(META_FONT).fillColor(C.ink2);
      const valueW = doc.widthOfString(value);
      const totalW = labelW + valueW;
      const startX = metaX + META_W - totalW;
      doc.font("Helvetica").fontSize(META_FONT).fillColor(C.ink3).text(label + "  ", startX, my, { lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(META_FONT).fillColor(C.ink2).text(value, startX + labelW, my, { lineBreak: false });
      my += ROW_GAP;
    };
    const drawMetaRowWithSub = (label, value, subValue) => {
      drawMetaRow(label, value);
      doc.font("Helvetica").fontSize(META_FONT - 0.5).fillColor(C.ink3).text(subValue, metaX, my - ROW_GAP + 11, { width: META_W, align: "right", lineBreak: false });
      my += 2;
    };
    drawMetaRow("Merchant", truncate(meta2.merchant, 30));
    drawMetaRow("Generated", meta2.generated);
    drawMetaRowWithSub("Generated by", meta2.generatedByName, meta2.generatedByEmail);
  }
  const ruleY = topY + LOGO_H + 4;
  hRule(doc, margin, ruleY, pageW - margin * 2, C.brand, 2);
  return ruleY + 8;
}
function stampPageFooter(doc, pageIndex, totalPages, pageH, pageW, margin, generatedAt) {
  const y = pageH - margin + 10;
  const colW = (pageW - margin * 2) / 3;
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  hRule(doc, margin, y - 8, pageW - margin * 2, C.border, 0.5);
  doc.font("Helvetica").fontSize(7).fillColor(C.ink3);
  doc.text("Confidential: for merchant use only", margin, y, {
    width: colW,
    align: "left",
    lineBreak: false
  });
  doc.text(generatedAt, margin + colW, y, {
    width: colW,
    align: "center",
    lineBreak: false
  });
  doc.text(`Page ${pageIndex + 1} of ${totalPages}`, margin + colW * 2, y, {
    width: colW,
    align: "right",
    lineBreak: false
  });
  doc.page.margins.bottom = savedBottom;
}
function drawStatusText(doc, status, x, y, w = 60) {
  let fg = C.notCap;
  if (status === "PAID") fg = C.paid;
  if (status === "PENDING") fg = C.pending;
  if (status === "REJECTED") fg = C.rejected;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(fg).text(status, x, y, { width: w, align: "left", lineBreak: false });
}
function finalizePdf(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}
function drawSectionHeading(doc, label, x, y, w) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink).text(label, x, y, { width: w, lineBreak: false });
  hRule(doc, x, y + 13, w, C.border, 1);
  return y + 20;
}
async function generateTransactionListPdf(rows, filters, user, capped, metaTotal, oldestDate, newestDate) {
  const PAGE_W = A4_W;
  const PAGE_H = A4_H;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const now = DateTime.now().setZone(REPORT_TZ);
  const generatedAt = fmtGenerated(now);
  const reportRef = makeReportRef("LIST");
  const headerMeta = {
    merchant: user.merchantName,
    generated: generatedAt,
    generatedByName: `${user.firstName} ${user.lastName}`,
    generatedByEmail: user.email
  };
  logger.info("pdf.list.generate", {
    reportRef,
    rows: rows.length,
    metaTotal,
    capped,
    merchant: user.merchantName,
    generatedBy: user.email
  });
  const REPORT_TITLE = "Collection Transactions Report";
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: MARGIN + 10, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: REPORT_TITLE,
      Author: `${user.firstName} ${user.lastName}`,
      Producer: "DLT Merchant Portal",
      CreationDate: /* @__PURE__ */ new Date()
    }
  });
  const bufferPromise = finalizePdf(doc);
  let y = drawPageHeader(doc, REPORT_TITLE, PAGE_W, MARGIN, headerMeta);
  y = drawSectionHeading(doc, "Filters applied", MARGIN, y, CONTENT_W);
  const filterPairs = describeFilters(filters, REPORT_TZ);
  if (filterPairs.length === 0) {
    doc.font("Helvetica").fontSize(8.5).fillColor(C.ink2).text("None (all transactions)", MARGIN, y, { lineBreak: false });
    y += 14;
  } else {
    const half = Math.ceil(filterPairs.length / 2);
    let leftY = y;
    let rightY = y;
    filterPairs.forEach(([label, value], i) => {
      const col = i < half ? 0 : 1;
      const cx = MARGIN + col * (CONTENT_W / 2 + 6);
      const rowY = col === 0 ? leftY : rightY;
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.ink3).text(label + ":", cx, rowY, { width: 100, lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(C.ink).text(truncate(value, 45), cx + 104, rowY, { width: CONTENT_W / 2 - 110, lineBreak: false });
      if (col === 0) leftY += 13;
      else rightY += 13;
    });
    y = Math.max(leftY, rightY) + 4;
  }
  const totalDisplayed = metaTotal ?? rows.length;
  const oldest = oldestDate ? fmtListDate(oldestDate) : null;
  const newest = newestDate ? fmtListDate(newestDate) : null;
  const coverageText = oldest && newest ? `Showing ${rows.length.toLocaleString()} of ${totalDisplayed.toLocaleString()} transactions · Oldest ${oldest} · Newest ${newest} · Sorted newest first` : `Showing ${rows.length.toLocaleString()} of ${totalDisplayed.toLocaleString()} transactions · Sorted newest first`;
  doc.font("Helvetica").fontSize(7.5).fillColor(C.ink3).text(coverageText, MARGIN, y, { width: CONTENT_W, lineBreak: false });
  y += 14;
  if (capped) {
    fillRect(doc, MARGIN, y, CONTENT_W, 20, C.amberBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2).strokeColor(C.pending).lineWidth(0.75).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.amber).text(
      `Warning: Report limited to the first ${rows.length.toLocaleString()} transactions. ${totalDisplayed > rows.length ? `${(totalDisplayed - rows.length).toLocaleString()} transactions not shown.` : ""} Narrow your filters or use CSV export for the full dataset.`,
      MARGIN + 6,
      y + 5,
      { width: CONTENT_W - 12, lineBreak: false }
    );
    y += 26;
  }
  hRule(doc, MARGIN, y, CONTENT_W);
  y += 10;
  y = drawSectionHeading(doc, "Summary", MARGIN, y, CONTENT_W);
  const summary = computeSummary(rows);
  const currencies = Object.keys(summary.byCurrencyStatus).filter((cc) => cc !== "_unknown");
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;
  const CARD_W = (CONTENT_W - 12) / 4;
  const CARD_H = 52;
  const CARD_GAP = 4;
  const makeCard = (label, status, color) => {
    const st = summary.byStatus[status];
    let amountStr;
    let zeroAmount = st.count === 0;
    if (st.count === 0) {
      amountStr = "—";
    } else if (singleCurrency) {
      amountStr = `${singleCurrency} ${formatMoneyStr(st.amount.toFixed(2))}`;
    } else {
      amountStr = "see breakdown below";
    }
    return { label, count: st.count, amountStr, color, zeroAmount };
  };
  const cards = [
    {
      label: "Total",
      count: summary.total,
      amountStr: singleCurrency && summary.total > 0 ? `${singleCurrency} ${formatMoneyStr(
        Object.values(summary.byCurrencyStatus).reduce(
          (acc, cs) => acc.plus(cs.PAID.amount).plus(cs.PENDING.amount).plus(cs.REJECTED.amount),
          new Decimal(0)
        ).toFixed(2)
      )}` : summary.total > 0 ? "see breakdown below" : "—",
      color: C.brand,
      zeroAmount: summary.total === 0
    },
    makeCard("PAID", "PAID", C.paid),
    makeCard("PENDING", "PENDING", C.pending),
    makeCard("REJECTED", "REJECTED", C.rejected)
  ];
  cards.forEach(({ label, count, amountStr, color, zeroAmount }, i) => {
    const cx = MARGIN + i * (CARD_W + CARD_GAP);
    fillRect(doc, cx, y, CARD_W, CARD_H, C.white);
    doc.roundedRect(cx, y, CARD_W, CARD_H, 3).strokeColor(C.border).lineWidth(0.75).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(C.ink3).text(label, cx + 8, y + 7, { width: CARD_W - 16, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(22).fillColor(zeroAmount ? C.ink3 : color).text(String(count), cx + 8, y + 17, { width: CARD_W - 16, lineBreak: false });
    doc.font("Helvetica").fontSize(7).fillColor(zeroAmount ? C.ink3 : C.ink2).text(amountStr, cx + 8, y + 41, { width: CARD_W - 16, lineBreak: false });
  });
  y += CARD_H + 10;
  if (currencies.length > 0) {
    y = drawSectionHeading(doc, "Totals by currency and status", MARGIN, y, CONTENT_W);
    const CC_COL_W = 52;
    const STAT_COL_W = (CONTENT_W - CC_COL_W) / 4;
    const CURR_ROW_H = 16;
    fillRect(doc, MARGIN, y, CONTENT_W, CURR_ROW_H, C.headerBg);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.ink2);
    doc.text("Currency", MARGIN + 4, y + 4, { width: CC_COL_W - 4, align: "left", lineBreak: false });
    const statLabels = ["Paid (collected)", "Pending", "Rejected", "All statuses"];
    statLabels.forEach((lbl, i) => {
      const cx = MARGIN + CC_COL_W + i * STAT_COL_W;
      doc.text(lbl, cx, y + 4, { width: STAT_COL_W - 4, align: "right", lineBreak: false });
    });
    y += CURR_ROW_H;
    currencies.forEach((cc, idx) => {
      const cs = summary.byCurrencyStatus[cc];
      const allAmount = cs.PAID.amount.plus(cs.PENDING.amount).plus(cs.REJECTED.amount);
      if (idx % 2 === 1) fillRect(doc, MARGIN, y, CONTENT_W, CURR_ROW_H, C.zebra);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.ink).text(cc, MARGIN + 4, y + 4, { width: CC_COL_W - 4, align: "left", lineBreak: false });
      const statValues = [
        { amount: cs.PAID.amount, count: cs.PAID.count, color: C.paid },
        { amount: cs.PENDING.amount, count: cs.PENDING.count, color: C.pending },
        { amount: cs.REJECTED.amount, count: cs.REJECTED.count, color: C.rejected },
        { amount: allAmount, count: cs.count, color: C.ink }
      ];
      statValues.forEach(({ amount, count, color }, i) => {
        const cx = MARGIN + CC_COL_W + i * STAT_COL_W;
        const txt = count > 0 ? formatMoneyStr(amount.toFixed(2)) : "—";
        doc.font("Helvetica").fontSize(8).fillColor(count > 0 ? color : C.ink3).text(txt, cx, y + 4, { width: STAT_COL_W - 4, align: "right", lineBreak: false });
      });
      y += CURR_ROW_H;
    });
    hRule(doc, MARGIN, y, CONTENT_W, C.border, 0.5);
    y += 8;
    doc.font("Helvetica").fontSize(7).fillColor(C.ink3).text(
      "Only PAID amounts have been collected. PENDING and REJECTED amounts are shown for reference.",
      MARGIN,
      y,
      { width: CONTENT_W, lineBreak: false }
    );
    y += 14;
  }
  hRule(doc, MARGIN, y, CONTENT_W);
  y += 10;
  if (rows.length === 0) {
    y += 20;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(C.ink2).text("No transactions match these filters.", MARGIN, y, { align: "center", width: CONTENT_W, lineBreak: false });
  } else {
    const cols = [
      { label: "Date & time", w: 90, align: "left", pad: 4 },
      { label: "Reference", w: 100, align: "left", pad: 4 },
      { label: "Amount", w: 74, align: "right", rpad: 12 },
      { label: "Currency", w: 56, align: "left", lpad: 8 },
      { label: "Status", w: 60, align: "left", pad: 4 },
      { label: "Brand", w: 113, align: "left", pad: 4 }
    ];
    const ROW_H = 16;
    const HEAD_H = 18;
    const drawTableHeader = (atY) => {
      fillRect(doc, MARGIN, atY, CONTENT_W, HEAD_H, C.headerBg);
      let cx = MARGIN;
      for (const col of cols) {
        const lpad = "lpad" in col ? col.lpad : "pad" in col ? col.pad : 4;
        const rpad = "rpad" in col ? col.rpad : 0;
        const innerX = cx + lpad;
        const innerW = col.w - lpad - rpad - 4;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.ink2).text(col.label, innerX, atY + 5, { width: innerW, align: col.align, lineBreak: false });
        cx += col.w;
      }
      return atY + HEAD_H;
    };
    y = drawTableHeader(y);
    rows.forEach((tx, idx) => {
      if (y + ROW_H > PAGE_H - MARGIN - 20) {
        doc.addPage({
          size: [PAGE_W, PAGE_H],
          margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN }
        });
        y = MARGIN;
        y = drawTableHeader(y);
      }
      if (idx % 2 === 1) fillRect(doc, MARGIN, y, CONTENT_W, ROW_H, C.zebra);
      let cx = MARGIN;
      {
        const col = cols[0];
        const lpad = "pad" in col ? col.pad : 4;
        doc.font("Helvetica").fontSize(7.5).fillColor(C.ink).text(fmtListDate(tx.created_at), cx + lpad, y + 4, { width: col.w - lpad - 4, align: col.align, lineBreak: false });
        cx += col.w;
      }
      {
        const col = cols[1];
        const lpad = "pad" in col ? col.pad : 4;
        doc.font("Courier").fontSize(7).fillColor(C.ink).text(tx.merchant_transaction_id, cx + lpad, y + 4, { width: col.w - lpad - 4, align: col.align, lineBreak: false });
        cx += col.w;
      }
      {
        const col = cols[2];
        const rpad = "rpad" in col ? col.rpad : 0;
        doc.font("Helvetica").fontSize(8).fillColor(C.ink).text(formatMoneyStr(tx.amount), cx, y + 4, { width: col.w - rpad, align: "right", lineBreak: false });
        cx += col.w;
      }
      {
        const col = cols[3];
        const lpad = "lpad" in col ? col.lpad : 4;
        doc.font("Helvetica").fontSize(8).fillColor(C.ink).text(tx.currency ?? "—", cx + lpad, y + 4, { width: col.w - lpad - 4, align: col.align, lineBreak: false });
        cx += col.w;
      }
      {
        const col = cols[4];
        const lpad = "pad" in col ? col.pad : 4;
        drawStatusText(doc, tx.status, cx + lpad, y + 4, col.w - lpad - 4);
        cx += col.w;
      }
      {
        const col = cols[5];
        const lpad = "pad" in col ? col.pad : 4;
        doc.font("Helvetica").fontSize(7.5).fillColor(C.ink).text(truncate(brandLabel(tx.payment_brand), 22), cx + lpad, y + 4, {
          width: col.w - lpad - 4,
          align: col.align,
          lineBreak: false
        });
      }
      y += ROW_H;
    });
    if (y + 24 > PAGE_H - MARGIN - 20) {
      doc.addPage({
        size: [PAGE_W, PAGE_H],
        margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN }
      });
      y = MARGIN;
    }
    hRule(doc, MARGIN, y, CONTENT_W);
    y += 6;
    doc.font("Helvetica").fontSize(7.5).fillColor(C.ink3).text(
      "Note: Statuses are normalised (PAID, PENDING, REJECTED). Data is as stored at generation time. Timestamps are in Asia/Singapore (SGT).",
      MARGIN,
      y,
      { width: CONTENT_W, lineBreak: false }
    );
  }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    stampPageFooter(doc, i, range.count, PAGE_H, PAGE_W, MARGIN, generatedAt);
  }
  doc.end();
  return bufferPromise;
}
const OMISSION_REASON_LABELS = {
  portal_field_allowlist: "Field not included in portal allowlist",
  merchant_response_field_allowlist: "Merchant response field not in allowlist",
  payment_url_excluded: "Payment URL excluded for security",
  pci_dss_exclusion: "Excluded for PCI-DSS compliance",
  oversize: "Value too large to store",
  binary_content: "Binary content not recorded",
  sensitive_header: "Sensitive header redacted",
  unsupported_content_type: "Unsupported content type"
};
const COVERAGE_LABELS = {
  merchant_request: "Merchant Request",
  dlt_response: "DLT Response",
  merchant_webhook_request: "Webhook Sent",
  merchant_webhook_response: "Webhook Reply"
};
const EVENT_LABELS = {
  merchant_request: "Merchant Request",
  dlt_response: "DLT Response",
  merchant_webhook_request: "Webhook Notification",
  merchant_webhook_response: "Webhook Response"
};
const DIRECTION_LABELS$1 = {
  merchant_to_dlt: "Merchant -> DLT",
  dlt_to_merchant: "DLT -> Merchant"
};
const CAPTURE_STATUS_LABELS$1 = {
  available: "Available",
  omitted: "Omitted",
  unavailable: "Unavailable",
  purged: "Purged"
};
function coverageColor(status) {
  if (status === "captured") return [C.paidBg, C.paid];
  if (status === "purged") return [C.purgedBg, C.purged];
  return [C.notCapBg, C.notCap];
}
function coverageStatusLabel(status) {
  if (status === "captured") return "Captured";
  if (status === "not_captured") return "Not captured";
  if (status === "purged") return "Purged";
  return status;
}
async function generateTransactionDetailPdf(tx, history, user) {
  const PAGE_W = A4_W;
  const PAGE_H = A4_H;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const now = DateTime.now().setZone(REPORT_TZ);
  const generatedAt = fmtGenerated(now);
  const reportRef = makeReportRef("TXN");
  const REPORT_TITLE = "Transaction Report";
  const headerMeta = {
    merchant: user.merchantName,
    generated: generatedAt,
    generatedByName: `${user.firstName} ${user.lastName}`,
    generatedByEmail: user.email
  };
  logger.info("pdf.detail.generate", {
    reportRef,
    transactionId: tx.id,
    merchantTxId: tx.merchant_transaction_id,
    merchant: user.merchantName,
    generatedBy: user.email,
    historyItems: history?.data.length ?? 0
  });
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: MARGIN + 10, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `${REPORT_TITLE} — ${tx.merchant_transaction_id}`,
      Author: `${user.firstName} ${user.lastName}`,
      Producer: "DLT Merchant Portal",
      CreationDate: /* @__PURE__ */ new Date()
    }
  });
  const bufferPromise = finalizePdf(doc);
  let y = drawPageHeader(doc, REPORT_TITLE, PAGE_W, MARGIN, headerMeta);
  y = drawSectionHeading(doc, "Transaction Summary", MARGIN, y, CONTENT_W);
  const amountDisplay = tx.amount !== null && tx.currency ? `${tx.currency} ${formatMoneyStr(tx.amount)}` : "—";
  const exchangeHistoryValue = (() => {
    if (!history) return "None recorded";
    if (history.data.length === 0) return "None recorded";
    return `${history.data.length} event${history.data.length !== 1 ? "s" : ""} recorded`;
  })();
  const LBL_W = 130;
  const VAL_X = MARGIN + LBL_W + 8;
  const VAL_W = CONTENT_W - LBL_W - 8;
  const ROW_H_DEF = 15;
  const summaryFields = [
    ["Merchant reference", tx.merchant_transaction_id],
    ["Internal ID", String(tx.id)],
    ["Amount", amountDisplay],
    ["Status", "STATUS_PILL"],
    ["Payment brand", brandLabel(tx.payment_brand)],
    ["Created", fmtDetailDate(tx.created_at)],
    ["Updated", fmtDetailDate(tx.updated_at)],
    ["Exchange history", exchangeHistoryValue]
  ];
  for (const [label, value] of summaryFields) {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.ink3).text(label, MARGIN, y, { width: LBL_W, lineBreak: false });
    if (value === "STATUS_PILL") {
      drawStatusText(doc, tx.status, VAL_X, y, 80);
    } else {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.ink).text(value, VAL_X, y, { width: VAL_W, lineBreak: false });
    }
    y += ROW_H_DEF;
  }
  y += 6;
  hRule(doc, MARGIN, y, CONTENT_W);
  y += 12;
  y = drawSectionHeading(doc, "Exchange History", MARGIN, y, CONTENT_W);
  if (!history || history.data.length === 0) {
    const BOX_H = 56;
    fillRect(doc, MARGIN, y, CONTENT_W, BOX_H, C.headerBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, BOX_H, 4).strokeColor(C.border).lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink).text("No recorded exchanges", MARGIN + 10, y + 10, { width: CONTENT_W - 20, align: "center", lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(C.ink3).text(
      "No merchant <-> DLT exchanges are stored for this transaction. Payload capture currently covers supported APN hosted checkout flows, so other providers may show no history. This does not indicate whether the payment succeeded.",
      MARGIN + 10,
      y + 24,
      { width: CONTENT_W - 20, lineBreak: true }
    );
    y += BOX_H + 12;
  } else {
    const coverage = history.meta.coverage;
    const coverageKeys = [
      "merchant_request",
      "dlt_response",
      "merchant_webhook_request",
      "merchant_webhook_response"
    ];
    const pillW = (CONTENT_W - 3 * 4) / 4;
    const COV_H = 30;
    coverageKeys.forEach((key, i) => {
      const status = coverage[key] ?? "not_captured";
      const [bg, fg] = coverageColor(status);
      const cx = MARGIN + i * (pillW + 4);
      fillRect(doc, cx, y, pillW, COV_H, bg);
      doc.roundedRect(cx, y, pillW, COV_H, 2).strokeColor(fg).lineWidth(0.5).stroke();
      doc.font("Helvetica").fontSize(7).fillColor(C.ink3).text(COVERAGE_LABELS[key] ?? key, cx + 4, y + 4, { width: pillW - 8, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8).fillColor(fg).text(coverageStatusLabel(status), cx + 4, y + 16, { width: pillW - 8, lineBreak: false });
    });
    y += COV_H + 10;
    doc.font("Helvetica").fontSize(7.5).fillColor(C.ink3).text(
      `${history.data.length} event${history.data.length !== 1 ? "s" : ""}, ascending by capture time`,
      MARGIN,
      y,
      { width: CONTENT_W, lineBreak: false }
    );
    y += 12;
    const sorted = [...history.data].sort(
      (a, b) => a.captured_at.localeCompare(b.captured_at)
    );
    for (const item of sorted) {
      const EVENT_BLOCK_MIN = 70;
      if (y + EVENT_BLOCK_MIN > PAGE_H - MARGIN - 20) {
        doc.addPage({
          size: [PAGE_W, PAGE_H],
          margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN }
        });
        y = MARGIN;
      }
      const eventLabel = EVENT_LABELS[item.event_type] ?? item.event_type;
      const dirLabel = DIRECTION_LABELS$1[item.direction] ?? item.direction;
      fillRect(doc, MARGIN, y, CONTENT_W, 18, C.zebra);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.ink).text(eventLabel, MARGIN + 4, y + 4, { width: 180, lineBreak: false });
      doc.font("Helvetica").fontSize(7.5).fillColor(C.ink2).text(dirLabel, MARGIN + 188, y + 5, { width: 140, lineBreak: false });
      doc.font("Helvetica").fontSize(7.5).fillColor(C.ink2).text(fmtDetailDate(item.captured_at), MARGIN + 332, y + 5, {
        width: CONTENT_W - 336,
        align: "right",
        lineBreak: false
      });
      y += 20;
      const detailFields = [
        ["Capture status", CAPTURE_STATUS_LABELS$1[item.capture_status] ?? item.capture_status]
      ];
      if (item.http_status != null) detailFields.push(["HTTP status", String(item.http_status)]);
      if (item.attempt_number != null) detailFields.push(["Attempt", String(item.attempt_number)]);
      if (item.delivery) {
        detailFields.push(["Delivery state", item.delivery.state]);
        if (item.delivery.duration_ms != null) detailFields.push(["Duration", `${item.delivery.duration_ms} ms`]);
      }
      if (item.response) {
        if (item.response.capture_stage) detailFields.push(["Capture stage", item.response.capture_stage]);
        if (item.response.is_repeated_request != null)
          detailFields.push(["Repeated request", item.response.is_repeated_request ? "Yes" : "No"]);
      }
      if (item.retain_until) detailFields.push(["Retained until", fmtDetailDate(item.retain_until)]);
      if (item.purged_at) detailFields.push(["Purged at", fmtDetailDate(item.purged_at)]);
      for (const [lbl, val] of detailFields) {
        if (y + 12 > PAGE_H - MARGIN - 20) {
          doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
          y = MARGIN;
        }
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.ink3).text(lbl + ":", MARGIN + 10, y, { width: 110, lineBreak: false });
        doc.font("Helvetica").fontSize(7.5).fillColor(C.ink).text(val, MARGIN + 124, y, { width: CONTENT_W - 134, lineBreak: false });
        y += 11;
      }
      if (item.payload !== null && typeof item.payload === "object" && !Array.isArray(item.payload)) {
        if (y + 12 > PAGE_H - MARGIN - 20) {
          doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
          y = MARGIN;
        }
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.ink3).text("Payload:", MARGIN + 10, y, { lineBreak: false });
        y += 11;
        for (const [k, v] of Object.entries(item.payload)) {
          if (y + 11 > PAGE_H - MARGIN - 20) {
            doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
            y = MARGIN;
          }
          const display = typeof v === "object" ? JSON.stringify(v) : String(v);
          doc.font("Helvetica").fontSize(7.5).fillColor(C.ink3).text(`${k}:`, MARGIN + 18, y, { width: 100, lineBreak: false });
          doc.fillColor(C.ink).text(truncate(display, 120), MARGIN + 122, y, { width: CONTENT_W - 132, lineBreak: false });
          y += 10;
        }
      }
      if (item.omissions.length > 0) {
        if (y + 12 > PAGE_H - MARGIN - 20) {
          doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
          y = MARGIN;
        }
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.ink3).text("Omitted fields:", MARGIN + 10, y, { lineBreak: false });
        y += 10;
        for (const omission of item.omissions) {
          if (y + 10 > PAGE_H - MARGIN - 20) {
            doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
            y = MARGIN;
          }
          const reason = OMISSION_REASON_LABELS[omission.reason_code] ?? omission.reason_code;
          doc.font("Helvetica").fontSize(7).fillColor(C.ink3).text(`${omission.field_path}: ${reason}`, MARGIN + 18, y, { width: CONTENT_W - 28, lineBreak: false });
          y += 10;
        }
      }
      hRule(doc, MARGIN, y + 2, CONTENT_W);
      y += 10;
    }
  }
  const NOTES_H = 44;
  if (y + NOTES_H > PAGE_H - MARGIN - 20) {
    doc.addPage({
      size: [PAGE_W, PAGE_H],
      margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN }
    });
    y = MARGIN;
  }
  y = drawSectionHeading(doc, "Notes", MARGIN, y, CONTENT_W);
  doc.font("Helvetica").fontSize(7.5).fillColor(C.ink3).text(
    "History shows sanitized, recorded exchanges between the merchant integration and DLT. Sent or queued does not mean the payment succeeded. This is not a reconstruction of original traffic.",
    MARGIN,
    y,
    { width: CONTENT_W }
  );
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    stampPageFooter(doc, i, range.count, PAGE_H, PAGE_W, MARGIN, generatedAt);
  }
  doc.end();
  return bufferPromise;
}
async function loader$7({
  request
}) {
  const {
    pat,
    user
  } = await requireUser(request);
  const url = new URL(request.url);
  const rawFilters = parseTransactionFilters(url.searchParams);
  const filters = {
    from: rawFilters.from,
    to: rawFilters.to,
    status: rawFilters.status,
    merchant_transaction_id: rawFilters.merchant_transaction_id,
    currency: rawFilters.currency,
    payment_brand: rawFilters.payment_brand,
    query: rawFilters.query
  };
  const result = await fetchAllTransactionPages(pat, filters, PDF_ROW_CAP);
  if (!result.ok) {
    const status = result.status === 401 ? 401 : result.status === 403 ? 403 : 500;
    throw data({
      message: result.message
    }, {
      status
    });
  }
  const pdfBuffer = await generateTransactionListPdf(result.rows, filters, {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    merchantName: user.merchantName
  }, result.capped, result.metaTotal, result.oldestDate, result.newestDate);
  const filename = makeFilename(user.merchantName, "dlt-transactions");
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private"
    }
  });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const Tabs = TabsPrimitive.Root;
function TabsList({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.List,
    {
      className: cn("flex gap-1 border-b border-line", className),
      ...props
    }
  );
}
function TabsTrigger({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Trigger,
    {
      className: cn(
        "-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-3 transition-colors",
        "hover:border-line-strong hover:text-ink-2",
        "data-[state=active]:border-primary data-[state=active]:text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className
      ),
      ...props
    }
  );
}
function TabsContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Content,
    {
      className: cn("pt-5 focus-visible:outline-none", className),
      ...props
    }
  );
}
const meta$3 = ({
  loaderData
}) => [{
  title: loaderData?.transaction ? `Transaction ${loaderData.transaction.merchant_transaction_id} | DLT Portal` : "Transaction | DLT Portal"
}];
const DEFAULT_TZ = "Asia/Manila";
const COVERAGE_VARIANT = {
  captured: "success",
  not_captured: "neutral",
  purged: "danger"
};
const CAPTURE_STATUS_LABELS = {
  merchant_request: "Merchant Request",
  dlt_response: "DLT Response",
  merchant_webhook_request: "Webhook Notification",
  merchant_webhook_response: "Webhook Response"
};
const DIRECTION_LABELS = {
  merchant_to_dlt: "Merchant → DLT",
  dlt_to_merchant: "DLT → Merchant"
};
async function loader$6({
  request,
  params
}) {
  const {
    pat
  } = await requireUser(request);
  const rawId = params.id;
  const id = rawId ? parseInt(rawId, 10) : NaN;
  if (!rawId || isNaN(id)) {
    throw data({
      message: "Invalid transaction ID"
    }, {
      status: 400
    });
  }
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "summary";
  const tz = url.searchParams.get("timezone") || DEFAULT_TZ;
  const historyPage = Math.max(1, parseInt(url.searchParams.get("history_page") ?? "1", 10) || 1);
  const txResult = await getTransaction(pat, id);
  if (!txResult.ok) {
    const status = txResult.error.status === 404 ? 404 : 500;
    throw data({
      message: txResult.error.status === 404 ? "Not found" : txResult.error.message
    }, {
      status
    });
  }
  const tx = txResult.data;
  let history = null;
  let historyError = null;
  if (tab === "history" && tx.history_available) {
    const histResult = await listTransactionHistory(pat, id, historyPage, 25);
    if (histResult.ok) {
      history = histResult.data;
    } else {
      historyError = histResult.error.message;
    }
  }
  return {
    transaction: tx,
    history,
    historyError,
    tab,
    tz,
    historyPage
  };
}
function Field({
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsx("dt", {
      className: "text-xs font-medium uppercase tracking-wider text-ink-3",
      children: label
    }), /* @__PURE__ */ jsx("dd", {
      className: "mt-1 text-sm text-ink",
      children: value ?? "—"
    })]
  });
}
function PayloadViewer({
  payload
}) {
  const [open, setOpen] = useState(false);
  return /* @__PURE__ */ jsxs("div", {
    className: "mt-2",
    children: [/* @__PURE__ */ jsxs("button", {
      onClick: () => setOpen(!open),
      "aria-expanded": open,
      className: "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
      children: [/* @__PURE__ */ jsx(FileJson, {
        className: "size-3.5",
        "aria-hidden": true
      }), open ? "Hide" : "View", " payload", open ? /* @__PURE__ */ jsx(ChevronUp, {
        className: "size-3",
        "aria-hidden": true
      }) : /* @__PURE__ */ jsx(ChevronDown, {
        className: "size-3",
        "aria-hidden": true
      })]
    }), open && /* @__PURE__ */ jsx("pre", {
      className: "mt-2 max-h-64 overflow-auto rounded-lg bg-sidebar p-3 text-xs text-sidebar-ink",
      children: JSON.stringify(payload, null, 2)
    })]
  });
}
function HistoryEventRow({
  item,
  tz
}) {
  return /* @__PURE__ */ jsxs("div", {
    className: "px-5 py-4",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex flex-wrap items-start justify-between gap-2",
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsx("p", {
          className: "text-sm font-medium text-ink",
          children: CAPTURE_STATUS_LABELS[item.event_type] ?? item.event_type
        }), /* @__PURE__ */ jsxs("p", {
          className: "text-xs text-ink-3",
          children: [DIRECTION_LABELS[item.direction] ?? item.direction, item.attempt_number != null && ` · Attempt #${item.attempt_number}`]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "text-right",
        children: [/* @__PURE__ */ jsx("p", {
          className: "text-xs text-ink-3",
          children: formatTimestamp(item.captured_at, tz, "long")
        }), item.http_status != null && /* @__PURE__ */ jsxs("span", {
          className: cn("font-mono text-xs", item.http_status < 400 ? "text-success-ink" : "text-danger-ink"),
          children: ["HTTP ", item.http_status]
        })]
      })]
    }), item.delivery && /* @__PURE__ */ jsxs("div", {
      className: "mt-1 flex flex-wrap gap-x-4 text-xs text-ink-3",
      children: [/* @__PURE__ */ jsxs("span", {
        children: ["Delivery: ", item.delivery.state]
      }), item.delivery.duration_ms != null && /* @__PURE__ */ jsxs("span", {
        children: [item.delivery.duration_ms, "ms"]
      }), item.delivery.body_capture_status && /* @__PURE__ */ jsxs("span", {
        children: ["Body: ", item.delivery.body_capture_status]
      })]
    }), item.response && /* @__PURE__ */ jsxs("div", {
      className: "mt-1 flex flex-wrap gap-x-4 text-xs text-ink-3",
      children: [item.response.is_repeated_request != null && /* @__PURE__ */ jsxs("span", {
        children: ["Repeated request: ", item.response.is_repeated_request ? "yes" : "no"]
      }), item.response.capture_stage && /* @__PURE__ */ jsxs("span", {
        children: ["Stage: ", item.response.capture_stage]
      }), item.response.body_capture_status && /* @__PURE__ */ jsxs("span", {
        children: ["Body: ", item.response.body_capture_status]
      })]
    }), /* @__PURE__ */ jsxs("p", {
      className: "mt-1 text-xs",
      children: [/* @__PURE__ */ jsx("span", {
        className: "text-ink-3",
        children: "Capture: "
      }), /* @__PURE__ */ jsx("span", {
        className: cn(item.capture_status === "available" ? "text-success-ink" : item.capture_status === "purged" ? "text-danger-ink" : "text-ink-3"),
        children: item.capture_status
      })]
    }), item.capture_status === "available" && item.payload != null && /* @__PURE__ */ jsx(PayloadViewer, {
      payload: item.payload
    }), item.omissions.length > 0 && /* @__PURE__ */ jsxs("div", {
      className: "mt-2 text-xs text-ink-3",
      children: [/* @__PURE__ */ jsx("p", {
        className: "font-medium",
        children: "Some fields are intentionally not shown:"
      }), /* @__PURE__ */ jsx("ul", {
        className: "mt-0.5 list-disc pl-4",
        children: item.omissions.map((om, i) => /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("span", {
            className: "font-mono",
            children: om.field_path
          }), " — ", om.reason_code]
        }, i))
      })]
    })]
  });
}
const app_transactions_$id = UNSAFE_withComponentProps(function TransactionDetailPage() {
  const {
    transaction: tx,
    history,
    historyError,
    tz
  } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "summary";
  const historyPage = Math.max(1, parseInt(searchParams.get("history_page") ?? "1", 10) || 1);
  function switchTab(t) {
    setSearchParams((prev) => {
      prev.set("tab", t);
      if (t !== "history") prev.delete("history_page");
      return prev;
    });
  }
  function setHistoryPage(page) {
    setSearchParams((prev) => {
      prev.set("history_page", String(page));
      return prev;
    });
  }
  function handlePdfExport() {
    const params = new URLSearchParams();
    params.set("timezone", tz);
    window.location.href = `/transactions/${tx.id}/pdf?${params.toString()}`;
  }
  if (!tx) {
    return /* @__PURE__ */ jsx(EmptyState, {
      icon: AlertCircle,
      title: "Transaction not found",
      action: /* @__PURE__ */ jsx(Link, {
        to: "/transactions",
        className: "text-sm font-medium text-primary hover:underline",
        children: "Back to transactions"
      })
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "space-y-6",
    children: [/* @__PURE__ */ jsxs(Link, {
      to: "/transactions",
      className: "inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink",
      children: [/* @__PURE__ */ jsx(ArrowLeft, {
        className: "size-4",
        "aria-hidden": true
      }), "Back to transactions"]
    }), /* @__PURE__ */ jsxs("div", {
      className: "flex flex-wrap items-start justify-between gap-3",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "min-w-0",
        children: [/* @__PURE__ */ jsx("h1", {
          className: "tnum font-mono text-xl font-semibold text-ink",
          children: tx.merchant_transaction_id
        }), /* @__PURE__ */ jsxs("p", {
          className: "mt-0.5 text-xs text-ink-3",
          children: ["Internal ID: ", tx.id]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-3",
        children: [/* @__PURE__ */ jsxs(Button, {
          variant: "secondary",
          size: "sm",
          onClick: handlePdfExport,
          children: [/* @__PURE__ */ jsx(Download, {
            className: "size-4",
            "aria-hidden": true
          }), "Export PDF"]
        }), /* @__PURE__ */ jsx(StatusPill, {
          status: tx.status
        })]
      })]
    }), /* @__PURE__ */ jsxs(Tabs, {
      value: tab,
      onValueChange: switchTab,
      children: [/* @__PURE__ */ jsxs(TabsList, {
        children: [/* @__PURE__ */ jsx(TabsTrigger, {
          value: "summary",
          children: "Summary"
        }), /* @__PURE__ */ jsxs(TabsTrigger, {
          value: "history",
          children: ["History", !tx.history_available && /* @__PURE__ */ jsx("span", {
            className: "text-xs font-normal text-ink-3",
            children: "(unavailable)"
          })]
        })]
      }), /* @__PURE__ */ jsx(TabsContent, {
        value: "summary",
        children: /* @__PURE__ */ jsx(Card, {
          className: "p-6",
          children: /* @__PURE__ */ jsxs("dl", {
            className: "grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3",
            children: [/* @__PURE__ */ jsx(Field, {
              label: "Amount",
              value: /* @__PURE__ */ jsx("span", {
                className: "tnum",
                children: tx.amount !== null && tx.currency ? formatMoney(tx.amount, tx.currency) : "—"
              })
            }), /* @__PURE__ */ jsx(Field, {
              label: "Currency",
              value: tx.currency ?? "—"
            }), /* @__PURE__ */ jsx(Field, {
              label: "Status",
              value: tx.status
            }), /* @__PURE__ */ jsx(Field, {
              label: "Payment Brand",
              value: tx.payment_brand ?? "—"
            }), /* @__PURE__ */ jsx(Field, {
              label: "Payment Method",
              value: tx.payment_method ?? "—"
            }), /* @__PURE__ */ jsx(Field, {
              label: "Merchant Reference",
              value: /* @__PURE__ */ jsx("span", {
                className: "font-mono text-xs",
                children: tx.merchant_transaction_id
              })
            }), /* @__PURE__ */ jsx(Field, {
              label: "Internal ID",
              value: String(tx.id)
            }), /* @__PURE__ */ jsx(Field, {
              label: "Created",
              value: formatTimestamp(tx.created_at, tz, "long")
            }), /* @__PURE__ */ jsx(Field, {
              label: "Updated",
              value: formatTimestamp(tx.updated_at, tz, "long")
            }), /* @__PURE__ */ jsx(Field, {
              label: "History",
              value: tx.history_available ? "Available" : "Not available"
            })]
          })
        })
      }), /* @__PURE__ */ jsx(TabsContent, {
        value: "history",
        children: !tx.history_available ? /* @__PURE__ */ jsx(Card, {
          className: "p-8",
          children: /* @__PURE__ */ jsx(EmptyState, {
            compact: true,
            icon: Clock,
            title: "History is not available for this transaction",
            description: 'Coverage is currently limited to supported payment flows. Absence of history means "not captured", not "nothing happened".'
          })
        }) : historyError ? /* @__PURE__ */ jsxs(Callout, {
          variant: "danger",
          role: "alert",
          children: ["Failed to load history: ", historyError]
        }) : history ? /* @__PURE__ */ jsxs("div", {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxs(Card, {
            className: "p-4",
            children: [/* @__PURE__ */ jsx("p", {
              className: "mb-3 text-xs font-medium uppercase tracking-wider text-ink-3",
              children: "Coverage"
            }), /* @__PURE__ */ jsx("div", {
              className: "flex flex-wrap gap-x-4 gap-y-2",
              children: Object.entries(history.meta.coverage).map(([kind, status]) => {
                const statusStr = String(status);
                const variant = COVERAGE_VARIANT[statusStr] ?? "neutral";
                return /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center gap-1.5",
                  children: [/* @__PURE__ */ jsxs("span", {
                    className: "text-xs capitalize text-ink-3",
                    children: [kind.replace(/_/g, " "), ":"]
                  }), /* @__PURE__ */ jsx(Badge, {
                    variant,
                    children: statusStr
                  })]
                }, kind);
              })
            })]
          }), /* @__PURE__ */ jsxs(Card, {
            children: [/* @__PURE__ */ jsx(CardHeader, {
              title: `Event Timeline (${history.data.length})`,
              description: 'Payloads are sanitized, allowlisted projections — not raw traffic captures. "Queued" or "prepared for return" does not prove merchant receipt or payment success.'
            }), /* @__PURE__ */ jsx("div", {
              className: "divide-y divide-line",
              children: history.data.map((item) => /* @__PURE__ */ jsx(HistoryEventRow, {
                item,
                tz
              }, item.id))
            }), history.data.length > 0 && (history.data[0]?.retain_until || history.data[0]?.purged_at) && /* @__PURE__ */ jsxs("div", {
              className: "border-t border-line bg-surface-2/50 px-5 py-3 text-xs text-ink-3",
              children: [/* @__PURE__ */ jsx(Clock, {
                className: "mr-1 inline size-3",
                "aria-hidden": true
              }), history.data[0]?.retain_until && `Retained until: ${formatTimestamp(history.data[0].retain_until, tz)}`, history.data[0]?.purged_at && ` · Purged: ${formatTimestamp(history.data[0].purged_at, tz)}`]
            })]
          }), history.meta.last_page > 1 && /* @__PURE__ */ jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxs("p", {
              className: "text-xs text-ink-3",
              children: ["Page ", history.meta.current_page, " of ", history.meta.last_page, " · ", history.meta.total, " total events"]
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex gap-2",
              children: [/* @__PURE__ */ jsx(Button, {
                variant: "secondary",
                size: "sm",
                disabled: historyPage <= 1,
                onClick: () => setHistoryPage(historyPage - 1),
                children: "Previous"
              }), /* @__PURE__ */ jsx(Button, {
                variant: "secondary",
                size: "sm",
                disabled: historyPage >= history.meta.last_page,
                onClick: () => setHistoryPage(historyPage + 1),
                children: "Next"
              })]
            })]
          })]
        }) : /* @__PURE__ */ jsx("p", {
          className: "text-sm text-ink-3",
          children: "Loading history…"
        })
      })]
    })]
  });
});
const ErrorBoundary3 = UNSAFE_withErrorBoundaryProps(function ErrorBoundary4() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    if (error.status === 404 || error.status === 400) {
      return /* @__PURE__ */ jsx(ErrorPage, {
        tone: "default",
        icon: AlertCircle,
        title: "Transaction not available",
        description: "This transaction may have been removed, or you may not have access to it.",
        primaryAction: {
          label: "Back to transactions",
          to: "/transactions"
        }
      });
    }
    return /* @__PURE__ */ jsx(ServerError, {});
  }
  return /* @__PURE__ */ jsx(ServerError, {});
});
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary3,
  default: app_transactions_$id,
  loader: loader$6,
  meta: meta$3
}, Symbol.toStringTag, { value: "Module" }));
async function loader$5({
  request,
  params
}) {
  const {
    pat,
    user
  } = await requireUser(request);
  const rawId = params.id;
  const id = rawId ? parseInt(rawId, 10) : NaN;
  if (!rawId || isNaN(id)) {
    throw data({
      message: "Invalid transaction ID"
    }, {
      status: 400
    });
  }
  const txResult = await getTransaction(pat, id);
  if (!txResult.ok) {
    const status = txResult.error.status === 404 ? 404 : 500;
    throw data({
      message: txResult.error.status === 404 ? "Transaction not found" : txResult.error.message
    }, {
      status
    });
  }
  const tx = txResult.data;
  let history = null;
  {
    const allItems = [];
    let page = 1;
    let lastPage = 1;
    let coverage = null;
    do {
      const histResult = await listTransactionHistory(pat, id, page, 100);
      if (!histResult.ok) {
        allItems.length = 0;
        coverage = null;
        break;
      }
      allItems.push(...histResult.data.data);
      lastPage = histResult.data.meta.last_page;
      coverage = histResult.data.meta.coverage;
      page++;
    } while (page <= lastPage);
    if (coverage !== null) {
      history = {
        data: allItems,
        meta: {
          current_page: 1,
          per_page: allItems.length,
          total: allItems.length,
          last_page: 1,
          coverage
        }
      };
    }
  }
  const pdfBuffer = await generateTransactionDetailPdf(tx, history, {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    merchantName: user.merchantName
  });
  const filename = makeFilename(user.merchantName, `dlt-transaction-${rawId}`);
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private"
    }
  });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
async function getProfile(pat) {
  const result = await dltGet("/api/v1/portal/me", pat);
  if (!result.ok) return result;
  const parsed = userProfileSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid profile response" } };
  }
  return { ok: true, data: parsed.data };
}
async function patchProfile(pat, fields) {
  const result = await dltMutate({
    method: "PATCH",
    path: "/api/v1/portal/me",
    bearer: pat,
    body: fields
  });
  if (!result.ok) return result;
  const parsed = userProfileSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: "Invalid profile response" } };
  }
  return { ok: true, data: parsed.data };
}
const otpResponseSchema = z.object({ message: z.string().optional() });
async function verifyEmailOtp(pat, otp) {
  const result = await dltMutate({
    method: "POST",
    path: "/api/v1/portal/me/email/verify",
    bearer: pat,
    body: { otp }
  });
  if (!result.ok) return result;
  const parsed = otpResponseSchema.safeParse(result.data ?? {});
  return { ok: true, data: parsed.success ? parsed.data : {} };
}
async function resendEmailOtp(pat) {
  const result = await dltMutate({
    method: "POST",
    path: "/api/v1/portal/me/email/resend",
    bearer: pat,
    body: {}
  });
  if (!result.ok) return result;
  const parsed = otpResponseSchema.safeParse(result.data ?? {});
  return { ok: true, data: parsed.success ? parsed.data : {} };
}
async function changePassword(pat, body) {
  const result = await dltMutate({
    method: "PUT",
    path: "/api/v1/portal/me/password",
    bearer: pat,
    body
  });
  if (!result.ok) return result;
  const parsed = z.object({ reauthentication_required: z.boolean().optional() }).safeParse(result.data ?? {});
  return { ok: true, data: parsed.success ? parsed.data : {} };
}
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  loading,
  onConfirm
}) {
  const Icon = danger ? ShieldAlert : AlertTriangle;
  return /* @__PURE__ */ jsx(AlertDialog.Root, { open, onOpenChange, children: /* @__PURE__ */ jsxs(AlertDialog.Portal, { children: [
    /* @__PURE__ */ jsx(AlertDialog.Overlay, { className: "fixed inset-0 z-50 bg-black/50" }),
    /* @__PURE__ */ jsxs(AlertDialog.Content, { className: "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface p-5 shadow-card focus:outline-none", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            className: danger ? "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-subtle text-danger-ink" : "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning-ink",
            children: /* @__PURE__ */ jsx(Icon, { className: "size-4.5", "aria-hidden": true })
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx(AlertDialog.Title, { className: "text-base font-semibold text-ink", children: title }),
          /* @__PURE__ */ jsx(AlertDialog.Description, { className: "mt-1 text-sm text-ink-2", children: message })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx(AlertDialog.Cancel, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "secondary", size: "sm", className: "h-9 px-4 text-sm", children: cancelLabel }) }),
        /* @__PURE__ */ jsx(AlertDialog.Action, { asChild: true, children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: danger ? "danger" : "primary",
            size: "sm",
            className: "h-9 px-4 text-sm",
            loading,
            onClick: onConfirm,
            children: confirmLabel
          }
        ) })
      ] })
    ] })
  ] }) });
}
function useDirtyGuard() {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    setConfirmOpen(blocker.state === "blocked");
  }, [blocker.state]);
  const track = useCallback((form) => {
    if (!form) return;
    const fd = new FormData(form);
    const initial = form.dataset.initial;
    const current = JSON.stringify(
      [...fd.entries()].filter(([k]) => !k.startsWith("csrf") && k !== "intent").sort(([a], [b]) => a.localeCompare(b))
    );
    if (initial === void 0) {
      form.dataset.initial = current;
      setDirty(false);
      return;
    }
    setDirty(current !== initial);
  }, []);
  const resetDirty = useCallback(() => setDirty(false), []);
  const confirmLeave = useCallback(() => {
    blocker.proceed?.();
  }, [blocker]);
  const cancelLeave = useCallback(() => {
    blocker.reset?.();
    setConfirmOpen(false);
  }, [blocker]);
  return { dirty, track, resetDirty, confirmOpen, confirmLeave, cancelLeave, setConfirmOpen };
}
const meta$2 = () => [{
  title: "Profile | DLT Portal"
}];
async function loader$4({
  request
}) {
  const {
    pat,
    user,
    csrfSecret,
    csrfSetCookie
  } = await requireUser(request);
  const profileResult = await getProfile(pat);
  const headers2 = csrfSetCookie ? {
    "Set-Cookie": csrfSetCookie
  } : {};
  return data({
    profile: profileResult.ok ? profileResult.data : null,
    profileError: profileResult.ok ? null : profileResult.error.message,
    csrfToken: csrfSecret,
    user
  }, {
    headers: headers2
  });
}
async function action$3({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  const {
    pat,
    csrfSecret
  } = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const token = form.get("csrf_token");
  if (!validateCsrfToken(token, csrfSecret)) {
    return {
      ok: false,
      error: "Invalid request. Please try again.",
      fieldErrors: null,
      intent
    };
  }
  if (intent === "update_profile") {
    const current = await getProfile(pat);
    const currentProfile = current.ok ? current.data : null;
    const fields = {};
    const firstName = form.get("first_name");
    const lastName = form.get("last_name");
    const email = form.get("email");
    if (firstName && firstName !== currentProfile?.first_name) fields.first_name = firstName;
    if (lastName && lastName !== currentProfile?.last_name) fields.last_name = lastName;
    if (email && email !== currentProfile?.email) fields.email = email;
    if (Object.keys(fields).length === 0) {
      return {
        ok: true,
        message: "No changes to save.",
        profile: currentProfile,
        fieldErrors: null,
        intent
      };
    }
    const result = await patchProfile(pat, fields);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        profile: null,
        intent
      };
    }
    return {
      ok: true,
      message: "Profile updated.",
      profile: result.data,
      fieldErrors: null,
      intent
    };
  }
  if (intent === "verify_otp") {
    const otp = form.get("otp");
    const result = await verifyEmailOtp(pat, otp);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: null,
        intent
      };
    }
    return {
      ok: true,
      message: "Email verified successfully.",
      fieldErrors: null,
      intent
    };
  }
  if (intent === "resend_otp") {
    const result = await resendEmailOtp(pat);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: null,
        intent
      };
    }
    return {
      ok: true,
      message: "Verification code resent.",
      fieldErrors: null,
      intent
    };
  }
  if (intent === "change_password") {
    const current_password = form.get("current_password");
    const password = form.get("password");
    const password_confirmation = form.get("password_confirmation");
    if (password !== password_confirmation) {
      return {
        ok: false,
        error: null,
        fieldErrors: {
          password_confirmation: ["Passwords do not match"]
        },
        intent
      };
    }
    const result = await changePassword(pat, {
      current_password,
      password,
      password_confirmation
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        intent
      };
    }
    return redirect("/login?reason=password_changed", {
      headers: {
        "Set-Cookie": await destroySession(session)
      }
    });
  }
  return {
    ok: false,
    error: "Unknown action.",
    fieldErrors: null,
    intent
  };
}
const app_settings_profile = UNSAFE_withComponentProps(function ProfilePage() {
  const {
    profile,
    profileError,
    csrfToken
  } = useLoaderData();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const toast = useToast();
  const profileFormRef = useRef(null);
  const passwordFormRef = useRef(null);
  const {
    dirty,
    track,
    resetDirty,
    confirmOpen,
    confirmLeave,
    cancelLeave
  } = useDirtyGuard();
  const actionData = fetcher.data;
  const isSubmitting = fetcher.state === "submitting";
  const activeIntent = fetcher.formData?.get("intent");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [emailVerificationBanner, setEmailVerificationBanner] = useState(null);
  useEffect(() => {
    track(profileFormRef.current);
  }, [track]);
  useEffect(() => {
    const emailVerification = searchParams.get("email_verification");
    if (emailVerification) {
      setEmailVerificationBanner(emailVerification);
      setSearchParams((prev) => {
        prev.delete("email_verification");
        return prev;
      }, {
        replace: true
      });
      if (emailVerification === "verified") {
        revalidator.revalidate();
      }
    }
  }, [searchParams, setSearchParams, revalidator]);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok === true && (fetcher.data.intent === "verify_otp" || fetcher.data.intent === "resend_otp")) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);
  useEffect(() => {
    if (fetcher.state === "idle" && actionData?.ok && actionData.intent === "update_profile") {
      toast.success(actionData.message ?? "Profile updated.");
      resetDirty();
      if (profileFormRef.current) {
        delete profileFormRef.current.dataset.initial;
        track(profileFormRef.current);
      }
    }
  }, [fetcher.state, actionData]);
  useEffect(() => {
    if (fetcher.state === "idle" && actionData?.intent === "change_password") {
      passwordFormRef.current?.reset();
      setNewPassword("");
      setConfirmation("");
    }
  }, [fetcher.state, actionData]);
  return /* @__PURE__ */ jsxs("div", {
    className: "w-full max-w-[1200px] space-y-6",
    children: [/* @__PURE__ */ jsx(PageHeader, {
      title: "Profile",
      description: "Your personal details and account security."
    }), emailVerificationBanner && /* @__PURE__ */ jsx(Callout, {
      variant: emailVerificationBanner === "verified" ? "success" : "danger",
      role: emailVerificationBanner === "verified" ? void 0 : "alert",
      children: emailVerificationBanner === "verified" ? "Email verified successfully." : "Email verification link is invalid or expired."
    }), profileError && /* @__PURE__ */ jsxs(Callout, {
      variant: "danger",
      role: "alert",
      children: ["Could not load profile: ", profileError]
    }), actionData && !actionData.ok && actionData.intent !== "change_password" && /* @__PURE__ */ jsx(Callout, {
      variant: "danger",
      role: "alert",
      children: actionData.error
    }), /* @__PURE__ */ jsxs("div", {
      className: "grid grid-cols-1 items-start gap-6 lg:grid-cols-2",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "space-y-6",
        children: [/* @__PURE__ */ jsxs(Card, {
          className: "p-6",
          children: [/* @__PURE__ */ jsx("h2", {
            className: "text-ink mb-5 text-base font-semibold",
            children: "Personal information"
          }), /* @__PURE__ */ jsxs(fetcher.Form, {
            method: "post",
            className: "space-y-4",
            ref: profileFormRef,
            onChange: (e) => track(e.currentTarget),
            children: [/* @__PURE__ */ jsx("input", {
              type: "hidden",
              name: "csrf_token",
              value: csrfToken
            }), /* @__PURE__ */ jsx("input", {
              type: "hidden",
              name: "intent",
              value: "update_profile"
            }), /* @__PURE__ */ jsxs("div", {
              className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
              children: [/* @__PURE__ */ jsx(FormField, {
                label: "First name",
                name: "first_name",
                required: true,
                error: actionData?.intent === "update_profile" ? actionData?.fieldErrors?.first_name?.[0] : void 0,
                children: /* @__PURE__ */ jsx(Input, {
                  defaultValue: profile?.first_name,
                  required: true,
                  autoComplete: "given-name"
                })
              }), /* @__PURE__ */ jsx(FormField, {
                label: "Last name",
                name: "last_name",
                required: true,
                error: actionData?.intent === "update_profile" ? actionData?.fieldErrors?.last_name?.[0] : void 0,
                children: /* @__PURE__ */ jsx(Input, {
                  defaultValue: profile?.last_name,
                  required: true,
                  autoComplete: "family-name"
                })
              })]
            }), /* @__PURE__ */ jsx(FormField, {
              label: "Email address",
              name: "email",
              required: true,
              error: actionData?.intent === "update_profile" ? actionData?.fieldErrors?.email?.[0] : void 0,
              hint: "Changing your email triggers a verification step.",
              children: /* @__PURE__ */ jsx(Input, {
                type: "email",
                defaultValue: profile?.email,
                required: true,
                autoComplete: "email"
              })
            }), /* @__PURE__ */ jsxs("div", {
              className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
              children: [/* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Username",
                value: profile?.username
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Role",
                value: profile?.role
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Merchant",
                value: profile?.merchant.name
              })]
            }), /* @__PURE__ */ jsx("div", {
              className: "flex justify-end pt-2",
              children: /* @__PURE__ */ jsx(Button, {
                type: "submit",
                loading: isSubmitting && activeIntent === "update_profile",
                disabled: !dirty,
                children: "Save changes"
              })
            })]
          })]
        }), profile?.pending_email && /* @__PURE__ */ jsx(Callout, {
          variant: "warning",
          className: "items-start",
          children: /* @__PURE__ */ jsxs("div", {
            className: "flex items-start gap-3",
            children: [/* @__PURE__ */ jsx(Mail, {
              className: "mt-0.5 size-5 shrink-0",
              "aria-hidden": true
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex-1",
              children: [/* @__PURE__ */ jsx("p", {
                className: "text-sm font-medium",
                children: "Email change pending verification"
              }), /* @__PURE__ */ jsxs("p", {
                className: "mt-1 text-xs",
                children: ["We sent a verification code to ", /* @__PURE__ */ jsx("strong", {
                  children: profile.pending_email
                }), ".", profile.pending_email_expires_at && /* @__PURE__ */ jsxs(Fragment, {
                  children: [" ", "Expires at", " ", new Date(profile.pending_email_expires_at).toLocaleTimeString("en-PH"), "."]
                })]
              }), /* @__PURE__ */ jsxs(fetcher.Form, {
                method: "post",
                className: "mt-3 flex items-end gap-2",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "csrf_token",
                  value: csrfToken
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "intent",
                  value: "verify_otp"
                }), /* @__PURE__ */ jsx(FormField, {
                  label: "6-digit code",
                  name: "otp",
                  error: actionData?.intent === "verify_otp" && !actionData.ok ? actionData.error ?? void 0 : void 0,
                  children: /* @__PURE__ */ jsx(Input, {
                    type: "text",
                    inputMode: "numeric",
                    pattern: "[0-9]{6}",
                    maxLength: 6,
                    placeholder: "000000",
                    className: "w-28 font-mono"
                  })
                }), /* @__PURE__ */ jsx(Button, {
                  type: "submit",
                  variant: "secondary",
                  loading: isSubmitting && activeIntent === "verify_otp",
                  children: "Verify"
                })]
              }), /* @__PURE__ */ jsxs(fetcher.Form, {
                method: "post",
                className: "mt-2",
                children: [/* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "csrf_token",
                  value: csrfToken
                }), /* @__PURE__ */ jsx("input", {
                  type: "hidden",
                  name: "intent",
                  value: "resend_otp"
                }), /* @__PURE__ */ jsx("button", {
                  type: "submit",
                  disabled: isSubmitting,
                  className: "text-xs font-medium underline disabled:opacity-60",
                  children: "Resend code"
                })]
              })]
            })]
          })
        })]
      }), /* @__PURE__ */ jsxs(Card, {
        className: "p-6",
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-ink text-base font-semibold",
          children: "Change password"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-ink-3 mt-1 mb-5 text-xs",
          children: "12–128 characters with uppercase, lowercase, number, and symbol."
        }), actionData && !actionData.ok && actionData.intent === "change_password" && /* @__PURE__ */ jsx(Callout, {
          variant: "danger",
          role: "alert",
          className: "mb-4",
          children: actionData.error ?? "An error occurred. Please try again."
        }), /* @__PURE__ */ jsxs(fetcher.Form, {
          method: "post",
          ref: passwordFormRef,
          className: "space-y-4",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "csrf_token",
            value: csrfToken
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: "change_password"
          }), /* @__PURE__ */ jsx(FormField, {
            label: "Current password",
            name: "current_password",
            required: true,
            error: actionData?.intent === "change_password" ? actionData?.fieldErrors?.current_password?.[0] : void 0,
            children: /* @__PURE__ */ jsx(PasswordInput, {
              autoComplete: "current-password",
              required: true
            })
          }), /* @__PURE__ */ jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsx(FormField, {
              label: "New password",
              name: "password",
              required: true,
              error: actionData?.intent === "change_password" ? actionData?.fieldErrors?.password?.[0] : void 0,
              children: /* @__PURE__ */ jsx(PasswordInput, {
                autoComplete: "new-password",
                required: true,
                onChange: (e) => setNewPassword(e.target.value)
              })
            }), /* @__PURE__ */ jsx(PasswordStrengthMeter, {
              password: newPassword
            }), /* @__PURE__ */ jsx(PasswordRules, {
              password: newPassword
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsx(FormField, {
              label: "Confirm new password",
              name: "password_confirmation",
              required: true,
              error: actionData?.intent === "change_password" ? actionData?.fieldErrors?.password_confirmation?.[0] : void 0,
              children: /* @__PURE__ */ jsx(PasswordInput, {
                autoComplete: "new-password",
                required: true,
                onChange: (e) => setConfirmation(e.target.value)
              })
            }), /* @__PURE__ */ jsx(PasswordMatchHint, {
              password: newPassword,
              confirmation
            })]
          }), /* @__PURE__ */ jsx(Callout, {
            variant: "info",
            children: "After a successful password change you will be signed out and asked to sign in with your new password."
          }), /* @__PURE__ */ jsx("div", {
            className: "flex justify-end pt-1",
            children: /* @__PURE__ */ jsx(Button, {
              type: "submit",
              loading: isSubmitting && activeIntent === "change_password",
              children: "Change password"
            })
          })]
        })]
      })]
    }), /* @__PURE__ */ jsx(ConfirmDialog, {
      open: confirmOpen,
      onOpenChange: (open) => {
        if (!open) cancelLeave();
      },
      title: "Discard unsaved changes?",
      message: "You have unsaved changes on this page. Leaving now will discard them.",
      confirmLabel: "Discard changes",
      danger: true,
      onConfirm: confirmLeave
    })]
  });
});
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: app_settings_profile,
  loader: loader$4,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
const COUNTRIES = [
  { iso: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { iso: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { iso: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { iso: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { iso: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" }
];
function normalizeDial(dial) {
  if (!dial) return "+63";
  return dial.startsWith("+") ? dial : `+${dial}`;
}
function PhoneInput({
  name = "phone",
  dialName = "dial_code",
  defaultDial,
  defaultPhone,
  disabled,
  onChange
}) {
  const initial = normalizeDial(defaultDial);
  const known = COUNTRIES.some((c) => c.dial === initial);
  const [dial, setDial] = React.useState(known ? initial : "+63");
  const [customDial, setCustomDial] = React.useState(known ? "" : initial);
  const [phone, setPhone] = React.useState(defaultPhone ?? "");
  const effectiveDial = customDial || dial;
  return /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative w-[132px] shrink-0", children: [
      /* @__PURE__ */ jsxs(
        "select",
        {
          "aria-label": "Country dial code",
          disabled,
          value: customDial ? "custom" : dial,
          onChange: (e) => {
            if (e.target.value === "custom") {
              setCustomDial("+");
            } else {
              setCustomDial("");
              setDial(e.target.value);
            }
            onChange?.();
          },
          className: cn(controlClass, "h-9 cursor-pointer appearance-none pl-8 pr-7"),
          children: [
            COUNTRIES.map((c) => /* @__PURE__ */ jsxs("option", { value: c.dial, children: [
              c.iso,
              " ",
              c.dial
            ] }, c.iso)),
            /* @__PURE__ */ jsx("option", { value: "custom", children: "Other…" })
          ]
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm", "aria-hidden": true, children: customDial ? "🌐" : COUNTRIES.find((c) => c.dial === dial)?.flag ?? "🌐" }),
      /* @__PURE__ */ jsx(ChevronDown, { className: "pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-ink-3", "aria-hidden": true })
    ] }),
    customDial !== "" && /* @__PURE__ */ jsx(
      "input",
      {
        "aria-label": "Custom dial code",
        value: customDial,
        disabled,
        onChange: (e) => {
          const v = e.target.value.replace(/[^\d+]/g, "");
          setCustomDial(v.startsWith("+") ? v : `+${v}`);
          onChange?.();
        },
        className: cn(controlClass, "h-9 w-20 font-mono"),
        placeholder: "+00",
        maxLength: 8
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        "aria-label": "Phone number",
        type: "tel",
        autoComplete: "tel-national",
        inputMode: "tel",
        disabled,
        value: phone,
        maxLength: 30,
        placeholder: "917 123 4567",
        onChange: (e) => {
          setPhone(e.target.value);
          onChange?.();
        },
        className: cn(controlClass, "h-9 flex-1")
      }
    ),
    /* @__PURE__ */ jsx("input", { type: "hidden", name: dialName, value: effectiveDial }),
    /* @__PURE__ */ jsx("input", { type: "hidden", name, value: phone })
  ] });
}
const meta$1 = () => [{
  title: "Merchant Profile | DLT Portal"
}];
async function loader$3({
  request
}) {
  const {
    pat,
    user,
    csrfSecret,
    csrfSetCookie
  } = await requireUser(request);
  const [merchantResult, logoResult] = await Promise.all([getMerchant(pat), getMerchantLogo(pat)]);
  const headers2 = new Headers();
  if (csrfSetCookie) headers2.append("Set-Cookie", csrfSetCookie);
  if (merchantResult.ok && merchantResult.data.name !== user.merchantName) {
    const session = await getSession(request.headers.get("Cookie"));
    session.set("user", {
      ...user,
      merchantName: merchantResult.data.name
    });
    headers2.append("Set-Cookie", await commitSession(session));
  }
  return data({
    merchant: merchantResult.ok ? merchantResult.data : null,
    merchantError: merchantResult.ok ? null : merchantResult.error.message,
    logoUrl: logoResult.ok ? logoResult.data.url : null,
    csrfToken: csrfSecret,
    isAdmin: user.role === "administrator"
  }, {
    headers: headers2
  });
}
async function action$2({
  request
}) {
  const {
    pat,
    user,
    csrfSecret
  } = await requireUser(request);
  const session = await getSession(request.headers.get("Cookie"));
  const isAdmin = user.role === "administrator";
  const form = await request.formData();
  const intent = form.get("intent");
  const token = form.get("csrf_token");
  if (!validateCsrfToken(token, csrfSecret)) {
    return {
      ok: false,
      error: "Invalid request.",
      fieldErrors: null,
      intent
    };
  }
  if (intent === "update_merchant") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      fieldErrors: null,
      intent
    };
    const currentResult = await getMerchant(pat);
    const current = currentResult.ok ? currentResult.data : null;
    const fields = {};
    const name = form.get("name");
    const contactPerson = form.get("contact_person");
    const email = form.get("email");
    const dialCode = form.get("dial_code");
    const phone = form.get("phone");
    const address = form.get("address");
    const website = form.get("website");
    if (name && name !== current?.name) fields.name = name;
    if (contactPerson !== (current?.contact_person ?? "")) fields.contact_person = contactPerson;
    if (email !== (current?.email ?? "")) fields.email = email;
    const currentDial = current?.dial_code ? current.dial_code.startsWith("+") ? current.dial_code : `+${current.dial_code}` : "";
    if (dialCode !== currentDial) fields.dial_code = dialCode;
    if (phone !== (current?.phone ?? "")) fields.phone = phone;
    if (address !== (current?.address ?? "")) fields.address = address;
    if (website !== (current?.website ?? "")) fields.website = website || null;
    if (Object.keys(fields).length === 0) {
      if (current && current.name !== user.merchantName) {
        session.set("user", {
          ...user,
          merchantName: current.name
        });
        return data({
          ok: true,
          message: "No changes to save.",
          intent
        }, {
          headers: {
            "Set-Cookie": await commitSession(session)
          }
        });
      }
      return {
        ok: true,
        message: "No changes to save.",
        intent
      };
    }
    const result = await patchMerchant(pat, fields);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        intent
      };
    }
    if (result.data.name !== user.merchantName) {
      session.set("user", {
        ...user,
        merchantName: result.data.name
      });
      return data({
        ok: true,
        message: "Merchant profile updated.",
        intent
      }, {
        headers: {
          "Set-Cookie": await commitSession(session)
        }
      });
    }
    return {
      ok: true,
      message: "Merchant profile updated.",
      intent
    };
  }
  if (intent === "upload_logo") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      fieldErrors: null,
      intent
    };
    const file = form.get("file");
    if (!file || file.size === 0) {
      return {
        ok: false,
        error: "Please select a file.",
        fieldErrors: null,
        intent
      };
    }
    if (file.size > 2048 * 1024) {
      return {
        ok: false,
        error: "File too large (max 2 MB).",
        fieldErrors: null,
        intent
      };
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return {
        ok: false,
        error: "Only PNG, JPEG, or WebP images are accepted.",
        fieldErrors: null,
        intent
      };
    }
    const result = await uploadMerchantLogo(pat, file);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: null,
        intent
      };
    }
    return {
      ok: true,
      message: "Logo uploaded.",
      intent
    };
  }
  if (intent === "delete_logo") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      fieldErrors: null,
      intent
    };
    const result = await deleteMerchantLogo(pat);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: null,
        intent
      };
    }
    return {
      ok: true,
      message: "Logo removed.",
      intent
    };
  }
  return {
    ok: false,
    error: "Unknown action.",
    fieldErrors: null,
    intent
  };
}
function LogoUploader({
  logoUrl,
  csrfToken,
  isAdmin
}) {
  const fetcher = useFetcher();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [clientError, setClientError] = useState(null);
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.data;
  useEffect(() => {
    if (fetcher.state === "idle" && actionData?.ok && actionData.intent === "upload_logo") {
      setPreview(null);
    }
  }, [fetcher.state, actionData]);
  function validateAndSubmit(file) {
    setClientError(null);
    if (file.size > 2048 * 1024) {
      setClientError("File too large (max 2 MB).");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setClientError("Only PNG, JPEG, or WebP images are accepted.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.set("csrf_token", csrfToken);
    fd.set("intent", "upload_logo");
    fd.set("file", file);
    fetcher.submit(fd, {
      method: "POST",
      encType: "multipart/form-data"
    });
  }
  const shown = preview ?? logoUrl;
  const error = clientError ?? (actionData && !actionData.ok && (actionData.intent === "upload_logo" || actionData.intent === "delete_logo") ? actionData.error : null);
  return /* @__PURE__ */ jsxs("div", {
    className: "flex flex-col gap-4 sm:flex-row sm:items-start",
    children: [/* @__PURE__ */ jsx("div", {
      onDragOver: (e) => {
        if (!isAdmin) return;
        e.preventDefault();
        setDragOver(true);
      },
      onDragLeave: () => setDragOver(false),
      onDrop: (e) => {
        if (!isAdmin) return;
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) validateAndSubmit(file);
      },
      onClick: () => isAdmin && inputRef.current?.click(),
      onKeyDown: (e) => {
        if (isAdmin && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      },
      role: isAdmin ? "button" : void 0,
      tabIndex: isAdmin ? 0 : void 0,
      "aria-label": isAdmin ? "Upload merchant logo" : "Merchant logo",
      className: cn("flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors", isAdmin && "cursor-pointer", dragOver ? "border-primary bg-primary-subtle" : "border-line bg-surface-2/60"),
      children: isSubmitting && preview ? /* @__PURE__ */ jsx(Loader2, {
        className: "text-ink-3 size-6 animate-spin",
        "aria-hidden": true
      }) : shown ? /* @__PURE__ */ jsx("img", {
        src: shown,
        alt: "Merchant logo",
        className: "h-full w-full object-contain p-2"
      }) : /* @__PURE__ */ jsxs("div", {
        className: "text-ink-3 flex flex-col items-center gap-1.5",
        children: [/* @__PURE__ */ jsx(ImageIcon, {
          className: "size-6",
          "aria-hidden": true
        }), /* @__PURE__ */ jsx("span", {
          className: "px-2 text-center text-[11px]",
          children: isAdmin ? "Drop a logo, or click to browse" : "No logo"
        })]
      })
    }), isAdmin && /* @__PURE__ */ jsxs("div", {
      className: "flex flex-col gap-2",
      children: [/* @__PURE__ */ jsx("input", {
        ref: inputRef,
        type: "file",
        accept: "image/png,image/jpeg,image/webp",
        className: "sr-only",
        "aria-hidden": true,
        tabIndex: -1,
        onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) validateAndSubmit(file);
          e.target.value = "";
        }
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/* @__PURE__ */ jsxs(Button, {
          variant: "secondary",
          size: "sm",
          onClick: () => inputRef.current?.click(),
          loading: isSubmitting && !!preview,
          children: [/* @__PURE__ */ jsx(Upload, {
            "aria-hidden": true
          }), " Upload logo"]
        }), logoUrl && /* @__PURE__ */ jsxs(fetcher.Form, {
          method: "post",
          className: "inline",
          children: [/* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "csrf_token",
            value: csrfToken
          }), /* @__PURE__ */ jsx("input", {
            type: "hidden",
            name: "intent",
            value: "delete_logo"
          }), /* @__PURE__ */ jsxs(Button, {
            variant: "danger-outline",
            size: "sm",
            type: "submit",
            loading: isSubmitting && !preview,
            children: [/* @__PURE__ */ jsx(Trash2, {
              "aria-hidden": true
            }), " Remove"]
          })]
        })]
      }), /* @__PURE__ */ jsx("p", {
        className: "text-ink-3 text-xs",
        children: "PNG, JPEG, or WebP. Max 2 MB."
      }), error && /* @__PURE__ */ jsx("p", {
        className: "text-danger-ink text-xs",
        role: "alert",
        children: error
      })]
    })]
  });
}
function serviceIcon(code, type) {
  const key = `${code} ${type}`.toLowerCase();
  if (key.includes("collect") || key.includes("checkout") || key.includes("payment")) {
    return ArrowDownToLine;
  }
  if (key.includes("payout") || key.includes("disburse") || key.includes("remit")) {
    return ArrowUpFromLine;
  }
  if (key.includes("card")) return CreditCard;
  if (key.includes("wallet")) return Wallet;
  if (key.includes("qr")) return QrCode;
  return Boxes;
}
const app_settings_merchant = UNSAFE_withComponentProps(function MerchantPage() {
  const {
    merchant,
    merchantError,
    logoUrl,
    csrfToken,
    isAdmin
  } = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const formRef = useRef(null);
  const {
    dirty,
    track,
    resetDirty,
    confirmOpen,
    confirmLeave,
    cancelLeave
  } = useDirtyGuard();
  const [websiteError, setWebsiteError] = useState(null);
  const actionData = fetcher.data;
  const isSubmitting = fetcher.state !== "idle";
  useEffect(() => {
    track(formRef.current);
  }, [track]);
  useEffect(() => {
    if (fetcher.state === "idle" && actionData?.ok && actionData.intent === "update_merchant") {
      toast.success(actionData.message ?? "Saved.");
      resetDirty();
      if (formRef.current) {
        delete formRef.current.dataset.initial;
        track(formRef.current);
      }
    }
  }, [fetcher.state, actionData]);
  useEffect(() => {
    if (fetcher.state === "idle" && actionData?.ok && (actionData.intent === "upload_logo" || actionData.intent === "delete_logo")) {
      toast.success(actionData.message ?? "Done.");
    }
  }, [fetcher.state, actionData, toast]);
  useEffect(() => {
    if (fetcher.state === "idle" && actionData && !actionData.ok && (actionData.intent === "upload_logo" || actionData.intent === "delete_logo")) {
      toast.error(actionData.error ?? "Something went wrong.");
    }
  }, [fetcher.state, actionData, toast]);
  function validateWebsite(value) {
    if (!value) {
      setWebsiteError(null);
      return;
    }
    if (!/^https:\/\/.+\..+/.test(value)) {
      setWebsiteError("Must be a full https:// URL (e.g. https://example.com).");
    } else {
      setWebsiteError(null);
    }
  }
  const updateError = actionData && !actionData.ok && actionData.intent === "update_merchant" ? actionData : null;
  return /* @__PURE__ */ jsxs("div", {
    className: "w-full max-w-[1200px] space-y-6",
    children: [/* @__PURE__ */ jsx(PageHeader, {
      title: "Merchant profile",
      description: "Public business details shown on receipts and invoices."
    }), merchantError && /* @__PURE__ */ jsx(Callout, {
      variant: "danger",
      role: "alert",
      children: merchantError
    }), merchant && /* @__PURE__ */ jsx(Fragment, {
      children: /* @__PURE__ */ jsxs("div", {
        className: cn("grid grid-cols-1 items-start gap-6", merchant.services.length > 0 && "lg:grid-cols-2"),
        children: [isAdmin ? /* @__PURE__ */ jsxs("div", {
          className: "space-y-6",
          children: [updateError && /* @__PURE__ */ jsx(Callout, {
            variant: "danger",
            role: "alert",
            children: updateError.error
          }), /* @__PURE__ */ jsxs(Card, {
            children: [/* @__PURE__ */ jsx(CardHeader, {
              title: "Business profile",
              description: "How your business appears in the portal and on customer-facing pages."
            }), /* @__PURE__ */ jsx("div", {
              className: "border-line border-b p-5",
              children: /* @__PURE__ */ jsx(LogoUploader, {
                logoUrl,
                csrfToken,
                isAdmin
              })
            }), /* @__PURE__ */ jsxs(fetcher.Form, {
              id: "merchant-profile-form",
              method: "post",
              className: "contents",
              ref: formRef,
              onChange: (e) => track(e.currentTarget),
              children: [/* @__PURE__ */ jsx("input", {
                type: "hidden",
                name: "csrf_token",
                value: csrfToken
              }), /* @__PURE__ */ jsx("input", {
                type: "hidden",
                name: "intent",
                value: "update_merchant"
              }), /* @__PURE__ */ jsxs("div", {
                className: "space-y-4 p-5",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
                  children: [/* @__PURE__ */ jsx(FormField, {
                    label: "Merchant name",
                    name: "name",
                    required: true,
                    error: updateError?.fieldErrors?.name?.[0],
                    children: /* @__PURE__ */ jsx(Input, {
                      defaultValue: merchant.name,
                      required: true,
                      maxLength: 150
                    })
                  }), /* @__PURE__ */ jsx(FormField, {
                    label: "Currency",
                    name: "currency_display",
                    children: /* @__PURE__ */ jsx(Input, {
                      value: merchant.currency,
                      disabled: true,
                      readOnly: true,
                      "aria-readonly": true
                    })
                  })]
                }), /* @__PURE__ */ jsx(FormField, {
                  label: "Address",
                  name: "address",
                  error: updateError?.fieldErrors?.address?.[0],
                  children: /* @__PURE__ */ jsx(Input, {
                    defaultValue: merchant.address ?? "",
                    maxLength: 500
                  })
                }), /* @__PURE__ */ jsx(FormField, {
                  label: "Website",
                  name: "website",
                  error: websiteError ?? updateError?.fieldErrors?.website?.[0],
                  hint: "Optional. Must start with https://",
                  children: /* @__PURE__ */ jsx(Input, {
                    type: "url",
                    defaultValue: merchant.website ?? "",
                    maxLength: 2048,
                    placeholder: "https://example.com",
                    onChange: (e) => validateWebsite(e.target.value)
                  })
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "border-line space-y-4 border-t p-5",
                children: [/* @__PURE__ */ jsx("h3", {
                  className: "text-ink text-sm font-semibold",
                  children: "Contact"
                }), /* @__PURE__ */ jsxs("div", {
                  className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
                  children: [/* @__PURE__ */ jsx(FormField, {
                    label: "Contact person",
                    name: "contact_person",
                    error: updateError?.fieldErrors?.contact_person?.[0],
                    children: /* @__PURE__ */ jsx(Input, {
                      defaultValue: merchant.contact_person ?? "",
                      maxLength: 100
                    })
                  }), /* @__PURE__ */ jsx(FormField, {
                    label: "Business email",
                    name: "email",
                    error: updateError?.fieldErrors?.email?.[0],
                    children: /* @__PURE__ */ jsx(Input, {
                      type: "email",
                      defaultValue: merchant.email ?? "",
                      autoComplete: "email"
                    })
                  })]
                }), /* @__PURE__ */ jsx(FormField, {
                  label: "Phone",
                  name: "phone",
                  error: updateError?.fieldErrors?.phone?.[0],
                  children: /* @__PURE__ */ jsx(PhoneInput, {
                    defaultDial: merchant.dial_code,
                    defaultPhone: merchant.phone
                  })
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: cn("border-line bg-surface shadow-card sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-200", dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"),
            "aria-hidden": !dirty,
            children: [/* @__PURE__ */ jsx("p", {
              className: "text-ink-2 text-sm",
              children: "You have unsaved changes"
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex gap-2",
              children: [/* @__PURE__ */ jsx(Button, {
                variant: "ghost",
                size: "sm",
                type: "button",
                onClick: () => {
                  formRef.current?.reset();
                  setWebsiteError(null);
                  resetDirty();
                },
                children: "Discard"
              }), /* @__PURE__ */ jsx(Button, {
                size: "sm",
                type: "submit",
                form: "merchant-profile-form",
                loading: isSubmitting,
                children: "Save changes"
              })]
            })]
          })]
        }) : /* @__PURE__ */ jsxs(Card, {
          children: [/* @__PURE__ */ jsx(CardHeader, {
            title: "Business profile",
            description: "How your business appears in the portal and on customer-facing pages."
          }), /* @__PURE__ */ jsx("div", {
            className: "border-line border-b p-5",
            children: /* @__PURE__ */ jsx(LogoUploader, {
              logoUrl,
              csrfToken,
              isAdmin
            })
          }), /* @__PURE__ */ jsx("div", {
            className: "p-5",
            children: /* @__PURE__ */ jsxs("dl", {
              className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
              children: [/* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Merchant name",
                value: merchant.name
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Contact person",
                value: merchant.contact_person
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Business email",
                value: merchant.email
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Phone",
                value: merchant.phone ? `${merchant.dial_code ?? ""} ${merchant.phone}` : null
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Address",
                value: merchant.address
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Website",
                value: merchant.website
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Currency",
                value: merchant.currency
              }), /* @__PURE__ */ jsx(ReadOnlyField, {
                label: "Active",
                value: merchant.is_active ? "Yes" : "No"
              })]
            })
          })]
        }), merchant.services.length > 0 && /* @__PURE__ */ jsxs(Card, {
          children: [/* @__PURE__ */ jsx(CardHeader, {
            title: "Services",
            description: "Payment services enabled on this merchant."
          }), /* @__PURE__ */ jsx("div", {
            className: "space-y-3 p-5",
            children: merchant.services.map((s) => {
              const Icon = serviceIcon(s.code, s.type);
              return /* @__PURE__ */ jsxs("div", {
                className: "border-line flex items-center gap-3 rounded-xl border p-3.5",
                children: [/* @__PURE__ */ jsx("span", {
                  className: "bg-primary-subtle text-primary flex size-10 shrink-0 items-center justify-center rounded-lg",
                  "aria-hidden": true,
                  children: /* @__PURE__ */ jsx(Icon, {
                    className: "size-5"
                  })
                }), /* @__PURE__ */ jsxs("div", {
                  className: "min-w-0 flex-1",
                  children: [/* @__PURE__ */ jsx("p", {
                    className: "text-ink truncate text-sm font-medium",
                    children: s.code
                  }), /* @__PURE__ */ jsx("p", {
                    className: "text-ink-3 text-xs capitalize",
                    children: s.type
                  })]
                }), /* @__PURE__ */ jsx(Badge, {
                  variant: s.is_active ? "success" : "neutral",
                  children: s.is_active ? "Active" : "Inactive"
                })]
              }, s.id);
            })
          })]
        })]
      })
    }), /* @__PURE__ */ jsx(ConfirmDialog, {
      open: confirmOpen,
      onOpenChange: (open) => {
        if (!open) cancelLeave();
      },
      title: "Discard unsaved changes?",
      message: "You have unsaved changes on this page. Leaving now will discard them.",
      confirmLabel: "Discard changes",
      danger: true,
      onConfirm: confirmLeave
    })]
  });
});
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: app_settings_merchant,
  loader: loader$3,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
function Pagination({
  currentPage,
  lastPage,
  total,
  noun,
  onPage,
  className
}) {
  if (lastPage <= 1) return null;
  return /* @__PURE__ */ jsxs("div", { className: className ?? "flex flex-wrap items-center justify-between gap-2", children: [
    /* @__PURE__ */ jsxs("p", { className: "text-xs text-ink-3", children: [
      "Page ",
      /* @__PURE__ */ jsx("span", { className: "tnum", children: currentPage }),
      " of ",
      /* @__PURE__ */ jsx("span", { className: "tnum", children: lastPage }),
      total != null && /* @__PURE__ */ jsxs(Fragment, { children: [
        " ",
        "· ",
        /* @__PURE__ */ jsx("span", { className: "tnum", children: total }),
        " ",
        noun ?? "total"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "secondary",
          size: "sm",
          onClick: () => onPage(currentPage - 1),
          disabled: currentPage <= 1,
          "aria-label": "Previous page",
          children: [
            /* @__PURE__ */ jsx(ChevronLeft, { "aria-hidden": true }),
            " Prev"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "secondary",
          size: "sm",
          onClick: () => onPage(currentPage + 1),
          disabled: currentPage >= lastPage,
          "aria-label": "Next page",
          children: [
            "Next ",
            /* @__PURE__ */ jsx(ChevronRight, { "aria-hidden": true })
          ]
        }
      )
    ] })
  ] });
}
const meta = () => [{
  title: "Team | DLT Portal"
}];
async function loader$2({
  request
}) {
  const {
    pat,
    user,
    csrfSecret,
    csrfSetCookie
  } = await requireUser(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const perPage = Number(url.searchParams.get("per_page") ?? "25");
  const invPage = Number(url.searchParams.get("inv_page") ?? "1");
  const invStatus = url.searchParams.get("inv_status") ?? "";
  const isAdmin = user.role === "administrator";
  const [membersResult, invitationsResult] = await Promise.all([getMembers(pat, {
    page,
    per_page: perPage
  }), isAdmin ? getInvitations(pat, {
    page: invPage,
    per_page: 25,
    status: invStatus || void 0
  }) : Promise.resolve({
    ok: true,
    data: {
      data: [],
      meta: {
        current_page: 1,
        per_page: 25,
        total: 0,
        last_page: 1
      }
    }
  })]);
  const headers2 = csrfSetCookie ? {
    "Set-Cookie": csrfSetCookie
  } : {};
  return data({
    members: membersResult.ok ? membersResult.data.data : [],
    membersMeta: membersResult.ok ? membersResult.data.meta : null,
    membersError: membersResult.ok ? null : membersResult.error.message,
    invitations: invitationsResult.ok ? invitationsResult.data.data : [],
    invitationsMeta: invitationsResult.ok ? invitationsResult.data.meta : null,
    invitationsError: invitationsResult.ok ? null : invitationsResult.error.message,
    csrfToken: csrfSecret,
    isAdmin,
    currentUserId: user.id
  }, {
    headers: headers2
  });
}
async function action$1({
  request
}) {
  const {
    pat,
    user,
    csrfSecret
  } = await requireUser(request);
  const isAdmin = user.role === "administrator";
  const form = await request.formData();
  const intent = form.get("intent");
  const csrfToken = form.get("csrf_token");
  if (!validateCsrfToken(csrfToken, csrfSecret)) {
    return {
      ok: false,
      error: "Invalid request. Please try again.",
      intent
    };
  }
  if (intent === "change_role") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      intent
    };
    const memberId = Number(form.get("member_id"));
    const newRole = form.get("role");
    const result = await updateMemberRole(pat, memberId, newRole);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      if (errorCode === "LAST_ADMINISTRATOR") {
        return {
          ok: false,
          error: "Cannot change role: this is the only active administrator. Add another administrator first.",
          intent
        };
      }
      if (errorCode === "RATE_LIMITED") {
        return {
          ok: false,
          error: "Too many team changes. Please wait a moment and try again.",
          intent
        };
      }
      return {
        ok: false,
        error: result.error.message,
        intent
      };
    }
    if (memberId === user.id && newRole === "developer") {
      const session = await getSession(request.headers.get("Cookie"));
      throw redirect("/login?reason=role_changed", {
        headers: {
          "Set-Cookie": await destroySession(session)
        }
      });
    }
    return {
      ok: true,
      message: "Member role updated.",
      intent
    };
  }
  if (intent === "remove_member") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      intent
    };
    const memberId = Number(form.get("member_id"));
    const result = await removeMember(pat, memberId);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      if (errorCode === "LAST_ADMINISTRATOR") {
        return {
          ok: false,
          error: "Cannot remove: this is the only active administrator. Add another administrator first.",
          intent
        };
      }
      if (errorCode === "RATE_LIMITED") {
        return {
          ok: false,
          error: "Too many team changes. Please wait a moment and try again.",
          intent
        };
      }
      return {
        ok: false,
        error: result.error.message,
        intent
      };
    }
    if (memberId === user.id) {
      const session = await getSession(request.headers.get("Cookie"));
      throw redirect("/login", {
        headers: {
          "Set-Cookie": await destroySession(session)
        }
      });
    }
    return {
      ok: true,
      message: "Member removed.",
      intent
    };
  }
  if (intent === "invite") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      intent
    };
    const email = form.get("email").trim().toLowerCase();
    const role = form.get("role");
    if (!email) return {
      ok: false,
      error: "Email is required.",
      intent
    };
    if (!role) return {
      ok: false,
      error: "Role is required.",
      intent
    };
    const result = await createInvitation(pat, email, role);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      const map = {
        MEMBER_ALREADY_EXISTS: "This person is already a member of your team.",
        INVITATION_ALREADY_PENDING: "A pending invitation already exists for this email.",
        USER_BELONGS_TO_ANOTHER_MERCHANT: "This user belongs to another merchant and cannot be invited.",
        USER_NOT_ELIGIBLE: "This user is not eligible for membership (internal DLT accounts cannot join).",
        USER_IDENTITY_CONFLICT: "This email conflicts with an existing identity. Contact support.",
        RATE_LIMITED: "Too many invitations sent. Please wait a moment and try again."
      };
      return {
        ok: false,
        error: map[errorCode ?? ""] ?? result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        intent
      };
    }
    if (result.data.sent === false) {
      return {
        ok: true,
        message: "Invitation saved, but the email could not be sent. Use Resend to try again.",
        invitationId: result.data.id,
        sent: false,
        intent
      };
    }
    return {
      ok: true,
      message: "Invitation sent.",
      intent
    };
  }
  if (intent === "resend_invitation") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      intent
    };
    const invitationId = form.get("invitation_id");
    const result = await resendInvitation(pat, invitationId);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      const map = {
        RATE_LIMITED: "Too many invitations sent. Please wait a moment and try again.",
        INVITATION_ALREADY_PENDING: "A newer pending invitation already exists for this email."
      };
      if (result.error.status === 410) {
        return {
          ok: false,
          error: "This invitation has already been accepted or revoked and cannot be resent.",
          intent
        };
      }
      return {
        ok: false,
        error: map[errorCode ?? ""] ?? result.error.message,
        intent
      };
    }
    const sent = result.data.sent;
    return {
      ok: true,
      message: sent ? "Invitation resent." : "Invitation updated, but email could not be delivered.",
      intent
    };
  }
  if (intent === "revoke_invitation") {
    if (!isAdmin) return {
      ok: false,
      error: "Forbidden",
      intent
    };
    const invitationId = form.get("invitation_id");
    const result = await revokeInvitation(pat, invitationId);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      if (result.error.status === 410) {
        return {
          ok: false,
          error: "This invitation cannot be revoked (already accepted).",
          intent
        };
      }
      if (errorCode === "RATE_LIMITED") {
        return {
          ok: false,
          error: "Too many team changes. Please wait a moment and try again.",
          intent
        };
      }
      return {
        ok: false,
        error: result.error.message,
        intent
      };
    }
    return {
      ok: true,
      message: "Invitation revoked.",
      intent
    };
  }
  return {
    ok: false,
    error: "Unknown action.",
    intent
  };
}
function fmtDate(ts) {
  if (!ts) return "—";
  const dt = DateTime.fromISO(ts, {
    zone: "Asia/Manila"
  });
  return dt.isValid ? dt.toFormat("dd MMM yyyy") : "—";
}
function RoleBadge({
  role
}) {
  return /* @__PURE__ */ jsx(Badge, {
    variant: role === "administrator" ? "primary" : "neutral",
    children: role === "administrator" ? "Administrator" : "Developer"
  });
}
function StatusText({
  active
}) {
  return /* @__PURE__ */ jsxs("span", {
    className: "inline-flex items-center gap-1.5 text-sm text-ink-2",
    children: [/* @__PURE__ */ jsx("span", {
      className: cn("size-2 rounded-full", active ? "bg-success" : "bg-ink-3/40"),
      "aria-hidden": true
    }), active ? "Active" : "Inactive"]
  });
}
function InviteForm({
  csrfToken,
  onDone
}) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data;
  const toast = useToast();
  const inviteError = actionData?.intent === "invite" && !actionData.ok ? actionData.error : null;
  const fieldErrors = actionData?.intent === "invite" && "fieldErrors" in actionData ? actionData.fieldErrors : null;
  useEffect(() => {
    if (fetcher.state === "idle" && actionData?.ok && actionData.intent === "invite") {
      toast.success(actionData.message ?? "Invitation sent.");
      onDone();
    } else if (fetcher.state === "idle" && actionData && !actionData.ok && actionData.intent === "invite") {
      toast.error(actionData.error ?? "Something went wrong.");
    }
  }, [fetcher.state, actionData]);
  return /* @__PURE__ */ jsxs(Card, {
    className: "p-5",
    children: [/* @__PURE__ */ jsx("h3", {
      className: "mb-4 text-sm font-semibold text-ink",
      children: "Send invitation"
    }), /* @__PURE__ */ jsxs(fetcher.Form, {
      method: "POST",
      className: "space-y-4",
      children: [/* @__PURE__ */ jsx("input", {
        type: "hidden",
        name: "intent",
        value: "invite"
      }), /* @__PURE__ */ jsx("input", {
        type: "hidden",
        name: "csrf_token",
        value: csrfToken
      }), /* @__PURE__ */ jsxs("div", {
        className: "grid gap-4 sm:grid-cols-2",
        children: [/* @__PURE__ */ jsx(FormField, {
          label: "Email",
          name: "email",
          required: true,
          error: fieldErrors?.email?.[0],
          children: /* @__PURE__ */ jsx(Input, {
            type: "email",
            required: true,
            maxLength: 255,
            placeholder: "colleague@example.com"
          })
        }), /* @__PURE__ */ jsx(FormField, {
          label: "Role",
          name: "role",
          required: true,
          error: fieldErrors?.role?.[0],
          children: /* @__PURE__ */ jsxs(Select, {
            name: "role",
            required: true,
            children: [/* @__PURE__ */ jsx("option", {
              value: "developer",
              children: "Developer"
            }), /* @__PURE__ */ jsx("option", {
              value: "administrator",
              children: "Administrator"
            })]
          })
        })]
      }), inviteError && !fieldErrors && /* @__PURE__ */ jsx(Callout, {
        variant: "danger",
        role: "alert",
        children: inviteError
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-end gap-2",
        children: [/* @__PURE__ */ jsx(Button, {
          type: "button",
          variant: "ghost",
          onClick: onDone,
          children: "Cancel"
        }), /* @__PURE__ */ jsx(Button, {
          type: "submit",
          loading: isSubmitting,
          children: "Send invitation"
        })]
      })]
    })]
  });
}
function MembersTab({
  members,
  membersMeta,
  isAdmin,
  currentUserId,
  csrfToken
}) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data;
  useEffect(() => {
    if (fetcher.state === "idle" && actionData) {
      if (actionData.ok && (actionData.intent === "change_role" || actionData.intent === "remove_member")) {
        toast.success(actionData.message ?? "Done.");
        revalidator.revalidate();
      } else if (!actionData.ok && (actionData.intent === "change_role" || actionData.intent === "remove_member")) {
        toast.error(actionData.error ?? "Something went wrong.");
      }
    }
  }, [fetcher.state, actionData]);
  function submitConfirmed() {
    if (!confirm) return;
    const fd = new FormData();
    fd.set("csrf_token", csrfToken);
    fd.set("member_id", String(confirm.memberId));
    if (confirm.type === "change_role" && confirm.newRole) {
      fd.set("intent", "change_role");
      fd.set("role", confirm.newRole);
    } else {
      fd.set("intent", "remove_member");
    }
    fetcher.submit(fd, {
      method: "POST"
    });
    setConfirm(null);
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "space-y-4",
    children: [/* @__PURE__ */ jsx("div", {
      className: "hidden overflow-x-auto rounded-xl border border-line bg-surface sm:block",
      children: /* @__PURE__ */ jsxs("table", {
        className: "min-w-full text-sm",
        children: [/* @__PURE__ */ jsx("thead", {
          className: "sticky top-0 bg-surface-2",
          children: /* @__PURE__ */ jsxs("tr", {
            className: "border-b border-line text-left text-xs font-medium uppercase tracking-wider text-ink-3",
            children: [/* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Name"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Email"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Role"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Status"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Joined"
            }), isAdmin && /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3 text-right",
              children: "Actions"
            })]
          })
        }), /* @__PURE__ */ jsx("tbody", {
          className: "divide-y divide-line",
          children: members.map((member) => {
            const isSelf = member.id === currentUserId;
            return /* @__PURE__ */ jsxs("tr", {
              className: "transition-colors hover:bg-surface-2/60",
              children: [/* @__PURE__ */ jsxs("td", {
                className: "px-4 py-3 font-medium text-ink",
                children: [member.first_name, " ", member.last_name, isSelf && /* @__PURE__ */ jsx("span", {
                  className: "ml-1.5 text-xs text-ink-3",
                  children: "(you)"
                })]
              }), /* @__PURE__ */ jsx("td", {
                className: "px-4 py-3 text-ink-2",
                children: member.email
              }), /* @__PURE__ */ jsx("td", {
                className: "px-4 py-3",
                children: isAdmin && !isSelf ? /* @__PURE__ */ jsxs(Select, {
                  "aria-label": `Change role for ${member.first_name} ${member.last_name}`,
                  defaultValue: member.role,
                  disabled: isSubmitting,
                  className: "w-36",
                  onChange: (e) => {
                    const newRole = e.target.value;
                    if (newRole !== member.role) {
                      setConfirm({
                        type: "change_role",
                        memberId: member.id,
                        newRole,
                        memberName: `${member.first_name} ${member.last_name}`,
                        isSelf
                      });
                      e.target.value = member.role;
                    }
                  },
                  children: [/* @__PURE__ */ jsx("option", {
                    value: "administrator",
                    children: "Administrator"
                  }), /* @__PURE__ */ jsx("option", {
                    value: "developer",
                    children: "Developer"
                  })]
                }) : /* @__PURE__ */ jsx(RoleBadge, {
                  role: member.role
                })
              }), /* @__PURE__ */ jsx("td", {
                className: "px-4 py-3",
                children: /* @__PURE__ */ jsx(StatusText, {
                  active: member.is_active
                })
              }), /* @__PURE__ */ jsx("td", {
                className: "px-4 py-3 text-ink-3",
                children: fmtDate(member.joined_at)
              }), isAdmin && /* @__PURE__ */ jsx("td", {
                className: "px-4 py-3 text-right",
                children: isSelf ? /* @__PURE__ */ jsx(Tooltip, {
                  content: "You can't change your own membership",
                  children: /* @__PURE__ */ jsx("span", {
                    className: "inline-flex cursor-not-allowed rounded-md p-1.5 text-ink-3/50",
                    children: /* @__PURE__ */ jsx(UserMinus, {
                      className: "size-4",
                      "aria-hidden": true
                    })
                  })
                }) : /* @__PURE__ */ jsx(Tooltip, {
                  content: `Remove ${member.first_name} ${member.last_name}`,
                  children: /* @__PURE__ */ jsx("button", {
                    type: "button",
                    "aria-label": `Remove ${member.first_name} ${member.last_name}`,
                    disabled: isSubmitting,
                    onClick: () => setConfirm({
                      type: "remove",
                      memberId: member.id,
                      memberName: `${member.first_name} ${member.last_name}`,
                      isSelf
                    }),
                    className: "rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-subtle hover:text-danger-ink disabled:opacity-50",
                    children: /* @__PURE__ */ jsx(UserMinus, {
                      className: "size-4",
                      "aria-hidden": true
                    })
                  })
                })
              })]
            }, member.id);
          })
        })]
      })
    }), /* @__PURE__ */ jsx("ul", {
      className: "space-y-3 sm:hidden",
      children: members.map((member) => {
        const isSelf = member.id === currentUserId;
        return /* @__PURE__ */ jsxs("li", {
          className: "rounded-xl border border-line bg-surface p-4",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "flex items-start justify-between gap-2",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "min-w-0",
              children: [/* @__PURE__ */ jsxs("p", {
                className: "truncate text-sm font-medium text-ink",
                children: [member.first_name, " ", member.last_name, isSelf && /* @__PURE__ */ jsx("span", {
                  className: "ml-1 text-xs text-ink-3",
                  children: "(you)"
                })]
              }), /* @__PURE__ */ jsx("p", {
                className: "truncate text-xs text-ink-3",
                children: member.email
              })]
            }), /* @__PURE__ */ jsx(RoleBadge, {
              role: member.role
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "mt-3 flex items-center justify-between text-xs text-ink-3",
            children: [/* @__PURE__ */ jsx(StatusText, {
              active: member.is_active
            }), /* @__PURE__ */ jsxs("span", {
              children: ["Joined ", fmtDate(member.joined_at)]
            })]
          }), isAdmin && !isSelf && /* @__PURE__ */ jsxs("div", {
            className: "mt-3 flex gap-2 border-t border-line pt-3",
            children: [/* @__PURE__ */ jsxs(Select, {
              "aria-label": `Change role for ${member.first_name} ${member.last_name}`,
              defaultValue: member.role,
              disabled: isSubmitting,
              className: "flex-1",
              onChange: (e) => {
                const newRole = e.target.value;
                if (newRole !== member.role) {
                  setConfirm({
                    type: "change_role",
                    memberId: member.id,
                    newRole,
                    memberName: `${member.first_name} ${member.last_name}`,
                    isSelf
                  });
                  e.target.value = member.role;
                }
              },
              children: [/* @__PURE__ */ jsx("option", {
                value: "administrator",
                children: "Administrator"
              }), /* @__PURE__ */ jsx("option", {
                value: "developer",
                children: "Developer"
              })]
            }), /* @__PURE__ */ jsx(Button, {
              variant: "danger-outline",
              size: "sm",
              "aria-label": `Remove ${member.first_name} ${member.last_name}`,
              disabled: isSubmitting,
              onClick: () => setConfirm({
                type: "remove",
                memberId: member.id,
                memberName: `${member.first_name} ${member.last_name}`,
                isSelf
              }),
              children: /* @__PURE__ */ jsx(UserMinus, {
                "aria-hidden": true
              })
            })]
          })]
        }, member.id);
      })
    }), membersMeta && /* @__PURE__ */ jsx(Pagination, {
      currentPage: membersMeta.current_page,
      lastPage: membersMeta.last_page,
      total: membersMeta.total,
      noun: "members",
      onPage: (p) => setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(p));
        return next;
      })
    }), /* @__PURE__ */ jsx(ConfirmDialog, {
      open: !!confirm,
      onOpenChange: (open) => !open && setConfirm(null),
      title: confirm?.type === "change_role" ? "Change role?" : "Remove member?",
      message: confirm?.type === "change_role" ? `This will change ${confirm.memberName}'s role to ${confirm.newRole}. Their current session tokens will be revoked and they'll need to log in again.${confirm.isSelf ? " You will be logged out." : ""}` : `This will remove ${confirm?.memberName ?? ""} from the team. Their session tokens will be revoked.${confirm?.isSelf ? " You will be logged out." : ""}`,
      confirmLabel: confirm?.type === "change_role" ? "Change role" : "Remove",
      danger: confirm?.type === "remove",
      loading: isSubmitting,
      onConfirm: submitConfirmed
    })]
  });
}
function InvitationsTab({
  invitations,
  invitationsMeta,
  csrfToken
}) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data;
  const invStatus = searchParams.get("inv_status") ?? "";
  useEffect(() => {
    if (fetcher.state === "idle" && actionData && (actionData.intent === "resend_invitation" || actionData.intent === "revoke_invitation")) {
      if (actionData.ok) {
        toast.success(actionData.message ?? "Done.");
        revalidator.revalidate();
      } else {
        toast.error(actionData.error ?? "Something went wrong.");
      }
    }
  }, [fetcher.state, actionData]);
  function submitRevoke() {
    if (!confirmRevoke) return;
    const fd = new FormData();
    fd.set("intent", "revoke_invitation");
    fd.set("csrf_token", csrfToken);
    fd.set("invitation_id", confirmRevoke.id);
    fetcher.submit(fd, {
      method: "POST"
    });
    setConfirmRevoke(null);
  }
  const statusOptions = [{
    value: "",
    label: "All statuses"
  }, {
    value: "pending",
    label: "Pending"
  }, {
    value: "accepted",
    label: "Accepted"
  }, {
    value: "expired",
    label: "Expired"
  }, {
    value: "revoked",
    label: "Revoked"
  }];
  return /* @__PURE__ */ jsxs("div", {
    className: "space-y-4",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex items-center gap-2",
      children: [/* @__PURE__ */ jsx("label", {
        htmlFor: "inv-status",
        className: "text-sm font-medium text-ink-2",
        children: "Status"
      }), /* @__PURE__ */ jsx(Select, {
        id: "inv-status",
        value: invStatus,
        onChange: (e) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (e.target.value) next.set("inv_status", e.target.value);
            else next.delete("inv_status");
            next.delete("inv_page");
            next.set("tab", "invitations");
            return next;
          });
        },
        className: "w-40",
        children: statusOptions.map((o) => /* @__PURE__ */ jsx("option", {
          value: o.value,
          children: o.label
        }, o.value))
      })]
    }), invitations.length === 0 ? /* @__PURE__ */ jsx(Card, {
      children: /* @__PURE__ */ jsx(EmptyState, {
        icon: Mail,
        title: "No invitations",
        description: "Invite teammates to give them access to this merchant account."
      })
    }) : /* @__PURE__ */ jsx("div", {
      className: "overflow-x-auto rounded-xl border border-line bg-surface",
      children: /* @__PURE__ */ jsxs("table", {
        className: "min-w-full text-sm",
        children: [/* @__PURE__ */ jsx("thead", {
          className: "sticky top-0 bg-surface-2",
          children: /* @__PURE__ */ jsxs("tr", {
            className: "border-b border-line text-left text-xs font-medium uppercase tracking-wider text-ink-3",
            children: [/* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Email"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Role"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Status"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Invited by"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Created"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3",
              children: "Expires"
            }), /* @__PURE__ */ jsx("th", {
              className: "px-4 py-3 text-right",
              children: "Actions"
            })]
          })
        }), /* @__PURE__ */ jsx("tbody", {
          className: "divide-y divide-line",
          children: invitations.map((inv) => /* @__PURE__ */ jsxs("tr", {
            className: "transition-colors hover:bg-surface-2/60",
            children: [/* @__PURE__ */ jsx("td", {
              className: "px-4 py-3 text-ink",
              children: inv.email
            }), /* @__PURE__ */ jsx("td", {
              className: "px-4 py-3",
              children: /* @__PURE__ */ jsx(RoleBadge, {
                role: inv.role
              })
            }), /* @__PURE__ */ jsxs("td", {
              className: "px-4 py-3",
              children: [/* @__PURE__ */ jsx(InvitationStatusPill, {
                status: inv.status
              }), inv.sent === false && /* @__PURE__ */ jsx("span", {
                className: "ml-1.5 text-xs text-warning-ink",
                children: "(email not sent)"
              })]
            }), /* @__PURE__ */ jsx("td", {
              className: "px-4 py-3 text-ink-3",
              children: inv.invited_by ?? "—"
            }), /* @__PURE__ */ jsx("td", {
              className: "px-4 py-3 text-ink-3",
              children: fmtDate(inv.created_at)
            }), /* @__PURE__ */ jsx("td", {
              className: "px-4 py-3 text-ink-3",
              children: fmtDate(inv.expires_at)
            }), /* @__PURE__ */ jsx("td", {
              className: "px-4 py-3 text-right",
              children: /* @__PURE__ */ jsxs("div", {
                className: "inline-flex items-center gap-1",
                children: [(inv.status === "pending" || inv.status === "expired") && /* @__PURE__ */ jsxs(fetcher.Form, {
                  method: "POST",
                  children: [/* @__PURE__ */ jsx("input", {
                    type: "hidden",
                    name: "intent",
                    value: "resend_invitation"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "hidden",
                    name: "csrf_token",
                    value: csrfToken
                  }), /* @__PURE__ */ jsx("input", {
                    type: "hidden",
                    name: "invitation_id",
                    value: inv.id
                  }), /* @__PURE__ */ jsx(Tooltip, {
                    content: "Resend invitation",
                    children: /* @__PURE__ */ jsx("button", {
                      type: "submit",
                      disabled: isSubmitting,
                      "aria-label": `Resend invitation to ${inv.email}`,
                      className: "rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-50",
                      children: /* @__PURE__ */ jsx(RefreshCw, {
                        className: "size-4",
                        "aria-hidden": true
                      })
                    })
                  })]
                }), inv.status === "pending" && /* @__PURE__ */ jsx(Tooltip, {
                  content: "Revoke invitation",
                  children: /* @__PURE__ */ jsx("button", {
                    type: "button",
                    disabled: isSubmitting,
                    "aria-label": `Revoke invitation for ${inv.email}`,
                    onClick: () => setConfirmRevoke({
                      id: inv.id,
                      email: inv.email
                    }),
                    className: "rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-subtle hover:text-danger-ink disabled:opacity-50",
                    children: /* @__PURE__ */ jsx(Trash2, {
                      className: "size-4",
                      "aria-hidden": true
                    })
                  })
                })]
              })
            })]
          }, inv.id))
        })]
      })
    }), invitationsMeta && /* @__PURE__ */ jsx(Pagination, {
      currentPage: invitationsMeta.current_page,
      lastPage: invitationsMeta.last_page,
      total: invitationsMeta.total,
      noun: "invitations",
      onPage: (p) => setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("inv_page", String(p));
        next.set("tab", "invitations");
        return next;
      })
    }), /* @__PURE__ */ jsx(ConfirmDialog, {
      open: !!confirmRevoke,
      onOpenChange: (open) => !open && setConfirmRevoke(null),
      title: "Revoke invitation?",
      message: `The invitation for ${confirmRevoke?.email} will be revoked. They will not be able to use the invitation link.`,
      confirmLabel: "Revoke",
      danger: true,
      loading: isSubmitting,
      onConfirm: submitRevoke
    })]
  });
}
const app_settings_team = UNSAFE_withComponentProps(function TeamPage() {
  const {
    members,
    membersMeta,
    membersError,
    invitations,
    invitationsMeta,
    invitationsError,
    csrfToken,
    isAdmin,
    currentUserId
  } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const activeTab = searchParams.get("tab") === "invitations" ? "invitations" : "members";
  return /* @__PURE__ */ jsxs("div", {
    className: "w-full max-w-[1200px] space-y-6",
    children: [/* @__PURE__ */ jsx(PageHeader, {
      title: "Team",
      description: "Manage team members and invitations for your merchant account.",
      actions: isAdmin && !showInviteForm ? /* @__PURE__ */ jsxs(Button, {
        onClick: () => setShowInviteForm(true),
        children: [/* @__PURE__ */ jsx(UserPlus, {
          "aria-hidden": true
        }), " Invite member"]
      }) : void 0
    }), showInviteForm && isAdmin && /* @__PURE__ */ jsx(InviteForm, {
      csrfToken,
      onDone: () => setShowInviteForm(false)
    }), /* @__PURE__ */ jsx("div", {
      className: "border-b border-line",
      children: /* @__PURE__ */ jsx("nav", {
        className: "-mb-px flex gap-6",
        "aria-label": "Team tabs",
        children: [{
          key: "members",
          label: "Members",
          icon: Users
        }, ...isAdmin ? [{
          key: "invitations",
          label: "Invitations",
          icon: Mail
        }] : []].map(({
          key,
          label,
          icon: Icon
        }) => /* @__PURE__ */ jsxs("button", {
          type: "button",
          onClick: () => setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (key === "members") next.delete("tab");
            else next.set("tab", key);
            return next;
          }),
          className: cn("inline-flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors", activeTab === key ? "border-primary text-primary" : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink-2"),
          "aria-current": activeTab === key ? "page" : void 0,
          children: [/* @__PURE__ */ jsx(Icon, {
            className: "size-4",
            "aria-hidden": true
          }), label]
        }, key))
      })
    }), activeTab === "members" && (membersError ? /* @__PURE__ */ jsx(Callout, {
      variant: "danger",
      role: "alert",
      children: membersError
    }) : /* @__PURE__ */ jsx(MembersTab, {
      members,
      membersMeta,
      isAdmin,
      currentUserId,
      csrfToken
    })), activeTab === "invitations" && isAdmin && (invitationsError ? /* @__PURE__ */ jsx(Callout, {
      variant: "danger",
      role: "alert",
      children: invitationsError
    }) : /* @__PURE__ */ jsx(InvitationsTab, {
      invitations,
      invitationsMeta,
      csrfToken
    }))]
  });
});
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: app_settings_team,
  loader: loader$2,
  meta
}, Symbol.toStringTag, { value: "Module" }));
async function loader$1({
  request
}) {
  return redirect("/");
}
async function action({
  request
}) {
  const session = await getSession(request.headers.get("Cookie"));
  const csrfSecret = session.get("csrfSecret");
  if (!isSameOrigin(request, env.APP_ORIGIN)) {
    return redirect("/login");
  }
  const formData = await request.formData();
  const csrf = formData.get("csrfToken");
  if (typeof csrf !== "string" || typeof csrfSecret !== "string" || !validateCsrfToken(csrf, csrfSecret)) {
    return redirect("/login");
  }
  const pat = session.get("pat");
  if (pat) {
    await dltMutate({
      method: "POST",
      path: "/api/v1/auth/logout",
      bearer: pat
    }).catch(() => {
    });
  }
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session)
    }
  });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader() {
  return new Response(JSON.stringify({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-CDAzbpqf.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/index-H2aAfvIM.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/root-DvarJwdY.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/index-H2aAfvIM.js", "/assets/button-DU045ZXN.js", "/assets/toast-j7UMTXsr.js", "/assets/error-page-BCe3lez3.js", "/assets/index-CyCGn7r-.js", "/assets/index-CfvV8Wc8.js", "/assets/x--cczURrU.js", "/assets/index-CQTAfmns.js", "/assets/info-FwM2iSpZ.js", "/assets/clock-DZYawGTz.js", "/assets/shield-alert-CrEh_Y1B.js", "/assets/refresh-cw-DxMB9lqJ.js"], "css": ["/assets/root-Jl1OB39i.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/public.login": { "id": "routes/public.login", "parentId": "root", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/public.login-ByFFOeEf.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/theme-toggle-B7oyOe1x.js", "/assets/callout-Cam1Z3cl.js", "/assets/form-field-U8yks7hd.js", "/assets/input-ClFBaJ_7.js", "/assets/password-input-hL8dARKi.js", "/assets/info-FwM2iSpZ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/public.forgot-password": { "id": "routes/public.forgot-password", "parentId": "root", "path": "forgot-password", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/public.forgot-password-DYfcbeg4.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/theme-toggle-B7oyOe1x.js", "/assets/callout-Cam1Z3cl.js", "/assets/form-field-U8yks7hd.js", "/assets/input-ClFBaJ_7.js", "/assets/info-FwM2iSpZ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/public.reset-password": { "id": "routes/public.reset-password", "parentId": "root", "path": "reset-password", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/public.reset-password-zTLTPaoN.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/theme-toggle-B7oyOe1x.js", "/assets/callout-Cam1Z3cl.js", "/assets/form-field-U8yks7hd.js", "/assets/password-input-hL8dARKi.js", "/assets/password-rules-BtEmvdvg.js", "/assets/info-FwM2iSpZ.js", "/assets/input-ClFBaJ_7.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/public.team.invitations.accept": { "id": "routes/public.team.invitations.accept", "parentId": "root", "path": "team/invitations/accept", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/public.team.invitations.accept-CS6p9kRu.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/theme-toggle-B7oyOe1x.js", "/assets/callout-Cam1Z3cl.js", "/assets/form-field-U8yks7hd.js", "/assets/input-ClFBaJ_7.js", "/assets/password-input-hL8dARKi.js", "/assets/password-rules-BtEmvdvg.js", "/assets/segmented-control-DhkM_xqI.js", "/assets/info-FwM2iSpZ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.layout": { "id": "routes/app.layout", "parentId": "root", "path": void 0, "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app.layout-Bziq9CX4.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/clock-DZYawGTz.js", "/assets/theme-toggle-B7oyOe1x.js", "/assets/index-CyCGn7r-.js", "/assets/index-CfvV8Wc8.js", "/assets/index-B6HG-Z_Y.js", "/assets/x--cczURrU.js", "/assets/index-Cqf3JmOK.js", "/assets/index-DRQFcgt0.js", "/assets/index-tf7RIQfK.js", "/assets/error-page-BCe3lez3.js", "/assets/receipt-text-C6TJyrnw.js", "/assets/store-D6Gcoh2R.js", "/assets/users-FMvAnaoa.js", "/assets/index-H2aAfvIM.js", "/assets/shield-alert-CrEh_Y1B.js", "/assets/refresh-cw-DxMB9lqJ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app.layout", "path": "/", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app._index-BjjfGw_k.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/empty-state-BSyV9joN.js", "/assets/dates-BbwXt-EL.js", "/assets/page-header-BOWgxMhE.js", "/assets/card-Bo2uPjv6.js", "/assets/input-ClFBaJ_7.js", "/assets/segmented-control-DhkM_xqI.js", "/assets/badge-CD8lWmC7.js", "/assets/callout-Cam1Z3cl.js", "/assets/tooltip-XEBnb1IG.js", "/assets/refresh-cw-DxMB9lqJ.js", "/assets/index-H2aAfvIM.js", "/assets/clock-DZYawGTz.js", "/assets/store-D6Gcoh2R.js", "/assets/user-plus-DrjmcJHN.js", "/assets/x--cczURrU.js", "/assets/info-FwM2iSpZ.js", "/assets/index-CyCGn7r-.js", "/assets/index-tf7RIQfK.js", "/assets/index-DRQFcgt0.js", "/assets/index-CQTAfmns.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.transactions._index": { "id": "routes/app.transactions._index", "parentId": "routes/app.layout", "path": "transactions", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.transactions._index-Dcs0L8_1.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/dates-BbwXt-EL.js", "/assets/toast-j7UMTXsr.js", "/assets/empty-state-BSyV9joN.js", "/assets/page-header-BOWgxMhE.js", "/assets/card-Bo2uPjv6.js", "/assets/input-ClFBaJ_7.js", "/assets/badge-CD8lWmC7.js", "/assets/callout-Cam1Z3cl.js", "/assets/tooltip-XEBnb1IG.js", "/assets/download-D3uOfAGx.js", "/assets/x--cczURrU.js", "/assets/receipt-text-C6TJyrnw.js", "/assets/chevron-right-Dg4ntZx8.js", "/assets/index-H2aAfvIM.js", "/assets/index-CyCGn7r-.js", "/assets/index-CfvV8Wc8.js", "/assets/index-CQTAfmns.js", "/assets/info-FwM2iSpZ.js", "/assets/index-tf7RIQfK.js", "/assets/index-DRQFcgt0.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.transactions.export.csv": { "id": "routes/app.transactions.export.csv", "parentId": "routes/app.layout", "path": "transactions/export.csv", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/app.transactions.export.csv-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.transactions._index.pdf": { "id": "routes/app.transactions._index.pdf", "parentId": "routes/app.layout", "path": "transactions/pdf", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/app.transactions._index.pdf-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.transactions.$id": { "id": "routes/app.transactions.$id", "parentId": "routes/app.layout", "path": "transactions/:id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app.transactions._id-DxkrR4wG.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/dates-BbwXt-EL.js", "/assets/index-CyCGn7r-.js", "/assets/index-B6HG-Z_Y.js", "/assets/index-tf7RIQfK.js", "/assets/card-Bo2uPjv6.js", "/assets/badge-CD8lWmC7.js", "/assets/callout-Cam1Z3cl.js", "/assets/empty-state-BSyV9joN.js", "/assets/error-page-BCe3lez3.js", "/assets/info-FwM2iSpZ.js", "/assets/download-D3uOfAGx.js", "/assets/clock-DZYawGTz.js", "/assets/index-H2aAfvIM.js", "/assets/index-CfvV8Wc8.js", "/assets/shield-alert-CrEh_Y1B.js", "/assets/refresh-cw-DxMB9lqJ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.transactions.$id.pdf": { "id": "routes/app.transactions.$id.pdf", "parentId": "routes/app.layout", "path": "transactions/:id/pdf", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/app.transactions._id.pdf-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.settings.profile": { "id": "routes/app.settings.profile", "parentId": "routes/app.layout", "path": "settings/profile", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.settings.profile-Bp1bsQb_.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/page-header-BOWgxMhE.js", "/assets/card-Bo2uPjv6.js", "/assets/input-ClFBaJ_7.js", "/assets/form-field-U8yks7hd.js", "/assets/password-input-hL8dARKi.js", "/assets/password-rules-BtEmvdvg.js", "/assets/callout-Cam1Z3cl.js", "/assets/confirm-dialog-HqkQa--d.js", "/assets/toast-j7UMTXsr.js", "/assets/use-dirty-guard-D9CcYPYi.js", "/assets/mail-xoJ-o2zr.js", "/assets/info-FwM2iSpZ.js", "/assets/index-CyCGn7r-.js", "/assets/index-H2aAfvIM.js", "/assets/index-Cqf3JmOK.js", "/assets/index-tf7RIQfK.js", "/assets/x--cczURrU.js", "/assets/shield-alert-CrEh_Y1B.js", "/assets/index-CfvV8Wc8.js", "/assets/index-CQTAfmns.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.settings.merchant": { "id": "routes/app.settings.merchant", "parentId": "routes/app.layout", "path": "settings/merchant", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.settings.merchant-P5y6D3Sj.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/page-header-BOWgxMhE.js", "/assets/card-Bo2uPjv6.js", "/assets/input-ClFBaJ_7.js", "/assets/form-field-U8yks7hd.js", "/assets/callout-Cam1Z3cl.js", "/assets/badge-CD8lWmC7.js", "/assets/confirm-dialog-HqkQa--d.js", "/assets/toast-j7UMTXsr.js", "/assets/use-dirty-guard-D9CcYPYi.js", "/assets/trash-2-Di6j0gPT.js", "/assets/info-FwM2iSpZ.js", "/assets/index-CyCGn7r-.js", "/assets/index-H2aAfvIM.js", "/assets/index-Cqf3JmOK.js", "/assets/index-tf7RIQfK.js", "/assets/x--cczURrU.js", "/assets/shield-alert-CrEh_Y1B.js", "/assets/index-CfvV8Wc8.js", "/assets/index-CQTAfmns.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.settings.team": { "id": "routes/app.settings.team", "parentId": "routes/app.layout", "path": "settings/team", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.settings.team-Cf5-V33U.js", "imports": ["/assets/jsx-runtime-DRCE_Dd4.js", "/assets/button-DU045ZXN.js", "/assets/empty-state-BSyV9joN.js", "/assets/page-header-BOWgxMhE.js", "/assets/card-Bo2uPjv6.js", "/assets/input-ClFBaJ_7.js", "/assets/form-field-U8yks7hd.js", "/assets/badge-CD8lWmC7.js", "/assets/callout-Cam1Z3cl.js", "/assets/confirm-dialog-HqkQa--d.js", "/assets/chevron-right-Dg4ntZx8.js", "/assets/tooltip-XEBnb1IG.js", "/assets/toast-j7UMTXsr.js", "/assets/user-plus-DrjmcJHN.js", "/assets/users-FMvAnaoa.js", "/assets/mail-xoJ-o2zr.js", "/assets/refresh-cw-DxMB9lqJ.js", "/assets/trash-2-Di6j0gPT.js", "/assets/info-FwM2iSpZ.js", "/assets/index-CyCGn7r-.js", "/assets/index-H2aAfvIM.js", "/assets/index-Cqf3JmOK.js", "/assets/index-tf7RIQfK.js", "/assets/x--cczURrU.js", "/assets/shield-alert-CrEh_Y1B.js", "/assets/index-DRQFcgt0.js", "/assets/index-CQTAfmns.js", "/assets/index-CfvV8Wc8.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.logout": { "id": "routes/app.logout", "parentId": "root", "path": "logout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/app.logout-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/healthz": { "id": "routes/healthz", "parentId": "root", "path": "healthz", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/healthz-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-e9ab8ec5.js", "version": "e9ab8ec5", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_enableNodeReadableStream": false, "unstable_optimizeDeps": true };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/public.login": {
    id: "routes/public.login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/public.forgot-password": {
    id: "routes/public.forgot-password",
    parentId: "root",
    path: "forgot-password",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/public.reset-password": {
    id: "routes/public.reset-password",
    parentId: "root",
    path: "reset-password",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/public.team.invitations.accept": {
    id: "routes/public.team.invitations.accept",
    parentId: "root",
    path: "team/invitations/accept",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/app.layout": {
    id: "routes/app.layout",
    parentId: "root",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app.layout",
    path: "/",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app.transactions._index": {
    id: "routes/app.transactions._index",
    parentId: "routes/app.layout",
    path: "transactions",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/app.transactions.export.csv": {
    id: "routes/app.transactions.export.csv",
    parentId: "routes/app.layout",
    path: "transactions/export.csv",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app.transactions._index.pdf": {
    id: "routes/app.transactions._index.pdf",
    parentId: "routes/app.layout",
    path: "transactions/pdf",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app.transactions.$id": {
    id: "routes/app.transactions.$id",
    parentId: "routes/app.layout",
    path: "transactions/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app.transactions.$id.pdf": {
    id: "routes/app.transactions.$id.pdf",
    parentId: "routes/app.layout",
    path: "transactions/:id/pdf",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.settings.profile": {
    id: "routes/app.settings.profile",
    parentId: "routes/app.layout",
    path: "settings/profile",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app.settings.merchant": {
    id: "routes/app.settings.merchant",
    parentId: "routes/app.layout",
    path: "settings/merchant",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app.settings.team": {
    id: "routes/app.settings.team",
    parentId: "routes/app.layout",
    path: "settings/team",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/app.logout": {
    id: "routes/app.logout",
    parentId: "root",
    path: "logout",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/healthz": {
    id: "routes/healthz",
    parentId: "root",
    path: "healthz",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  }
};
const allowedActionOrigins = ["stage-merchant.dxp.dtic.com.ph"];
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
