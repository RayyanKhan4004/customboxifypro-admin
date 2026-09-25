"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button, Card, Input, Label, Spinner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Login failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/boxify-logo.svg"
            alt="Boxify"
            width={48}
            height={48}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            Boxify Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your workspace
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <Card className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : null}
              Sign in
            </Button>
          </Card>
        </form>
      </div>
    </main>
  );
}
