/**
 * Release Wizard – Bandcamp / DistroKid / Spotify for Artists inspired.
 * Progressive disclosure: one step at a time; state accumulated for publish.
 */

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type ReleaseType =
  | "single"
  | "ep"
  | "album"
  | "demo"
  | "live"
  | "rare"
  | "rehearsal";

export type CollaboratorRole = "author" | "composer" | "producer" | "performer";

export type PricingModel = "streaming" | "download" | "limited" | "license";

export const RELEASE_TYPES: ReleaseType[] = [
  "single",
  "ep",
  "album",
  "demo",
  "live",
  "rare",
  "rehearsal",
];

export const COLLABORATOR_ROLES: CollaboratorRole[] = [
  "author",
  "composer",
  "producer",
  "performer",
];

export const PRICING_MODELS: PricingModel[] = [
  "streaming",
  "download",
  "limited",
  "license",
];

export const GENRES = [
  "Rock",
  "Pop",
  "Hip-Hop",
  "Electrónica",
  "Jazz",
  "Folk",
  "Latina",
  "R&B",
  "Metal",
  "Indie",
  "Clásica",
  "Experimental",
  "Otro",
] as const;

export const LANGUAGES = [
  "Español",
  "Inglés",
  "Portugués",
  "Francés",
  "Instrumental",
  "Otro",
] as const;

export interface ReleaseTrack {
  id: string;
  file: File | null;
  previewUrl: string | null;
  title: string;
  version: string;
  durationSec: number | null;
  explicit: boolean;
  lyrics: string;
}

export interface ReleaseCollaborator {
  id: string;
  /** Display name for invite. Not Actor identity. */
  name: string;
  /** Invite handle. Not wallet and not ActorRef. */
  email: string;
  role: CollaboratorRole;
  /** Revenue share on this release. Not ownership and not a payment. */
  percentage: number;
  actorRef?: string | null;
}

export interface ReleaseWizardState {
  step: WizardStep;
  // Step 1 – General
  title: string;
  releaseType: ReleaseType;
  language: string;
  primaryGenre: string;
  secondaryGenre: string;
  description: string;
  coverFile: File | null;
  coverUrl: string | null;
  // Step 2 – Tracks
  tracks: ReleaseTrack[];
  // Step 3 – Collaborators
  soloCreator: boolean;
  collaborators: ReleaseCollaborator[];
  // Step 4 – Pricing
  pricingModels: PricingModel[];
  priceUsdc: number;
  // Step 5 – Publish
  isPublishing: boolean;
  publishError: string | null;
  publishedId: string | null;
}

export type ReleaseValidationErrors = Partial<{
  title: string;
  releaseType: string;
  language: string;
  primaryGenre: string;
  cover: string;
  tracks: string;
  trackTitle: string;
  trackFile: string;
  collaborators: string;
  pricingModels: string;
  priceUsdc: string;
}>;

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyTrack(): ReleaseTrack {
  return {
    id: uid("track"),
    file: null,
    previewUrl: null,
    title: "",
    version: "",
    durationSec: null,
    explicit: false,
    lyrics: "",
  };
}

export function createEmptyCollaborator(
  role: CollaboratorRole = "composer",
  percentage = 0
): ReleaseCollaborator {
  return {
    id: uid("collab"),
    name: "",
    email: "",
    role,
    percentage,
  };
}

export const INITIAL_RELEASE_STATE: ReleaseWizardState = {
  step: 1,
  title: "",
  releaseType: "single",
  language: "Español",
  primaryGenre: "",
  secondaryGenre: "",
  description: "",
  coverFile: null,
  coverUrl: null,
  tracks: [createEmptyTrack()],
  soloCreator: true,
  collaborators: [],
  pricingModels: ["download"],
  priceUsdc: 1,
  isPublishing: false,
  publishError: null,
  publishedId: null,
};

/** @deprecated Use ReleaseWizardState – kept for gradual migration */
export type SongUploadState = ReleaseWizardState;
export type UploadValidationErrors = ReleaseValidationErrors;
export const INITIAL_UPLOAD_STATE = INITIAL_RELEASE_STATE;
