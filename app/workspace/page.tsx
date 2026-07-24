import Home from "../page";
import { requireCurrentIdentity } from "../../lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WorkspacePage() {
  const user = await requireCurrentIdentity("/workspace");
  return <Home mode="private" userName={user.displayName} />;
}
