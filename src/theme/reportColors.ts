import type { CSSProperties } from 'react';

/** Shared report palette contract, mirrored from orders-be `report_color.py`. */
export const REPORT_COLOR_PALETTES = {
  // Keep the saved/API identifier while presenting this palette as yellow.
  green: {
    header: '#facc15',
    headerText: '#000000',
    headerMedium: '#fde047',
    headerLight: '#fef08a',
    headerLightText: '#000000',
    rowLight: '#fef9c3',
    rowAlternate: '#fefce8',
    rowText: '#000000',
  },
  orange: {
    header: '#c65811',
    headerText: '#ffffff',
    headerMedium: '#c65811',
    headerLight: '#e7b189',
    headerLightText: '#000000',
    rowLight: '#f7caad',
    rowAlternate: '#fce3d6',
    rowText: '#000000',
  },
  blue: {
    header: '#1e4e77',
    headerText: '#ffffff',
    headerMedium: '#0070c0',
    headerLight: '#0070c0',
    headerLightText: '#ffffff',
    rowLight: '#9ac1e6',
    rowAlternate: '#b4c6e7',
    rowText: '#000000',
  },
  green_alt: {
    header: '#375522',
    headerText: '#ffffff',
    headerMedium: '#548134',
    headerLight: '#8ab96b',
    headerLightText: '#000000',
    rowLight: '#a9d08d',
    rowAlternate: '#c6e0b4',
    rowText: '#000000',
  },
} as const;

export type ReportColorScheme = keyof typeof REPORT_COLOR_PALETTES;
export type ReportColorPalette = (typeof REPORT_COLOR_PALETTES)[ReportColorScheme];
export const DEFAULT_REPORT_COLOR: ReportColorScheme = 'green_alt';

export interface ReportColorOption {
  value: ReportColorScheme;
  label: string;
  hex: string;
}

export const REPORT_COLOR_OPTIONS: ReportColorOption[] = [
  { value: 'green', label: 'orders.colorScheme.green', hex: REPORT_COLOR_PALETTES.green.header },
  { value: 'orange', label: 'orders.colorScheme.orange', hex: REPORT_COLOR_PALETTES.orange.header },
  { value: 'blue', label: 'orders.colorScheme.blue', hex: REPORT_COLOR_PALETTES.blue.header },
  { value: 'green_alt', label: 'orders.colorScheme.green_alt', hex: REPORT_COLOR_PALETTES.green_alt.header },
];

type ReportPaletteProperties = CSSProperties & Record<`--report-${string}`, string>;

/** Apply the chosen palette once; report component classes consume these CSS variables. */
export function getReportPaletteProperties(scheme?: ReportColorScheme): ReportPaletteProperties {
  const palette = REPORT_COLOR_PALETTES[scheme ?? DEFAULT_REPORT_COLOR];
  return {
    '--report-header': palette.header,
    '--report-header-text': palette.headerText,
    '--report-header-medium': palette.headerMedium,
    '--report-header-light': palette.headerLight,
    '--report-header-light-text': palette.headerLightText,
    '--report-row-light': palette.rowLight,
    '--report-row-alternate': palette.rowAlternate,
    '--report-row-text': palette.rowText,
  };
}
