import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, Printer, X, FileText, CheckCircle2, ShieldCheck, Building2 } from "lucide-react";
import { generateInvoicePDF, type InvoiceData } from "../../lib/pdf-invoice";

export function InvoiceModal({
  invoice,
  onClose,
}: {
  invoice: InvoiceData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!invoice) return null;

  const numericAmount = parseFloat(invoice.amount.replace(/[^0-9.]/g, "")) || 25000;
  const baseAmount = +(numericAmount / 1.18).toFixed(2);
  const cgst = +((numericAmount - baseAmount) / 2).toFixed(2);
  const sgst = cgst;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]"
      style={{
        backgroundColor: "rgba(10, 22, 40, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100/90 w-full max-w-2xl overflow-hidden relative my-auto transition-all animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Modal Top Bar Actions */}
        <div className="bg-[#0D2137] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-blue-500/20 text-[#2B7BC4] border border-blue-400/30 flex items-center justify-center">
              <FileText className="size-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>Official Tax Invoice</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  GST Compliant
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">{invoice.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print invoice"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={() => generateInvoicePDF(invoice)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Printable Preview Body */}
        <div id="printable-invoice" className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto bg-white">
          {/* Supplier & Client Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2B7BC4] block mb-1">
                Billed By (Supplier)
              </span>
              <p className="font-bold text-slate-900 text-sm">Creo Creative Technologies Pvt. Ltd.</p>
              <p className="text-slate-600 font-mono text-[11px]">GSTIN: 33AACCC1234F1Z9</p>
              <p className="text-slate-500">100 Creative Avenue, Cyber City</p>
              <p className="text-slate-500">Bangalore, KA 560100, India</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2B7BC4] block mb-1">
                Billed To (Client)
              </span>
              <p className="font-bold text-slate-900 text-sm">{invoice.companyName || invoice.clientName || "Valued Client Partner"}</p>
              <p className="text-slate-500">{invoice.clientEmail || "client@workspace.com"}</p>
              <p className="text-slate-600 font-medium mt-1">Billing Date: {invoice.date}</p>
              <p className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px] mt-1">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> Payment Status: {invoice.status}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D2137] text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4">SAC Code</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{invoice.plan} — Creative Retainer Plan</p>
                    <p className="text-[11px] text-slate-500">Monthly creative pod allocation & quota synthesis</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">998311</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">1</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                    ₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
            <div className="text-xs text-slate-500 max-w-xs space-y-1">
              <p className="flex items-center gap-1 font-semibold text-slate-700">
                <ShieldCheck className="size-3.5 text-emerald-600" /> GST Tax Compliant Receipt
              </p>
              <p className="text-[11px] leading-relaxed">
                Computer-generated receipt issued by Creo Creative Technologies Pvt Ltd.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Excl. Tax):</span>
                <span className="font-semibold text-slate-800">
                  ₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST (9.0%):</span>
                <span className="font-semibold text-slate-800">
                  ₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST (9.0%):</span>
                <span className="font-semibold text-slate-800">
                  ₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900 font-extrabold text-sm">
                <span>Total Paid:</span>
                <span className="text-base text-[#2B7BC4]">
                  ₹{numericAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="size-3.5 text-slate-400" />
            <span>Creo Platform Payments</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => generateInvoicePDF(invoice)}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 text-white font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Download PDF File</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
