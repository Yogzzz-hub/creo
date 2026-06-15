import { Navbar } from "@/components/public/navbar";
import { StickyCTABar } from "@/components/public/sticky-cta-bar";
import { Footer } from "@/components/public/footer";
import { ExitIntentPopup } from "@/components/public/exit-intent-popup";

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
