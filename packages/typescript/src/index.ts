export { Ax402Client, type Ax402ClientOptions } from "./client.js";
export { Ax402Error, HttpClient } from "./http.js";
export * from "./types.js";
export * from "./scopes.js";
export {
  usdcToAtomic,
  atomicToUsdc,
  buildUsdcAccept,
  gatewayURL,
  gatewayBaseURL,
  setupApiWithDefaultDomain,
  wrapOpenAPI,
  USDC_DECIMALS,
} from "./platform/helpers.js";
export type { PaymentScheme } from "./platform/helpers.js";
