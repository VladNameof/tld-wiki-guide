import { ExternalLink } from 'lucide-react';
import {
  AfflictionsCatalogView,
  FandomLiveSyncView,
  ItemsCatalogView,
  MechanicsCatalogView,
  RegionsCatalogView,
  WildlifeCatalogView,
} from './components/EncyclopediaViews.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { HeaderHud } from './components/HeaderHud.tsx';
import { HomePortalView } from './components/HomePortalView.tsx';
import { RegionLeafletMap } from './components/RegionLeafletMap.tsx';
import { SnowfallOverlay } from './components/SnowfallOverlay.tsx';
import { useCommandState } from './hooks/useCommandState.ts';

export function App() {
  const state = useCommandState();

  return (
    <div className="flex min-h-screen flex-col bg-[#0b1116] text-[#e4dfd5]">
      <SnowfallOverlay enabled={state.snowEnabled} />
      <HeaderHud />
      <GlobalSearchModal />

      <main className="relative z-10 flex-1">
        {state.activeSection === 'home' && <HomePortalView />}
        {state.activeSection === 'map' && <RegionLeafletMap />}
        {state.activeSection === 'regions' && <RegionsCatalogView />}
        {state.activeSection === 'items' && <ItemsCatalogView />}
        {state.activeSection === 'wildlife' && <WildlifeCatalogView />}
        {state.activeSection === 'afflictions' && <AfflictionsCatalogView />}
        {state.activeSection === 'mechanics' && <MechanicsCatalogView />}
        {state.activeSection === 'fandom' && <FandomLiveSyncView />}
      </main>

      <footer className="relative z-10 mt-12 border-t border-[#1e2c3a] bg-[#080d12] px-4 py-6 text-xs text-[#7d91a3]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            Неофициальный фанатский справочник и интерактивная угольная карта по игре{' '}
            <strong className="text-[#cbd5e1]">The Long Dark</strong> (Hinterland Studio Inc.).
          </div>
          <div className="flex items-center gap-4">
            <span>Прогресс дневника сохраняется локально в браузере</span>
            <a
              href="https://the-long-dark.fandom.com/ru/wiki/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#6cb4cc] hover:underline"
            >
              Материалы сообщества Fandom RU (CC-BY-SA 3.0) <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
