"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import {
  demoSdk,
  getDemoState,
  resetDemo,
  subscribeDemo,
  type DemoMethodId,
  type DemoState,
} from "@/lib/demo/mockSdk";
import InvestorStory from "./InvestorStory";
import ArchitectureDiagram from "./ArchitectureDiagram";
import DomainExplorer from "./DomainExplorer";
import ProtocolTimeline from "./ProtocolTimeline";
import SdkConsole from "./SdkConsole";
import ChainSwitcher from "./ChainSwitcher";
import DeveloperView from "./DeveloperView";
import ProtocolMetrics from "./ProtocolMetrics";

import InvestorPresentation from "./InvestorPresentation";

type ActivityTab = "developer" | "product";

const DEMO_ASSET_ID = "asset_mirrors";

export default function ProtocolExperience() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;

  const [state, setState] = useState<DemoState>(() => getDemoState());
  const [tab, setTab] = useState<ActivityTab>("developer");
  const [copied, setCopied] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);

  const [flowDone, setFlowDone] = useState(false);

  useEffect(() => subscribeDemo(setState), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("present") === "1" || window.location.hash === "#present") {
      setPresentationOpen(true);
    }
  }, []);

  const run = useCallback(
    (method: DemoMethodId) => {
      setFlowDone(false);
      const assetId = state.asset?.id ?? DEMO_ASSET_ID;
      switch (method) {
        case "connectWallet":
          return demoSdk.connectWallet();
        case "publishAsset":
          return demoSdk.publishAsset({ title: p.publishAssetDemoTitle });
        case "sellAsset":
          return demoSdk.sellAsset({
            assetId,
            price: { amount: "1.00", currency: "USD" },
          });
        case "buyAsset":
          return demoSdk.buyAsset({ assetId });
        case "issueLicense":
          return demoSdk.issueLicense({ assetId, type: "download" });
        case "transferOwnership":
          return demoSdk.transferOwnership({ assetId, toAccountId: "acc_demo_fan" });
        case "claimRoyalty":
          return demoSdk.claimRoyalty({ assetId, role: "composer" });
        default:
          return Promise.resolve();
      }
    },
    [state.asset, p.publishAssetDemoTitle]
  );

  const runFullFlow = useCallback(async () => {
    setFlowDone(false);
    await demoSdk.connectWallet();
    const asset = await demoSdk.publishAsset({ title: p.publishAssetDemoTitle });
    await demoSdk.sellAsset({
      assetId: asset.id,
      price: { amount: "1.00", currency: "USD" },
    });
    await demoSdk.buyAsset({ assetId: asset.id });
    await demoSdk.issueLicense({ assetId: asset.id, type: "download" });
    await demoSdk.transferOwnership({ assetId: asset.id, toAccountId: "acc_demo_fan" });
    await demoSdk.claimRoyalty({ assetId: asset.id, role: "composer" });
    setFlowDone(true);
  }, [p.publishAssetDemoTitle]);

  const handleCopy = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(state.generatedCode).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [state.generatedCode]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <InvestorPresentation
        open={presentationOpen}
        onClose={() => setPresentationOpen(false)}
      />

      <InvestorStory />

      <section className="relative overflow-hidden border-b border-zinc-800/60">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 15% -10%, rgba(59,130,246,0.14), transparent 55%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3">
            {p.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-50 max-w-2xl leading-tight">
            {p.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-xl">{p.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPresentationOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 text-sm font-medium hover:bg-white transition-colors"
            >
              {p.presentation.openCta}
            </button>
            <a
              href="#console"
              className="px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 transition-colors"
            >
              {p.ctaPlayground}
            </a>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
              {p.ctaLivePoc}
            </Link>
            <a
              href="#architecture"
              className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
              {p.architecture.eyebrow}
            </a>
            <a
              href="#chains"
              className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
              {p.chains.eyebrow}
            </a>
          </div>
        </div>
      </section>

      <div id="architecture">
        <ArchitectureDiagram activeLayer={state.activeLayer} />
      </div>

      <DomainExplorer />

      <section id="console" className="border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3">
                {p.playgroundEyebrow}
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-50">
                {p.playgroundTitle}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl">
                {p.playgroundHint}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetDemo();
                  setFlowDone(false);
                }}
                disabled={state.busy}
                className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-40 transition-colors"
              >
                {p.console.reset}
              </button>
              <button
                type="button"
                onClick={runFullFlow}
                disabled={state.busy}
                className="px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 disabled:opacity-50 transition-colors"
              >
                {state.busy ? p.running : p.runFullFlow}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <ProtocolTimeline activeStep={state.activeStep} completedSteps={state.completedSteps} />
            <SdkConsole
              busy={state.busy}
              onRun={run}
              lines={state.consoleLines}
              generatedCode={state.generatedCode}
              onCopy={handleCopy}
            />
          </div>
          {copied && <p className="mt-3 text-xs text-blue-300">{p.console.copied}</p>}
          {flowDone && (
            <div className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/80 p-5">
              <p className="font-medium text-zinc-50">{p.postDemoTitle}</p>
              <p className="mt-1 text-sm text-zinc-400">{p.postDemoBody}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/#marketplace"
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-400"
                >
                  {p.postDemoMarketplace}
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-600"
                >
                  {p.postDemoArtist}
                </Link>
                <Link
                  href="/fan-dashboard"
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-600"
                >
                  {p.postDemoFan}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <div id="chains">
        <ChainSwitcher />
      </div>

      <section className="border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-4">
            {p.layerInspector}
          </p>
          <div className="flex items-center gap-2 mb-8">
            <TabButton active={tab === "developer"} onClick={() => setTab("developer")}>
              {p.developerView.tabDeveloper}
            </TabButton>
            <TabButton active={tab === "product"} onClick={() => setTab("product")}>
              {p.developerView.tabProduct}
            </TabButton>
          </div>

          {tab === "developer" ? (
            <DeveloperView trace={state.developerTrace} />
          ) : (
            <ProductView state={state} />
          )}
        </div>
      </section>

      <ProtocolMetrics metrics={state.metrics} />

      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3">
            {p.codeShowcase.eyebrow}
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-50">
            {p.codeShowcase.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl">
            {p.codeShowcase.hint}
          </p>
          <div className="mt-8 rounded-xl border border-zinc-800 bg-black/50 p-6">
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-zinc-400 hover:text-blue-300 transition-colors"
              >
                {p.codeShowcase.copy}
              </button>
            </div>
            <pre className="text-xs sm:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
              {state.generatedCode}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
        active
          ? "border-blue-500/50 bg-blue-500/[0.08] text-zinc-50"
          : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function ProductView({ state }: { state: DemoState }) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol.productView;

  const rows: { label: string; value: string | null }[] = [
    { label: p.walletLabel, value: state.session?.user.displayName ?? null },
    { label: p.assetLabel, value: state.asset?.title ?? null },
    {
      label: p.listingLabel,
      value: state.listing
        ? `${state.listing.price.amount} ${state.listing.price.currency} · ${state.listing.status}`
        : null,
    },
    {
      label: p.licenseLabel,
      value: state.license ? `${state.license.type} · ${state.license.active}` : null,
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
      <dl className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-3">
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500 w-24 shrink-0">
              {row.label}
            </dt>
            <dd className={`text-sm ${row.value ? "text-zinc-200" : "text-zinc-600"}`}>
              {row.value ?? p.notYet}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
