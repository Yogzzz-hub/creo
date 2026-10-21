import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { EASE_OUT_EXPO, MaskReveal, Reveal } from "../motion";
import { DistortImage } from "../motion/DistortImage";

const THUMBS = [
  "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80",
];

/** Working mock of the client portal's review panel: approve, request a change, undo. */
export function PortalDemo() {
  const [assets, setAssets] = useState([
    { id: 1, name: "Brand Launch Teaser", type: "Reel 9:16", status: "awaiting" },
    { id: 2, name: "Product Feature Breakdown", type: "Carousel 4 slides", status: "awaiting" },
    { id: 3, name: "Serum launch countdown", type: "Story 3 frames", status: "approved" },
  ]);

  const updateStatus = (id: number, status: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const approvedCount = assets.filter((a) => a.status === "approved").length;

  return (
    <div className="relative max-w-5xl mx-auto">
      <div aria-hidden="true" className="absolute inset-x-10 -top-10 -bottom-10 -z-10 rounded-[48px] bg-site-blue-deep/[0.12] blur-[90px]" />
      <Reveal delay={0.2} className="absolute -top-4 left-8 z-10">
        <div className="creo-glass-strong text-site-ice text-[11px] font-bold px-4 py-1.5 rounded-full tracking-[0.14em]">
          TRY IT — THIS PANEL WORKS
        </div>
      </Reveal>

      <MaskReveal from="center" zoom={1.06} duration={1.3}>
        <div className="creo-glass creo-beam rounded-3xl p-6 sm:p-10 relative overflow-hidden" style={{ "--creo-beam-delay": "-2s" } as React.CSSProperties}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-hi/[0.08]">
            <div className="font-black tracking-[-0.02em] text-site-ink text-xl sm:text-2xl">Batch 04 · Active Review</div>
            <div className="text-sm font-semibold text-site-mist flex items-center gap-4">
              <span className="hidden sm:block w-32 h-1.5 rounded-full bg-hi/[0.08] overflow-hidden">
                <motion.span
                  className="block h-full rounded-full bg-gradient-to-r from-site-blue-deep to-site-sky"
                  animate={{ width: `${(approvedCount / 3) * 100}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                />
              </span>
              <span>
                <motion.span key={approvedCount} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block text-site-ink font-black">
                  {approvedCount}
                </motion.span>{" "}
                of 3 approved &bull; <span className="text-site-peri">On track: 2 days early</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-8">
            {assets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                layout
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className={`group bg-site-deep/80 border rounded-2xl overflow-hidden flex flex-col transition-[border-color,box-shadow] duration-500 ${
                  asset.status === "approved"
                    ? "border-site-blue/70 shadow-[0_18px_40px_-18px_rgba(210,150,90,0.7)]"
                    : asset.status === "revision"
                      ? "border-site-amber/50"
                      : "border-hi/[0.08]"
                }`}
              >
                <div className="relative overflow-hidden">
                  <DistortImage
                    src={THUMBS[idx] ?? THUMBS[0] ?? ""}
                    alt={asset.name}
                    className="h-52 sm:h-60 w-full"
                    imgClassName="size-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-site-deep via-transparent to-transparent" />
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[11px] font-bold text-site-mist uppercase tracking-[0.14em] mb-1.5">
                    {asset.type.replace(" ", " • ")}
                  </div>
                  <div className="text-base font-bold text-site-ink mb-5 flex-1">{asset.name}</div>

                  <div className="flex items-center justify-between mt-auto min-h-[40px]">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={asset.status}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                        className="w-full"
                      >
                        {asset.status === "awaiting" && (
                          <div className="flex items-center gap-2.5 w-full">
                            <button
                              type="button"
                              onClick={() => updateStatus(asset.id, "approved")}
                              className="creo-btn-primary flex-1 font-semibold text-xs sm:text-sm py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="size-4" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(asset.id, "revision")}
                              className="creo-btn-ghost flex-1 font-semibold text-xs sm:text-sm py-2.5 rounded-full cursor-pointer"
                            >
                              Change
                            </button>
                          </div>
                        )}

                        {asset.status === "approved" && (
                          <div className="flex items-center justify-between w-full">
                            <div className="inline-flex items-center gap-1.5 text-site-peri text-xs font-bold">
                              <CheckCircle2 className="size-4 text-site-blue-light" /> Approved (queued)
                            </div>
                            <button
                              type="button"
                              onClick={() => updateStatus(asset.id, "awaiting")}
                              className="creo-btn-ghost text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer"
                            >
                              Undo
                            </button>
                          </div>
                        )}

                        {asset.status === "revision" && (
                          <div className="flex items-center justify-between w-full">
                            <div className="inline-flex items-center gap-1.5 text-site-amber text-xs font-bold">
                              <AlertCircle className="size-4" /> Revision requested
                            </div>
                            <button
                              type="button"
                              onClick={() => updateStatus(asset.id, "awaiting")}
                              className="creo-btn-ghost text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer"
                            >
                              Undo
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </MaskReveal>
    </div>
  );
}
