import "../styles/public-theme.css";
import { IntroLoader } from "../components/public/IntroLoader";

/**
 * The website's brand intro, played when the app opens: the wordmark rises out of
 * its mask, then the curtain lifts onto sign-in or the workspace, which mounts as the
 * lift starts. Loaded only by the apps (see NativeShell).
 */
export default function AppIntro({ onLift, onDone }: { onLift: () => void; onDone: () => void }) {
  // .public-site isolates its children, so the wrapper itself must sit above the page.
  return (
    <div className="public-site fixed inset-0 z-[80]">
      <IntroLoader onLift={onLift} onDone={onDone} />
    </div>
  );
}
