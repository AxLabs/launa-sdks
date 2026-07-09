import { Ax402Error } from "../http.js";
import { formatHumanOutput } from "./format-human.js";
import type { ShellResult } from "./types.js";

export function formatShellOutput(
  data: unknown,
  json: boolean,
  cmd = "",
  sub = "",
): string {
  if (json) return JSON.stringify(data, null, 2);
  if (typeof data === "string") return data;
  return formatHumanOutput(data, cmd, sub);
}

export function shellErrorFromUnknown(err: unknown): ShellResult {
  if (err instanceof Ax402Error) {
    return {
      ok: false,
      error: `${err.status}: ${err.message}`,
      status: err.status,
      data: err.data,
    };
  }
  if (err instanceof TypeError && String(err).includes("Failed to fetch")) {
    return {
      ok: false,
      error:
        "Network error: cross-origin fetch blocked (CORS) or host unreachable. For browser inspect/pay, the gateway must allow your dashboard origin via Access-Control-Allow-Origin.",
    };
  }
  return { ok: false, error: String(err) };
}

export function formatShellError(result: Extract<ShellResult, { ok: false }>, json: boolean): string {
  if (json) {
    return JSON.stringify({ error: result.error, status: result.status, data: result.data }, null, 2);
  }
  const lines = [result.error];
  if (result.data && Object.keys(result.data).length > 0) {
    lines.push("", formatHumanOutput(result.data));
  }
  return lines.join("\n");
}
