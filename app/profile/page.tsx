import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { getAuth } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";
import { getUserSummary } from "@/lib/user-words";

export const metadata = {
  title: "Profile — Billien",
};

// The page reads the session cookie, so it is never prerendered.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { data: session } = await getAuth().getSession();
  const user = session?.user;
  if (!user) redirect("/");

  const [preferences, summary] = await Promise.all([
    getUserPreferences(user.id),
    getUserSummary(user.id),
  ]);

  return (
    <ProfileView
      user={{ name: user.name ?? "", email: user.email ?? "" }}
      preferences={preferences}
      summary={summary}
    />
  );
}
