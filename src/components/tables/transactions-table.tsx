"use client";

import { useState, useEffect } from "react";
import { PaymentStatus, TransactionRecord } from "@/lib/dlt-transaction-service";
import { formatDisplayAmount } from "@/lib/money";

const inputClass = "w-full text-sm bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 transition-all duration-150 outline-none focus:border-[#0052FF] focus:ring-[3px] focus:ring-[rgba(0,82,255,0.15)]";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5";

export function TransactionsTable() {
  const [data, setData] = useState<TransactionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams();
        query.set("page", page.toString());
        query.set("limit", limit.toString());
        if (statusFilter) query.set("status", statusFilter);
        if (startDate) query.set("startDate", startDate);
        if (endDate) query.set("endDate", endDate);

        const res = await fetch(`/api/transactions?${query.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to fetch transactions");
        }
        
        const json = await res.json();
        setData(json.data || []);
        setTotal(json.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page, limit, statusFilter, startDate, endDate]);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as PaymentStatus | "");
    setPage(1);
  };

  const renderStatusBadge = (status: PaymentStatus) => {
    if (status === "PAID") return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Paid</span>;
    if (status === "PENDING") return <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">Pending</span>;
    if (status === "REJECTED") return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">Rejected</span>;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex flex-col flex-1 sm:max-w-[200px]">
            <label className={labelClass}>Status</label>
            <select 
              value={statusFilter} 
              onChange={handleStatusChange}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="flex flex-col flex-1 sm:max-w-[200px]">
            <label className={labelClass}>Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col flex-1 sm:max-w-[200px]">
            <label className={labelClass}>End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
           <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
           </svg>
           {error}
        </div>
      )}

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Transaction ID</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Amount</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Product</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Payor</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="h-6 w-6 animate-spin text-[#0052FF]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading transactions...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-2">No transactions found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono text-xs">{tx.merchant_transaction_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{formatDisplayAmount(tx.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">
                      <div className="max-w-[150px] truncate">{tx.product_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden sm:table-cell">{tx.payor_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{renderStatusBadge(tx.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6 mt-auto">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="relative ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Showing <span className="font-medium text-slate-900">{(page - 1) * limit + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * limit, total)}</span> of <span className="font-medium text-slate-900">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-lg border border-slate-200 bg-white px-3 py-2 text-slate-400 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {/* Just showing current page indicator instead of full page numbers for simplicity */}
                  <span className="relative inline-flex items-center border-t border-b border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-slate-400 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
