import {
  BookOpen,
  Compass,
  Flame,
  Globe,
  HeartPulse,
  Map as MapIcon,
  Package,
  PawPrint,
  Search,
  Snowflake,
  Wrench,
} from 'lucide-react';
import { DIFFICULTY_BY_ID } from '../../l0-primitives/constants.ts';
import { formatSignedTempC } from '../../l0-primitives/textUtils.ts';
import type { WikiSectionId } from '../../l0-primitives/types.ts';
import { getRegionById } from '../../l2-models/selectors.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';

const NAV_ITEMS: readonly {
  readonly id: WikiSectionId;
  readonly label: string;
  readonly Icon: typeof Compass;
}[] = [
  { id: 'home', label: 'Главная', Icon: Flame },
  { id: 'map', label: 'Угольная Карта', Icon: MapIcon },
  { id: 'regions', label: 'Регионы', Icon: Compass },
  { id: 'items', label: 'Предметы и Одежда', Icon: Package },
  { id: 'wildlife', label: 'Фауна и Флора', Icon: PawPrint },
  { id: 'afflictions', label: 'Болезни', Icon: HeartPulse },
  { id: 'mechanics', label: 'Выживание и Крафт', Icon: Wrench },
  { id: 'fandom', label: 'База Fandom RU', Icon: Globe },
];

export function HeaderHud() {
  const state = useCommandState();
  const currentRegion = getRegionById(state.selectedRegionId);
  const diffMeta = DIFFICULTY_BY_ID[state.difficulty];

  return (
    <header className="sticky top-0 z-40 border-b border-[#273644]/85 bg-[#0c1319]/95 backdrop-blur-md">
      {/* Верхняя атмосферная полоса выжившего */}
      <div className="border-b border-[#1c2833] bg-[#080d12] px-4 py-1.5 text-xs text-[#95a8b8]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#f09a3e]">
              <BookOpen className="h-3.5 w-3.5" />
              Остров Великого Медведя • Справочник Выжившего
            </span>
            <span className="hidden text-[#4b6072] sm:inline">|</span>
            <span className="hidden sm:inline">
              Текущий регион:{' '}
              <strong className="text-[#e4dfd5]">{currentRegion.nameRu}</strong> (
              <span className="text-[#6cb4cc]">{formatSignedTempC(currentRegion.avgTempC)}</span>)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                borderColor: `${diffMeta.badgeColor}66`,
                color: diffMeta.badgeColor,
                backgroundColor: `${diffMeta.badgeColor}18`,
              }}
            >
              Режим: {diffMeta.nameRu}
            </span>

            <button
              type="button"
              onClick={() => executeCommand('ui.toggleSnow', {})}
              className={`inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition ${
                state.snowEnabled
                  ? 'border-[#6cb4cc]/40 bg-[#6cb4cc]/10 text-[#9ad5e8]'
                  : 'border-[#273644] text-[#788b9c] hover:text-[#cbd5e1]'
              }`}
              title="Переключить анимацию снегопада"
            >
              <Snowflake className="h-3 w-3" />
              Снег
            </button>
          </div>
        </div>
      </div>

      {/* Основная шапка и поиск */}
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => executeCommand('nav.setSection', { section: 'home' })}
            className="group flex cursor-pointer items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d97724]/50 bg-gradient-to-br from-[#2a1c11] to-[#121b22] shadow-inner transition group-hover:border-[#f09a3e]">
              <Flame className="h-5 w-5 text-[#f09a3e]" />
            </div>
            <div>
              <div className="font-tld-display text-lg font-bold tracking-wider text-[#f3efe6] uppercase sm:text-xl">
                THE LONG DARK <span className="text-[#d97724]">WIKI</span>
              </div>
              <div className="text-[11px] text-[#8fa3b5]">
                Интерактивная угольная карта и энциклопедия по мотивам Fandom RU
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => executeCommand('ui.setSearchModalOpen', { open: true })}
            className="flex min-w-[230px] flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#2c3d4f] bg-[#131d26] px-3.5 py-2 text-sm text-[#95a8b8] transition hover:border-[#d97724]/60 hover:text-[#e4dfd5] sm:max-w-md"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-4 w-4 shrink-0 text-[#d97724]" />
              <span className="truncate">Поиск локаций, лута, статей Fandom...</span>
            </span>
            <kbd className="hidden rounded border border-[#2d3f50] bg-[#0b1116] px-1.5 py-0.5 font-mono text-[11px] text-[#7c90a1] sm:inline-block">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Навигационные вкладки по разделам вики */}
        <nav
          aria-label="Основные разделы справочника"
          className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = state.activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => executeCommand('nav.setSection', { section: id })}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  active
                    ? 'border border-[#d97724]/60 bg-[#d97724]/20 text-[#ffd699] shadow-sm'
                    : 'border border-transparent text-[#a3b4c4] hover:bg-[#16222d] hover:text-[#f1ede4]'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#f09a3e]' : 'text-[#6e8497]'}`} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
