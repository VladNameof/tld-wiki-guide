import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Loader2, Search, X } from 'lucide-react';
import type { FandomSyncedArticle } from '../../l0-primitives/types.ts';
import { fetchLiveFandomSearch } from '../../l1-codecs/fandomCodec.ts';
import {
  type GlobalSearchHit,
  searchLocalEncyclopedia,
} from '../../l2-models/selectors.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';

export function GlobalSearchModal() {
  const state = useCommandState();
  const [query, setQuery] = useState('');
  const [fandomHits, setFandomHits] = useState<readonly FandomSyncedArticle[]>([]);
  const [loadingFandom, setLoadingFandom] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        executeCommand('ui.setSearchModalOpen', { open: !state.isSearchModalOpen });
      } else if (e.key === 'Escape' && state.isSearchModalOpen) {
        executeCommand('ui.setSearchModalOpen', { open: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.isSearchModalOpen]);

  useEffect(() => {
    if (state.isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [state.isSearchModalOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !state.isSearchModalOpen) {
      setFandomHits([]);
      setLoadingFandom(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingFandom(true);
      try {
        const res = await fetchLiveFandomSearch(trimmed, controller.signal);
        setFandomHits(res.slice(0, 4));
      } catch {
        // При офлайне тихо оставляем локальные результаты без сброса UI
        if (!controller.signal.aborted) setFandomHits([]);
      } finally {
        if (!controller.signal.aborted) setLoadingFandom(false);
      }
    }, 380);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, state.isSearchModalOpen]);

  if (!state.isSearchModalOpen) return null;

  const localHits = searchLocalEncyclopedia(query);

  const handleSelectHit = (hit: GlobalSearchHit) => {
    executeCommand('ui.setSearchModalOpen', { open: false });
    if (hit.id.startsWith('sv-')) {
      executeCommand('streetview.openNode', {
        nodeId: hit.id.slice(3),
        regionId: hit.regionId,
      });
    } else if (hit.regionId) {
      executeCommand('map.selectRegion', {
        regionId: hit.regionId,
        openRegionMap: true,
        focusMarkerId: hit.markerId ?? null,
      });
    } else {
      executeCommand('nav.setSection', { section: hit.targetSection });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Глобальный поиск по справочнику и Fandom"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 pt-16 backdrop-blur-sm"
      onClick={() => executeCommand('ui.setSearchModalOpen', { open: false })}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#384d63] bg-[#111a23] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#243444] px-4 py-3.5">
          <Search className="h-5 w-5 text-[#f09a3e]" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ищите локации, предметы, болезни или статьи Fandom (напр. турбаза, лось, лупа)..."
            className="w-full bg-transparent text-sm text-white placeholder-[#788b9c] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => executeCommand('ui.setSearchModalOpen', { open: false })}
            className="cursor-pointer rounded p-1 text-[#8ea3b5] hover:bg-[#1b2936] hover:text-white"
            aria-label="Закрыть поиск"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-4">
          {!query.trim() ? (
            <div className="py-6 text-center text-xs text-[#8ea3b5]">
              Начните вводить название локации, снаряжения, болезни или квеста — поиск идёт сразу по
              локальной базе карты и по русскоязычной Fandom Wiki.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wider text-[#8ea3b5] uppercase">
                  Локальная энциклопедия и точки на карте ({localHits.length})
                </div>
                {localHits.length === 0 ? (
                  <p className="text-xs text-[#6d8194]">В локальной базе точных совпадений нет.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {localHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectHit(hit)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#223242] bg-[#15212c] px-3.5 py-2.5 text-left transition hover:border-[#d97724]/60"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-[#0b1116] px-2 py-0.5 text-[10px] font-semibold text-[#f09a3e]">
                                {hit.badgeRu}
                              </span>
                              <span className="truncate text-sm font-semibold text-[#f5f1e8]">
                                {hit.titleRu}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-[#95a8b8]">{hit.subtitleRu}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-[#6cb4cc]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Живые статьи из Fandom MediaWiki API */}
              <div className="border-t border-[#1e2c3a] pt-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#6cb4cc] uppercase">
                  <span>Напрямую из Fandom Wiki RU</span>
                  {loadingFandom && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </div>
                {fandomHits.length === 0 && !loadingFandom ? (
                  <p className="text-xs text-[#6d8194]">
                    Дополнительные статьи в онлайн-базе не найдены (или нет сети).
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {fandomHits.map((art) => (
                      <li key={art.pageId}>
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-lg border border-[#223242] bg-[#0e161f] px-3.5 py-2.5 transition hover:border-[#6cb4cc]/60"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#e4dfd5]">{art.title}</div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-[#8ea3b5]">
                              {art.extract}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 shrink-0 text-[#6cb4cc]" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
