/**
 * (dashboard)/transactions/page.tsx — Transaction log tab.
 * Backed by dummy-data stub (lib/dlt-transaction-service.ts).
 */

import type { Metadata } from "next";
import { TransactionsTable } from "@/components/tables/transactions-table";

export const metadata: Metadata = {
  title: "Transactions",
  description: "View and manage all your generated payment links and transaction history.",
};

export default function TransactionsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Transactions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View and manage all your generated payment links.
        </p>
      </div>
      
      <TransactionsTable />
    </main>
  );
}
