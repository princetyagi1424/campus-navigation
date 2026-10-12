/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#172338',
    tint: '#3478ff',

    // Core surfaces
    background: '#f3f6fa',
    foreground: '#172338',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#172338',

    // Primary action color (buttons, links, active states)
    primary: '#3478ff',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#eaf1ff',
    secondaryForeground: '#496587',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#eef2f7',
    mutedForeground: '#758198',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#eaf1ff',
    accentForeground: '#1f62e5',

    // Destructive actions (delete, error states)
    destructive: '#e65d57',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e5eaf1',
    input: '#e1e7f0',
    navy: '#0b172a',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 11,
};

export default colors;
