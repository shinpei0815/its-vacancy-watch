import { Dashboard } from "./dashboard";
import { requireChatGPTUser } from "./chatgpt-auth";
import { japanToday } from "../lib/japan-date";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");

  return (
    <Dashboard
      currentUser={{ email: user.email, displayName: user.displayName }}
      today={japanToday()}
    />
  );
}
