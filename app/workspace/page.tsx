import Home from "../page";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await requireChatGPTUser("/workspace");
  return <Home mode="private" userName={user.displayName} />;
}
