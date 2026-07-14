/**
 * Demo-only mock SDK — same public surface as the future `@moc/sdk`.
 *
 * UI never imports viem / wagmi / ethers. It only talks to this module,
 * which mirrors the real layering:
 *
 *   UI → SDK (this file's public methods)
 *      → Core Domain (@moc/domain, @moc/application use cases — simulated)
 *      → Blockchain Adapter (@moc/ports + @moc/adapters — simulated)
 *      → Settlement Layer (Base — simulated)
 *
 * Nothing here performs real network or chain calls. All delays and chain
 * references are simulated for the Architecture Experience demo.
 */

export type Money = { amount: string; currency: "USD" };

export type LayerId = "ui" | "sdk" | "core" | "adapter" | "base";

export type Session = {
  user: { id: string; displayName: string; role: "artist" | "fan"; accountId: string };
};

export type Asset = {
  id: string;
  title: string;
  artistName: string;
  status: "draft" | "published";
};

export type Listing = {
  id: string;
  assetId: string;
  price: Money;
  status: "active" | "sold";
};

export type License = {
  id: string;
  assetId: string;
  type: "stream" | "download";
  active: boolean;
};

export type ConsoleLineKind = "info" | "success" | "chain";

export type ConsoleLine = {
  id: string;
  kind: ConsoleLineKind;
  layer: LayerId;
  /** i18n key under protocol.console.<messageKey> */
  messageKey: string;
  params?: Record<string, string>;
  timestamp: number;
};

export const TIMELINE_STEP_IDS = [
  "publishAsset",
  "validateMetadata",
  "createMusicalWork",
  "persistDomain",
  "callAdapter",
  "publishToBase",
  "settlementProof",
  "emitEvents",
] as const;

export type TimelineStepId = (typeof TIMELINE_STEP_IDS)[number];

export type DeveloperTrace = {
  sdkCall: string;
  coreMethod: string;
  domainEvent: string;
  adapterCall: string;
  settlement: string;
};

export type DemoMetrics = {
  apiCalls: number;
  assetsPublished: number;
  licensesIssued: number;
  royaltiesDistributed: number;
  settlementTimeMs: number;
  connectedWallets: number;
};

export type DemoMethodId =
  | "connectWallet"
  | "publishAsset"
  | "sellAsset"
  | "buyAsset"
  | "issueLicense"
  | "transferOwnership"
  | "claimRoyalty";

export type DemoState = {
  activeLayer: LayerId | null;
  busy: boolean;
  busyMethod: DemoMethodId | null;
  consoleLines: ConsoleLine[];
  activeStep: TimelineStepId | null;
  completedSteps: TimelineStepId[];
  developerTrace: DeveloperTrace | null;
  metrics: DemoMetrics;
  generatedCode: string;
  session: Session | null;
  asset: Asset | null;
  listing: Listing | null;
  license: License | null;
};

type Listener = (state: DemoState) => void;

const CODE_IMPORT_LINE = 'import { sdk } from "@moc/sdk";';
const MAX_CONSOLE_LINES = 40;
const MAX_CODE_LINES = 16;

const initialMetrics: DemoMetrics = {
  apiCalls: 0,
  assetsPublished: 0,
  licensesIssued: 0,
  royaltiesDistributed: 0,
  settlementTimeMs: 0,
  connectedWallets: 0,
};

type Store = DemoState & { codeLines: string[] };

const store: Store = {
  activeLayer: null,
  busy: false,
  busyMethod: null,
  consoleLines: [],
  activeStep: null,
  completedSteps: [],
  developerTrace: null,
  metrics: { ...initialMetrics },
  generatedCode: CODE_IMPORT_LINE,
  session: null,
  asset: null,
  listing: null,
  license: null,
  codeLines: [],
};

const listeners = new Set<Listener>();
let lineCounter = 0;

function snapshot(): DemoState {
  const { codeLines, ...state } = store;
  void codeLines;
  return {
    ...state,
    consoleLines: [...store.consoleLines],
    completedSteps: [...store.completedSteps],
    metrics: { ...store.metrics },
    developerTrace: store.developerTrace ? { ...store.developerTrace } : null,
  };
}

function notify() {
  const state = snapshot();
  for (const listener of listeners) listener(state);
}

/** Subscribe to demo state changes. Returns an unsubscribe function. */
export function subscribeDemo(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoState(): DemoState {
  return snapshot();
}

export function getGeneratedCode(): string {
  return store.generatedCode;
}

function delay(min = 280, max = 450) {
  const ms = Math.round(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setLayer(layer: LayerId) {
  store.activeLayer = layer;
  notify();
}

function pushConsole(
  layer: LayerId,
  kind: ConsoleLineKind,
  messageKey: string,
  params?: Record<string, string>
) {
  lineCounter += 1;
  const line: ConsoleLine = {
    id: `line_${lineCounter}`,
    kind,
    layer,
    messageKey,
    params,
    timestamp: Date.now(),
  };
  store.consoleLines = [...store.consoleLines, line].slice(-MAX_CONSOLE_LINES);
  notify();
}

function setStep(stepId: TimelineStepId | null, completed: TimelineStepId[]) {
  store.activeStep = stepId;
  store.completedSteps = completed;
  notify();
}

function setTrace(trace: DeveloperTrace) {
  store.developerTrace = trace;
  notify();
}

function bumpMetrics(partial: Partial<DemoMetrics>) {
  store.metrics = { ...store.metrics, ...partial };
  notify();
}

function appendCode(line: string) {
  store.codeLines = [...store.codeLines, line].slice(-MAX_CODE_LINES);
  store.generatedCode = [CODE_IMPORT_LINE, "", ...store.codeLines].join("\n");
  notify();
}

async function withBusy<T>(method: DemoMethodId, fn: () => Promise<T>): Promise<T> {
  store.busy = true;
  store.busyMethod = method;
  notify();
  try {
    const result = await fn();
    bumpMetrics({ apiCalls: store.metrics.apiCalls + 1 });
    return result;
  } finally {
    store.busy = false;
    store.busyMethod = null;
    store.activeLayer = null;
    notify();
  }
}

/** Public SDK-shaped client for the Protocol Architecture Experience (mock). */
export const demoSdk = {
  async connectWallet(): Promise<Session> {
    return withBusy("connectWallet", async () => {
      setLayer("sdk");
      pushConsole("sdk", "info", "sdkCallReceived", { method: "connectWallet" });
      appendCode("const session = await sdk.connectWallet();");
      await delay();

      setLayer("core");
      pushConsole("core", "info", "sessionCreated");
      await delay();

      setLayer("adapter");
      pushConsole("adapter", "info", "walletBridgeResolved");
      await delay();

      const session: Session = {
        user: {
          id: "usr_demo",
          displayName: "CLEAVER",
          role: "artist",
          accountId: "acc_demo_cleaver",
        },
      };
      store.session = session;
      setLayer("sdk");
      pushConsole("sdk", "success", "walletConnected");
      bumpMetrics({ connectedWallets: store.metrics.connectedWallets + 1 });

      setTrace({
        sdkCall: "sdk.connectWallet()",
        coreMethod: "WalletSession.connect()",
        domainEvent: "SessionCreated",
        adapterCall: "IWalletAdapter.resolveAccount() (simulated)",
        settlement: "— (no settlement required)",
      });

      return session;
    });
  },

  async publishAsset(input: { title: string }): Promise<Asset> {
    return withBusy("publishAsset", async () => {
      const title = input.title || "Mirrors";
      setLayer("sdk");
      pushConsole("sdk", "info", "sdkCallReceived", { method: "publishAsset" });
      appendCode(`const asset = await sdk.publishAsset({ title: "${title}" });`);
      setStep("publishAsset", []);
      await delay();

      setLayer("core");
      pushConsole("core", "info", "domainValidation");
      setStep("validateMetadata", ["publishAsset"]);
      await delay();

      pushConsole("core", "info", "musicalWorkCreated");
      setStep("createMusicalWork", ["publishAsset", "validateMetadata"]);
      await delay();

      pushConsole("core", "info", "domainPersisted");
      setStep("persistDomain", ["publishAsset", "validateMetadata", "createMusicalWork"]);
      await delay();

      setLayer("adapter");
      pushConsole("adapter", "info", "adapterSelected");
      setStep("callAdapter", [
        "publishAsset",
        "validateMetadata",
        "createMusicalWork",
        "persistDomain",
      ]);
      await delay();

      setLayer("base");
      pushConsole("base", "chain", "publishedToBase");
      setStep("publishToBase", [
        "publishAsset",
        "validateMetadata",
        "createMusicalWork",
        "persistDomain",
        "callAdapter",
      ]);
      await delay();

      pushConsole("base", "success", "settlementComplete");
      setStep("settlementProof", [
        "publishAsset",
        "validateMetadata",
        "createMusicalWork",
        "persistDomain",
        "callAdapter",
        "publishToBase",
      ]);
      await delay();

      setLayer("core");
      pushConsole("core", "success", "domainEventsEmitted");
      setStep(null, [
        "publishAsset",
        "validateMetadata",
        "createMusicalWork",
        "persistDomain",
        "callAdapter",
        "publishToBase",
        "settlementProof",
        "emitEvents",
      ]);

      const asset: Asset = {
        id: "asset_mirrors",
        title,
        artistName: "CLEAVER",
        status: "published",
      };
      store.asset = asset;

      setLayer("sdk");
      pushConsole("sdk", "success", "assetPublished");
      bumpMetrics({ assetsPublished: store.metrics.assetsPublished + 1 });

      setTrace({
        sdkCall: `sdk.publishAsset({ title: "${title}" })`,
        coreMethod: "MusicalWorkFactory.create() → PublishMusicalWorkUseCase.execute()",
        domainEvent: "MusicalWorkCreated · AssetPublished",
        adapterCall: "IMetadataAdapter.publish() (simulated)",
        settlement: "BaseSettlementAdapter · chainRef: base-sepolia",
      });

      return asset;
    });
  },

  async sellAsset(input: { assetId: string; price: Money }): Promise<Listing> {
    return withBusy("sellAsset", async () => {
      setLayer("sdk");
      pushConsole("sdk", "info", "sdkCallReceived", { method: "sellAsset" });
      appendCode(
        `const listing = await sdk.sellAsset({ assetId: asset.id, price: { amount: "${input.price.amount}", currency: "USD" } });`
      );
      await delay();

      setLayer("core");
      pushConsole("core", "info", "listingActivated");
      await delay();

      const listing: Listing = {
        id: "listing_01",
        assetId: input.assetId,
        price: input.price,
        status: "active",
      };
      store.listing = listing;

      setLayer("sdk");
      pushConsole("sdk", "success", "listingReady");

      setTrace({
        sdkCall: `sdk.sellAsset({ assetId, price: ${input.price.amount} USD })`,
        coreMethod: "ListingFactory.create() → ActivateListingUseCase.execute()",
        domainEvent: "ListingActivated",
        adapterCall: "— (no adapter call required)",
        settlement: "— (settlement occurs on buyAsset)",
      });

      return listing;
    });
  },

  async buyAsset(input: { assetId: string }): Promise<{ license: License }> {
    return withBusy("buyAsset", async () => {
      setLayer("sdk");
      pushConsole("sdk", "info", "sdkCallReceived", { method: "buyAsset" });
      appendCode(`const { license } = await sdk.buyAsset({ assetId: asset.id });`);
      await delay();

      setLayer("core");
      pushConsole("core", "info", "purchaseConfirmed");
      await delay();

      setLayer("adapter");
      pushConsole("adapter", "info", "settlementRequested");
      await delay();

      setLayer("base");
      pushConsole("base", "chain", "settlementProof");
      const settlementTimeMs = Math.round(800 + Math.random() * 700);
      await delay();

      pushConsole("base", "success", "settlementComplete");

      const license: License = {
        id: "lic_stream_01",
        assetId: input.assetId,
        type: "stream",
        active: true,
      };
      store.license = license;
      if (store.listing) store.listing = { ...store.listing, status: "sold" };

      setLayer("sdk");
      pushConsole("sdk", "success", "licenseGranted");
      bumpMetrics({
        licensesIssued: store.metrics.licensesIssued + 1,
        settlementTimeMs,
      });

      setTrace({
        sdkCall: `sdk.buyAsset({ assetId: "${input.assetId}" })`,
        coreMethod: "ConfirmPurchaseUseCase.execute() → LicenseGrantFactory.create()",
        domainEvent: "PurchaseConfirmed · LicenseIssued(STREAM)",
        adapterCall: "ISettlementAdapter.verifySettlement() (simulated)",
        settlement: `BaseSettlementAdapter · proof verified in ${settlementTimeMs}ms`,
      });

      return { license };
    });
  },

  async issueLicense(input: { assetId: string; type: "download" }): Promise<License> {
    return withBusy("issueLicense", async () => {
      setLayer("sdk");
      pushConsole("sdk", "info", "sdkCallReceived", { method: "issueLicense" });
      appendCode(`await sdk.issueLicense({ assetId: asset.id, type: "${input.type}" });`);
      await delay();

      setLayer("core");
      pushConsole("core", "success", "licenseIssued");

      const license: License = {
        id: "lic_dl_01",
        assetId: input.assetId,
        type: "download",
        active: true,
      };
      store.license = license;
      bumpMetrics({ licensesIssued: store.metrics.licensesIssued + 1 });

      setTrace({
        sdkCall: `sdk.issueLicense({ type: "${input.type}" })`,
        coreMethod: "LicenseGrantFactory.create() → IssueLicenseUseCase.execute()",
        domainEvent: "LicenseIssued(DOWNLOAD)",
        adapterCall: "— (no adapter call required)",
        settlement: "— (no settlement required)",
      });

      return license;
    });
  },

  async transferOwnership(input: { assetId: string; toAccountId: string }): Promise<Asset> {
    return withBusy("transferOwnership", async () => {
      setLayer("sdk");
      pushConsole("sdk", "info", "sdkCallReceived", { method: "transferOwnership" });
      appendCode(
        `await sdk.transferOwnership({ assetId: asset.id, toAccountId: "${input.toAccountId}" });`
      );
      await delay();

      setLayer("core");
      pushConsole("core", "info", "domainValidation");
      await delay();

      setLayer("adapter");
      pushConsole("adapter", "info", "adapterSelected");
      await delay();

      setLayer("base");
      pushConsole("base", "success", "settlementComplete");

      const asset: Asset = store.asset
        ? { ...store.asset }
        : {
            id: input.assetId,
            title: "Mirrors",
            artistName: "CLEAVER",
            status: "published",
          };
      store.asset = asset;

      setLayer("sdk");
      pushConsole("sdk", "success", "ownershipTransferred");

      setTrace({
        sdkCall: `sdk.transferOwnership({ assetId, toAccountId: "${input.toAccountId}" })`,
        coreMethod: "AssetOwnership.transfer() → TransferOwnershipUseCase.execute()",
        domainEvent: "OwnershipTransferred",
        adapterCall: "ITokenAdapter.transfer() (simulated)",
        settlement: "BaseSettlementAdapter · chainRef: base-sepolia",
      });

      return asset;
    });
  },

  async claimRoyalty(input: { assetId: string; role: string }): Promise<{ amount: Money }> {
    return withBusy("claimRoyalty", async () => {
      setLayer("sdk");
      pushConsole("sdk", "info", "sdkCallReceived", { method: "claimRoyalty" });
      appendCode(`await sdk.claimRoyalty({ assetId: asset.id, role: "${input.role}" });`);
      await delay();

      setLayer("core");
      pushConsole("core", "info", "royaltyDistributed");
      await delay();

      setLayer("adapter");
      pushConsole("adapter", "info", "adapterSelected");
      await delay();

      setLayer("base");
      pushConsole("base", "success", "settlementComplete");

      const amount: Money = { amount: "0.98", currency: "USD" };

      setLayer("sdk");
      pushConsole("sdk", "success", "royaltyClaimed");
      bumpMetrics({ royaltiesDistributed: store.metrics.royaltiesDistributed + 1 });

      setTrace({
        sdkCall: `sdk.claimRoyalty({ assetId, role: "${input.role}" })`,
        coreMethod: "validateRoyaltySplits() → RoyaltySplit.distribute()",
        domainEvent: "RoyaltyDistributed",
        adapterCall: "IRoyaltyAdapter.settle() (simulated)",
        settlement: "BaseSettlementAdapter · chainRef: base-sepolia",
      });

      return { amount };
    });
  },
};

/** Reset the demo store to its initial state. */
export function resetDemo() {
  store.activeLayer = null;
  store.busy = false;
  store.busyMethod = null;
  store.consoleLines = [];
  store.activeStep = null;
  store.completedSteps = [];
  store.developerTrace = null;
  store.metrics = { ...initialMetrics };
  store.codeLines = [];
  store.generatedCode = CODE_IMPORT_LINE;
  store.session = null;
  store.asset = null;
  store.listing = null;
  store.license = null;
  notify();
}
