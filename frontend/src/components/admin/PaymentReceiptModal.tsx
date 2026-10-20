import { useEffect } from "react";
import { useNavigate } from "react-router";
import {
  X,
  Check,
  Printer,
  Download,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { generateInvoicePDF, type InvoiceData } from "@/lib/pdf-invoice";

export interface PaymentReceiptData {
  id: string;
  client: string;
  clientEmail?: string;
  clientId?: string;
  amount: number;
  scope: string;
  method: string;
  status?: string;
  date: string;
  term?: string;
  quantity?: string;
}

interface PaymentReceiptModalProps {
  receipt: PaymentReceiptData | null;
  onClose: () => void;
  onNavigateToAccount?: () => void;
}

export function PaymentReceiptModal({
  receipt,
  onClose,
  onNavigateToAccount,
}: PaymentReceiptModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!receipt) return null;

  const numericAmount = receipt.amount || 25000;
  const baseAmount = +(numericAmount / 1.18).toFixed(2);
  const taxAmount = +(numericAmount - baseAmount).toFixed(2);
  const formattedTotal = `₹${numericAmount.toLocaleString("en-IN")}`;
  const formattedSubtotal = `₹${baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const formattedTax = `₹${taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const handleDownloadPDF = () => {
    const invoiceData: InvoiceData = {
      id: receipt.id,
      date: receipt.date,
      amount: formattedTotal,
      status: receipt.status || "Paid",
      plan: receipt.scope,
      clientName: receipt.client,
      clientEmail: receipt.clientEmail || `${receipt.client.toLowerCase().replace(/\s+/g, ".")}@workspace.com`,
      companyName: receipt.client,
    };
    generateInvoicePDF(invoiceData);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAccountNavigation = () => {
    if (onNavigateToAccount) {
      onNavigateToAccount();
    } else if (receipt.clientId) {
      onClose();
      navigate(`/admin/clients/${receipt.clientId}`);
    } else {
      onClose();
      navigate("/admin/clients");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in print:p-0 print:bg-white"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#121A26] border border-[#2A3446] rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#F8FAFC] print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/80 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-2xl text-white tracking-tighter leading-none">
              creo<span className="text-[#7FA0D6] text-3xl leading-none">.</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
              Payment Receipt
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white transition-colors cursor-pointer border border-[#2A3446]"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="p-2 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white transition-colors cursor-pointer border border-[#2A3446]"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white transition-colors cursor-pointer border border-[#2A3446] ml-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body (Styled after Image 2 with Creo Aesthetics) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Status Checkmark & Thanks Badge */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              Thanks!
            </span>
          </div>

          {/* Large Bold Headline (Matching Image 2) */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Your items have been renewed.
            </h1>
            <p className="text-xs text-[#97A0B3] font-medium">
              We received your payment for your monthly Creo Creative Retainer subscription.
            </p>
          </div>

          {/* Key Receipt Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#0B111C] border border-[#2A3446]/80 text-[11px]">
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#97A0B3] block">Client</span>
              <span className="font-bold text-white truncate block mt-0.5">{receipt.client}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#97A0B3] block">Invoice #</span>
              <span className="font-mono font-bold text-[#7FA0D6] truncate block mt-0.5">{receipt.id}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#97A0B3] block">Method</span>
              <span className="font-bold text-white truncate block mt-0.5">{receipt.method}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#97A0B3] block">Date</span>
              <span className="font-bold text-white truncate block mt-0.5">{receipt.date}</span>
            </div>
          </div>

          {/* Line Items Table (Exact structured layout from Image 2 in Creo styling) */}
          <div className="overflow-hidden rounded-2xl border border-[#2A3446] bg-[#0B111C]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#161F2D] border-b border-[#2A3446] text-[#97A0B3] font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-[45%]">Product</th>
                  <th className="py-3 px-3 text-center">Quantity</th>
                  <th className="py-3 px-3 text-center">Term</th>
                  <th className="py-3 px-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446]/70">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-4 align-top">
                    <p className="font-black text-white text-[13px] tracking-tight">{receipt.scope}</p>
                    <p className="text-[11px] text-[#97A0B3] mt-0.5 font-medium">
                      Creative Retainer · Dedicated Pod & SLA Deliverables
                    </p>
                  </td>
                  <td className="py-4 px-3 text-center align-top font-bold text-[#F8FAFC]">
                    {receipt.quantity || "1 Retainer"}
                  </td>
                  <td className="py-4 px-3 text-center align-top font-bold text-[#F8FAFC]">
                    {receipt.term || "1 Month"}
                  </td>
                  <td className="py-4 px-4 text-right align-top font-black text-white text-[13px]">
                    {formattedTotal}
                  </td>
                </tr>

                {/* Subtotal Row */}
                <tr className="bg-[#0B111C]/90 text-[11px]">
                  <td colSpan={3} className="py-2.5 px-4 text-right text-[#97A0B3] font-bold">
                    Subtotal:
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-white">
                    {formattedSubtotal}
                  </td>
                </tr>

                {/* Tax Row */}
                <tr className="bg-[#0B111C]/90 text-[11px]">
                  <td colSpan={3} className="py-2 px-4 text-right text-[#97A0B3] font-bold">
                    Tax (GST 18%):
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-white">
                    {formattedTax}
                  </td>
                </tr>

                {/* Total Row */}
                <tr className="bg-[#161F2D]/90 border-t-2 border-[#2A3446] text-xs">
                  <td colSpan={3} className="py-3 px-4 text-right font-black uppercase tracking-wider text-white">
                    Total:
                  </td>
                  <td className="py-3 px-4 text-right font-black text-base text-[#7FA0D6]">
                    {formattedTotal} INR
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action CTA Button (Matching Image 2: "Go to My Account ->") */}
          <div>
            <button
              type="button"
              onClick={handleAccountNavigation}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-[#BCCCE6] text-[#0B111C] font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <span>Go to Client Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Informative Paragraphs (Matching Image 2) */}
          <div className="space-y-3 text-xs text-[#97A0B3] leading-relaxed pt-2 border-t border-[#2A3446]/60">
            <p>
              We have billed your <strong className="text-white font-bold">{receipt.method}</strong> agreement for the amount of{" "}
              <strong className="text-[#7FA0D6] font-bold">{formattedTotal} INR</strong>. To review all your products, deliverables, and creative pod updates,{" "}
              <button
                type="button"
                onClick={handleAccountNavigation}
                className="text-[#7FA0D6] font-bold hover:underline cursor-pointer inline"
              >
                sign in to your Creo account
              </button>
              .
            </p>

            <p>
              If your products are on a 1 month subscription term, they will automatically renew next month at the same price listed here, unless otherwise indicated.
            </p>
          </div>

          {/* Footer Note (Matching Image 2) */}
          <div className="pt-4 border-t border-[#2A3446]/60 text-[10px] text-[#97A0B3]/80 leading-normal flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              NOTE: Your purchase includes enrollment in our automatic renewal service. This message confirms that billing for this service has been completed. Computer-generated official tax receipt issued by Creo Creative Technologies Pvt. Ltd.
            </p>
          </div>
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="px-6 py-4 border-t border-[#2A3446] bg-[#0B111C]/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
          <span className="text-[11px] text-[#97A0B3] font-medium hidden sm:inline">
            Status: <span className="text-emerald-400 font-bold">Settled & Confirmed</span>
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
