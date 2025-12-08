/**
 * Design System: Typography
 *
 * Font sizes, weights, and line heights for consistent text styling
 */

export const typography = {
  // Font families
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  // Font sizes with line heights
  fontSize: {
    xs: {
      size: '0.75rem',      // 12px
      lineHeight: '1rem',   // 16px
    },
    sm: {
      size: '0.875rem',     // 14px
      lineHeight: '1.25rem', // 20px
    },
    base: {
      size: '1rem',         // 16px
      lineHeight: '1.5rem',  // 24px
    },
    lg: {
      size: '1.125rem',     // 18px
      lineHeight: '1.75rem', // 28px
    },
    xl: {
      size: '1.25rem',      // 20px
      lineHeight: '1.75rem', // 28px
    },
    '2xl': {
      size: '1.5rem',       // 24px
      lineHeight: '2rem',    // 32px
    },
    '3xl': {
      size: '1.875rem',     // 30px
      lineHeight: '2.25rem', // 36px
    },
    '4xl': {
      size: '2.25rem',      // 36px
      lineHeight: '2.5rem',  // 40px
    },
    '5xl': {
      size: '3rem',         // 48px
      lineHeight: '1',       // 48px
    },
    '6xl': {
      size: '3.75rem',      // 60px
      lineHeight: '1',       // 60px
    },
    '7xl': {
      size: '4.5rem',       // 72px
      lineHeight: '1',       // 72px
    },
    '8xl': {
      size: '6rem',         // 96px
      lineHeight: '1',       // 96px
    },
    '9xl': {
      size: '8rem',         // 128px
      lineHeight: '1',       // 128px
    },
  },

  // Font weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Semantic typography classes (Tailwind-compatible)
export const textStyles = {
  // Headings
  h1: 'text-4xl font-bold tracking-tight text-grey-900 dark:text-white',
  h2: 'text-3xl font-semibold tracking-tight text-grey-900 dark:text-white',
  h3: 'text-2xl font-semibold text-grey-900 dark:text-white',
  h4: 'text-xl font-semibold text-grey-900 dark:text-white',
  h5: 'text-lg font-semibold text-grey-900 dark:text-white',
  h6: 'text-base font-semibold text-grey-900 dark:text-white',

  // Body text
  body: 'text-base leading-relaxed text-grey-700 dark:text-grey-300',
  bodyLarge: 'text-lg leading-relaxed text-grey-700 dark:text-grey-300',
  bodySmall: 'text-sm leading-relaxed text-grey-700 dark:text-grey-300',

  // Labels
  label: 'text-sm font-medium text-grey-700 dark:text-grey-300',
  labelSmall: 'text-xs font-medium text-grey-700 dark:text-grey-300',

  // Captions
  caption: 'text-sm text-grey-600 dark:text-grey-400',
  captionSmall: 'text-xs text-grey-600 dark:text-grey-400',

  // Links
  link: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline-offset-2 hover:underline transition-colors',

  // Muted text
  muted: 'text-grey-500 dark:text-grey-500',
  mutedSmall: 'text-sm text-grey-500 dark:text-grey-500',

  // Code
  code: 'font-mono text-sm bg-grey-100 dark:bg-grey-800 px-1.5 py-0.5 rounded',
};
