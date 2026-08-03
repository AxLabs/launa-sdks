export {
  SHELL_RESOURCES,
  shellUsageText,
  findMethod,
  buildArgvFromForm,
  argvToShellCommand,
} from "./registry.js";
export {
  tokenizeInput,
  parseShellArgv,
  parseShellInput,
  flag,
  idFlag,
  shellCommandNeedsCredentials,
} from "./parse.js";
export { runShellCommand } from "./execute.js";
export { inspectGatewayUrl, type InspectGatewayResult } from "./gateway.js";
export { formatShellOutput, formatShellError, shellErrorFromUnknown } from "./format.js";
export { formatHumanOutput } from "./format-human.js";
export type {
  FlagType,
  ShellFlagDef,
  ShellMethodDef,
  ShellResourceDef,
  ParsedShellCommand,
  ShellResult,
  ShellExecuteContext,
} from "./types.js";
