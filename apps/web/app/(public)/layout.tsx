import dynamic from "next/dynamic";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

const StickyCTABar = dynamic(
  () => import("@/components/public/sticky-cta-bar").then((mod) => mod.StickyCTABar),
  { ssr: false }
);

const ExitIntentPopup = dynamic(
  () => import("@/components/public/exit-intent-popup").then((mod) => mod.ExitIntentPopup),
  { ssr: false }
);

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      <StickyCTABar />
      <ExitIntentPopup />
    </>
  );
}
