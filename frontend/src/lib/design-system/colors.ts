/**
 * Design System: Color Palette
 *
 * Modern color scheme with gradients and semantic naming
 */

export const colors = {
  // Primary brand color (blue)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Secondary accent (green)
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Accent color (purple)
  accent: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Warning (amber)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error (red)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Success (emerald)
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Neutral (gray)
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

// Semantic color mapping
export const semantic = {
  background: {
    light: colors.neutral[50],
    dark: colors.neutral[900],
  },
  surface: {
    light: '#ffffff',
    dark: colors.neutral[800],
  },
  border: {
    light: colors.neutral[200],
    dark: colors.neutral[700],
  },
  text: {
    primary: {
      light: colors.neutral[900],
      dark: colors.neutral[50],
    },
    secondary: {
      light: colors.neutral[600],
      dark: colors.neutral[400],
    },
    muted: {
      light: colors.neutral[500],
      dark: colors.neutral[500],
    },
  },
};

// Gradient presets
export const gradients = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-600',
  secondary: 'bg-gradient-to-r from-green-500 to-emerald-600',
  accent: 'bg-gradient-to-r from-purple-500 to-pink-600',
  warning: 'bg-gradient-to-r from-amber-500 to-orange-600',
  brand: 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600',
};
