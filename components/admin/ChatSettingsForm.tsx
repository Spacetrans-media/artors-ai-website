"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveChatSettings, type SettingsState } from "@/lib/chat/actions";
import type { ChatSettings } from "@/lib/chat/settings";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { Switch } from "@/components/admin/ui/switch";

/**
 * The settings form.
 *
 * Written by hand rather than driven by a collection spec, because this is one
 * row rather than a list: CollectionManager's table, publish toggles and delete
 * dialogs would all be dead weight here.
 *
 * Every field is optional except her name. A cleared field falls back to the
 * built-in default rather than to blank — so it is impossible to break her by
 * emptying a box, which is the most likely mistake this form invites.
 */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{blurb}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function ChatSettingsForm({ settings }: { settings: ChatSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveChatSettings, {});

  useEffect(() => {
    if (state.ok) toast.success("Saved. Live within a minute.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <Section
        title="On or off"
        blurb="Off removes her from every page — no launcher, no conversations, no model cost."
      >
        <div className="flex items-center gap-3">
          <Switch id="enabled" name="enabled" defaultChecked={settings.enabled} />
          <Label htmlFor="enabled">Show the assistant on the site</Label>
        </div>
      </Section>

      <Section title="Who she is" blurb="Her name and the line under it in the chat header.">
        <Field label="Name">
          <Input name="name" defaultValue={settings.name} maxLength={60} required />
        </Field>
        <Field label="Tagline" hint="Shown under her name. Sets the expectation for reply speed.">
          <Input name="tagline" defaultValue={settings.tagline} maxLength={140} />
        </Field>
        <Field
          label="Opening message"
          hint="Her first message inside the chat. Ask a question in it — an opening that invites a reply gets one."
        >
          <Textarea name="openingMessage" defaultValue={settings.openingMessage} rows={3} />
        </Field>
      </Section>

      <Section
        title="The greeting bubble"
        blurb="The small box that appears beside her to introduce her."
      >
        <Field label="Title">
          <Input name="greetingTitle" defaultValue={settings.greetingTitle} maxLength={80} />
        </Field>
        <Field label="Message">
          <Input name="greetingText" defaultValue={settings.greetingText} maxLength={200} />
        </Field>

        <Field
          label="When it appears"
          hint="Once per visitor is the kind default. Every session suits a site people return to often."
        >
          <select
            name="greetingMode"
            defaultValue={settings.greetingMode}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          >
            <option value="first_visit">Once per visitor — the first time they ever come</option>
            <option value="every_session">Once per visit — every new browser session</option>
            <option value="off">Never — she waits to be clicked</option>
          </select>
        </Field>

        <Field
          label="Delay (seconds)"
          hint="Under three seconds interrupts the sentence they are reading. Four is the default."
        >
          <Input
            name="greetingDelay"
            type="number"
            min={1}
            max={60}
            defaultValue={settings.greetingDelay}
          />
        </Field>
      </Section>

      <Section
        title="Starter questions"
        blurb="The buttons under her opening message. Leave one blank to drop it — four is the maximum, because more reads as a menu rather than a hint."
      >
        {[0, 1, 2, 3].map((i) => (
          <Input
            key={i}
            name={`suggestion${i}`}
            defaultValue={settings.suggestions[i] ?? ""}
            maxLength={120}
            placeholder={`Suggestion ${i + 1}`}
          />
        ))}
      </Section>

      <Section
        title="Extra direction"
        blurb="Appended to her instructions, for tone and emphasis. Facts belong in the knowledge base instead — those are fetched only when relevant, while anything here is resent on every single message and costs tokens each time."
      >
        <Field
          label="Tone and emphasis"
          hint='e.g. "Lead with automation rather than chatbots." It shapes how she answers; it cannot override the rules that stop her inventing prices or clients.'
        >
          <Textarea name="persona" defaultValue={settings.persona} rows={4} maxLength={2000} />
        </Field>
      </Section>

      <Section
        title="Limits"
        blurb="Guards the model bill. Every message calls a paid API, so a conversation cannot run forever."
      >
        <Field
          label="Messages before she asks for a human"
          hint="Twelve is generous for a website chat. Someone still talking after that is better served by a phone call."
        >
          <Input name="maxTurns" type="number" min={2} max={30} defaultValue={settings.maxTurns} />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Changes reach the site within a minute.
        </p>
      </div>
    </form>
  );
}
