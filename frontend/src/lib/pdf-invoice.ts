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
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("Creo billing record", 20, 25);
  doc.setFontSize(11);
  const lines = [
    `Reference: ${inv.id}`,
    `Date: ${inv.date}`,
    `Status: ${inv.status}`,
    `Plan: ${inv.plan}`,
    `Amount: ${inv.amount}`,
    `Client: ${inv.companyName || inv.clientName || "Unavailable"}`,
    `Email: ${inv.clientEmail || "Unavailable"}`,
  ];
  lines.forEach((line, i) => doc.text(doc.splitTextToSize(line, 170), 20, 45 + i * 12));
  doc.text("Billing details are recorded by your subscription service.", 20, 145);
  doc.save(`${inv.id}.pdf`);
}
