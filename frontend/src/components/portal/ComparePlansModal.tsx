import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PricingCards } from "../public/PricingCards";
export function ComparePlansModal({ isOpen, onClose, currentPlanName, onOpenNegotiation }: { isOpen: boolean; onClose: () => void; currentPlanName: string; onOpenNegotiation: (topic: string) => void }) {
  useEffect(() => { if (!isOpen) return; const old = document.body.style.overflow; document.body.style.overflow = "hidden"; const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", key); return () => { document.body.style.overflow = old; window.removeEventListener("keydown", key); }; }, [isOpen, onClose]);
  if (!isOpen) return null;
  return createPortal(<div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="Compare plans" className="max-w-6xl w-full max-h-[90vh] overflow-auto bg-[#161F2D] rounded-2xl p-6 text-white space-y-5" onClick={e => e.stopPropagation()}><button onClick={onClose}>Close</button><h2 className="text-xl font-bold">Compare current plans</h2><p>Current plan: {currentPlanName || "No plan assigned"}</p><PricingCards /><button onClick={() => { onClose(); onOpenNegotiation("Plan change or custom pricing"); }}>Request a plan change or custom quote</button></section></div>, document.body);
}
