export {
  SHELL_RESOURCES,
  findResource,
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
  envRequestsSandbox,
  assertSandboxCredentials,
} from "./parse.js";
export { runShellCommand } from "./execute.js";
export { inspectGatewayUrl, type InspectGatewayResult } from "./gateway.js";
export { formatShellOutput, formatShellError, shellErrorFromUnknown } from "./format.js";
export { formatHumanOutput } from "./format-human.js";
export {
  shellCommandCatalog,
  catalogEntry,
  catalogEntryFor,
  resolvedAuth,
  shellCommandRequiresJwt,
  SHELL_GROUPS,
  SHELL_GLOBALS,
} from "./catalog.js";
export {
  shellUsageText,
  shellWelcomeText,
  shellHelpAllText,
  formatHelpText,
  helpIndex,
  helpResource,
  helpCommand,
  isHelpInvocation,
  resolveHelp,
  usageHelpText,
  jwtRequiredResult,
  type ShellHelpView,
  type ShellHelpIndex,
  type ShellHelpResource,
  type ShellHelpCommand,
  type ShellHelpAll,
} from "./help.js";
export type {
  FlagType,
  ShellAuth,
  ShellResourceGroup,
  ShellCredentialKind,
  ShellFlagDef,
  ShellMethodDef,
  ShellResourceDef,
  ParsedShellCommand,
  ShellResult,
  ShellExecuteContext,
  ShellCatalogFlag,
  ShellCatalogEntry,
  ShellCommandCatalog,
} from "./types.js";
