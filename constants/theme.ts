export const KAMBAGO_COLORS = {
  // Vermelho primário da marca
  primary: '#E53935',
  primaryDark: '#C62828',
  primaryLight: '#FFEBEE',

  // Neutros
  background: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F1F2',
  border: '#E8E8E8',

  // Texto
  textPrimary: '#191919',
  textSecondary: '#747474',

  // Estados
  success: '#18864B',
  successSurface: '#EAF6EF',
  danger: '#D32F2F',
  dangerSurface: '#FFF0F0',
  warning: '#F57C00',
  warningSurface: '#FFF3E0',

  // Cor de destaque (mantida para compatibilidade com mapas e marcadores)
  accent: '#E53935',
};

// Aliases de compatibilidade com nomes anteriores (não usar em novo código)
// Preencher aliases para evitar quebrar código existente
Object.assign(KAMBAGO_COLORS, {
  navy: '#191919',
  navyLight: '#333333',
  teal: '#E53935',
  tealDark: '#C62828',
  amber: '#E53935',
  amberText: '#C62828',
  amberSurface: '#FFF0F0',
  textMuted: '#747474',
});

export const KAMBAGO_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const KAMBAGO_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
