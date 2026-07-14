"use client";

import { useState } from "react";
import type { TicketEvent, AccessRule } from "@/types/ticketNft";
import { createEvent } from "@/lib/tickets/events";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

interface CreateEventFormProps {
  artistWallet: string;
  artistSlug: string;
  onCreated: (event: TicketEvent) => void;
}

export default function CreateEventForm({
  artistWallet,
  artistSlug,
  onCreated,
}: CreateEventFormProps) {
  const locale = useLocale();
  const t = (getTranslations(locale).tickets || {}) as Record<string, string>;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [locationType, setLocationType] = useState<"physical" | "virtual">("physical");
  const [location, setLocation] = useState("");
  const [accessRules, setAccessRules] = useState<AccessRule[]>([]);
  const [supply, setSupply] = useState(100);
  const [price, setPrice] = useState(0);

  const addRule = () => {
    setAccessRules((r) => [...r, { type: "door", description: "" }]);
  };

  const updateRule = (i: number, field: keyof AccessRule, value: string) => {
    setAccessRules((r) => {
      const next = [...r];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const event = createEvent(artistWallet, artistSlug, {
      title,
      description,
      date: date || new Date().toISOString().slice(0, 10),
      locationType,
      location,
      accessRules,
      supply: supply > 0 ? supply : 100,
      price: price >= 0 ? price : 0,
    });
    onCreated(event);
    setTitle("");
    setDescription("");
    setDate("");
    setLocation("");
    setAccessRules([]);
    setSupply(100);
    setPrice(0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.eventTitle}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.eventDescription}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.date}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.locationType}</label>
        <select
          value={locationType}
          onChange={(e) => setLocationType(e.target.value as "physical" | "virtual")}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        >
          <option value="physical">{t.physical}</option>
          <option value="virtual">{t.virtual}</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.location}</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t.supply}</label>
          <input
            type="number"
            min={1}
            value={supply}
            onChange={(e) => setSupply(Number(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t.price}</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>
      </div>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground/80">
          {t.advancedAccess}
        </summary>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-foreground">{t.accessRules}</label>
            <button type="button" onClick={addRule} className="text-sm text-accent hover:underline">
              {t.addRule}
            </button>
          </div>
          {accessRules.map((rule, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={rule.type}
                onChange={(e) => updateRule(i, "type", e.target.value)}
                placeholder={t.accessRuleType}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
              <input
                type="text"
                value={rule.description ?? ""}
                onChange={(e) => updateRule(i, "description", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          ))}
        </div>
      </details>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover"
      >
        {t.createEvent}
      </button>
    </form>
  );
}
