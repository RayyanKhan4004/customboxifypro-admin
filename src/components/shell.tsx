"use client";

import {
  ClockCounterClockwise,
  EnvelopeSimple,
  FolderSimple,
  Gauge,
  ImageSquare,
  Key,
  Package,
  ShieldCheck,
  SignOut,
  Sliders,
  UploadSimple,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import {
  Button,
  Field,
  IconButton,
  Input,
  Modal,
  Spinner,
  ToastHost,
  useToast,
} from "@/components/ui";
import { apiPost } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "fill" | "regular" }>;
  permission?: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Catalog",
    items: [
      { href: "/products", label: "Products", icon: Package, permission: "products.read" },
      { href: "/categories", label: "Categories", icon: FolderSimple, permission: "categories.manage" },
      { href: "/filters", label: "Filters", icon: Sliders, permission: "filters.manage" },
      { href: "/media", label: "Media", icon: ImageSquare, permission: "media.manage" },
      { href: "/bulk-imports", label: "Bulk imports", icon: UploadSimple, permission: "products.bulk-import" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/requests", label: "Requests", icon: EnvelopeSimple, permission: "requests.read" },
      { href: "/audit-logs", label: "Audit logs", icon: ClockCounterClockwise, permission: "audit-logs.read" },
    ],
  },
  {
    title: "Access",
    items: [
      { href: "/roles", label: "Roles", icon: ShieldCheck, permission: "roles.manage" },
      { href: "/admins", label: "Admins", icon: UsersThree, permission: "admins.read" },
    ],
  },
];

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/admin/auth/change-password", {
        currentPassword,
        newPassword,
      });
      show.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Change failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      footer={
        <Button type="submit" form="change-password-form" disabled={busy}>
          {busy ? <Spinner /> : null}
          Change password
        </Button>
      }
    >
      <form
        id="change-password-form"
        onSubmit={submit}
        className="space-y-4"
      >
        <Field label="Current password">
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <Input
            type="password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout, can } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { toast, dismiss } = useToast();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null; // proxy / api client will redirect to /login
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            B
          </div>
          <span className="font-semibold">Boxify Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <Link
            href="/dashboard"
            className={clsxNav("/dashboard", pathname)}
          >
            <Gauge size={18} weight="regular" />
            Dashboard
          </Link>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mt-4">
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              {section.items
                .filter((item) => !item.permission || can(item.permission))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsxNav(item.href, pathname)}
                    >
                      <Icon size={18} weight="regular" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <IconButton title="Change password" onClick={() => setPasswordOpen(true)}>
              <Key size={16} />
            </IconButton>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => logout()}
          >
            <SignOut size={14} />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden px-6 py-6">{children}</main>
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}

function clsxNav(href: string, pathname: string): string {
  const active =
    href === "/dashboard"
      ? pathname === href
      : pathname.startsWith(href);
  return active
    ? "flex items-center gap-2.5 rounded-md bg-primary/15 px-3 py-2 text-sm font-medium text-primary"
    : "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
}
