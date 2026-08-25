import type { TextStyle } from "react-native";

// ─── Status de vendas (mapa) ──────────────────────────────────────────────────
// Cores de preenchimento dos polígonos. Para texto e ícone use COLORS.success /
// warning / error: estes tons puros não têm contraste suficiente sobre branco.
export const STATUS_COLORS = {
  all: '#34C759',          // todos compraram
  partial: '#FF9500',      // alguns compraram
  none: '#FF3B30',         // nenhum comprou
  'no-clients': '#C7C7CC', // sem clientes
} as const;

export const STATUS_FILL_OPACITY = {
  all: 0.3,
  partial: 0.3,
  none: 0.12,
  'no-clients': 0.1,
} as const;

/**
 * Contorno por status, para o polígono não se distinguir só pelo matiz: sólido
 * quando todos compraram e tracejado quando faltam clientes — o traço
 * "incompleto" carrega o sentido. A largura é a mesma de produção (1,5): o que
 * distingue é a forma do traço, não o peso dele.
 */
/**
 * Opacidade do contorno, em hexadecimal para concatenar na cor — o mesmo valor
 * que está em produção.
 */
export const STATUS_STROKE_ALPHA = 'CC';

export const STATUS_STROKE: Record<
  'all' | 'partial' | 'none' | 'no-clients',
  { width: number; dash?: number[] }
> = {
  all: { width: 1.5 },
  partial: { width: 1.5, dash: [7, 4] },
  none: { width: 1.5 },
  'no-clients': { width: 0.5 },
};

/**
 * Glifo por status — o mapa não pode depender só do matiz. Cerca de 1 em 12
 * homens não distingue verde de vermelho, e o público do app é majoritariamente
 * masculino: sem símbolo, uma praça vendida e uma praça perdida são iguais.
 */
export const STATUS_ICONS = {
  all: 'checkmark',
  partial: 'add',
  none: 'close',
  'no-clients': 'remove',
} as const;

/**
 * Versão legível sobre fundo claro dos tons de STATUS_COLORS, para texto e
 * ícone. Em hexadecimal porque há lugares que concatenam alfa (`${cor}55`).
 */
export const STATUS_TEXT_COLORS = {
  all: '#248A3D',
  partial: '#A85800',
  none: '#C9241B',
  'no-clients': '#6B6B70',
} as const;

// ─── Paleta ───────────────────────────────────────────────────────────────────
// Cor por papel, não por valor: texto é uma hierarquia de opacidade sobre o
// fundo, e não um cinza escolhido a dedo. É isso que faz o modo escuro e o
// Aumentar Contraste do sistema funcionarem sem uma segunda paleta.
export const COLORS = {
  /**
   * Backgrounds. O cinza agrupado do iOS (#F2F2F7) é levemente azulado e, ao
   * lado do material quente dos painéis, lia como lilás — sobretudo nas telas
   * vazias durante uma transição, onde ele ocupa a tela inteira. Este é o
   * mesmo cinza em temperatura neutra-quente.
   */
  background: '#FFFFFF',
  backgroundSubtle: '#F5F3F0',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F3F0',
  surfaceBorder: 'rgba(60, 60, 67, 0.16)',
  surfaceBorderStrong: 'rgba(60, 60, 67, 0.29)',

  // Ação
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0060D0',
  primaryBg: 'rgba(0, 122, 255, 0.12)',
  accent: '#007AFF',

  // Texto — label, secondary, tertiary, placeholder
  textPrimary: 'rgba(0, 0, 0, 0.88)',
  textSecondary: 'rgba(60, 60, 67, 0.6)',
  textMuted: 'rgba(60, 60, 67, 0.4)',
  textPlaceholder: 'rgba(60, 60, 67, 0.3)',

  // Feedback — tons legíveis sobre fundo claro (os puros vivem em STATUS_COLORS)
  success: '#248A3D',
  successBg: 'rgba(52, 199, 89, 0.14)',
  warning: '#A85800',
  warningBg: 'rgba(255, 149, 0, 0.16)',
  error: '#C9241B',
  errorBg: 'rgba(255, 59, 48, 0.12)',
  info: '#007AFF',

  /**
   * Preenchimento de controle (campo de busca, botão secundário, trilha).
   * O cinza do sistema iOS é levemente azulado (118,118,128) e, sobre o
   * material quente dos painéis, lia como arroxeado — este é neutro-quente
   * para conviver com o fundo bege sem puxar para o frio.
   */
  fill: 'rgba(120, 118, 114, 0.10)',
  fillStrong: 'rgba(120, 118, 114, 0.18)',

  // Mapa — fundo de terra atrás dos tiles (aparece enquanto carregam)
  mapBackground: '#F6F2EB',

  // Map overlay
  mapOverlay: 'rgba(252, 251, 249, 0.95)',
  cardBlur: 'rgba(252, 251, 249, 0.97)',
  searchBar: 'rgba(252, 251, 249, 0.97)',

  // Material flutuante sobre o mapa — ver MATERIALS para a escala completa
  floatingBg: 'rgba(252, 251, 249, 0.78)',
  floatingPanelBg: 'rgba(252, 251, 249, 0.9)',
  floatingBorder: 'rgba(255, 255, 255, 0.7)',

  // Status aliases
  statusAll: '#34C759',
  statusPartial: '#FF9500',
  statusNone: '#FF3B30',
  statusNoClients: '#C7C7CC',

  // Tab
  tabActive: '#007AFF',
  tabInactive: 'rgba(60, 60, 67, 0.4)',
  tabBackground: '#FFFFFF',
} as const;

/**
 * Três materiais, e só três. Cada nível de elevação tem uma espessura: o que
 * flutua sobre o mapa deixa o mapa legível por baixo; o que carrega uma lista
 * cede lugar ao conteúdo. `backdropFilter` só existe na web — no nativo ficam
 * as cores opacas equivalentes.
 */
export const MATERIALS = {
  /** Chips e legenda: o mapa continua legível por baixo. */
  thin: {
    background: 'rgba(252, 251, 249, 0.55)',
    blur: 'blur(20px) saturate(1.7)',
  },
  /** Cápsula de navegação, busca, controles de zoom. */
  regular: {
    background: 'rgba(252, 251, 249, 0.68)',
    blur: 'blur(30px) saturate(1.8)',
  },
  /**
   * Painel lateral e bottom sheet: aqui se lê, então cede menos lugar ao fundo
   * — mas não muito, senão o desfoque não tem o que mostrar e a superfície
   * passa a parecer sólida.
   */
  thick: {
    background: 'rgba(252, 251, 249, 0.78)',
    blur: 'blur(40px) saturate(1.8)',
  },
} as const;

// ─── Paleta de avatares de cliente ────────────────────────────────────────────
// Cor determinística por id (estilo Contatos da Apple): o mesmo cliente sempre
// cai na mesma cor, em qualquer tela — ver utils/avatarColor.ts.
export const AVATAR_PALETTE = [
  '#FF9500',
  '#34C759',
  '#007AFF',
  '#AF52DE',
  '#FF3B30',
  '#5AC8FA',
  '#FF2D55',
  '#5856D6',
] as const;

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
  /**
   * Tipo com nome de papel: o corpo vem com o peso que aquele papel pede, em
   * vez de cada tela escolher os dois separados. Espalhe via `...FONTS.text.x`.
   */
  text: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.7 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
    title2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
    headline: { fontSize: 17, fontWeight: '600' as const },
    body: { fontSize: 17, fontWeight: '400' as const },
    callout: { fontSize: 16, fontWeight: '400' as const },
    subheadline: { fontSize: 15, fontWeight: '400' as const },
    footnote: { fontSize: 13, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
    /** Cabeçalho de seção em lista agrupada. */
    sectionHeader: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
      textTransform: 'uppercase' as const,
    },
  },
  /**
   * Dígitos de largura fixa. Sem isso uma coluna de reais não alinha na
   * vírgula: os números dançam de linha em linha e a coluna deixa de ser
   * comparável de relance — que é justamente para isso que ela existe.
   */
  // O `as` é necessário: sem ele o `as const` abaixo torna o array readonly, e
  // um fontVariant readonly derruba a inferência de StyleSheet.create inteira.
  tabular: { fontVariant: ['tabular-nums'] } as Pick<TextStyle, 'fontVariant'>,
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
// Raios de controle, não de documento: 4 e 6 px pertencem a um editor de texto.
export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 18,
  xxl: 26,
  full: 999,
} as const;

/**
 * Alvo mínimo de toque. O desenho pode ser menor — um avatar de 34 px dentro de
 * uma área de 44 está correto —, mas nada que responda ao dedo mede menos que
 * isto. É o que dispensa os `hitSlop` espalhados pelo app.
 */
export const HIT_TARGET = 44;
