"use client";

import {
  ClockCounterClockwise,
  EnvelopeSimple,
  FolderSimple,
  Gauge,
  ImageSquare,
  ChatsCircle,
  List,
  Bell,
  Factory,
  Key,
  Package,
  ShieldCheck,
  SignOut,
  UploadSimple,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
import { apiGet, apiPost } from "@/lib/api";

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
      {
        href: "/home-page",
        label: "Home page",
        icon: Gauge,
        permission: "settings.manage",
      },
      {
        href: "/products",
        label: "Products",
        icon: Package,
        permission: "products.read",
      },
      {
        href: "/categories",
        label: "Categories",
        icon: FolderSimple,
        permission: "categories.manage",
      },
      {
        href: "/media",
        label: "Media",
        icon: ImageSquare,
        permission: "media.manage",
      },
      {
        href: "/industries",
        label: "Industries",
        icon: Factory,
        permission: "settings.manage",
      },
      {
        href: "/packaging-styles",
        label: "Packaging styles",
        icon: Package,
        permission: "settings.manage",
      },
      {
        href: "/bulk-imports",
        label: "Bulk imports",
        icon: UploadSimple,
        permission: "products.bulk-import",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/home-page",
        label: "Home page",
        icon: Gauge,
        permission: "settings.manage",
      },
      {
        href: "/requests",
        label: "Requests",
        icon: EnvelopeSimple,
        permission: "requests.read",
      },
      {
        href: "/chats",
        label: "Chats",
        icon: ChatsCircle,
        permission: "chats.read",
      },
      {
        href: "/notification-deliveries",
        label: "Deliveries",
        icon: Bell,
        permission: "settings.manage",
      },
      {
        href: "/audit-logs",
        label: "Audit logs",
        icon: ClockCounterClockwise,
        permission: "audit-logs.read",
      },
    ],
  },
  {
    title: "Access",
    items: [
      {
        href: "/home-page",
        label: "Home page",
        icon: Gauge,
        permission: "settings.manage",
      },
      {
        href: "/roles",
        label: "Roles",
        icon: ShieldCheck,
        permission: "roles.manage",
      },
      {
        href: "/admins",
        label: "Admins",
        icon: UsersThree,
        permission: "admins.read",
      },
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
      <form id="change-password-form" onSubmit={submit} className="space-y-4">
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useQuery({
    queryKey: ["in-app-notifications", user?.id],
    queryFn: () =>
      apiGet<{
        items: Array<{
          _id: string;
          title: string;
          href: string;
          readAt: string | null;
        }>;
        unread: number;
      }>("/admin/notifications"),
    enabled: Boolean(user),
    refetchInterval: 5_000,
  });
  const { toast, dismiss } = useToast();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Unable to load your session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-background/70 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`${menuOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-60 shrink-0 flex-col border-r border-border bg-card md:sticky md:top-0 md:flex md:h-screen`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <img src="/boxify-logo.svg" alt="Boxify" className="h-auto w-8" />
          <span className="font-semibold">Boxify Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <Link href="/dashboard" className={clsxNav("/dashboard", pathname)}>
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
                      onClick={() => setMenuOpen(false)}
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
            <IconButton
              title="Change password"
              onClick={() => setPasswordOpen(true)}
            >
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
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-4 md:px-6 md:py-6">
        <button
          type="button"
          className="mb-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm md:hidden"
          onClick={() => setMenuOpen(true)}
        >
          <List size={18} /> Menu
        </button>
        <div className="relative mb-3 flex justify-end">
          <button
            type="button"
            aria-label={`Notifications${notifications.data?.unread ? `, ${notifications.data.unread} unread` : ""}`}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-md border border-border p-2"
          >
            <Bell size={18} />
            {Boolean(notifications.data?.unread) && (
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {notifications.data?.unread}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-10 z-30 max-h-80 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-border bg-card p-2 shadow-lg">
              <p className="px-2 py-1 text-sm font-semibold">Notifications</p>
              {notifications.data?.items.length ? (
                notifications.data.items.map((item) => (
                  <Link
                    key={item._id}
                    href={item.href}
                    onClick={() => {
                      setNotificationsOpen(false);
                      void apiPost(
                        `/admin/notifications/${item._id}/read`,
                      ).then(() => notifications.refetch());
                    }}
                    className={`block rounded-md px-2 py-2 text-sm hover:bg-muted ${item.readAt ? "text-muted-foreground" : "font-medium"}`}
                  >
                    {item.title}
                  </Link>
                ))
              ) : (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No notifications.
                </p>
              )}
            </div>
          )}
        </div>
        {children}
      </main>
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
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  return active
    ? "flex items-center gap-2.5 rounded-md bg-primary/15 px-3 py-2 text-sm font-medium text-primary"
    : "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
}
