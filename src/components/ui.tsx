"use client";

import { InfoIcon, SpinnerIcon, XIcon } from "@phosphor-icons/react";
import { clsx } from "clsx";
import ReactSelect, { SingleValue } from "react-select";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-50",
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50",
  danger:
    "bg-destructive text-destructive-foreground hover:brightness-110 disabled:opacity-50",
  outline:
    "border border-border bg-transparent hover:bg-muted disabled:opacity-50",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed",
        size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      title={title}
      className={clsx(
        "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

const inputClasses =
  "h-11 w-full rounded-xl border border-input bg-muted/70 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:bg-card disabled:cursor-not-allowed disabled:opacity-50";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputClasses, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "min-h-30 w-full resize-none rounded-xl border border-input bg-muted/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:bg-card disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onChange,
  options = [],
  placeholder,
  className,
  disabled,
  id,
  required,
}: {
  value?: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <ReactSelect
      inputId={id}
      className={clsx("text-sm", className)}
      classNamePrefix="rs"
      isDisabled={disabled}
      placeholder={placeholder ?? "SelectÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦"}
      options={options}
      value={selected}
      onChange={(option) => {
        const val = (option as SingleValue<SelectOption>)?.value ?? "";
        if (required && !val) return;
        onChange?.(val);
      }}
      isSearchable={false}
      menuPlacement="auto"
      menuPortalTarget={
        typeof document === "undefined" ? undefined : document.body
      }
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: "2.75rem",
          height: "2.75rem",
          borderRadius: "0.75rem",
          borderColor: state.isFocused ? "var(--primary)" : "transparent",
          boxShadow: "none",
          backgroundColor: "var(--muted)",
          cursor: "pointer",
          fontSize: 14,
          transition: "border-color 150ms ease",
          "&:hover": {
            borderColor: "var(--primary)",
          },
        }),
        valueContainer: (base) => ({ ...base, padding: "0 1.25rem" }),
        singleValue: (base) => ({ ...base, color: "var(--foreground)" }),
        placeholder: (base) => ({
          ...base,
          color: "color-mix(in srgb, var(--foreground) 50%, transparent)",
        }),
        indicatorSeparator: () => ({ display: "none" }),
        dropdownIndicator: (base) => ({
          ...base,
          color: "var(--foreground)",
          padding: "0 1rem 0 0",
        }),
        menu: (base) => ({
          ...base,
          zIndex: 50,
          overflow: "hidden",
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
        }),
        menuPortal: (base) => ({ ...base, zIndex: 70 }),
        menuList: (base) => ({ ...base, padding: "0.25rem 0" }),
        option: (base, state) => ({
          ...base,
          padding: "0.625rem 1rem",
          backgroundColor: state.isFocused
            ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
            : "transparent",
          color: "var(--foreground)",
          fontSize: 14,
          cursor: "pointer",
          ":active": {
            backgroundColor: "transparent",
          },
        }),
      }}
    />
  );
}

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={clsx(
        "h-4 w-4 shrink-0 rounded border-input bg-transparent accent-[var(--primary)]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx(
        "mb-1 block text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  error,
  children,
  hint,
  tooltip,
}: {
  label: string;
  error?: string;
  hint?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const tooltipId = useId();
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Label className="mb-0" htmlFor={id}>
          {label}
        </Label>
        {tooltip && (
          <span className="group relative inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`About ${label.replace(/\s*\*$/, "")}`}
              aria-describedby={tooltipId}
              className="h-6 w-6 rounded-full p-0 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <InfoIcon aria-hidden size={15} />
            </Button>
            <span
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs font-normal leading-5 text-popover-foreground shadow-lg group-hover:block group-focus-within:block"
            >
              {tooltip}
            </span>
          </span>
        )}
      </div>
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            { id },
          )
        : children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type BadgeTone =
  "default" | "success" | "warning" | "danger" | "info" | "muted";

const badgeTones: Record<BadgeTone, string> = {
  default: "bg-secondary text-foreground border-border",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/15 text-red-400 border-red-500/30",
  info: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <SpinnerIcon
      size={32}
      className={clsx("animate-spin text-current", className)}
      aria-label="Loading"
      role="status"
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-card shadow-sm shadow-black/10",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Table({
  headers,
  children,
  empty,
  loading,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center">
                <div className="flex justify-center text-muted-foreground">
                  <Spinner className="h-6 w-6" />
                </div>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
      {!loading && !React.Children.count(children) && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {empty ?? "No records found."}
        </div>
      )}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={clsx(
          "my-auto w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40",
          wide ? "max-w-4xl" : "max-w-lg",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <h2
            id="admin-modal-title"
            className="text-base font-semibold tracking-tight"
          >
            {title}
          </h2>
          <IconButton onClick={onClose} aria-label="Close">
            <XIcon className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="max-h-[min(76vh,52rem)] overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-5 w-9 shrink-0 rounded-full p-0 transition-colors hover:bg-transparent",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={clsx(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-4.5 translate-x-[18px]" : "translate-x-1",
        )}
      />
    </Button>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
  );
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota/private-mode errors
    }
  }, [key, state]);
  return [state, setState];
}

export function Toast({
  message,
  tone = "error",
  onClose,
}: {
  message: string;
  tone?: "error" | "success";
  onClose: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    timer.current = setTimeout(onClose, 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [onClose]);
  return (
    <div
      className={clsx(
        "fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg",
        tone === "error"
          ? "border-red-500/30 bg-[#2a1212] text-red-200"
          : "border-emerald-500/30 bg-[#12221a] text-emerald-200",
      )}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      <IconButton
        onClick={onClose}
        className="text-current/70 hover:text-current"
        aria-label="Dismiss"
      >
        <span aria-hidden="true" className="text-base leading-none">
          Ã—
        </span>
      </IconButton>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    tone?: "error" | "success";
    id: number;
  } | null>(null);

  const show = useMemo(
    () => ({
      error: (message: string) =>
        setToast({ message, tone: "error", id: Date.now() }),
      success: (message: string) =>
        setToast({ message, tone: "success", id: Date.now() }),
    }),
    [],
  );

  return { toast, show, dismiss: () => setToast(null) };
}

export function ToastHost({
  toast,
  dismiss,
}: {
  toast: { message: string; tone?: "error" | "success"; id: number } | null;
  dismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <Toast
      key={toast.id}
      message={toast.message}
      tone={toast.tone}
      onClose={dismiss}
    />
  );
}
