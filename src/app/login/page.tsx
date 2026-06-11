import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { QuireLogo } from "@/components/brand/logo";
import {
  SESSION_COOKIE,
  getAppPassword,
  sessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const expected = getAppPassword();
  if (!expected || password !== expected) {
    redirect("/login?error=1");
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  redirect("/studio");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!getAppPassword()) redirect("/studio");
  const { error } = await searchParams;

  return (
    <main className="grain flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <QuireLogo size="lg" />
        </div>
        <div className="rounded-3xl border border-line bg-paper-raised p-7 shadow-raised">
          <h1 className="font-display text-xl font-semibold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Enter your studio password to continue.
          </p>
          <form action={login} className="mt-5 grid gap-3">
            <input
              type="password"
              name="password"
              autoFocus
              required
              placeholder="Password"
              className="h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-sm text-ink placeholder:text-muted shadow-sm outline-none transition-all focus:border-muse/40 focus:ring-2 focus:ring-muse/20"
            />
            {error && (
              <p className="text-sm text-clay">That password didn&apos;t match. Try again.</p>
            )}
            <button
              type="submit"
              className="h-11 rounded-xl bg-ink text-sm font-medium text-paper shadow-soft transition-all hover:bg-ink/90 active:scale-[0.98]"
            >
              Open the studio
            </button>
          </form>
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          Quire — from a spark to a finished book.
        </p>
      </div>
    </main>
  );
}
