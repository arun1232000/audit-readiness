import { brand } from '../config/brand';

export function hexToChannels(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) throw new Error(`Invalid hex colour: ${hex}`);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Push the brand accent from src/config/brand.ts into the single CSS variable the design uses. */
export function applyBrandTheme(root: HTMLElement = document.documentElement): void {
  hexToChannels(brand.colors.accent); // validates
  root.style.setProperty('--yellow', brand.colors.accent);
}
