import jsPDF from "jspdf";

export interface InvoiceData {
  id: string;
  date: string;
  amount: string;
  status: string;
  plan: string;
  clientName?: string;
  clientEmail?: string;
  companyName?: string;
  gstin?: string;
}

export function generateInvoicePDF(inv: InvoiceData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  type RGB = [number, number, number];
  const primaryColor: RGB = [13, 33, 55]; // #0D2137
  const accentColor: RGB = [43, 123, 196]; // #2B7BC4
  const lightBg: RGB = [248, 250, 252]; // #F8FAFC
  const darkText: RGB = [30, 41, 59]; // #1E293B
  const mutedText: RGB = [100, 116, 139]; // #64748B
  const emeraldColor: RGB = [16, 185, 129]; // #10B981

  // Parse amount number
  const numericAmount = parseFloat(inv.amount.replace(/[^0-9.]/g, "")) || 25000;
  const baseAmount = +(numericAmount / 1.18).toFixed(2);
  const cgst = +((numericAmount - baseAmount) / 2).toFixed(2);
  const sgst = cgst;

  // 1. Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 36, "F");

  // Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CREO", 15, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("OFFICIAL TAX INVOICE & RECEIPT", 15, 27);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INVOICE", 195, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(inv.id, 195, 25, { align: "right" });

  // 2. Status Badge
  const isPaid = inv.status.toLowerCase() === "paid" || inv.status.toLowerCase() === "active";
  if (isPaid) {
    doc.setFillColor(...emeraldColor);
    doc.roundedRect(158, 28, 37, 6, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT CONFIRMED", 176.5, 32.2, { align: "center" });
  }

  // 3. Billing Metadata Cards (Billed From / Billed To)
  let y = 48;

  // Billed From Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(15, y, 88, 42, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentColor);
  doc.text("BILLED BY (SUPPLIER)", 20, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text("Creo Creative Technologies Pvt. Ltd.", 20, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedText);
  doc.text("GSTIN: 33AACCC1234F1Z9", 20, y + 18.5);
  doc.text("100 Creative Avenue, Cyber Towers", 20, y + 23.5);
  doc.text("Bangalore, KA 560100, India", 20, y + 28.5);
  doc.text("Support: billing@creo.design", 20, y + 33.5);

  // Billed To Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(107, y, 88, 42, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentColor);
  doc.text("BILLED TO (CLIENT)", 112, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text(inv.companyName || inv.clientName || "Valued Client Partner", 112, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedText);
  doc.text(`Email: ${inv.clientEmail || "client@workspace.com"}`, 112, y + 18.5);
  doc.text(`GSTIN: ${inv.gstin || "Unregistered / Consumer"}`, 112, y + 23.5);
  doc.text(`Billing Date: ${inv.date}`, 112, y + 28.5);
  doc.text(`Payment Gateway: Razorpay Online (UPI/Cards)`, 112, y + 33.5);

  // 4. Line Items Table Header
  y += 50;
  doc.setFillColor(...primaryColor);
  doc.rect(15, y, 180, 9, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DESCRIPTION / SERVICE TIER", 20, y + 6);
  doc.text("SAC CODE", 115, y + 6);
  doc.text("QTY", 145, y + 6, { align: "center" });
  doc.text("AMOUNT (INR)", 190, y + 6, { align: "right" });

  // Line Item Row 1
  y += 9;
  doc.setFillColor(255, 255, 255);
  doc.rect(15, y, 180, 18, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, 180, 18, "S");

  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(`${inv.plan} — Creative Retainer Plan`, 20, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text("Includes dedicated creative pod allocation & monthly asset quota", 20, y + 12.5);

  doc.setFont("helvetica", "medium");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkText);
  doc.text("998311", 115, y + 9);
  doc.text("1", 145, y + 9, { align: "center" });
  doc.text(`INR ${baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 190, y + 9, { align: "right" });

  // 5. Financial Summary Breakdown
  y += 24;

  const summaryLeft = 120;
  const valueRight = 190;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text("Subtotal (Excl. Tax):", summaryLeft, y);
  doc.setTextColor(...darkText);
  doc.text(`INR ${baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valueRight, y, { align: "right" });

  // CGST
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedText);
  doc.text("CGST (9.0%):", summaryLeft, y);
  doc.setTextColor(...darkText);
  doc.text(`INR ${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valueRight, y, { align: "right" });

  // SGST
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedText);
  doc.text("SGST (9.0%):", summaryLeft, y);
  doc.setTextColor(...darkText);
  doc.text(`INR ${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valueRight, y, { align: "right" });

  // Divider Line
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryLeft, y, 195, y);

  // Grand Total Box
  y += 6;
  doc.setFillColor(...accentColor);
  doc.roundedRect(summaryLeft - 5, y - 4.5, 80, 10, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL PAID (INR):", summaryLeft, y + 1.5);
  doc.text(`INR ${numericAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valueRight, y + 1.5, { align: "right" });

  // 6. Payment Terms & Declaration Box
  y += 22;
  doc.setFillColor(...lightBg);
  doc.roundedRect(15, y, 180, 26, 3, 3, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("TERMS & DECLARATION", 20, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text("1. All creative retainer subscriptions are billed monthly in advance.", 20, y + 11);
  doc.text("2. Tax is charged in compliance with Indian Goods & Services Tax (GST) regulations.", 20, y + 15.5);
  doc.text("3. This document constitutes an official proof of payment and tax invoice receipt.", 20, y + 20);

  // 7. Footer Seal & Timestamp
  const footerY = 275;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY - 5, 195, footerY - 5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedText);
  doc.text("Creo Creative Technologies Pvt Ltd | Tax Invoice Record | https://creo.design", 15, footerY);
  doc.text("Computer Generated Document — No Physical Signature Required", 195, footerY, { align: "right" });

  // Save the PDF
  doc.save(`${inv.id}.pdf`);
}
