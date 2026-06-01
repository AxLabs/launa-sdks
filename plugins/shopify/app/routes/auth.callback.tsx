import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { exchangeCode } from "../shopify.server.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return redirect("/");
  const session = exchangeCode("demo.myshopify.com", code);
  return redirect(`/app?session=${session.id}`);
}
