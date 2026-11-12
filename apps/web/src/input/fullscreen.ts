type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenRoot = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export function fullscreenActive(doc: Document = document): boolean {
  return Boolean(doc.fullscreenElement || (doc as FullscreenDocument).webkitFullscreenElement);
}
export function fullscreenSupported(doc: Document = document): boolean {
  const root = doc.documentElement as FullscreenRoot;
  return Boolean(
    (doc.fullscreenEnabled !== false && typeof root.requestFullscreen === "function") ||
    ((doc as FullscreenDocument).webkitFullscreenEnabled !== false &&
      typeof root.webkitRequestFullscreen === "function"),
  );
}
/** Call directly from a touch/click gesture; denial must never prevent starting a round. */
export async function enterMobileFullscreen(doc: Document = document): Promise<boolean> {
  if (fullscreenActive(doc)) return true;
  if (!fullscreenSupported(doc)) return false;
  const root = doc.documentElement as FullscreenRoot;
  try {
    if (doc.fullscreenEnabled !== false && root.requestFullscreen)
      await root.requestFullscreen({ navigationUI: "hide" });
    else await root.webkitRequestFullscreen!();
    return true;
  } catch {
    return false;
  }
}
export async function exitMobileFullscreen(doc: Document = document): Promise<void> {
  if (!fullscreenActive(doc)) return;
  try {
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else await (doc as FullscreenDocument).webkitExitFullscreen?.();
  } catch {
    /* The browser may have already left fullscreen. */
  }
}
