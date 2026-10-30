# DLT Merchant Portal — Design System

## Logo & Brand Colors
The design system is heavily inspired by the DLT logo (`dlt.png`), which features two prominent shades of blue:
- **Vibrant Blue** (`#001eff`): Used as the **Primary** interactive color (buttons, active states, focus rings).
- **Deep Navy** (`#172d99`): Used as the **Brand/Secondary** color, excellent for sidebars, heavy accents, and headers.

## Color Palette (Tailwind v4)
Defined in `app/app.css`:

### Primary (Vibrant Blue)
* `primary-50`: #edf2ff
* `primary-100`: #dce7ff
* `primary-500`: #2644ff
* `primary-600`: #001eff (Base)
* `primary-700`: #001ad4 (Hover)
* `primary-900`: #00178c

### Brand (Deep Navy)
* `brand-50`: #eff4ff
* `brand-500`: #3b65f6
* `brand-800`: #172d99 (Base)
* `brand-900`: #172979
* `brand-950`: #101a4a (Sidebar/Dark Background)

## Status Colors
- **Success (PAID)**: Tailwind `emerald` (e.g., emerald-500)
- **Pending (PENDING)**: Tailwind `amber` (e.g., amber-500)
- **Error/Rejected (REJECTED)**: Tailwind `rose` (e.g., rose-500)

## UI Elements
- **Cards/Panels**: Pure white (`#ffffff`) background with subtle shadow (`shadow-sm`), rounded borders (`rounded-xl`).
- **Backgrounds**: Slate-50 (`#f8fafc`) for main layout areas.
- **Buttons**: 
  - Primary: `bg-primary-600 hover:bg-primary-700 text-white rounded-md`
  - Secondary/Outline: `border-gray-200 text-gray-900 hover:bg-gray-50 rounded-md`
- **Typography**: Inter (Google Fonts). Slate-900 (`#0f172a`) for headings, Slate-500 (`#64748b`) for body and secondary text.
