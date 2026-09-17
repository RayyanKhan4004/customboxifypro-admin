"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button, Field, Input, PageHeader, Select, Spinner, Textarea, ToastHost, useToast } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import type { HomePageContent } from "@/lib/types";

const fallback: HomePageContent = {
  pageMode: "home", countdownTargetDate: undefined, eyebrow: "CUSTOM PACKAGING, ENGINEERED", title: "Every Brand Deserves A Box", titleAccent: "Worth Opening.",
  description: "Custom Boxify Pro is a faster way to design, quote, and produce custom packaging from first sketch to finished carton.",
  primaryCtaLabel: "Explore Packaging", primaryCtaHref: "#packaging-style", secondaryCtaLabel: "Contact Now", secondaryCtaHref: "#quote",
  customersValue: "500+", satisfactionValue: "99%",
};

export default function HomePageEditor() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();
  const [form, setForm] = useState<HomePageContent>(fallback);
  const [error, setError] = useState<string | null>(null);
  const page = useQuery({ queryKey: ["home-page"], queryFn: () => apiGet<HomePageContent>("/admin/home-page") });

  useEffect(() => { if (page.data) setForm(page.data); }, [page.data]);
  const save = useMutation({
    mutationFn: () => apiPatch("/admin/home-page", form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["home-page"] }); show.success("Home page saved."); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Save failed."),
  });
  const update = <Key extends keyof HomePageContent>(key: Key, value: HomePageContent[Key]) => setForm((current) => ({ ...current, [key]: value }));

  if (page.isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  return <div>
    <PageHeader title="Home page" description="Edit the main hero content and its call-to-action links." />
    <form className="max-w-3xl space-y-6 rounded-lg border border-border p-6" onSubmit={(event) => { event.preventDefault(); setError(null); save.mutate(); }}>
      {error && <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <Field label="Website mode">
        <Select
          value={form.pageMode}
          onChange={(pageMode) =>
            update("pageMode", pageMode as HomePageContent["pageMode"])
          }
          options={[
            { value: "home", label: "Show full home page" },
            { value: "countdown", label: "Show Coming Soon page" },
          ]}
          required
        />
      </Field>
      {form.pageMode === "countdown" && (
        <Field label="Countdown launch date">
          <Input
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => update("countdownTargetDate", event.target.value || undefined)}
            required
            type="date"
            value={form.countdownTargetDate ?? ""}
          />
        </Field>
      )}
      <Field label="Eyebrow"><Input value={form.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Heading"><Input value={form.title} onChange={(event) => update("title", event.target.value)} /></Field><Field label="Gold heading text"><Input value={form.titleAccent} onChange={(event) => update("titleAccent", event.target.value)} /></Field></div>
      <Field label="Description"><Textarea rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Outline CTA label"><Input value={form.primaryCtaLabel} onChange={(event) => update("primaryCtaLabel", event.target.value)} /></Field><Field label="Outline CTA link"><Input value={form.primaryCtaHref} onChange={(event) => update("primaryCtaHref", event.target.value)} /></Field><Field label="Gold CTA label"><Input value={form.secondaryCtaLabel} onChange={(event) => update("secondaryCtaLabel", event.target.value)} /></Field><Field label="Gold CTA link"><Input value={form.secondaryCtaHref} onChange={(event) => update("secondaryCtaHref", event.target.value)} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Customers statistic"><Input value={form.customersValue} onChange={(event) => update("customersValue", event.target.value)} /></Field><Field label="Satisfaction statistic"><Input value={form.satisfactionValue} onChange={(event) => update("satisfactionValue", event.target.value)} /></Field></div>
      <Button disabled={save.isPending} type="submit">{save.isPending ? <Spinner /> : null} Save home page</Button>
    </form>
    <ToastHost toast={toast} dismiss={dismiss} />
  </div>;
}
