/**
 * Generate a simple device fingerprint based on browser properties.
 * Not cryptographically strong, but sufficient for device recognition.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() ?? "unknown",
  ];

  const raw = components.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Mobile|Android/.test(ua)) return "Mobile Browser";
  if (/Tablet|iPad/.test(ua)) return "Tablet Browser";
  return "Desktop Browser";
}
