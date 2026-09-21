import { AuthCard } from "@/components/auth-card";

export default async function SignUpPage({ searchParams }: PageProps<"/auth/sign-up">) {
  const { next } = await searchParams;
  return <AuthCard mode="sign-up" next={typeof next === "string" && next.startsWith("/") ? next : "/"} />;
}
