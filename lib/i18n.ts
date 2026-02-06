// Sistema de internacionalización simple
// Español como idioma principal para usuarios latinos

export type Language = "es" | "en";

export const defaultLanguage: Language = "es";

export const translations = {
  es: {
    // Navegación
    nav: {
      explore: "Explorar",
      artists: "Artistas",
      dashboard: "Panel",
      aiGuide: "Guía",
      howItWorks: "Cómo funciona",
    },
    auth: {
      signIn: "Iniciar sesión",
      logout: "Cerrar sesión",
      loading: "Cargando...",
    },
    // Landing
    landing: {
      title1: "Vende tu música",
      title2: "directamente.",
      title3: "Conserva el 98%.",
      subtitle:
        "Una plataforma Web3 donde los artistas se conectan directamente con sus fans. Sin intermediarios. Sin tarifas ocultas. Solo tú y tu música.",
      ctaArtist: "Soy Artista",
      ctaExplore: "Explorar Música",
      footer: "Music on Chain MVP - Creado para artistas, impulsado por Web3",
    },
    // Artistas
    artists: {
      title: "Artistas",
      subtitle: "Descubre artistas independientes vendiendo su música directamente",
      backToArtists: "Volver a Artistas",
      tracks: "Canciones",
      noTracks: "Aún no hay canciones disponibles.",
      noBio: "Sin biografía disponible",
    },
    // Tracks
    tracks: {
      title: "Explorar Música",
      buy: "Comprar",
      purchased: "✓ Comprado",
      processing: "Procesando...",
      preview: "Vista previa",
      ownedBadge: "Comprada",
      download: "Descargar",
      downloadLocked: "Descargar (bloqueado)",
      purchaseSuccess: "Compra simulada completada",
    },
    // Dashboard
    dashboard: {
      title: "Panel de Artista",
      subtitle: "Rastrea tus ganancias y rendimiento de ventas",
      connectWallet: "Inicia sesión",
      connectWalletDesc: "Inicia sesión para ver tu panel de artista",
      loading: "Cargando...",
      totalEarned: "Total Ganado",
      totalSales: "Total de Ventas",
      salesSubtitle: "canciones vendidas",
      platformFees: "Tarifas de Plataforma",
      feesSubtitle: "USDC (2% por venta)",
      collaboratorEarnings: "Ganancias de Colaboradores",
      noEarnings: "Aún no hay datos de ganancias disponibles.",
      totalDistributed: "Total Distribuido",
      noSales: "Aún no hay ventas",
      noSalesDesc:
        "Tu panel se llenará una vez que comiences a vender canciones. Todas las estadísticas se calculan a partir de datos de ventas simuladas.",
    },
    // Wallet
    wallet: {
      connect: "Conectar Wallet",
      connecting: "Conectando...",
      disconnect: "Desconectar",
      wrongNetwork: "⚠️ Red incorrecta. Por favor cambia a Base Sepolia.",
    },
    // Compra
    purchase: {
      confirm: "Confirmar Compra",
      trackPrice: "Precio de la Canción",
      platformFee: "Tarifa de Plataforma (2%)",
      netAmount: "Monto Neto",
      revenueSplit: "Distribución de Ingresos",
      collaborator: "Colaborador",
      testnetTitle: "Pago USDC en testnet",
      testnetDesc:
        "Se ejecutará una transferencia real de USDC en Base Sepolia. No hay custodia ni marketplace aún.",
      cancel: "Cancelar",
      confirmButton: "Confirmar Compra",
      processing: "Procesando...",
      paymentSuccess: "Pago enviado. Confirmando en Base Sepolia...",
      paymentError: "No se pudo completar el pago. Intenta de nuevo.",
      pleaseConnect: "Por favor inicia sesión para comprar canciones",
    },
    // General
    general: {
      usdc: "USDC",
      format: "Formato",
      duration: "Duración",
      genre: "Género",
    },
    // Página artista / tracks
    artistPage: {
      backToArtists: "Volver a artistas",
      viewArtist: "Ver artista",
      tracks: "Canciones",
      noTracks: "Aún no hay canciones.",
      connectToListen: "Conecta tu wallet para escuchar",
      ownedFullAccess: "✔ Comprado · Acceso completo",
      previewBuy: "Vista previa · Comprar por",
      buyTrack: "Comprar track",
    },
    // Crowdfunding
    crowdfunding: {
      title: "Crowdfunding",
      contribute: "Contribuir",
      deadline: "Fecha límite",
      raised: "Recaudado",
      target: "Objetivo",
    },
    // Modal contribución
    contributeModal: {
      title: "Contribuir",
      amount: "Monto (USDC)",
      customAmount: "Monto personalizado",
      cancel: "Cancelar",
      contribute: "Contribuir",
      processing: "Procesando…",
      fundsGoTo: "Los fondos van a la wallet del artista en Base Sepolia.",
      connectWallet: "Conecta tu wallet para contribuir.",
      success: "¡Gracias! Contribución registrada.",
      error: "Error al procesar el pago. Intenta de nuevo.",
    },
    // NFTs
    nft: {
      sectionTitle: "NFTs y utilidades",
      sectionDesc: "Compatible con ERC-1155 (Base). Mintea tickets, pases de acceso o membresías.",
      ticket: "🎟️ Ticket",
      access: "🔓 Acceso",
      membership: "🏷️ Membresía",
      supply: "Disponibles",
      mintComingSoon: "Mintear NFT (próximamente)",
    },
    // Guía
    guide: {
      title: "Music On Chain — Guía",
      subtitle: "Entiende qué es la plataforma y qué puedes hacer. Elige tu perspectiva.",
      areYou: "¿Eres artista o fan?",
      iAmArtist: "Soy artista",
      iAmArtistDesc: "Hago música y quiero venderla, levantar fondos u ofrecer NFTs.",
      iAmFan: "Soy fan",
      iAmFanDesc: "Quiero descubrir artistas, comprar tracks y apoyarlos directamente.",
      changeChoice: "← Cambiar (artista / fan)",
      forArtistsTitle: "¿Qué es Music On Chain para artistas?",
      forArtistsIntro: "Music On Chain te permite vender tu música y beneficios directamente a los fans usando USDC en Base. Te quedas con la gran mayoría de los ingresos; no hay intermediarios que se lleven un corte.",
      forArtistsWhat: "Qué puedes hacer",
      sellTracks: "Vender tracks — Los fans pagan en USDC; tú recibes en tu wallet. Reproducción completa al comprar.",
      crowdfundingItem: "Crowdfunding — Lanza campañas (ej. nuevo álbum). Los fans contribuyen en USDC; tú defines beneficios (NFT, acceso anticipado).",
      nftsItem: "NFTs — Ofrece tickets, pases de acceso o membresías como NFTs (ERC-1155 en Base).",
      socialsItem: "Redes — Tu página de artista puede enlazar TikTok, Instagram, Facebook, YouTube.",
      exampleArtist: "Ejemplo: Pon un track a 1 USDC, una campaña de crowdfunding de 5.000 USDC y 300 NFT tickets para un show en vivo. Todos los pagos van a tu wallet en Base.",
      seeArtists: "Ver artistas en la plataforma",
      forFansTitle: "¿Qué es Music On Chain para fans?",
      forFansIntro: "Descubre artistas independientes, compra sus tracks con USDC, contribuye a campañas de crowdfunding y colecciona NFT tickets o membresías. Tu apoyo va directo al artista.",
      discoverArtists: "Descubrir artistas — Navega la lista de artistas y abre la página de cada uno.",
      buyTracksItem: "Comprar tracks — Paga en USDC. Tras la compra tienes reproducción completa; la propiedad queda registrada.",
      contributeItem: "Contribuir al crowdfunding — Apoya campañas. El USDC va al artista; puedes recibir beneficios.",
      collectNfts: "Coleccionar NFTs — Obtén tickets NFT, pases de acceso o insignias de membresía.",
      exampleFan: "Ejemplo: Conecta tu wallet, entra a la página de un artista, escucha la vista previa de 30 segundos y compra el track por 1 USDC o contribuye 25 USDC a su campaña de álbum.",
      exploreArtists: "Explorar artistas",
      footerHow: "Cómo funciona",
      footerHome: "Inicio",
    },
    // Cómo funciona
    howItWorks: {
      title: "Cómo funciona",
      subtitle: "Una explicación breve del flujo de Music On Chain para artistas y fans.",
      backHome: "← Volver al inicio",
      step1Title: "Los artistas se suman",
      step1Body: "Cada artista tiene una página con su identidad, tracks, campañas de crowdfunding y NFTs. Todo se configura desde datos, sin páginas fijas.",
      step2Title: "Los fans descubren",
      step2Body: "Los fans ven la lista de artistas en la portada y entran a cada uno para ver su música, campañas y redes. La página del artista es el centro de cada creador.",
      step3Title: "Pagos en USDC",
      step3Body: "Las compras de tracks y las contribuciones de crowdfunding se pagan en USDC en Base (testnet por ahora). El dinero va directo a la wallet del artista.",
      step4Title: "Propiedad y acceso",
      step4Body: "Cuando un fan compra un track, se registra la propiedad (local en este MVP). Obtiene reproducción completa. Las contribuciones se guardan con prueba de transacción. Los NFTs (tickets, acceso, membresía) se mintearán con ERC-1155 cuando se conecten los contratos.",
      oneLiner: "En una frase",
      oneLinerText: "Los artistas tienen una página; los fans los descubren, pagan en USDC y obtienen tracks, crowdfunding y NFTs, con pagos y prueba yendo al artista.",
      ctaGuide: "Guía (artista vs fan)",
      ctaExplore: "Explorar artistas",
    },
  },
  en: {
    // Navigation
    nav: {
      explore: "Explore",
      artists: "Artists",
      dashboard: "Dashboard",
      aiGuide: "AI Guide",
      howItWorks: "How it works",
    },
    auth: {
      signIn: "Sign in",
      logout: "Sign out",
      loading: "Loading...",
    },
    // Landing
    landing: {
      title1: "Sell your music",
      title2: "directly.",
      title3: "Keep 98%.",
      subtitle:
        "A Web3 music platform where artists connect directly with fans. No intermediaries. No hidden fees. Just you and your music.",
      ctaArtist: "I'm an Artist",
      ctaExplore: "Explore Music",
      footer: "Music on Chain MVP - Built for artists, powered by Web3",
    },
    // Artists
    artists: {
      title: "Artists",
      subtitle: "Discover independent artists selling their music directly",
      backToArtists: "Back to Artists",
      tracks: "Tracks",
      noTracks: "No tracks available yet.",
      noBio: "No bio available",
    },
    // Tracks
    tracks: {
      title: "Explore Music",
      buy: "Buy Track",
      purchased: "✓ Purchased",
      processing: "Processing...",
      preview: "Preview",
      ownedBadge: "Owned",
      download: "Download",
      downloadLocked: "Download (locked)",
      purchaseSuccess: "Mock purchase completed",
    },
    // Dashboard
    dashboard: {
      title: "Artist Dashboard",
      subtitle: "Track your earnings and sales performance",
      connectWallet: "Sign in",
      connectWalletDesc:
        "Sign in to view your artist dashboard",
      loading: "Loading...",
      totalEarned: "Total Earned",
      totalSales: "Total Sales",
      salesSubtitle: "tracks sold",
      platformFees: "Platform Fees",
      feesSubtitle: "USDC (2% per sale)",
      collaboratorEarnings: "Collaborator Earnings",
      noEarnings: "No earnings data available yet.",
      totalDistributed: "Total Distributed",
      noSales: "No sales yet",
      noSalesDesc:
        "Your dashboard will populate once you start selling tracks. All statistics are calculated from mock sales data.",
    },
    // Wallet
    wallet: {
      connect: "Connect Wallet",
      connecting: "Connecting...",
      disconnect: "Disconnect",
      wrongNetwork: "⚠️ Wrong network. Please switch to Base Sepolia.",
    },
    // Purchase
    purchase: {
      confirm: "Confirm Purchase",
      trackPrice: "Track Price",
      platformFee: "Platform Fee (2%)",
      netAmount: "Net Amount",
      revenueSplit: "Revenue Split",
      collaborator: "Collaborator",
      testnetTitle: "USDC payment on testnet",
      testnetDesc:
        "A real USDC transfer will be sent on Base Sepolia. No escrow or marketplace yet.",
      cancel: "Cancel",
      confirmButton: "Confirm Purchase",
      processing: "Processing...",
      paymentSuccess: "Payment sent. Confirming on Base Sepolia...",
      paymentError: "Payment failed. Please try again.",
      pleaseConnect: "Please sign in to purchase tracks",
    },
    // General
    general: {
      usdc: "USDC",
      format: "Format",
      duration: "Duration",
      genre: "Genre",
    },
    artistPage: {
      backToArtists: "Back to artists",
      viewArtist: "View artist",
      tracks: "Tracks",
      noTracks: "No tracks yet.",
      connectToListen: "Connect to listen",
      ownedFullAccess: "✔ Owned · Full access",
      previewBuy: "Preview · Buy for",
      buyTrack: "Buy track",
    },
    crowdfunding: {
      title: "Crowdfunding",
      contribute: "Contribute",
      deadline: "Deadline",
      raised: "Raised",
      target: "Target",
    },
    contributeModal: {
      title: "Contribute",
      amount: "Amount (USDC)",
      customAmount: "Custom amount",
      cancel: "Cancel",
      contribute: "Contribute",
      processing: "Processing…",
      fundsGoTo: "Funds go to the artist wallet on Base Sepolia.",
      connectWallet: "Connect your wallet to contribute.",
      success: "Thank you! Contribution recorded.",
      error: "Error processing payment. Try again.",
    },
    nft: {
      sectionTitle: "NFTs & utilities",
      sectionDesc: "ERC-1155 compatible (Base). Mint tickets, access passes, or memberships.",
      ticket: "🎟️ Ticket",
      access: "🔓 Access",
      membership: "🏷️ Membership",
      supply: "Supply",
      mintComingSoon: "Mint NFT (coming soon)",
    },
    guide: {
      title: "Music On Chain — Guide",
      subtitle: "Understand what the platform is and what you can do. Choose your perspective.",
      areYou: "Are you an artist or a fan?",
      iAmArtist: "I am an Artist",
      iAmArtistDesc: "I make music and want to sell it, raise funds, or offer NFTs.",
      iAmFan: "I am a Fan",
      iAmFanDesc: "I want to discover artists, buy tracks, and support them directly.",
      changeChoice: "← Change (artist / fan)",
      forArtistsTitle: "What is Music On Chain for artists?",
      forArtistsIntro: "Music On Chain lets you sell your music and perks directly to fans using USDC on Base. You keep the vast majority of revenue; there are no big intermediaries taking a cut.",
      forArtistsWhat: "What you can do",
      sellTracks: "Sell tracks — Fans pay in USDC; you receive to your wallet. Full playback unlocks after purchase.",
      crowdfundingItem: "Crowdfunding — Run campaigns (e.g. new album). Fans contribute USDC; you set benefits (NFT, early access).",
      nftsItem: "NFTs — Offer tickets, access passes, or membership as NFTs (ERC-1155 on Base).",
      socialsItem: "Socials — Your artist page can link TikTok, Instagram, Facebook, YouTube.",
      exampleArtist: "Set a track at 1 USDC, run a 5,000 USDC crowdfunding campaign, and offer 300 NFT tickets for a live show. All payments go to your wallet on Base.",
      seeArtists: "See artists on the platform",
      forFansTitle: "What is Music On Chain for fans?",
      forFansIntro: "Discover independent artists, buy their tracks with USDC, contribute to crowdfunding campaigns, and collect NFT tickets or memberships. Your support goes straight to the artist.",
      discoverArtists: "Discover artists — Browse the artist list and open each artist page.",
      buyTracksItem: "Buy tracks — Pay in USDC. After purchase you get full playback; ownership is recorded.",
      contributeItem: "Contribute to crowdfunding — Support campaigns. USDC goes to the artist; you may get benefits.",
      collectNfts: "Collect NFTs — Get NFT tickets, access passes, or membership badges.",
      exampleFan: "Connect your wallet, go to an artist page, listen to the 30-second preview, then buy the track for 1 USDC or contribute 25 USDC to their album campaign.",
      exploreArtists: "Explore artists",
      footerHow: "How it works",
      footerHome: "Home",
    },
    howItWorks: {
      title: "How it works",
      subtitle: "A short overview of the Music On Chain flow for artists and fans.",
      backHome: "← Back to home",
      step1Title: "Artists join",
      step1Body: "Each artist has a dedicated page with their identity, tracks, crowdfunding campaigns, and NFT utilities. Everything is configurable from data.",
      step2Title: "Fans discover",
      step2Body: "Fans browse the artist list on the homepage and open any artist to see their music, campaigns, and social links.",
      step3Title: "Payments in USDC",
      step3Body: "Track purchases and crowdfunding contributions are paid in USDC on Base (testnet for now). Funds go directly to the artist wallet.",
      step4Title: "Ownership & access",
      step4Body: "When a fan buys a track, ownership is recorded. They get full playback. Crowdfunding contributions are stored with tx proof. NFTs will mint on ERC-1155 when contracts are connected.",
      oneLiner: "In one line",
      oneLinerText: "Artists get a page; fans discover them, pay in USDC, and get tracks, crowdfunding, and NFTs — all with payments and proof going to the artist.",
      ctaGuide: "Guide (artist vs fan)",
      ctaExplore: "Explore artists",
    },
  },
} as const;

export type Translations = (typeof translations)["es"];

export function getTranslations(lang: Language = defaultLanguage): Translations {
  return translations[lang] as Translations;
}

export function t(key: string, lang: Language = defaultLanguage): string {
  const keys = key.split(".");
  let value: unknown = translations[lang];

  for (const k of keys) {
    if (typeof value === "object" && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  if (value === undefined) {
    // Fallback to Spanish if key not found
    value = translations[defaultLanguage];
    for (const k2 of keys) {
      if (typeof value === "object" && value !== null && k2 in value) {
        value = (value as Record<string, unknown>)[k2];
      } else {
        value = undefined;
        break;
      }
    }
  }

  return typeof value === "string" ? value : key;
}

