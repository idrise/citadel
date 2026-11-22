/** The build command, not NODE_ENV or Vite's DEV flag, owns diagnostic visibility. */
export function localDiagnosticsEnabled(
  command: "build" | "serve",
  mode: string,
  isPreview = false,
) {
  return mode !== "reddit" && (mode === "local-debug" || (command === "serve" && !isPreview));
}
