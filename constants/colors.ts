// ─── Status de vendas (mapa) ──────────────────────────────────────────────────
export const STATUS_COLORS = {
  all: '#448361',          // verde muted — todos compraram
  partial: '#D9730D',      // laranja — alguns compraram
  none: '#D44C47',         // vermelho — nenhum comprou
  'no-clients': '#9B9A97', // cinza — sem clientes
} as const;

export const STATUS_FILL_OPACITY = {
  all: 0.45,
  partial: 0.45,
  none: 0.45,
  'no-clients': 0.15,
} as const;

// ─── Paleta Notion ────────────────────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSubtle: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceElevated: '#F7F7F5',
  surfaceBorder: '#E9E9E7',
  surfaceBorderStrong: '#CBCAC8',

  // Brand — Notion blue
  primary: '#0073E6',
  primaryLight: '#5BA4F5',
  primaryDark: '#0059B3',
  primaryBg: '#E9F0FE',
  accent: '#0073E6',

  // Text
  textPrimary: '#37352F',
  textSecondary: '#787774',
  textMuted: '#AFACAA',
  textPlaceholder: '#C4C1BD',

  // Feedback
  success: '#448361',
  successBg: '#DBEDDB',
  warning: '#D9730D',
  warningBg: '#FBECDD',
  error: '#D44C47',
  errorBg: '#FFE2DD',
  info: '#0073E6',

  // Map overlay (sobre fundo claro)
  mapOverlay: 'rgba(255, 255, 255, 0.95)',
  cardBlur: 'rgba(255, 255, 255, 0.97)',
  searchBar: 'rgba(255, 255, 255, 0.97)',

  // Status aliases
  statusAll: '#448361',
  statusPartial: '#D9730D',
  statusNone: '#D44C47',
  statusNoClients: '#9B9A97',

  // Tab
  tabActive: '#0073E6',
  tabInactive: '#AFACAA',
  tabBackground: '#FFFFFF',
} as const;

// ─── Mapa ─────────────────────────────────────────────────────────────────────
export const PIAUI_REGION = {
  latitude: -7.718889,
  longitude: -42.728889,
  latitudeDelta: 8.5,
  longitudeDelta: 5.5,
} as const;

// ─── Tipografia ───────────────────────────────────────────────────────────────
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
} as const;

// ─── Espaçamentos ─────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ─── Border radius ─────────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 999,
} as const;
