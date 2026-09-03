/**
 * Moderation console (site-owner only).
 *
 * Authorization happens in the Worker — the allowlist is a server-side secret —
 * so this page simply renders what the API says. A non-moderator who finds the
 * URL gets a signed-in-but-not-authorized notice, never an error page.
 */
import { escapeHtml as esc, deckCoverHtml } from '../../content/render.mjs';
import { ApiError } from '../../services/api';
import { fetchSession, logout, oauthStartUrl } from '../../services/auth';
import {
  fetchOverview,
  moderate,
  type AdminSubmission,
  type AdminOverview,
} from '../../services/admin';
import { qs } from '../dom';
import { t } from '../i18n';
import type { PageContext } from './context';

type Tab = 'pending' | 'published' | 'rejected' | 'all';

let overview: AdminOverview | null = null;
let activeTab: Tab = 'pending';

export async function renderAdmin(outlet: HTMLElement, _ctx: PageContext): Promise<void> {
  outlet.innerHTML = `<div class="container admin-wrap"><div class="spinner"></div></div>`;
  const host = qs('.admin-wrap', outlet)!;

  const session = await fetchSession();
  if (!session.available) {
    host.innerHTML = `<div class="error-note">${esc(t('submit.apiUnavailable'))}</div>`;
    return;
  }
  if (!session.user) {
    host.innerHTML = `
      <h1>${esc(t('admin.title'))}</h1>
      <p class="muted">${esc(t('admin.signInRequired'))}</p>
      <a class="btn btn-primary" href="${esc(oauthStartUrl(location.pathname + location.hash))}">${esc(
        t('admin.signInButton'),
      )}</a>`;
    return;
  }
  if (!session.user.isAdmin) {
    host.innerHTML = `
      <h1>${esc(t('admin.title'))}</h1>
      <div class="error-note">${esc(t('admin.notAuthorized', { login: session.user.login }))}</div>`;
    return;
  }

  host.innerHTML = `
    <header class="admin-head">
      <h1>${esc(t('admin.title'))}</h1>
      <div class="admin-session">
        <span>@${esc(session.user.login)}</span>
        <button class="btn btn-ghost admin-logout" type="button">${esc(t('admin.signOut'))}</button>
      </div>
    </header>
    <p class="muted">${esc(t('admin.lead'))}</p>
    <nav class="admin-tabs" role="tablist"></nav>
    <div class="admin-body"><div class="spinner"></div></div>`;

  qs('.admin-logout', host)?.addEventListener('click', async () => {
    await logout().catch(() => undefined);
    location.reload();
  });

  await reload(host);
}

async function reload(host: HTMLElement): Promise<void> {
  const body = qs('.admin-body', host)!;
  try {
    overview = await fetchOverview();
    renderTabs(host);
    renderTab(host);
  } catch (e) {
    body.innerHTML = `<div class="error-note">${esc((e as ApiError).message)}</div>`;
  }
}

function counts(): Record<Tab, number> {
  const subs = overview?.submissions ?? [];
  return {
    pending: subs.filter((s) => s.status === 'pending').length,
    published: (overview?.decks ?? []).filter((d) => d.submission?.issue).length,
    rejected: subs.filter((s) => s.status === 'rejected').length,
    all: subs.length,
  };
}

function renderTabs(host: HTMLElement): void {
  const nav = qs('.admin-tabs', host)!;
  const c = counts();
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'pending', label: t('admin.tabPending'), count: c.pending },
    { id: 'published', label: t('admin.tabPublished'), count: c.published },
    { id: 'rejected', label: t('admin.tabRejected'), count: c.rejected },
    { id: 'all', label: t('admin.tabAll'), count: c.all },
  ];
  nav.innerHTML = tabs
    .map(
      (tb) =>
        `<button class="admin-tab${tb.id === activeTab ? ' is-active' : ''}" role="tab" data-tab="${tb.id}">
          ${esc(tb.label)} <span class="admin-tab-count">${tb.count}</span>
        </button>`,
    )
    .join('');
  nav.querySelectorAll('.admin-tab').forEach((btn) =>
    btn.addEventListener('click', () => {
      activeTab = (btn as HTMLElement).dataset.tab as Tab;
      renderTabs(host);
      renderTab(host);
    }),
  );
}

function renderTab(host: HTMLElement): void {
  const body = qs('.admin-body', host)!;
  if (activeTab === 'published') {
    body.innerHTML = publishedHtml();
    wirePublished(body);
    return;
  }
  const subs = (overview?.submissions ?? []).filter((s) =>
    activeTab === 'all' ? true : s.status === activeTab,
  );
  if (!subs.length) {
    body.innerHTML = `<p class="muted">${esc(t('admin.empty'))}</p>`;
    return;
  }
  body.innerHTML = subs.map(submissionHtml).join('');
  wireSubmissions(body);
}

/* ------------------------------------------------------------ submissions */

function payloadRow(label: string, value?: string, href?: boolean): string {
  if (!value) return '';
  const inner = href
    ? `<a href="${esc(value)}" target="_blank" rel="noopener nofollow">${esc(value)}</a>`
    : esc(value);
  return `<div class="kv"><span class="kv-k">${esc(label)}</span><span class="kv-v">${inner}</span></div>`;
}

function submissionHtml(s: AdminSubmission): string {
  const p = (s.payload ?? {}) as Record<string, string | undefined>;
  return `
  <article class="admin-card" data-number="${s.number}">
    <header class="admin-card-head">
      <a class="admin-card-title" href="${esc(s.htmlUrl)}" target="_blank" rel="noopener">#${s.number} ${esc(
        s.title,
      )}</a>
      <span class="status-badge status-${esc(s.status)}">${esc(t(`submit.status.${s.status}`))}</span>
    </header>
    <p class="muted">${esc(t('admin.submittedOn', { date: s.createdAt.slice(0, 10) }))} · by @${esc(
      s.submittedBy,
    )}</p>
    <div class="admin-card-grid">
      ${p.coverUrl ? `<img class="admin-cover" src="${esc(p.coverUrl)}" alt="" loading="lazy">` : ''}
      <div class="admin-card-kv">
        ${payloadRow(t('submit.field.subtitle'), p.subtitle)}
        ${payloadRow(t('submit.field.downloadUrl'), p.downloadUrl, true)}
        ${payloadRow(t('submit.field.previewUrl'), p.previewUrl, true)}
        ${payloadRow(t('submit.field.authorName'), p.authorName)}
        ${payloadRow(t('submit.field.authorUrl'), p.authorUrl, true)}
        ${payloadRow(t('submit.field.tags'), p.tags)}
        ${payloadRow(t('submit.field.language'), p.language)}
        ${payloadRow(t('submit.field.license'), p.license)}
        ${p.note ? `<div class="kv"><span class="kv-k">${esc(t('submit.field.noteToOwner'))}</span><span class="kv-v">${esc(p.note)}</span></div>` : ''}
      </div>
    </div>
    ${
      s.lastComment
        ? `<blockquote class="sub-comment"><p>${esc(s.lastComment.body)}</p><footer>— ${esc(
            s.lastComment.author,
          )}</footer></blockquote>`
        : ''
    }
    ${
      s.status === 'pending'
        ? `<div class="admin-actions">
            <button class="btn btn-primary" data-act="approve">${esc(t('admin.approve'))}</button>
            <button class="btn btn-secondary" data-act="reject">${esc(t('admin.reject'))}</button>
            <a class="btn btn-ghost" href="${esc(s.htmlUrl)}" target="_blank" rel="noopener">${esc(
              t('admin.openTicket'),
            )}</a>
          </div>
          <div class="admin-reject-box" hidden>
            <label for="reject-reason-${s.number}">${esc(t('admin.rejectReason'))}</label>
            <textarea id="reject-reason-${s.number}" rows="3" placeholder="${esc(
              t('admin.rejectReasonPh'),
            )}"></textarea>
            <div class="admin-reject-actions">
              <button class="btn btn-primary" data-act="reject-send">${esc(t('admin.reject'))}</button>
              <button class="btn btn-ghost" data-act="reject-cancel">${esc(t('common.cancel'))}</button>
            </div>
          </div>`
        : ''
    }
  </article>`;
}

function wireSubmissions(body: HTMLElement): void {
  body.querySelectorAll<HTMLElement>('.admin-card').forEach((card) => {
    const number = Number(card.dataset.number);
    card.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) =>
      btn.addEventListener('click', () => onAct(card, number, btn.dataset.act as string)),
    );
  });
}

async function onAct(card: HTMLElement, number: number, act: string): Promise<void> {
  if (act === 'reject') {
    const box = qs('.admin-reject-box', card)!;
    box.hidden = !box.hidden;
    return;
  }
  if (act === 'reject-cancel') {
    qs('.admin-reject-box', card)!.hidden = true;
    return;
  }
  if (act === 'approve') {
    if (!confirm(t('admin.confirmApprove'))) return;
    await doModerate(card, { number, action: 'approve' });
    return;
  }
  if (act === 'reject-send') {
    const reason = (qs<HTMLTextAreaElement>('.admin-reject-box textarea', card)?.value ?? '').trim();
    if (!reason) {
      alert(t('admin.rejectReason'));
      return;
    }
    if (!confirm(t('admin.confirmReject'))) return;
    await doModerate(card, { number, action: 'reject', reason });
  }
}

async function doModerate(
  card: HTMLElement,
  payload: { number?: number; slug?: string; action: 'approve' | 'reject' | 'unpublish'; reason?: string },
): Promise<void> {
  const buttons = card.querySelectorAll<HTMLButtonElement>('button[data-act]');
  buttons.forEach((b) => (b.disabled = true));
  try {
    const res = await moderate(payload);
    card.insertAdjacentHTML(
      'afterbegin',
      `<div class="admin-flash">${esc(
        payload.action === 'approve'
          ? t('admin.approvedDone', { url: res.deckUrl ?? '' })
          : payload.action === 'reject'
            ? t('admin.rejectedDone')
            : t('admin.unpublishedDone', { slug: payload.slug ?? '' }),
      )}</div>`,
    );
    const host = card.closest('.admin-wrap') as HTMLElement;
    await reload(host);
  } catch (e) {
    alert((e as ApiError).message);
    buttons.forEach((b) => (b.disabled = false));
  }
}

/* -------------------------------------------------------------- published */

function publishedHtml(): string {
  const decks = (overview?.decks ?? []).slice().sort((a, b) => (a.slug < b.slug ? -1 : 1));
  if (!decks.length) return `<p class="muted">${esc(t('admin.empty'))}</p>`;
  const rows = decks
    .map(
      (d) => `
      <tr data-slug="${esc(d.slug)}">
        <td class="pub-cover">${deckCoverHtml(d)}</td>
        <td>
          <a href="/anki-browser/deck/${esc(d.slug)}/" target="_blank" rel="noopener"><strong>${esc(
            d.title,
          )}</strong></a>
          <div class="muted">${esc(d.slug)}${d.submission?.submittedBy ? ` · @${esc(d.submission.submittedBy)}` : ''}</div>
        </td>
        <td class="pub-actions">
          ${
            d.submission?.issue
              ? `<button class="btn btn-secondary" data-act="unpublish">${esc(t('admin.unpublish'))}</button>`
              : `<span class="muted">${esc(t('admin.curated'))}</span>`
          }
        </td>
      </tr>`,
    )
    .join('');
  return `
  <p class="muted">${esc(t('admin.publishedCount', { count: decks.length }))}</p>
  <table class="admin-table">
    <tbody>${rows}</tbody>
  </table>`;
}

function wirePublished(body: HTMLElement): void {
  body.querySelectorAll<HTMLButtonElement>('button[data-act=unpublish]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const slug = (btn.closest('tr') as HTMLElement).dataset.slug ?? '';
      if (!confirm(t('admin.confirmUnpublish', { slug }))) return;
      const card = btn.closest('tr') as HTMLElement;
      void doModerate(card, { slug, action: 'unpublish' });
    }),
  );
}
