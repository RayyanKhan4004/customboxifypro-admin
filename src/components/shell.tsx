"use client";

import {
  KeyIcon,
  ShieldCheckIcon,
  SignOutIcon,
  UsersThreeIcon,
  BellIcon,
  ClockCounterClockwiseIcon,
  ChatsCircleIcon,
  EnvelopeSimpleIcon,
  UploadSimpleIcon,
  PackageIcon,
  FactoryIcon,
  ImageSquareIcon,
  FolderSimpleDashedIcon,
  GaugeIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
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
        icon: GaugeIcon,
        permission: "settings.manage",
      },
      {
        href: "/products",
        label: "Products",
        icon: PackageIcon,
        permission: "products.read",
      },
      {
        href: "/categories",
        label: "Categories",
        icon: FolderSimpleDashedIcon,
        permission: "categories.manage",
      },
      {
        href: "/media",
        label: "Media",
        icon: ImageSquareIcon,
        permission: "media.manage",
      },
      {
        href: "/industries",
        label: "Industries",
        icon: FactoryIcon,
        permission: "settings.manage",
      },
      {
        href: "/packaging-styles",
        label: "Packaging styles",
        icon: PackageIcon,
        permission: "settings.manage",
      },
      {
        href: "/bulk-imports",
        label: "Bulk imports",
        icon: UploadSimpleIcon,
        permission: "products.bulk-import",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/requests",
        label: "Requests",
        icon: EnvelopeSimpleIcon,
        permission: "requests.read",
      },
      {
        href: "/chats",
        label: "Chats",
        icon: ChatsCircleIcon,
        permission: "chats.read",
      },
      {
        href: "/notification-deliveries",
        label: "Deliveries",
        icon: BellIcon,
        permission: "settings.manage",
      },
      {
        href: "/audit-logs",
        label: "Audit logs",
        icon: ClockCounterClockwiseIcon,
        permission: "audit-logs.read",
      },
    ],
  },
  {
    title: "Access",
    items: [
      {
        href: "/roles",
        label: "Roles",
        icon: ShieldCheckIcon,
        permission: "roles.manage",
      },
      {
        href: "/admins",
        label: "Admins",
        icon: UsersThreeIcon,
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
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
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
  const pageLabel =
    pathname === "/dashboard"
      ? "Workspace overview"
      : (NAV_SECTIONS.flatMap((section) => section.items).find(
          (item) =>
            pathname === item.href || pathname.startsWith(`${item.href}/`),
        )?.label ?? "Admin workspace");

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
        <Button
          type="button"
          variant="ghost"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 h-full w-full rounded-none bg-background/70 p-0 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`${menuOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col border-r border-border bg-card shadow-2xl shadow-black/20 md:sticky md:top-0 md:flex md:h-screen md:shadow-none`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <Image
            src="/boxify-logo.svg"
            alt="Boxify"
            width={32}
            height={32}
            priority
          />
          <div>
            <p className="text-sm font-semibold tracking-tight">Boxify</p>
            <p className="text-[11px] text-muted-foreground">Admin workspace</p>
          </div>
        </div>
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          <Link
            href="/dashboard"
            className={clsxNav("/dashboard", pathname)}
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <GaugeIcon size={18} weight="regular" />
            Dashboard
          </Link>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mt-6 first:mt-2">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                      aria-current={
                        pathname.startsWith(item.href) ? "page" : undefined
                      }
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
              <KeyIcon size={16} />
            </IconButton>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => logout()}
          >
            <SignOutIcon size={14} />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              className="md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <ListBulletsIcon size={18} /> Menu
            </Button>
            <div className="hidden text-sm font-medium text-muted-foreground sm:block">
              {pageLabel}
            </div>
          </div>
          <div className="relative flex justify-end">
            <Button
              type="button"
              variant="ghost"
              aria-label={`Notifications${notifications.data?.unread ? `, ${notifications.data.unread} unread` : ""}`}
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative h-10 w-10 border border-border bg-card p-0! text-muted-foreground hover:text-foreground"
            >
              <BellIcon size={18} />
              {Boolean(notifications.data?.unread) && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-5 text-primary-foreground">
                  {notifications.data?.unread}
                </span>
              )}
            </Button>
            {notificationsOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 max-h-[min(28rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-black/30">
                <p className="px-3 py-2 text-sm font-semibold">Notifications</p>
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
                      className={`block rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted ${item.readAt ? "text-muted-foreground" : "font-medium text-foreground"}`}
                    >
                      {item.title}
                    </Link>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No notifications.
                  </p>
                )}
              </div>
            )}
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
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
    ? "flex min-h-10 items-center gap-3 rounded-xl bg-primary/12 px-3 text-sm font-semibold text-primary"
    : "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
}
