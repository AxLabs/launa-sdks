import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const session = url.searchParams.get("session");
  return redirect(session ? `/app?session=${session}` : "/app?session=offline_dev");
}
