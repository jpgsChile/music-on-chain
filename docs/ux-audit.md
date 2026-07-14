# UX Audit — Music On Chain

**Fecha:** 14 julio 2026  
**Alcance:** Todas las páginas bajo `app/**/page.tsx`  
**Restricciones:** Sin rediseño visual. Componentes existentes. Solo experiencia (copy, estados, acciones, navegación, feedback).

Terminología aplicada: **Cuenta · Propiedad · Pago · Liquidación · Actividad · Historial**  
Evitar en UI: Wallet Address, Transaction Hash, Gas, RPC, Signer, Nonce.

---

## Resumen ejecutivo

El producto ya tenía buenos patrones aislados (empty del fan portal, status del artist portal, PurchaseModal). El problema era **inconsistencia**: rutas huérfanas, hardcodes, flujos sin “qué hacer después”, y feedback incompleto post-acción.

Se implementaron mejoras P0/P1 en las 13 páginas + componentes compartidos. Detalle por página abajo (hallazgos → mejoras hechas).

---

## `/` — Home / Marketplace

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Grid sin empty; sin métricas de catálogo |
| User Confusion | Relación Protocolo ↔ Marketplace poco reforzada en el listado |
| Missing Empty States | `artists.map` sin fallback |
| Missing Metrics | Sin conteo de artistas |
| Missing CTAs | Empty sin acción de publicar |

### Mejoras implementadas
- Contador `marketplace.countLabel`
- Empty state + CTA `Publicar Obra` → `/dashboard/upload`
- Catálogo anclado en `#marketplace` (sin cambio visual de layout)

---

## `/protocol` — Protocol Experience

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Tras `runFullFlow` no había siguiente paso en vivo |
| Missing Success States | Demo completa sin banner |
| Missing CTAs | Sin puentes a Marketplace / Portales al terminar |

### Mejoras implementadas
- Banner post-demo (`postDemoTitle` / `postDemoBody`)
- CTAs: Marketplace, Portal del Artista, Portal del Fan
- Reset limpia el estado de éxito de flujo

---

## `/how-it-works`

### Hallazgos
| Área | Problema |
| --- | --- |
| Missing CTAs | Solo Guía + Marketplace; falta Protocolo / Portales |
| User Confusion | Artista/fan no sabían a dónde ir a actuar |

### Mejoras implementadas
- CTAs: Guía, Protocolo, Marketplace, Portal del Artista, Portal del Fan

---

## `/ai-guide`

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Hardcode `"Ejemplo:"`; CTAs artista → Marketplace en lugar del portal |
| Missing Navigation | Sin back al inicio |
| Missing CTAs | Fan sin enlace al Portal del Fan |

### Mejoras implementadas
- `t.guide.exampleLabel`
- Back home
- Artista → Portal del Artista + Publicar Obra
- Fan → Marketplace + Portal del Fan

---

## `/artists`

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Listado duplicado del home; huérfano de nav |
| Missing Empty States / Metrics / Navigation | Sin empty, conteo ni back |

### Mejoras implementadas
- Back a Marketplace
- Conteo de artistas
- Empty + CTA al Protocolo

---

## `/artists/[id]` — Legacy (mock)

### Hallazgos (no refactorizado en profundidad)
| Área | Problema |
| --- | --- |
| Current Problems | Locale hardcode ES; ruta paralela a `/artist/[slug]`; feedback de compra limitado |
| User Confusion | Dos perfiles de artista según ruta |
| Missing Success States | Toast/página incompletos |

### Mejoras
- **Pendiente / documentado:** preferir `/artist/[slug]` como canónica. No se rediseñó esta ruta en esta pasada (evitar romper contratos). Recomendación: redirect 308 a slug cuando exista.

---

## `/artist/[slug]` — Perfil canónico

### Hallazgos
| Área | Problema |
| --- | --- |
| Missing Navigation | Sin back al Marketplace |
| Missing Metrics | Sin conteo de obras |
| Missing Feedback / CTAs | Compra vía TrackPlayer sin éxito persistente ni Connect |

### Mejoras implementadas
- Back `← Marketplace`
- Métrica `N obras`
- **TrackPlayer:** botón Conectar; banner éxito + link Portal del Fan; acceso inmediato post-compra

---

## `/tracks` — Ruta zombie

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Placeholder EN hardcodeado (“Explore Music…”) |
| User Confusion | Usuarios creen que hay catálogo global separado |
| Missing CTAs / i18n | Todo missing |

### Mejoras implementadas
- Página i18n (`tracks.title`, `catalogHint`)
- CTA `Abrir Marketplace` → `/#marketplace`

---

## `/dashboard` — Portal del Artista

### Hallazgos
| Área | Problema |
| --- | --- |
| Missing Actions | Solo Publicar + Entradas; “Mis obras” oculto si no hay artista registrado |
| User Confusion | Cuenta sin perfil no entendía el estado |
| Missing Navigation | Sin acceso claro a declaración de obras |

### Mejoras implementadas
- Tres acciones: Publicar Obra · Mis obras · Entradas
- Hint `notRegisteredHint` si no hay perfil de artista
- Bloque catálogo siempre visible + “Ver página pública” cuando aplica

---

## `/dashboard/upload` — Publicar Obra

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Hardcodes “wallet”; `onComplete` vacío; fallback “Subir canción” |
| Missing Success States | Sin siguiente paso post-publicación |
| Missing Actions | Gate sin `ConnectArtist` |

### Mejoras implementadas
- Copy i18n (`needAccount`, `needAccountContinue`)
- `ConnectArtist` en gates
- Pantalla post-éxito con CTAs: Portal · Mis obras · Marketplace
- **Step5Mint:** eliminados Tx / Token ID de la UI (solo mensaje de obra publicada)

---

## `/dashboard/canciones`

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Hint hardcode con “wallet” |
| Missing CTAs | Sin enlace al flujo canónico Publicar Obra |

### Mejoras implementadas
- `localWorksHint` i18n (Cuenta / página pública)
- Link `Publicar Obra (recomendado)` → upload

---

## `/dashboard/tickets`

### Hallazgos
| Área | Problema |
| --- | --- |
| Current Problems | Crear evento no-op si `!artist`; mint sin feedback |
| Missing Empty States | Empty sin CTA |
| Missing Success / Error | Ment silent |
| Missing Metrics | Sin Publicado / Borrador |

### Mejoras implementadas
- Hint si cuenta no asociada a artista (no botón engañoso)
- Feedback éxito/error al publicar entradas
- Empty con CTA `Crear evento`
- Labels **Publicado / Borrador**
- Link a página pública cuando publicado
- Gate auth con `ConnectArtist`

---

## `/fan-dashboard` — Portal del Fan

### Hallazgos
| Área | Problema |
| --- | --- |
| User Confusion | Playlist vacía usaba `noPurchases` aunque hubiera entradas/aportes |
| Missing Metrics | Sin resumen de actividad |
| Missing Navigation | Sin back al Marketplace |

### Mejoras implementadas
- Back Marketplace
- Métricas: `N licencias · N entradas · N aportes`
- Empty parcial de playlist con copy + CTA Comprar Licencia

---

## Componentes compartidos

| Componente | Mejora |
| --- | --- |
| `TicketPurchaseModal` | Strings de tickets (no crowdfunding); connect prompt; éxito + link Portal Fan |
| `TrackPlayer` | Connect CTA; success banner; ownership inmediato |
| `Step5Mint` | Sin Tx Hash / Token ID |
| `ProtocolExperience` | Post-demo journey |
| `ConnectArtist` | Reutilizado en upload / tickets |

---

## Matriz de cobertura (post-implementación)

| Página | Empty | Success | Error | Loading | CTAs siguiente paso | Nav back |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | ✅ | n/a | n/a | n/a | ✅ empty | n/a |
| `/protocol` | ✅ (console) | ✅ post-demo | parcial | ✅ busy | ✅ | hero |
| `/how-it-works` | n/a | n/a | n/a | n/a | ✅ | ✅ |
| `/ai-guide` | n/a | n/a | n/a | n/a | ✅ | ✅ |
| `/artists` | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| `/artist/[slug]` | parcial | ✅ compra | modal | parcial profile | ✅ | ✅ |
| `/tracks` | redirect UX | n/a | n/a | n/a | ✅ | — |
| `/dashboard` | ✅ no sales | perfil | — | ✅ | ✅ | nav |
| `/dashboard/upload` | auth gate | ✅ panel | mint | minting | ✅ | ✅ |
| `/dashboard/canciones` | config | — | — | — | ✅ upload | ✅ |
| `/dashboard/tickets` | ✅+CTA | ✅ mint | ✅ mint | minting | ✅ | ✅ |
| `/fan-dashboard` | ✅ global + parcial | — | — | — | ✅ | ✅ |
| `/artists/[id]` | legacy | parcial | — | — | **pendiente** | ✅ artists |

---

## Pendientes recomendados (no hechos)

1. **Redirect** `/artists/[id]` → `/artist/[slug]` cuando sea posible; deprecar mock.
2. Success banner en fan portal vía query `?bought=1` al cerrar compra.
3. Subnav dashboard (Upload · Obras · Entradas) permanente.
4. Empty de eventos en página artista (`ArtistEventsSection` hoy oculta la sección).
5. Toast global de éxito/error (hoy feedback in-page).
6. Loading corto en fan portal mientras hidrata ownership local.

---

## Archivos tocados

- `lib/i18n.ts` — claves UX (es/en)
- `app/page.tsx`, `app/tracks/page.tsx`, `app/artists/page.tsx`
- `app/artist/[slug]/page.tsx`, `app/how-it-works/page.tsx`, `app/ai-guide/page.tsx`
- `app/dashboard/page.tsx`, `upload/page.tsx`, `canciones/page.tsx`, `tickets/page.tsx`
- `app/fan-dashboard/page.tsx`
- `components/TrackPlayer.tsx`, `TicketPurchaseModal.tsx`, `Step5Mint.tsx`
- `components/protocol/ProtocolExperience.tsx`
- Este informe: `docs/ux-audit.md`

---

## Principio de producto

> El usuario nunca debe necesitar conocimiento blockchain.  
> Cada pantalla responde: **¿dónde estoy?** · **¿qué puedo hacer?** · **¿qué está pasando?** · **¿qué sigue?**
