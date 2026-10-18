"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppHeader } from "@/components/app/app-header";
import {
  AppShellContext,
  type AppShellContextValue,
} from "@/components/app/app-shell-context";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { AuthModal } from "@/components/auth/auth-modal";
import { LanguageModal } from "@/components/preferences/language-modal";
import {
  preferencesQueryOptions,
  streakQueryOptions,
  type ApiEnvelope,
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { DEFAULT_LANGUAGE } from "@/lib/language";
import { ownsHeader } from "@/lib/navigation";
import type { UserPreferences } from "@/lib/types";

/**
 * Shared chrome for the word views: session state, header, bottom navigation,
 * and the account-level dialogs. Pages render only their own content, so
 * `/` and `/remembered` stay small and independent.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [authOpen, setAuthOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const signedIn = Boolean(session?.user);
  const sessionLabel = signedIn ? session?.user?.name || "Learner" : "";

  // A page that draws its own header takes the app bar's place, so the shell
  // must not reserve room for a bar it does not render.
  const bare = ownsHeader(pathname);

  const preferencesQuery = useQuery(preferencesQueryOptions(signedIn));
  const streakQuery = useQuery(streakQueryOptions(signedIn));
  const preferredLanguage =
    preferencesQuery.data?.translationLanguage ?? DEFAULT_LANGUAGE;

  const showOnboarding =
    signedIn &&
    preferencesQuery.isSuccess &&
    preferencesQuery.data.onboardedAt === null;

  function openAuth() {
    setAuthOpen(true);
  }

  function handlePreferencesSaved(preferences: UserPreferences) {
    queryClient.setQueryData<ApiEnvelope<UserPreferences>>(
      ["preferences"],
      (previous) =>
        previous ? { ...previous, data: preferences } : { data: preferences },
    );
    void queryClient.invalidateQueries({ queryKey: ["remembered-words"] });
  }

  async function signOut() {
    setSigningOut(true);
    try {
      // `signOut` reports failures both by throwing and by resolving with
      // `error`; a resolved error must not be treated as a signed-out state.
      const { error } = await authClient.signOut();
      if (error) throw error;
      queryClient.removeQueries({ queryKey: ["remembered-words"] });
      queryClient.removeQueries({ queryKey: ["streak"] });
      queryClient.removeQueries({ queryKey: ["preferences"] });
      setAuthOpen(false);
      toast.success("Signed out. Your progress stays in your account.");
      router.refresh();
    } catch {
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const context: AppShellContextValue = {
    signedIn,
    isSessionPending,
    preferredLanguage,
    openAuth,
  };

  return (
    <AppShellContext.Provider value={context}>
      <div
        className={`grid-pattern flex min-h-dvh flex-col bg-canvas px-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] sm:px-6 lg:h-dvh lg:overflow-hidden lg:px-6 lg:pt-6 lg:pb-6 ${
          bare ? "pt-0" : "pt-[4.5rem]"
        }`}
      >
        <div className="mx-auto flex w-full max-w-310 flex-col gap-4 lg:h-full lg:min-h-0">
          <AppHeader
            signedIn={signedIn}
            isSessionPending={isSessionPending}
            sessionLabel={sessionLabel}
            streak={streakQuery.data ?? 0}
            actionLoading={signingOut}
            onSignOut={() => void signOut()}
            onSignIn={openAuth}
            showMobileBar={!bare}
          />

          {children}
        </div>
      </div>

      <MobileBottomNav signedIn={signedIn} onSignIn={openAuth} />

      <AuthModal
        open={authOpen && !signedIn}
        onClose={() => setAuthOpen(false)}
      />

      {showOnboarding ? (
        <LanguageModal
          currentLanguage={preferredLanguage}
          onSaved={handlePreferencesSaved}
        />
      ) : null}
    </AppShellContext.Provider>
  );
}
