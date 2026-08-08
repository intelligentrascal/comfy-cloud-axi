import { installSessionStartHooks } from "axi-sdk-js";

export async function setupHooks(): Promise<string> {
  installSessionStartHooks({
    marker: "comfy-cloud-axi",
    binaryNames: ["comfy-cloud-axi"],
  });
  return "hooks installed or already up to date";
}
