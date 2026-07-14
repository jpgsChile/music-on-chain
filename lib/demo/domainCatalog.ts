/**
 * Domain catalog — Core Protocol object registry for the Architecture Experience.
 *
 * This file only exports IDs and the field-key structure for each domain object.
 * All display copy (purpose, property/method/event/relation labels) lives in
 * `lib/i18n.ts` under `protocol.domain.<DomainObjectId>.*` so the UI stays
 * 100% translation-driven. Components should look up strings like:
 *
 *   t.protocol.domain.MusicalWork.purpose
 *   t.protocol.domain.MusicalWork.properties.title
 *   t.protocol.domain.MusicalWork.methods.create
 *   t.protocol.domain.MusicalWork.events.musicalWorkCreated
 *   t.protocol.domain.MusicalWork.relations.Asset
 */

export const DOMAIN_OBJECT_IDS = [
  "MusicalWork",
  "Asset",
  "License",
  "RoyaltySplit",
  "Listing",
  "PurchaseOrder",
  "Settlement",
  "WalletSession",
] as const;

export type DomainObjectId = (typeof DOMAIN_OBJECT_IDS)[number];

export type DomainObjectDefinition = {
  id: DomainObjectId;
  /** Field keys under protocol.domain.<id>.properties.<key> */
  properties: string[];
  /** Field keys under protocol.domain.<id>.methods.<key> */
  methods: string[];
  /** Field keys under protocol.domain.<id>.events.<key> */
  events: string[];
  /** Related domain object ids, rendered via protocol.domain.<id>.relations.<RelatedId> */
  relations: DomainObjectId[];
};

export const DOMAIN_CATALOG: Record<DomainObjectId, DomainObjectDefinition> = {
  MusicalWork: {
    id: "MusicalWork",
    properties: ["id", "title", "artistRef", "isrc", "royaltySplits", "createdAt"],
    methods: ["create", "updateMetadata", "attachRoyaltySplits"],
    events: ["musicalWorkCreated", "royaltySplitsAttached"],
    relations: ["Asset", "RoyaltySplit"],
  },
  Asset: {
    id: "Asset",
    properties: ["id", "workRef", "status", "metadataUri", "createdAt"],
    methods: ["publish", "updateStatus"],
    events: ["assetPublished"],
    relations: ["MusicalWork", "Listing", "License"],
  },
  License: {
    id: "License",
    properties: ["id", "assetRef", "granteeRef", "type", "active", "issuedAt"],
    methods: ["issue", "revoke", "evaluateAccess"],
    events: ["licenseIssued", "licenseRevoked"],
    relations: ["Asset", "PurchaseOrder"],
  },
  RoyaltySplit: {
    id: "RoyaltySplit",
    properties: ["role", "percentage", "payoutRef"],
    methods: ["validate", "distribute"],
    events: ["royaltyDistributed"],
    relations: ["MusicalWork", "Settlement"],
  },
  Listing: {
    id: "Listing",
    properties: ["id", "assetRef", "price", "status"],
    methods: ["activate", "deactivate"],
    events: ["listingActivated", "listingSold"],
    relations: ["Asset", "PurchaseOrder"],
  },
  PurchaseOrder: {
    id: "PurchaseOrder",
    properties: ["id", "listingRef", "buyerRef", "amount", "status"],
    methods: ["create", "confirm"],
    events: ["purchaseConfirmed"],
    relations: ["Listing", "Settlement", "License"],
  },
  Settlement: {
    id: "Settlement",
    properties: ["id", "orderRef", "chainRef", "txRef", "status", "settledAt"],
    methods: ["requestSettlement", "verifyProof"],
    events: ["settlementCompleted"],
    relations: ["PurchaseOrder", "RoyaltySplit"],
  },
  WalletSession: {
    id: "WalletSession",
    properties: ["id", "accountRef", "role", "connectedAt"],
    methods: ["connect", "disconnect"],
    events: ["sessionCreated"],
    relations: ["MusicalWork", "PurchaseOrder"],
  },
};

export const DOMAIN_OBJECT_LIST: DomainObjectDefinition[] = DOMAIN_OBJECT_IDS.map(
  (id) => DOMAIN_CATALOG[id]
);
