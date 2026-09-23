export const brandAssets = {
  logoLight: '/brand/logo-light.png',
  logoDark: '/brand/logo-dark.png',
  symbol: '/brand/symbol.png',
  faviconLight: '/brand/favicon-light.png',
  faviconDark: '/brand/favicon-dark.svg',
} as const;

export function applyBrandFavicon(dark: boolean) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = dark ? brandAssets.faviconDark : brandAssets.faviconLight;
  link.type = dark ? 'image/svg+xml' : 'image/png';
}
