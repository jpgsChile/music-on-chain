/**
 * MOC pin of the external Trust-Native C-BIND/1 consumable artifact.
 * Source of truth remains Trust-Native; this file only identifies the pin.
 * Trust-Native does not depend on MOC.
 */
import release from "@/contracts/c-bind/1/release.json";

export const C_BIND_PROFILE = "C-BIND/1" as const;
export const C_BIND_RELEASE = "1.0.0" as const;
export const C_BIND_CDR = "CDR-008" as const;
export const C_BIND_ARTIFACT = "contracts/c-bind/1/release.json" as const;

export const C_BIND_PIN = {
  profile: release.profile,
  release: release.release,
  cdr: release.cdr,
  status: release.status,
  artifact: C_BIND_ARTIFACT,
} as const;

if (C_BIND_PIN.profile !== C_BIND_PROFILE) {
  throw new Error("C-BIND pin profile mismatch");
}
if (C_BIND_PIN.release !== C_BIND_RELEASE) {
  throw new Error("C-BIND pin release mismatch");
}
if (C_BIND_PIN.cdr !== C_BIND_CDR) {
  throw new Error("C-BIND pin CDR mismatch");
}
