import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/theme.css';
import './index.css';
import { App } from './App';
import { brand } from './config/brand';
import { applyBrandTheme } from './lib/theme';
import { captureAttribution } from './lib/utm';

applyBrandTheme();
captureAttribution();
document.title = brand.meta.title;
document.querySelector('meta[name="description"]')?.setAttribute('content', brand.meta.description);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
