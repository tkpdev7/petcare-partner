export const Colors = {
  // Primary brand colors
  primary: '#F55536', // Orange-red from the design
  primaryLight: '#FF6B4A',
  primaryDark: '#E8452B',
  
  // Secondary colors
  secondary: '#FF8A65',
  secondaryLight: '#FFB299',
  secondaryDark: '#F4511E',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray900: '#1A1A1A',
  gray800: '#2D2D2D',
  gray700: '#404040',
  gray600: '#525252',
  gray500: '#737373',
  gray400: '#A3A3A3',
  gray300: '#D4D4D4',
  gray200: '#E5E5E5',
  gray100: '#F5F5F5',
  gray50: '#FAFAFA',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F1F5F9',
  
  // Status colors
  success: '#22C55E',
  successLight: '#86EFAC',
  error: '#EF4444',
  errorLight: '#FCA5A5',
  warning: '#F59E0B',
  warningLight: '#FDE68A',
  info: '#3B82F6',
  infoLight: '#93C5FD',
  
  // Text colors
  textPrimary: '#1F1F1F',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',

  // Legacy color names (for backward compatibility)
  dark: '#1F1F1F',          // Maps to textPrimary
  mediumGray: '#6B7280',    // Maps to textSecondary
  lightGray: '#F5F5F5',     // Maps to gray100
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  // Text style presets (for backward compatibility)
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};