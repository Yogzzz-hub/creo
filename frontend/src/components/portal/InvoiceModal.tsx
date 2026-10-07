import { useEffect } from "react";
import { createPortal } from "react-dom";
import { generateInvoicePDF, type InvoiceData } from "../../lib/pdf-invoice";
export function InvoiceModal({
  invoice,
  onClose,
}: { invoice: InvoiceData | null; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  if (!invoice) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Billing record"
        className="w-full max-w-xl bg-[#161F2D] text-white rounded-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}>Close</button>
        <h2 className="text-xl font-bold">Billing record</h2>
        <p>Reference: {invoice.id}</p>
        <p>Date: {invoice.date}</p>
        <p>Plan: {invoice.plan}</p>
        <p>Amount: {invoice.amount}</p>
        <p>Status: {invoice.status}</p>
        {invoice.clientName && <p>{invoice.clientName}</p>}
        {invoice.clientEmail && <p>{invoice.clientEmail}</p>}
        <button onClick={() => generateInvoicePDF(invoice)}>Download PDF</button>
      </section>
    </div>,
    document.body,
  );
}
