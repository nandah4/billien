import { redirect } from "next/navigation";

/**
 * Sign-up is the same Google flow as sign-in, which now runs in a modal on the
 * home page. This route is kept so existing links do not 404.
 */
export default function SignUpPage() {
  redirect("/");
}
