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
      kind: "api",
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
    const body: Record<string, unknown> = { error: result.error };
    if (result.code) body.code = result.code;
    if (result.status != null) body.status = result.status;
    if (result.hint) body.hint = result.hint;
    if (result.help) body.help = result.help;
    if (result.data && Object.keys(result.data).length > 0) body.data = result.data;
    return JSON.stringify(body, null, 2);
  }
  const lines = [result.error];
  if (result.hint) lines.push(result.hint);
  if (result.help) {
    lines.push("", result.help);
  } else if (result.data && Object.keys(result.data).length > 0) {
    lines.push("", formatHumanOutput(result.data));
  }
  return lines.join("\n");
}
