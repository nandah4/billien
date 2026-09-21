import { AuthCard } from "@/components/auth-card";

export default async function SignInPage({ searchParams }: PageProps<"/auth/sign-in">) {
  const { next } = await searchParams;
  return <AuthCard mode="sign-in" next={typeof next === "string" && next.startsWith("/") ? next : "/"} />;
}
