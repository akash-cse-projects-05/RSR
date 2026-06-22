/**
 * HRMS Global Design System
 * Single source of truth for all colors, typography, and shared styles.
 * Import `T` and use T.colors, T.text, T.card, etc. in any screen.
 */

export const colors = {
  // Brand
  primary:    '#0052cc',
  primaryDark:'#0052cc',
  primarySoft:'#eff6ff',

  // Backgrounds
  bg:         '#f8fafc',
  surface:    '#ffffff',
  muted:      '#f1f5f9',

  // Text
  textPrimary:   '#0f172a',
  textSecondary: '#64748b',
  textMuted:     '#94a3b8',
  textLight:     '#cbd5e1',

  // Borders
  border:     '#e2e8f0',

  // Semantic
  success:    '#10b981',
  successBg:  '#ecfdf5',
  successBorder: '#a7f3d0',
  warning:    '#f59e0b',
  warningBg:  '#fffbeb',
  warningBorder: '#fde68a',
  danger:     '#ef4444',
  dangerBg:   '#fdf2f2',
  info:       '#3b82f6',
  infoBg:     '#eff6ff',
  purple:     '#8b5cf6',
  purpleBg:   '#f5f3ff',
  cyan:       '#06b6d4',
  cyanBg:     '#ecfeff',
  pink:       '#ec4899',
  pinkBg:     '#fdf2f8',
  teal:       '#14b8a6',
  tealBg:     '#f0fdfa',
};

// Shared shadow style — consistent elevation across all cards
export const shadow = {
  shadowColor:   '#0f172a',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius:  8,
  elevation:     3,
};

// Shared text styles (use spread: { ...T.label } )
export const text = {
  // Section headers — e.g. "TODAY'S METRICS"
  sectionTitle: {
    fontSize:      11,
    fontWeight:    '800',
    color:         '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Page / card headers
  heading: {
    fontSize:   18,
    fontWeight: '800',
    color:      '#0f172a',
  },

  // Sub-heading inside cards
  subheading: {
    fontSize:   14,
    fontWeight: '700',
    color:      '#0f172a',
  },

  // Standard body text
  body: {
    fontSize:   13,
    fontWeight: '600',
    color:      '#0f172a',
  },

  // Supporting / secondary text
  caption: {
    fontSize:   11,
    fontWeight: '600',
    color:      '#64748b',
  },

  // Tiny label inside badges / KPI headers
  label: {
    fontSize:      9,
    fontWeight:    '700',
    color:         '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Small muted note text
  note: {
    fontSize:   10,
    fontWeight: '600',
    color:      '#94a3b8',
  },

  // KPI big number
  kpiNumber: {
    fontSize:   22,
    fontWeight: '800',
    color:      '#0f172a',
  },

  // Screen loading text
  loadingText: {
    fontSize:   16,
    fontWeight: '700',
    color:      '#ffffff',
    marginTop:  12,
  },

  // Field label inside forms
  fieldLabel: {
    fontSize:      11,
    fontWeight:    '800',
    color:         '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  6,
  },

  // Badge text — pass color via inline style
  badge: {
    fontSize:      8,
    fontWeight:    '800',
    letterSpacing: 0.3,
  },
};

// Shared card styles
export const card = {
  base: {
    backgroundColor: '#ffffff',
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     '#e2e8f0',
    padding:         14,
    ...shadow,
  },
  // Left-accent card (KPI cards)
  kpi: {
    backgroundColor:     '#ffffff',
    borderRadius:        14,
    borderWidth:         1,
    borderColor:         '#e2e8f0',
    borderLeftWidth:     4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    padding:             12,
    ...shadow,
  },
};

// Shared layout containers
export const layout = {
  screen: {
    flex:            1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding:       16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex:            1,
    backgroundColor: '#0052cc',
    justifyContent:  'center',
    alignItems:      'center',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  rowBetween: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
};

// Shared input field style
export const input = {
  base: {
    backgroundColor: '#ffffff',
    borderWidth:     1.5,
    borderColor:     '#e2e8f0',
    borderRadius:    10,
    paddingVertical: 10,
    paddingHorizontal: 13,
    fontSize:        13,
    fontWeight:      '600',
    color:           '#0f172a',
  },
};

// Badge presets
export const badge = {
  success: {
    backgroundColor: '#ecfdf5',
    borderColor:     '#a7f3d0',
    borderWidth:     0.5,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warning: {
    backgroundColor: '#fffbeb',
    borderColor:     '#fde68a',
    borderWidth:     0.5,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  danger: {
    backgroundColor: '#fdf2f2',
    borderColor:     '#fecaca',
    borderWidth:     0.5,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  info: {
    backgroundColor: '#eff6ff',
    borderColor:     '#bfdbfe',
    borderWidth:     0.5,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  neutral: {
    backgroundColor: '#f1f5f9',
    borderColor:     '#cbd5e1',
    borderWidth:     0.5,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
};

export default { colors, text, card, layout, input, badge, shadow };
