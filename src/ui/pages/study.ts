import { getSession, setSession, clearSession } from '../state';
import { clearStates } from '../storage';
import { loadDeckIndex, deckBySlug, previewUrl } from '../../content/decks';
import { openPackage } from '../review';
import { appLinks } from '../../content/render.mjs';
import { el, qs } from '../dom';
import {
  RATING_AGAIN,
  RATING_HARD,
  RATING_GOOD,
  RATING_EASY,
} from '../../core';
import type { StudySession } from '../review';

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

function renderSession(outlet: HTMLElement, session: StudySession): void {
  outlet.replaceChildren();
  const wrap = el('div', { class: 'study-wrap' });

  const topbar = el('div', { class: 'study-topbar' });
  const title = el('div', { class: 'study-title' }, session.name);
  const meta = el('div', { class: 'study-meta' });

  // Mode toggle: Browse (flip cards freely) / Review (SM-2 spaced repetition).
  const toggle = el('div', { class: 'mode-toggle', role: 'group', 'aria-label': 'Study mode' });
  const browseBtn = el('button', { class: 'mode-btn', type: 'button' }, 'Browse');
  const reviewBtn = el('button', { class: 'mode-btn', type: 'button' }, 'Review');
  toggle.append(browseBtn, reviewBtn);
  topbar.append(title, toggle, meta);

  const progress = el('div', { class: 'progress' });
  const progBar = el('span');
  progress.append(progBar);

  const stage = el('div', { class: 'card-stage' });
  const scroll = el('div', { class: 'card-scroll' });
  const footer = el('div', { class: 'card-footer' });
  stage.append(scroll, footer);
  wrap.append(topbar, progress, stage);
  outlet.append(wrap);

  let mode: Mode = 'review';
  let showAnswer = false;
  let browseCursor = 0;

  function setMode(m: Mode): void {
    mode = m;
    showAnswer = false;
    browseBtn.classList.toggle('is-active', m === 'browse');
    reviewBtn.classList.toggle('is-active', m === 'review');
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
      // Card could not be rendered (missing note/notetype) — skip it.
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
      // Skip unrenderable cards silently while browsing.
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
  }

  function paint(): void {
    if (mode === 'browse') paintBrowse();
    else paintReview();
  }

  browseBtn.addEventListener('click', () => setMode('browse'));
  reviewBtn.addEventListener('click', () => setMode('review'));
  setMode('review');
}
