# Music On Chain Protocol

**Music On Chain** es un **protocolo de derechos musicales**: ownership, licensing, distribución, regalías y liquidación.

El **Marketplace** es la **primera aplicación** construida sobre el protocolo. Encima también viven el **Portal del Artista**, el **Portal del Fan** y la **Developer Platform** (SDK).

---

## Jerarquía del producto

1. Music On Chain Protocol  
2. SDK  
3. Marketplace  
4. Artist Portal  
5. Fan Portal  
6. Developer Platform  

---

## Qué puedes probar en esta demo

- Protocolo / Architecture Experience (`/protocol`)
- Marketplace de obras y artistas (`/`)
- Portal del Artista (publicar obras, regalías, ingresos)
- Portal del Fan (licencias, acceso, ownership)
- SDK playground (métodos públicos simulados)
- Liquidación etiquetada en USDC · Base

---

## Para quién

### Artistas
- Publicar obras con ownership y regalías programables
- Distribución de ingresos transparente
- Portal dedicado encima del protocolo

### Fans
- Adquirir licencias
- Acceso y ownership verificables
- Marketplace como primera app

### Desarrolladores
- SDK para construir más apps sobre el mismo núcleo

---

## 🧭 Cómo funciona (resumen)

1. El fan explora artistas  
2. Escucha un preview del track  
3. Compra el track usando USDC  
4. La blockchain registra la transacción  
5. El fan obtiene **propiedad digital**  
6. El contenido se desbloquea automáticamente  

---

## 🖥️ Estructura de la demo

- **Home**  
  Lista de artistas disponibles

- **Página de Artista**  
  - Información del artista  
  - Tracks disponibles  
  - Crowdfunding activo (si aplica)  
  - NFTs / tickets (MVP)  
  - Redes sociales  

- **Compra Web3**
  - Login social (Privy)
  - Wallet embebida automática
  - Pago en USDT/USDC 

---

## 🔗 Tecnología utilizada

- **Frontend:** Next.js (App Router)
- **Web3 Auth:** Privy
- **Blockchain:** Base Sepolia (desarrollo)
- **Pagos:** USDC
- **Wallets:** Embedded Wallet / Coinbase Wallet
- **Audio:** HTML5 Audio
- **Persistencia (MVP):** LocalStorage
- **Arquitectura:** Multi-artista, data-driven

---

## ⚠️ Importante (sobre esta demo)

- Esta demo corre sobre **testnet**
- Los tokens utilizados **no tienen valor real**
- El objetivo es **mostrar funcionalidad y experiencia**, no producción f
