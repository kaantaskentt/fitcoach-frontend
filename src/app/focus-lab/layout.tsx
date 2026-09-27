import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Focus Lab — FitCoach",
  description:
    "Deep work timer, guided breathing, reaction, Schulte and Stroop training — FitCoach's lab for the mind that moves the weight.",
};

export const viewport: Viewport = {
  themeColor: "#0B0A09",
  colorScheme: "dark",
};

export default function FocusLabLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
