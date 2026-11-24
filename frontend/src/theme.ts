import { createTheme } from '@mui/material';

/**
 * SpaceFlow design system: flat style, teal brand, Plus Jakarta Sans.
 *
 * Every text/background pair below meets WCAG AA (4.5:1), measured:
 * - white on primary #0F766E: 5.47
 * - primary on background #F0FDFA: 5.25
 * - warning #B45309 / success #15803D on white: 5.02, error #B91C1C: 6.47
 * MUI's default warning orange (#ED6C02, 3.11 on white) fails, hence the overrides.
 */
const FONT = '"Plus Jakarta Sans Variable", "Segoe UI", Roboto, sans-serif';

export const theme = createTheme({
  palette: {
    primary: { main: '#0F766E', contrastText: '#FFFFFF' },
    secondary: { main: '#14B8A6' },
    success: { main: '#15803D' },
    warning: { main: '#B45309' },
    error: { main: '#B91C1C' },
    background: { default: '#F0FDFA', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#475569' },
    divider: '#CBD5E1',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: FONT,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700, fontSize: '1.5rem' },
    h3: { fontWeight: 600, fontSize: '1.125rem' },
    // Sentence case reads better than MUI's default ALL CAPS buttons and tabs.
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    // Flat style: borders instead of shadows.
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiAppBar: { defaultProps: { elevation: 0 } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTab: { styleOverrides: { root: { minHeight: 48 } } },
    MuiCssBaseline: {
      styleOverrides: {
        // A clearly visible keyboard focus ring on every control (mouse clicks do not show it).
        ':focus-visible': { outline: '3px solid #0F766E', outlineOffset: 2 },
        // Respect the OS "reduce motion" setting: no animated transitions or spinners.
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
  },
});
