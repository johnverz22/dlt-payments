export function AlreadyCompletedView() {
  return (
    <div className="py-4">
      {/* Success icon with glow ring */}
      <div className="mb-6 flex justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-emerald-100 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <h1 className="mb-1.5 text-2xl font-bold text-slate-900 tracking-tight">
        Payment Already Completed
      </h1>
      <p className="text-sm text-slate-500 leading-relaxed">
        This payment link has already been processed. No further action is
        needed.
      </p>

      <div className="mt-6 pt-5 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          You may safely close this window.
        </p>
      </div>
    </div>
  );
}
