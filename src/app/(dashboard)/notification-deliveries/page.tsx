"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/components/auth-provider";
import { Button, PageHeader } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";

interface FailedDelivery {
  _id: string;
  channel: "email" | "whatsapp";
  recipient: string;
  status: "failed" | "uncertain" | "blocked";
  attempts: number;
  failure: string | null;
  providerReference?: string | null;
  updatedAt: string;
}

export default function NotificationDeliveriesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const deliveries = useQuery({
    queryKey: ["failed-deliveries"],
    queryFn: () =>
      apiGet<FailedDelivery[]>("/admin/notification-deliveries/failed"),
    enabled: can("settings.manage"),
  });
  const retry = useMutation({
    mutationFn: ({
      id,
      confirmPossibleDuplicate,
    }: {
      id: string;
      confirmPossibleDuplicate: boolean;
    }) =>
      apiPost(`/admin/notification-deliveries/${id}/retry`, {
        confirmPossibleDuplicate,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["failed-deliveries"] }),
  });

  if (!can("settings.manage"))
    return (
      <p className="text-sm text-muted-foreground">
        You do not have access to notification deliveries.
      </p>
    );
  return (
    <div>
      <PageHeader
        title="Notification deliveries"
        description="Review failed, uncertain, and approval-blocked email or WhatsApp deliveries."
      />
      {deliveries.isLoading && <p>Loading deliveries…</p>}
      {deliveries.isError && (
        <p role="alert" className="text-destructive">
          Deliveries could not be loaded.
        </p>
      )}
      {deliveries.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">No failed deliveries.</p>
      )}
      <div className="space-y-3">
        {deliveries.data?.map((item) => (
          <div
            key={item._id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {item.channel} · {item.status}
                </p>
                <p className="break-all text-sm text-muted-foreground">
                  {item.recipient}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attempts: {item.attempts} ·{" "}
                  {item.failure ?? "Unknown failure"}
                </p>
                {item.providerReference && (
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    Provider ID: {item.providerReference}
                  </p>
                )}
              </div>
              {(item.status !== "blocked" || item.channel === "whatsapp") && <Button
                type="button"
                variant="outline"
                disabled={retry.isPending}
                onClick={() => {
                  const uncertain = item.status === "uncertain";
                  if (
                    uncertain &&
                    !window.confirm(
                      "The provider may already have delivered this message. Retry may send a duplicate. Continue?",
                    )
                  )
                    return;
                  retry.mutate({
                    id: item._id,
                    confirmPossibleDuplicate: uncertain,
                  });
                }}
              >
                Retry
              </Button>}
            </div>
          </div>
        ))}
      </div>
      {retry.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {retry.error instanceof Error ? retry.error.message : "Retry failed."}
        </p>
      )}
    </div>
  );
}
