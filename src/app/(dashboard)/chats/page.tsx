"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUp,
  ChatCircle,
  NotePencil,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { apiGet, apiPatch, apiPost, qs } from "@/lib/api";
import type { AdminRecord, Paged } from "@/lib/types";
import type {
  ChatMessage,
  ChatQuote,
  Conversation,
  MessageHistory,
} from "@/lib/chat-types";

function customerOf(conversation: Conversation): {
  name: string;
  phone: string | null;
  email: string | null;
} {
  const customer =
    conversation.customer ??
    (typeof conversation.customerId === "object"
      ? conversation.customerId
      : null);
  return {
    name: customer?.name ?? conversation.waId,
    phone: customer?.phone ?? null,
    email: customer?.email ?? null,
  };
}

export default function ChatsPage() {
  return <Suspense fallback={<p>Loading inbox…</p>}><ChatsPageContent /></Suspense>;
}

function ChatsPageContent() {
  const { user, can } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("conversation"));
  const [now, setNow] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [error, setError] = useState("");
  const [optimistic, setOptimistic] = useState<ChatMessage[]>([]);
  const [assigneeId, setAssigneeId] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const list = useQuery({
    queryKey: ["chats", page, search, status, assignedToMe, user?.id],
    queryFn: () =>
      apiGet<Paged<Conversation>>(
        `/admin/chats${qs({ page, limit: 20, search: search || undefined, status: status || undefined, assignedTo: assignedToMe ? user?.id : undefined })}`,
      ),
    enabled: can("chats.read"),
    refetchInterval: 4_000,
  });
  const detail = useQuery({
    queryKey: ["chat", selectedId],
    queryFn: () => apiGet<Conversation>(`/admin/chats/${selectedId}`),
    enabled: Boolean(selectedId),
    refetchInterval: 4_000,
  });
  const history = useInfiniteQuery({
    queryKey: ["chat-messages", selectedId],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiGet<MessageHistory>(
        `/admin/chats/${selectedId}/messages${qs({ limit: 30, before: pageParam || undefined })}`,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(selectedId),
    refetchInterval: 4_000,
  });
  const notes = useQuery({
    queryKey: ["chat-notes", selectedId],
    queryFn: () => apiGet<ChatMessage[]>(`/admin/chats/${selectedId}/notes`),
    enabled: Boolean(selectedId),
    refetchInterval: 4_000,
  });
  const quotes = useQuery({
    queryKey: ["chat-quotes", selectedId],
    queryFn: () => apiGet<ChatQuote[]>(`/admin/chats/${selectedId}/quotes`),
    enabled: Boolean(selectedId),
  });
  const templates = useQuery({
    queryKey: ["chat-templates"],
    queryFn: () =>
      apiGet<Array<{ name: string; language: string; configured: boolean }>>(
        "/admin/chats/templates/available",
      ),
    enabled: can("chats.read"),
  });
  const admins = useQuery({
    queryKey: ["chat-assignees"],
    queryFn: () => apiGet<Paged<AdminRecord>>("/admin/admins?limit=100"),
    enabled: can("chats.assign") && can("admins.read"),
  });

  const invalidateChat = () => {
    void queryClient.invalidateQueries({ queryKey: ["chats"] });
    void queryClient.invalidateQueries({ queryKey: ["chat", selectedId] });
    void queryClient.invalidateQueries({
      queryKey: ["chat-messages", selectedId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["chat-notes", selectedId],
    });
  };
  const send = useMutation({
    mutationFn: async ({
      idempotencyKey,
      text,
    }: {
      idempotencyKey: string;
      text: string;
    }) =>
      apiPost<ChatMessage>(`/admin/chats/${selectedId}/messages`, {
        idempotencyKey,
        text,
      }),
    onSuccess: (message, variables) => {
      setOptimistic((current) =>
        current.map((item) =>
          item._id === variables.idempotencyKey ? message : item,
        ),
      );
      invalidateChat();
    },
    onError: (cause, variables) => {
      setOptimistic((current) =>
        current.map((item) =>
          item._id === variables.idempotencyKey
            ? { ...item, status: "failed" }
            : item,
        ),
      );
      setError(
        cause instanceof Error ? cause.message : "Message could not be queued.",
      );
    },
  });
  const addNote = useMutation({
    mutationFn: (text: string) =>
      apiPost(`/admin/chats/${selectedId}/notes`, { text }),
    onSuccess: () => {
      setNoteDraft("");
      invalidateChat();
    },
    onError: (cause) =>
      setError(
        cause instanceof Error ? cause.message : "Note could not be saved.",
      ),
  });
  const sendTemplate = useMutation({
    mutationFn: (name: string) =>
      apiPost(`/admin/chats/${selectedId}/send-template`, {
        name,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: invalidateChat,
    onError: (cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : "Template could not be queued.",
      ),
  });
  const updateStatus = useMutation({
    mutationFn: (next: "open" | "resolved") =>
      apiPatch(`/admin/chats/${selectedId}/status`, { status: next }),
    onSuccess: invalidateChat,
    onError: (cause) =>
      setError(
        cause instanceof Error ? cause.message : "Status update failed.",
      ),
  });
  const assign = useMutation({
    mutationFn: (assignedTo: string) =>
      apiPatch(`/admin/chats/${selectedId}/assign`, { assignedTo }),
    onSuccess: invalidateChat,
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "Assignment failed."),
  });

  const selectChat = (id: string) => {
    setSelectedId(id);
    setError("");
    setDraft("");
    setOptimistic([]);
    void apiPost(`/admin/chats/${id}/read`)
      .then(() => queryClient.invalidateQueries({ queryKey: ["chats"] }))
      .catch(() => {});
  };
  const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || send.isPending) return;
    const idempotencyKey = crypto.randomUUID();
    setOptimistic((current) => [
      ...current,
      {
        _id: idempotencyKey,
        direction: "outbound",
        text,
        type: "text",
        status: "sending",
        attachment: null,
        createdAt: new Date().toISOString(),
        failure: null,
      },
    ]);
    setDraft("");
    setError("");
    send.mutate({ idempotencyKey, text });
  };
  const submitNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noteDraft.trim()) addNote.mutate(noteDraft.trim());
  };

  const current = detail.data;
  const customer = current ? customerOf(current) : null;
  const serviceWindowOpen = Boolean(
    now > 0 &&
    current?.lastInboundAt &&
    now - new Date(current.lastInboundAt).getTime() <
      24 * 60 * 60 * 1000,
  );
  const serverMessages =
    history.data?.pages
      .slice()
      .reverse()
      .flatMap((item) => item.data) ?? [];
  const knownIds = new Set(serverMessages.map((item) => item._id));
  const messages = [
    ...serverMessages,
    ...optimistic.filter((item) => !knownIds.has(item._id)),
  ];

  if (!can("chats.read"))
    return (
      <p className="text-sm text-muted-foreground">
        You do not have access to conversations.
      </p>
    );

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-120 flex-col overflow-hidden rounded-xl border border-border bg-card md:h-[calc(100dvh-3rem)]">
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)] xl:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)_minmax(14rem,18rem)]">
        <section
          className={`${selectedId ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-border`}
          aria-label="Conversations"
        >
          <div className="space-y-3 border-b border-border p-4">
            <h1 className="text-lg font-semibold">WhatsApp inbox</h1>
            <Input
              aria-label="Search conversations"
              placeholder="Search name or phone"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md px-3"
            />
            <div className="flex gap-2">
              <Select
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All" },
                  { value: "open", label: "Open" },
                  { value: "resolved", label: "Resolved" },
                ]}
                className="min-w-0 flex-1"
              />
              {can("chats.read_all") && (
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={assignedToMe}
                    onChange={(event) => setAssignedToMe(event.target.checked)}
                  />{" "}
                  Mine
                </label>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.isLoading && (
              <p className="p-4 text-sm text-muted-foreground">
                Loading conversations…
              </p>
            )}
            {list.isError && (
              <p className="p-4 text-sm text-destructive">
                Could not load conversations.
              </p>
            )}
            {!list.isLoading && (list.data?.data.length ?? 0) === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No conversations found.
              </p>
            )}
            {list.data?.data.map((conversation) => {
              const itemCustomer = customerOf(conversation);
              return (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => selectChat(conversation._id)}
                  className={`w-full border-b border-border p-4 text-left hover:bg-muted ${selectedId === conversation._id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {itemCustomer.name}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {itemCustomer.phone ?? `+${conversation.waId}`}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {conversation.lastMessagePreview || "No messages yet"}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-border p-2 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page >= (list.data?.meta.totalPages ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </section>

        <section
          className={`${selectedId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}
          aria-label="Chat conversation"
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ChatCircle size={34} />
              <p>Select a conversation</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-border p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Back to conversations"
                    className="md:hidden"
                    onClick={() => setSelectedId(null)}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {customer?.name ?? "Loading…"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {customer?.phone ?? (current ? `+${current.waId}` : "")}
                    </p>
                  </div>
                </div>
                {current && can("chats.manage") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate(
                        current.status === "open" ? "resolved" : "open",
                      )
                    }
                  >
                    {current.status === "open" ? "Resolve" : "Reopen"}
                  </Button>
                )}
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {history.hasNextPage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={history.isFetchingNextPage}
                    onClick={() => history.fetchNextPage()}
                  >
                    Load older messages
                  </Button>
                )}
                {history.isLoading && (
                  <p className="text-sm text-muted-foreground">
                    Loading messages…
                  </p>
                )}
                {history.isError && (
                  <p className="text-sm text-destructive">
                    Could not load messages.
                  </p>
                )}
                {messages.length === 0 && !history.isLoading && (
                  <p className="text-center text-sm text-muted-foreground">
                    No messages yet.
                  </p>
                )}
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm md:max-w-[70%] ${message.direction === "outbound" ? "bg-primary/20" : "bg-muted"}`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                      {message.attachment && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {message.attachment.mimeType ?? "Attachment"} ·{" "}
                          {message.attachment.providerMediaId ? (
                            <a
                              href={`/api/v1/admin/chats/${selectedId}/messages/${message._id}/attachment`}
                              className="text-primary underline"
                            >
                              Download
                            </a>
                          ) : (
                            "Unsupported attachment"
                          )}
                        </p>
                      )}
                      <p className="mt-1 text-right text-[11px] text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {message.direction === "outbound"
                          ? ` · ${message.status}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {notes.data && notes.data.length > 0 && (
                <div className="max-h-24 overflow-y-auto border-t border-border bg-muted/40 px-4 py-2 text-xs">
                  <strong>Internal notes</strong>
                  {notes.data.map((note) => (
                    <p key={note._id} className="mt-1 break-words">
                      {note.text}
                    </p>
                  ))}
                </div>
              )}
              {error && (
                <p role="alert" className="px-4 py-1 text-xs text-destructive">
                  {error}
                </p>
              )}
              <div className="border-t border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setNoteMode(!noteMode)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <NotePencil size={14} />{" "}
                    {noteMode ? "Write message" : "Internal note"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {serviceWindowOpen
                      ? "Reply window open"
                      : "Reply window closed · use a template"}
                  </span>
                </div>
                {noteMode ? (
                  <form onSubmit={submitNote} className="flex gap-2">
                    <Input
                      aria-label="Internal note"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Only staff can see this note"
                      className="h-10 rounded-md px-3"
                    />
                    <Button
                      type="submit"
                      disabled={
                        !can("chats.notes.create") ||
                        addNote.isPending ||
                        !noteDraft.trim()
                      }
                    >
                      Save
                    </Button>
                  </form>
                ) : (
                  <form
                    onSubmit={submitMessage}
                    className="flex items-end gap-2"
                  >
                    <Textarea
                      aria-label="Message"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={
                        serviceWindowOpen
                          ? "Write a reply"
                          : "Free-form replies are unavailable"
                      }
                      disabled={!serviceWindowOpen || !can("chats.reply")}
                      className="min-h-16 rounded-md px-3 py-2"
                    />
                    <Button
                      type="submit"
                      aria-label="Send message"
                      disabled={
                        !serviceWindowOpen ||
                        !can("chats.reply") ||
                        send.isPending ||
                        !draft.trim()
                      }
                    >
                      <ArrowUp size={18} />
                    </Button>
                  </form>
                )}
                {!serviceWindowOpen &&
                  can("chats.templates.send") &&
                  (templates.data?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {templates.data?.map((template) => (
                        <Button
                          key={template.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={sendTemplate.isPending}
                          onClick={() => sendTemplate.mutate(template.name)}
                        >
                          Send {template.name} template
                        </Button>
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}
        </section>

        <aside
          className="hidden min-h-0 overflow-y-auto border-l border-border p-4 xl:block"
          aria-label="Customer details"
        >
          {current && (
            <>
              <h2 className="font-semibold">Customer</h2>
              <p className="mt-2 text-sm">{customer?.name}</p>
              <p className="break-all text-xs text-muted-foreground">
                {customer?.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {customer?.phone ?? `+${current.waId}`}
              </p>
              <h3 className="mt-6 font-semibold">Assignment</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {current.assignedTo ?? "Unassigned"}
              </p>
              {can("chats.assign") && user && (
                <div className="mt-2 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={assign.isPending}
                    onClick={() => assign.mutate(user.id)}
                  >
                    Assign to me
                  </Button>
                  {admins.data && (
                    <div className="flex gap-2">
                      <Select
                        value={assigneeId}
                        onChange={setAssigneeId}
                        options={[
                          { value: "", label: "Select agent" },
                          ...admins.data.data
                            .filter((item) => item.status === "active")
                            .map((item) => ({
                              value: item.id,
                              label: item.name,
                            })),
                        ]}
                        className="min-w-0 flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!assigneeId || assign.isPending}
                        onClick={() => assign.mutate(assigneeId)}
                      >
                        Assign
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <h3 className="mt-6 font-semibold">Quotes</h3>
              {quotes.data?.length ? (
                quotes.data.map((quote) => (
                  <div
                    key={quote._id}
                    className="mt-2 rounded-md border border-border p-2 text-xs"
                  >
                    <p className="font-medium">
                      {quote.quoteNumber ?? quote._id}
                    </p>
                    <p>
                      {quote.productName ?? "Custom request"} · {quote.status}
                    </p>
                    <p>Quantity: {quote.quantity ?? "—"}</p>
                    {can("requests.read") && (
                      <Link
                        href={`/requests?requestId=${quote._id}`}
                        className="mt-1 inline-block text-primary underline"
                      >
                        View request
                      </Link>
                    )}
                  </div>
                ))
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  No linked quotes.
                </p>
              )}
            </>
          )}
        </aside>
      </div>
      {selectedId && (
        <div className="border-t border-border p-3 xl:hidden">
          <details>
            <summary className="cursor-pointer text-sm">
              Customer and quote details
            </summary>
            <p className="mt-2 text-xs">
              {customer?.name} · {customer?.email} · {customer?.phone}
            </p>
            {quotes.data?.map((quote) => (
              <p key={quote._id} className="mt-1 text-xs">
                {quote.quoteNumber ?? quote._id}:{" "}
                {quote.productName ?? "Custom request"} · {quote.status}
                {can("requests.read") && (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      href={`/requests?requestId=${quote._id}`}
                      className="text-primary underline"
                    >
                      View
                    </Link>
                  </>
                )}
              </p>
            ))}
          </details>
        </div>
      )}
    </div>
  );
}
