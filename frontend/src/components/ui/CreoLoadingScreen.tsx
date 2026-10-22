import { CreoLoader } from "./CreoLoader";

interface CreoLoadingScreenProps {
  label?: string;
  sublabel?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * CREO Nebula Session Verification & Loading Screen
 *
 * Uses the official CREO Nebula wave loader.
 */
export function CreoLoadingScreen({
  label,
  sublabel,
  fullScreen = true,
  className = "",
}: CreoLoadingScreenProps) {
  // If a custom label is provided that differs from standard, adapt it cleanly
  const isDefaultOrAuth =
    !label ||
    label.toLowerCase().includes("auth") ||
    label.toLowerCase().includes("session") ||
    label.toLowerCase().includes("verif");

  const primaryLabel = isDefaultOrAuth ? "VERIFYING" : label.toUpperCase();
  const highlightWord = isDefaultOrAuth ? "SESSION" : "";
  const secondaryText = sublabel ? sublabel.toUpperCase() : "SECURE CONNECTION";

  return (
    <CreoLoader
      label={primaryLabel}
      highlightWord={highlightWord}
      secondaryText={secondaryText}
      fullScreen={fullScreen}
      className={className}
    />
  );
}

export default CreoLoadingScreen;
