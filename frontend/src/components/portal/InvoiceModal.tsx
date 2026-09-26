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
      <div className="bg-[#161F2D] rounded-3xl shadow-2xl border border-[#2A3446] w-full max-w-2xl overflow-hidden relative my-auto transition-all animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Modal Top Bar Actions */}
        <div className="bg-[#050810] px-6 py-4 text-white flex items-center justify-between border-b border-[#2A3446]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-[#0B111C] text-[#7FA0D6] border border-[#2A3446] flex items-center justify-center">
              <FileText className="size-4 text-[#7FA0D6]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[#F8FAFC] flex items-center gap-2">
                <span>Official Tax Invoice</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
                  GST Compliant
                </span>
              </h3>
              <p className="text-[11px] text-[#97A0B3] font-mono">{invoice.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#97A0B3] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print invoice"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={() => generateInvoicePDF(invoice)}
              className="px-3.5 py-1.5 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#0B111C] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#BCCCE6]/20 transition-all cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#97A0B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Printable Preview Body */}
        <div id="printable-invoice" className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto bg-[#161F2D] text-[#F8FAFC]">
          {/* Supplier & Client Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#2A3446]">
            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7FA0D6] block mb-1">
                Billed By (Supplier)
              </span>
              <p className="font-bold text-[#F8FAFC] text-sm">Creo Creative Technologies Pvt. Ltd.</p>
              <p className="text-[#97A0B3] font-mono text-[11px]">GSTIN: 33AACCC1234F1Z9</p>
              <p className="text-[#97A0B3]">100 Creative Avenue, Cyber City</p>
              <p className="text-[#97A0B3]">Bangalore, KA 560100, India</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7FA0D6] block mb-1">
                Billed To (Client)
              </span>
              <p className="font-bold text-[#F8FAFC] text-sm">{invoice.companyName || invoice.clientName || "Valued Client Partner"}</p>
              <p className="text-[#97A0B3]">{invoice.clientEmail || "client@workspace.com"}</p>
              <p className="text-[#97A0B3] font-medium mt-1">Billing Date: {invoice.date}</p>
              <p className="text-emerald-300 font-semibold flex items-center gap-1 text-[11px] mt-1">
                <CheckCircle2 className="size-3.5 text-emerald-400" /> Payment Status: {invoice.status}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-[#2A3446]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050810] text-[#97A0B3] font-bold uppercase text-[10px] tracking-wider border-b border-[#2A3446]">
                <tr>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4">SAC Code</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446] bg-[#0B111C]">
                <tr>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#F8FAFC]">{invoice.plan} — Creative Retainer Plan</p>
                    <p className="text-[11px] text-[#97A0B3]">Monthly creative pod allocation & quota synthesis</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#97A0B3]">998311</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#F8FAFC]">1</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-[#F8FAFC]">
                    ₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
            <div className="text-xs text-[#97A0B3] max-w-xs space-y-1">
              <p className="flex items-center gap-1 font-semibold text-emerald-300">
                <ShieldCheck className="size-3.5 text-emerald-400" /> GST Tax Compliant Receipt
              </p>
              <p className="text-[11px] leading-relaxed text-[#97A0B3]">
                Computer-generated receipt issued by Creo Creative Technologies Pvt Ltd.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs border-t sm:border-t-0 pt-3 sm:pt-0 border-[#2A3446]">
              <div className="flex justify-between text-[#97A0B3]">
                <span>Subtotal (Excl. Tax):</span>
                <span className="font-semibold text-[#F8FAFC]">
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
                <span className="text-base text-[#0052FF]">
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
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#0052FF] to-[#0045D8] hover:brightness-110 text-white font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer"
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
