# Ticket NFT System — Music On Chain

## Resumen

Sistema de entradas NFT para eventos creados por artistas. Los tickets son **transferibles** (el fan puede revender o regalar) y **rastreables** (cadena + txHash para verificación).

---

## 1. Estándar de metadata NFT

Compatible con **ERC-721 / ERC-1155** y marketplaces (OpenSea, etc.). El `tokenURI` del NFT apunta a un JSON con la siguiente estructura.

### Tipo: `TicketMetadata`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Ej: `"Ticket: Concierto CLEAVER 2026"` |
| `description` | string | Descripción del evento / admisión |
| `image` | string? | URL de imagen del ticket (opcional) |
| `external_url` | string? | Enlace a la página del artista o evento |
| `attributes` | array | Atributos estándar (EIP-1155 / OpenSea) |
| `ticket` | object | **Extensión custom** con datos del evento |

### Atributos estándar (`attributes`)

Cada elemento: `{ trait_type, value, display_type? }`.

- **Event** → título del evento  
- **Date** → fecha (ISO); `display_type: "date"`  
- **Location** → dirección o URL  
- **Location Type** → `"physical"` | `"virtual"`  
- **Artist** → slug del artista  
- Uno por **regla de acceso** (ej. `trait_type: "door"`, `value: "General"`)

### Extensión `ticket`

Datos estructurados para validación y UI:

```ts
ticket: {
  eventId: string;
  eventTitle: string;
  date: string;           // ISO
  locationType: "physical" | "virtual";
  location: string;      // Dirección o enlace virtual
  accessRules: Array<{ type: string; description?: string }>;
  artistSlug: string;
  chainId: number;       // 84532 = Base Sepolia
}
```

**Ubicación:** `types/ticketNft.ts` (interfaces), `lib/tickets/metadata.ts` (función `buildTicketMetadata`).

---

## 2. Flujo de minting

### 2.1 Artista: crear evento

1. Artista entra en **Dashboard → Entradas** (`/dashboard/tickets`).
2. Clic en **Crear evento**.
3. Completa el formulario:
   - **Título** y descripción  
   - **Fecha** del evento  
   - **Tipo de lugar**: físico o virtual  
   - **Lugar**: dirección o URL  
   - **Reglas de acceso**: ej. `door` / General, `backstage`, `vip` (tipo + descripción opcional)  
   - **Cantidad** de entradas (supply) y **precio** en USDC  
4. Envío del formulario → se crea el evento en almacenamiento local (y en futuro on-chain). No se mintea aún.

### 2.2 Artista: mintear tickets (lote)

1. En la lista de eventos, el artista ve cada evento con botón **Mintear entradas**.
2. Al hacer clic:
   - Se construye la metadata con `buildTicketMetadata(event, tokenId)`.
   - Se genera un `tokenURI` (p. ej. `data:application/json,...` o URL IPFS).
   - Se llama a `mintTicketNFT({ artistAddress, tokenURI, supply, priceWei? })`.
3. El contrato (ERC-1155 style): un evento = un `tokenId`; `supply` = número de tickets.
4. Tras éxito, se guarda `tokenId` (y opcionalmente `contractAddress`) en el evento para trazabilidad.

**Nota:** La implementación actual usa un stub en `lib/contracts/ticketNft.ts`. Al desplegar el contrato en Base Sepolia, se sustituye por `writeContract` (wagmi/viem) y, si aplica, lectura de balance por wallet para el fan.

### 2.3 Fan: comprar entrada

1. En la **página del artista** se listan los eventos (componente `ArtistEventsSection`).
2. El fan hace clic en **Comprar entrada** → se abre `TicketPurchaseModal`.
3. Pago en USDC a la wallet del artista (mismo flujo que compra de tracks).
4. Tras la transacción exitosa:
   - Se registra la propiedad del ticket con `addTicketOwnership`: `eventId`, `tokenId`, `ownerWallet`, `txHash`, `chain`, snapshot del evento (título, fecha, lugar, reglas de acceso).
5. El ticket aparece en **Panel de Fan** → Mis entradas.

---

## 3. Transferible y rastreable

- **Transferible:** El NFT puede ser transferido por el propietario (ERC-721/1155). La UI puede mostrar un aviso “Transferible” y en el futuro un botón “Transferir” o enlace al marketplace.
- **Rastreable:** Cada registro de propiedad incluye `txHash` y `chain`. En la UI del fan se puede mostrar “Rastreable en blockchain” y un enlace al explorador (p. ej. BaseScan) con `txHash` para ver la transacción de compra (y futuras transferencias on-chain).

Datos de trazabilidad en `TicketOwnership`: `txHash`, `chain`, `tokenId`, `eventId`, `artistSlug`.

---

## 4. Componentes de UI

### Artista

| Componente | Ruta / uso | Descripción |
|------------|------------|-------------|
| **CreateEventForm** | `/dashboard/tickets` | Formulario crear evento: título, descripción, fecha, tipo de lugar, lugar, reglas de acceso, supply, precio. |
| **Dashboard Tickets Page** | `/dashboard/tickets` | Lista de eventos del artista por wallet; botón “Crear evento”; por evento: “Mintear entradas”. |

### Fan

| Componente | Ruta / uso | Descripción |
|------------|------------|-------------|
| **ArtistEventsSection** | `/artist/[slug]` | Lista de eventos del artista; botón “Comprar entrada” por evento. |
| **TicketPurchaseModal** | Desde ArtistEventsSection | Modal con resumen del evento y precio; pago USDC; registro de propiedad al completar. |
| **FanTicketList** | `/fan-dashboard` | Lista de tickets del fan (por wallet); usa **TicketCard** por entrada. |
| **TicketCard** | Dentro de FanTicketList | Tarjeta por entrada: fecha, lugar, tipo físico/virtual, reglas de acceso, badges Transferible y Rastreable, enlace al artista y al explorador (BaseScan) vía txHash. | Lista de tickets del fan (por wallet); muestra evento, fecha, lugar, reglas de acceso, y nota “Transferible · Rastreable”. |

### Datos y hooks

- **Eventos:** `lib/tickets/events.ts` — `getEventsByWallet`, `getEventsByArtistSlug`, `createEvent`, `updateEvent`.  
- **Metadata:** `lib/tickets/metadata.ts` — `buildTicketMetadata`.  
- **Propiedad:** `lib/tickets/ownership.ts` — `getTicketsByWallet`, `addTicketOwnership`.  
- **Hook fan:** `lib/tickets/useTicketOwnership.ts` — `useTicketOwnership(wallet)` → `{ tickets, refresh }`.  
- **Contrato (stub):** `lib/contracts/ticketNft.ts` — `mintTicketNFT`, `getTicketNftChainId`.

---

## 5. Tipos principales

- **TicketEvent** — Evento creado por el artista (id, artistSlug, artistWallet, title, description, date, locationType, location, accessRules, supply, price, currency, tokenId?, contractAddress?, createdAt).  
- **TicketMetadata** — JSON del tokenURI (name, description, image?, external_url?, attributes, ticket?).  
- **TicketOwnership** — Propiedad de un ticket por un fan (eventId, tokenId, ownerWallet, artistSlug, txHash, chain, acquiredAt, más snapshot del evento para la UI).  
- **AccessRule** — `{ type: string; description?: string }` (ej. puerta, backstage, vip).

Definiciones completas en `types/ticketNft.ts`.
