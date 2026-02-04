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
  },
  en: {
    // Navigation
    nav: {
      explore: "Explore",
      artists: "Artists",
      dashboard: "Dashboard",
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
  },
} as const;

export function getTranslations(lang: Language = defaultLanguage) {
  return translations[lang];
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

