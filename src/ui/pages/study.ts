import { getSession, setSession, clearSession } from '../state';
import { clearStates, loadLastFile, clearLastFile } from '../storage';
import { loadDeckIndex, deckBySlug, previewUrl } from '../../content/decks';
import { openPackage } from '../review';
import type { StudySession } from '../review';
import { appLinks } from '../../content/render.mjs';
import { el, qs, onDelegate } from '../dom';
import {
  RATING_AGAIN,
  RATING_HARD,
  RATING_GOOD,
  RATING_EASY,
} from '../../core';

export async function renderStudy(outlet: HTMLElement, route: { query: URLSearchParams }): Promise<void> {
  const deckSlug = route.query.get('deck');
  let session = getSession() as StudySession | null;

  // No in-memory session yet, but a deck preview was requested (e.g. from a deck page).
  if (!session && deckSlug) {
    outlet.innerHTML = `<div class="study-wrap"><div class="spinner"></div><p class="muted" style="text-align:center">Loading deck…</p></div>`;
    try {
      const decks = await loadDeckIndex();
      const deck = deckBySlug(decks, deckSlug);
      if (!deck?.previewFile) {
        outlet.innerHTML = noSession();
        return;
      }
      const res = await fetch(previewUrl(deck));
      if (!res.ok) throw new Error(`Could not fetch preview (${res.status})`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      session = await openPackage(bytes, deck.title);
      setSession(session);
    } catch (e) {
      outlet.innerHTML = `<div class="study-wrap"><div class="error-note">${(e as Error).message}</div></div>`;
      return;
    }
  }

  // No in-memory session and no explicit deck requested: restore the most
  // recently opened file from IndexedDB so a reload (or coming back to the
  // study page after browsing elsewhere) never drops the user's open deck.
  if (!session) {
    const last = await loadLastFile();
    if (last) {
      outlet.innerHTML = `<div class="study-wrap"><div class="spinner"></div><p class="muted" style="text-align:center">Restoring…</p></div>`;
      try {
        session = await openPackage(last.bytes, last.name);
        setSession(session);
      } catch {
        // The persisted copy may be from an older session that no longer
        // parses cleanly; forget it rather than blocking the page.
        void clearLastFile();
        outlet.innerHTML = noSession();
        return;
      }
    }
  }

  if (!session) {
    outlet.innerHTML = noSession();
    return;
  }
  renderSession(outlet, session);
}

function noSession(): string {
  return `
    <div class="study-wrap">
      <h1>No deck loaded</h1>
      <p class="muted">Open an <code>.apkg</code> / <code>.colpkg</code> file to start browsing or reviewing.</p>
      <p><a class="btn btn-primary" href="${appLinks.open()}">Open a file</a></p>
    </div>`;
}

type Mode = 'browse' | 'review';

/** Escape HTML, then wrap query matches in <mark> for search highlighting. */
function highlight(text: string, query: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (!query) return escaped;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(q, 'gi'), (m) => `<mark>${m}</mark>`);
}

function renderSession(outlet: HTMLElement, session: StudySession): void {
  outlet.replaceChildren();
  const wrap = el('div', { class: 'study-wrap' });

  // ---------- Sidebar (browse-mode card list) ----------
  const sidebar = el('aside', { class: 'study-sidebar', id: 'browse-sidebar' });
  const sidebarHeader = el('div', { class: 'sidebar-header' });
  const sidebarClose = el('button', {
    type: 'button', class: 'sidebar-close', id: 'sidebar-close',
    title: 'Hide card list', 'aria-label': 'Hide card list',
  }, '×');
  sidebarHeader.append(
    el('span', { class: 'sidebar-title' }, 'Cards'),
    el('span', { class: 'sidebar-count', id: 'sidebar-count' }, ''),
    sidebarClose,
  );

  const searchWrap = el('div', { class: 'sidebar-search-wrap' });
  const searchInput = el('input', {
    type: 'search', class: 'sidebar-search', id: 'sidebar-search',
    placeholder: 'Search cards…', autocomplete: 'off', spellcheck: 'false',
  });
  const clearBtn = el('button', {
    type: 'button', class: 'sidebar-search-clear', id: 'sidebar-search-clear',
    title: 'Clear search (Esc)', 'aria-label': 'Clear search',
  }, '✕');
  searchWrap.append(searchInput, clearBtn);

  const sidebarList = el('div', { class: 'sidebar-list', id: 'sidebar-list' });

  // Drag-to-scroll on the list. Hold + move scrolls; a quick click still jumps.
  let dragStartY = 0, dragStartTop = 0, dragMoved = false;
  sidebarList.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragStartY = e.clientY;
    dragStartTop = sidebarList.scrollTop;
    dragMoved = false;
    sidebarList.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (sidebarList.style.cursor !== 'grabbing') return;
    const dy = e.clientY - dragStartY;
    if (!dragMoved && Math.abs(dy) > 4) dragMoved = true;
    sidebarList.scrollTop = dragStartTop - dy;
    if (dragMoved) e.preventDefault();
  });
  window.addEventListener('mouseup', () => {
    sidebarList.style.cursor = '';
    setTimeout(() => { dragMoved = false; }, 0);
  });

  sidebar.append(sidebarHeader, searchWrap, sidebarList);

  // Floating "Show cards" button (mobile only; the topbar toggle is hidden
  // there because the sidebar is a full-screen overlay).
  const sidebarFab = el('button', {
    type: 'button', class: 'sidebar-fab', id: 'sidebar-fab',
    title: 'Show card list', 'aria-label': 'Show card list',
  }, '☰ Cards');

  // ---------- Main area ----------
  const main = el('div', { class: 'study-main' });
  const topbar = el('div', { class: 'study-topbar' });
  const sidebarToggle = el('button', {
    class: 'sidebar-toggle', id: 'sidebar-toggle', type: 'button',
    title: 'Hide card list', 'aria-label': 'Toggle card list',
  }, '×');
  const title = el('div', { class: 'study-title' }, session.name);
  const meta = el('div', { class: 'study-meta' });

  const toggle = el('div', { class: 'mode-toggle', role: 'group', 'aria-label': 'Study mode' });
  const browseBtn = el('button', { class: 'mode-btn', type: 'button' }, 'Browse');
  const reviewBtn = el('button', { class: 'mode-btn', type: 'button' }, 'Review');
  toggle.append(browseBtn, reviewBtn);
  topbar.append(sidebarToggle, title, toggle, meta);

  const progress = el('div', { class: 'progress' });
  const progBar = el('span');
  progress.append(progBar);

  const stage = el('div', { class: 'card-stage' });
  const scroll = el('div', { class: 'card-scroll' });
  const footer = el('div', { class: 'card-footer' });
  stage.append(scroll, footer);
  main.append(topbar, progress, stage);

  const layout = el('div', { class: 'study-layout' });
  const backdrop = el('div', { class: 'sidebar-backdrop', id: 'sidebar-backdrop' });
  layout.append(sidebar, main, backdrop);
  wrap.append(layout, sidebarFab);
  outlet.append(wrap);

  // ---------- Sidebar state ----------
  const allEntries = session.getBrowseEntries();
  let sidebarOpen = true;
  let searchQuery = '';

  function isPhone(): boolean {
    return window.matchMedia('(max-width: 480px)').matches;
  }

  function updateSidebarToggleUi(): void {
    if (mode !== 'browse') {
      sidebarToggle.style.display = 'none';
      sidebarFab.classList.remove('is-visible');
      return;
    }
    if (isPhone()) {
      sidebarToggle.style.display = 'none';
      sidebarFab.classList.toggle('is-visible', !sidebarOpen);
    } else {
      sidebarToggle.style.display = '';
      sidebarFab.classList.remove('is-visible');
      sidebarToggle.textContent = sidebarOpen ? '×' : '☰';
      sidebarToggle.title = sidebarOpen ? 'Hide card list' : 'Show card list';
    }
  }

  function renderSidebarList(activeIdx: number): void {
    sidebarList.replaceChildren();
    const q = searchQuery.toLowerCase();
    const filtered = q
      ? allEntries.filter((e) => e.searchText.includes(q))
      : allEntries;

    const countEl = qs('#sidebar-count', sidebar) as HTMLElement;
    if (q) countEl.textContent = `${filtered.length} / ${allEntries.length}`;
    else countEl.textContent = `${allEntries.length}`;

    if (filtered.length === 0) {
      sidebarList.append(el('div', { class: 'sidebar-empty' }, 'No matching cards'));
      return;
    }

    const pad = allEntries.length >= 1000 ? 4 : allEntries.length >= 100 ? 3 : 2;
    for (const e of filtered) {
      const item = el('div', {
        class: 'sidebar-item' + (e.index === activeIdx ? ' is-active' : ''),
        'data-index': String(e.index),
        role: 'button',
        tabindex: '0',
      });
      item.append(
        el('span', { class: 'item-num' }, String(e.index + 1).padStart(pad, '0')),
        el('span', { class: 'item-title', html: highlight(e.title, q) }),
      );
      if (e.preview) item.append(el('span', { class: 'item-preview', html: highlight(e.preview, q) }));
      if (e.deckName) item.append(el('span', { class: 'item-deck' }, e.deckName));
      sidebarList.append(item);
    }
  }

  function scrollActiveItemIntoView(): void {
    const active = qs(`[data-index="${browseCursor}"]`, sidebarList) as HTMLElement | null;
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function jumpToIndex(idx: number): void {
    if (Number.isNaN(idx) || idx < 0 || idx >= session.browseTotal) return;
    browseCursor = idx;
    showAnswer = false;
    paint();
    // Per spec: keep the sidebar open after a jump.
    sidebarOpen = true;
    sidebar.classList.remove('is-collapsed');
    backdrop.classList.remove('is-active');
    updateSidebarToggleUi();
    scroll.scrollTop = 0;
    window.scrollTo({ top: 0 });
  }

  onDelegate(sidebarList, 'click', '.sidebar-item', (target: HTMLElement, e: Event) => {
    if (dragMoved) { e.preventDefault(); return; }
    jumpToIndex(Number((target as HTMLElement).dataset.index));
  });
  onDelegate(sidebarList, 'keydown', '.sidebar-item', (target: HTMLElement, e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' || ke.key === ' ') {
      ke.preventDefault();
      jumpToIndex(Number((target as HTMLElement).dataset.index));
    } else if (ke.key === 'ArrowDown' || ke.key === 'ArrowUp') {
      ke.preventDefault();
      const items = Array.from(sidebarList.querySelectorAll<HTMLElement>('.sidebar-item'));
      const i = items.indexOf(target);
      const next = items[Math.max(0, Math.min(items.length - 1, i + (ke.key === 'ArrowDown' ? 1 : -1)))];
      if (next) {
        next.focus();
        const idx = Number(next.dataset.index);
        if (idx !== browseCursor) jumpToIndex(idx);
      }
    }
  });

  function applySearch(): void {
    searchQuery = (searchInput as HTMLInputElement).value.trim();
    clearBtn.classList.toggle('is-visible', !!searchQuery);
    renderSidebarList(browseCursor);
  }
  searchInput.addEventListener('input', applySearch);
  searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      (searchInput as HTMLInputElement).value = '';
      applySearch();
      (searchInput as HTMLInputElement).focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const first = sidebarList.querySelector<HTMLElement>('.sidebar-item');
      if (first) jumpToIndex(Number(first.dataset.index));
    }
  });
  clearBtn.addEventListener('click', () => {
    (searchInput as HTMLInputElement).value = '';
    applySearch();
    (searchInput as HTMLInputElement).focus();
  });

  if (isPhone()) {
    sidebarOpen = false;
    sidebar.classList.add('is-collapsed');
  }

  sidebarToggle.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('is-collapsed', !sidebarOpen);
    if (isPhone()) backdrop.classList.toggle('is-active', sidebarOpen);
    updateSidebarToggleUi();
  });
  sidebarClose.addEventListener('click', () => {
    if (!sidebarOpen) return;
    sidebarOpen = false;
    sidebar.classList.add('is-collapsed');
    backdrop.classList.remove('is-active');
    updateSidebarToggleUi();
  });
  sidebarFab.addEventListener('click', () => {
    if (sidebarOpen) return;
    sidebarOpen = true;
    sidebar.classList.remove('is-collapsed');
    backdrop.classList.add('is-active');
    updateSidebarToggleUi();
  });
  backdrop.addEventListener('click', () => {
    sidebarOpen = false;
    sidebar.classList.add('is-collapsed');
    backdrop.classList.remove('is-active');
    updateSidebarToggleUi();
  });
  window.matchMedia('(max-width: 480px)').addEventListener?.('change', () => {
    if (!isPhone()) backdrop.classList.remove('is-active');
  });

  let mode: Mode = 'browse';
  let showAnswer = false;
  let browseCursor = 0;

  function setMode(m: Mode): void {
    mode = m;
    showAnswer = false;
    browseBtn.classList.toggle('is-active', m === 'browse');
    reviewBtn.classList.toggle('is-active', m === 'review');
    if (m === 'browse') {
      sidebar.classList.remove('is-hidden');
      if (sidebarOpen) sidebar.classList.remove('is-collapsed');
      if (isPhone()) backdrop.classList.toggle('is-active', sidebarOpen);
    } else {
      sidebar.classList.add('is-hidden');
      backdrop.classList.remove('is-active');
    }
    updateSidebarToggleUi();
    paint();
  }

  function updateMeta(): void {
    if (mode === 'browse') {
      const shown = browseCursor + 1;
      meta.textContent = `Card ${shown} / ${session.browseTotal} · Browse`;
      progBar.style.width = session.browseTotal ? Math.round((shown / session.browseTotal) * 100) + '%' : '0%';
    } else {
      meta.textContent = `${session.remaining} due · ${session.total} cards`;
      progBar.style.width = session.progress() + '%';
    }
  }

  function paintCardContent(rendered: { questionHtml: string; answerHtml: string }): void {
    scroll.innerHTML = `
      <div class="card-side-label">Question</div>
      <div class="card-content">${rendered.questionHtml}</div>
      <div id="answer-area"></div>`;
    if (showAnswer) {
      const area = qs('#answer-area', scroll);
      if (area) {
        area.innerHTML = `<hr id="answer"><div class="card-side-label">Answer</div><div class="card-content">${rendered.answerHtml}</div>`;
      }
    }
  }

  function paintReview(): void {
    const cur = session.current;
    if (!cur) {
      scroll.innerHTML = `
        <div class="study-done">
          <h2>All caught up</h2>
          <p class="muted">Nothing is due right now. Come back later, or reset progress for this deck.</p>
        </div>`;
      footer.replaceChildren();
      const reset = el('button', { class: 'btn btn-secondary', type: 'button' }, 'Reset progress');
      reset.addEventListener('click', async () => {
        await clearStates(session.deckKey);
        clearSession();
        location.reload();
      });
      footer.append(reset);
      updateMeta();
      progBar.style.width = '100%';
      return;
    }

    const rendered = session.renderCurrent();
    if (!rendered) {
      session.answer(RATING_GOOD);
      paint();
      return;
    }

    const previews = session.intervalPreviews();
    paintCardContent(rendered);
    footer.replaceChildren();

    if (showAnswer) {
      const row = el('div', { class: 'rating-row' });
      const defs = [
        { rating: RATING_AGAIN, label: 'Again', cls: 'again' },
        { rating: RATING_HARD, label: 'Hard', cls: 'hard' },
        { rating: RATING_GOOD, label: 'Good', cls: 'good' },
        { rating: RATING_EASY, label: 'Easy', cls: 'easy' },
      ] as const;
      for (const d of defs) {
        const btn = el('button', { class: `rating-btn ${d.cls}`, type: 'button' });
        btn.append(el('span', { class: 'r-label' }, d.label));
        btn.append(el('span', { class: 'r-delay' }, previews[d.rating] || ''));
        btn.addEventListener('click', () => {
          session.answer(d.rating);
          showAnswer = false;
          paint();
        });
        row.append(btn);
      }
      footer.append(row);
    } else {
      const show = el('button', { class: 'btn btn-primary', type: 'button' }, 'Show Answer');
      show.addEventListener('click', () => {
        showAnswer = true;
        paint();
      });
      const row = el('div', { class: 'answer-row' });
      row.append(show);
      footer.append(row);
    }
    updateMeta();
  }

  function paintBrowse(): void {
    const st = session.browseAt(browseCursor);
    const total = session.browseTotal;
    if (!st || total === 0) {
      scroll.innerHTML = `
        <div class="study-done">
          <h2>Nothing to browse</h2>
          <p class="muted">This deck contains no cards.</p>
        </div>`;
      footer.replaceChildren();
      updateMeta();
      return;
    }
    const rendered = session.renderState(st);
    if (!rendered) {
      if (browseCursor < total - 1) {
        browseCursor++;
        paintBrowse();
      }
      return;
    }

    paintCardContent(rendered);
    footer.replaceChildren();

    const row = el('div', { class: 'browse-row' });
    const prev = el('button', { class: 'btn btn-secondary browse-nav', type: 'button' }, '‹ Prev');
    const show = el('button', { class: 'btn btn-primary', type: 'button' }, showAnswer ? 'Hide Answer' : 'Show Answer');
    const next = el('button', { class: 'btn btn-secondary browse-nav', type: 'button' }, 'Next ›');
    prev.disabled = browseCursor <= 0;
    next.disabled = browseCursor >= total - 1;
    prev.addEventListener('click', () => {
      if (browseCursor > 0) {
        browseCursor--;
        showAnswer = false;
        paint();
      }
    });
    next.addEventListener('click', () => {
      if (browseCursor < total - 1) {
        browseCursor++;
        showAnswer = false;
        paint();
      }
    });
    show.addEventListener('click', () => {
      showAnswer = !showAnswer;
      paint();
    });
    row.append(prev, show, next);
    footer.append(row);
    updateMeta();

    // Update active item + keep it visible so long lists stay usable.
    renderSidebarList(browseCursor);
    scrollActiveItemIntoView();
  }

  function paint(): void {
    if (mode === 'browse') paintBrowse();
    else paintReview();
  }

  browseBtn.addEventListener('click', () => setMode('browse'));
  reviewBtn.addEventListener('click', () => setMode('review'));
  setMode('browse');
}
