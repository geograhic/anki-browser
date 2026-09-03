/**
 * Deck submission page (visitor side).
 *
 * Progressive disclosure keeps the form from scaring people off: three required
 * fields on top, everything else tucked into an "optional" drawer. Validation
 * rules come from `content/validate.mjs` — the same module the Worker runs on
 * the server side — so the two sides can never disagree.
 */
import { escapeHtml as esc, submitBodyHtml, SUPPORTED_LICENSES } from '../../content/render.mjs';
import { sanitizeSubmission } from '../../content/validate.mjs';
import { ApiError } from '../../services/api';
import { fetchSession, oauthStartUrl, logout, type SessionUser } from '../../services/auth';
import {
  submitDeck,
  mySubmissions,
  type MySubmission,
  type SubmissionInput,
} from '../../services/submissions';
import { qs } from '../dom';
import { t } from '../i18n';
import type { PageContext } from './context';

const LANG_OPTIONS: { value: string; key: string }[] = [
  { value: 'en', key: 'submit.langEn' },
  { value: 'zh', key: 'submit.langZh' },
  { value: 'en-zh', key: 'submit.langBilingual' },
  { value: 'other', key: 'submit.langOther' },
];

export async function renderSubmit(outlet: HTMLElement, ctx: PageContext): Promise<void> {
  const shell =
    submitBodyHtml({ links: ctx.links, lang: ctx.lang }) + '<div id="submit-app"></div>';
  outlet.innerHTML = shell;
  const host = qs('#submit-app', outlet)!;

  host.innerHTML = `<div class="spinner"></div>`;
  const session = await fetchSession();

  if (!session.available) {
    host.innerHTML = notice('error-note', t('submit.apiUnavailable'));
    return;
  }
  if (!session.user) {
    host.innerHTML = signInCard();
    return;
  }

  host.innerHTML = signedInBar(session.user) + formHtml() + mySectionHtml();
  wireForm(host);
  wireSignOut(host);
  void refreshMySubmissions(host);
}

/* ------------------------------------------------------------------ shell */

function notice(cls: string, msg: string): string {
  return `<div class="${cls}">${esc(msg)}</div>`;
}

function signInCard(): string {
  return `
  <div class="submit-signin-card">
    <h2>${esc(t('submit.signInTitle'))}</h2>
    <p class="muted">${esc(t('submit.signInWhy'))}</p>
    <a class="btn btn-primary" href="${esc(oauthStartUrl())}">${esc(t('submit.signInButton'))}</a>
  </div>`;
}

function signedInBar(user: SessionUser): string {
  return `
  <div class="submit-session">
    <img class="session-avatar" src="${esc(user.avatarUrl)}" alt="" width="28" height="28">
    <span>${esc(t('submit.signedInAs'))}
      <a href="${esc(user.htmlUrl)}" target="_blank" rel="noopener">@${esc(user.login)}</a>
    </span>
    <button class="btn btn-ghost session-logout" type="button">${esc(t('submit.signOut'))}</button>
  </div>`;
}

function wireSignOut(host: HTMLElement): void {
  qs('.session-logout', host)?.addEventListener('click', async () => {
    await logout().catch(() => undefined);
    location.reload();
  });
}

/* ------------------------------------------------------------------- form */

function input(
  id: string,
  label: string,
  opts: { ph?: string; help?: string; type?: string; required?: boolean } = {},
): string {
  return `
  <div class="form-field">
    <label for="f-${id}">${esc(label)}${opts.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
    <input id="f-${id}" name="${id}" type="${opts.type ?? 'text'}" placeholder="${esc(
      opts.ph ?? '',
    )}" autocomplete="off">
    ${opts.help ? `<p class="form-help">${esc(opts.help)}</p>` : ''}
    <p class="form-error" data-error-for="${id}" hidden></p>
  </div>`;
}

function textarea(
  id: string,
  label: string,
  opts: { ph?: string; help?: string; rows?: number } = {},
): string {
  return `
  <div class="form-field">
    <label for="f-${id}">${esc(label)}</label>
    <textarea id="f-${id}" name="${id}" rows="${opts.rows ?? 6}" placeholder="${esc(
      opts.ph ?? '',
    )}"></textarea>
    ${opts.help ? `<p class="form-help">${esc(opts.help)}</p>` : ''}
    <p class="form-error" data-error-for="${id}" hidden></p>
  </div>`;
}

function select(id: string, label: string, options: { value: string; text: string }[]): string {
  const opts = options
    .map((o) => `<option value="${esc(o.value)}">${esc(o.text)}</option>`)
    .join('');
  return `
  <div class="form-field">
    <label for="f-${id}">${esc(label)}</label>
    <select id="f-${id}" name="${id}">${opts}</select>
    <p class="form-error" data-error-for="${id}" hidden></p>
  </div>`;
}

function formHtml(): string {
  const langOptions = LANG_OPTIONS.map((o) => ({ value: o.value, text: t(o.key) }));
  const licenseOptions = SUPPORTED_LICENSES.map((l) => ({ value: l, text: l }));

  return `
  <form id="submit-form" class="submit-form" novalidate>
    ${input('title', t('submit.field.title'), {
      ph: t('submit.field.titlePh'),
      help: t('submit.field.titleHelp'),
      required: true,
    })}
    ${input('downloadUrl', t('submit.field.downloadUrl'), {
      ph: 'https://…',
      help: t('submit.field.downloadUrlHelp'),
      type: 'url',
      required: true,
    })}
    <div class="form-row">
      ${input('downloadLabel', t('submit.field.downloadLabel'), { ph: t('submit.field.downloadLabelPh') })}
      ${input('downloadNote', t('submit.field.downloadNote'), { ph: t('submit.field.downloadNotePh') })}
    </div>
    ${input('subtitle', t('submit.field.subtitle'), {
      ph: t('submit.field.subtitlePh'),
      help: t('submit.field.subtitleHelp'),
      required: true,
    })}

    <details class="form-more">
      <summary>${esc(t('common.moreOptions'))}<span class="form-more-hint">${esc(
        t('submit.groupExtraHint'),
      )}</span></summary>
      <div class="form-more-body">
        ${input('coverUrl', t('submit.field.coverUrl'), {
          ph: 'https://…/cover.png',
          help: t('submit.field.coverUrlHelp'),
          type: 'url',
        })}
        ${textarea('content', t('submit.field.content'), {
          ph: t('submit.field.contentPh'),
          help: t('submit.field.contentHelp'),
          rows: 7,
        })}
        <div class="form-row">
          ${input('authorName', t('submit.field.authorName'), { ph: t('submit.field.authorNamePh') })}
          ${input('authorUrl', t('submit.field.authorUrl'), { ph: 'https://…', type: 'url' })}
        </div>
        <p class="form-help">${esc(t('submit.field.authorUrlHelp'))}</p>
        ${input('tags', t('submit.field.tags'), {
          ph: t('submit.field.tagsPh'),
          help: t('submit.field.tagsHelp'),
        })}
        <div class="form-row">
          ${select('language', t('submit.field.language'), langOptions)}
          ${select('license', t('submit.field.license'), licenseOptions)}
        </div>
        ${input('previewUrl', t('submit.field.previewUrl'), {
          ph: 'https://…/deck.apkg',
          help: t('submit.field.previewUrlHelp'),
          type: 'url',
        })}
        <div class="form-row">
          ${input('extraDownloadUrl', t('submit.field.extraDownload'), { ph: 'https://…', type: 'url' })}
          ${input('extraDownloadLabel', t('submit.field.downloadLabel'), {
            ph: t('submit.field.downloadLabelPh'),
          })}
        </div>
        ${textarea('note', t('submit.field.noteToOwner'), {
          ph: t('submit.field.noteToOwnerPh'),
          rows: 3,
        })}
      </div>
    </details>

    <label class="form-consent">
      <input type="checkbox" id="f-consent">
      <span>${esc(t('submit.field.consent'))}</span>
    </label>
    <p class="form-error" data-error-for="consent" hidden></p>

    <div class="form-actions">
      <button class="btn btn-primary btn-lg" type="submit">${esc(t('submit.submitButton'))}</button>
    </div>
    <div class="form-result" hidden></div>
  </form>`;
}

function fieldValue(form: HTMLFormElement, id: string): string {
  const el = form.elements.namedItem(id) as HTMLInputElement | HTMLTextAreaElement | null;
  return (el?.value ?? '').trim();
}

function wireForm(host: HTMLElement): void {
  const form = qs<HTMLFormElement>('#submit-form', host);
  if (!form) return;

  // Consent gate: the button only enables once the box is ticked.
  const consent = qs<HTMLInputElement>('#f-consent', form)!;
  const submitBtn = qs<HTMLButtonElement>('button[type=submit]', form)!;
  const syncConsent = () => {
    submitBtn.disabled = !consent.checked;
    submitBtn.textContent = consent.checked ? t('submit.submitButton') : t('submit.consentRequired');
  };
  consent.addEventListener('change', syncConsent);
  syncConsent();

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearErrors(form);

    const raw = {
      title: fieldValue(form, 'title'),
      downloadUrl: fieldValue(form, 'downloadUrl'),
      downloadLabel: fieldValue(form, 'downloadLabel'),
      downloadNote: fieldValue(form, 'downloadNote'),
      subtitle: fieldValue(form, 'subtitle'),
      coverUrl: fieldValue(form, 'coverUrl'),
      previewUrl: fieldValue(form, 'previewUrl'),
      authorName: fieldValue(form, 'authorName'),
      authorUrl: fieldValue(form, 'authorUrl'),
      extraDownloadUrl: fieldValue(form, 'extraDownloadUrl'),
      extraDownloadLabel: fieldValue(form, 'extraDownloadLabel'),
      content: fieldValue(form, 'content'),
      language: fieldValue(form, 'language') || 'en',
      license: fieldValue(form, 'license') || SUPPORTED_LICENSES[0],
      tags: fieldValue(form, 'tags'),
      note: fieldValue(form, 'note'),
    };

    const check = sanitizeSubmission(raw as Record<string, unknown>);
    if (!check.ok) {
      showErrors(form, check.errors);
      return;
    }
    if (!consent.checked) {
      showErrors(form, { consent: 'consentRequired' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t('submit.submitting');
    const result = qs('.form-result', form)!;
    try {
      const res = await submitDeck(raw as SubmissionInput);
      result.hidden = false;
      result.innerHTML = `
        <div class="submit-success">
          <h3>${esc(t('submit.successTitle'))}</h3>
          <p>${esc(t('submit.successBody'))}</p>
          <p class="submit-success-actions">
            <a class="btn btn-secondary" href="${esc(res.htmlUrl)}" target="_blank" rel="noopener">${esc(
              t('submit.successTrack'),
            )}</a>
            <button class="btn btn-ghost" type="button" id="submit-another">${esc(
              t('submit.submitAnother'),
            )}</button>
          </p>
        </div>`;
      qs('#submit-another', result)?.addEventListener('click', () => {
        form.reset();
        syncConsent();
        result.hidden = true;
      });
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      void refreshMySubmissions(host);
    } catch (e) {
      const err = e as ApiError;
      result.hidden = false;
      result.innerHTML = notice('error-note', t(`submit.error.${err.code}`));
      if (err.fields) showErrors(form, err.fields);
      submitBtn.disabled = false;
      submitBtn.textContent = t('submit.submitButton');
    }
  });
}

function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll('.form-error').forEach((el) => {
    (el as HTMLElement).hidden = true;
    el.textContent = '';
  });
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
}

function showErrors(form: HTMLFormElement, errors: Record<string, string>): void {
  for (const [fieldId, key] of Object.entries(errors)) {
    const slot = form.querySelector(`[data-error-for="${fieldId}"]`) as HTMLElement | null;
    if (!slot) continue;
    slot.hidden = false;
    slot.textContent = t(`submit.${key}`);
    const inputEl = form.querySelector(`#f-${fieldId}`);
    inputEl?.classList.add('is-invalid');
  }
  const first = form.querySelector('.is-invalid');
  first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* --------------------------------------------------------- my submissions */

function mySectionHtml(): string {
  return `
  <section class="my-submissions">
    <h2>${esc(t('submit.myTitle'))}</h2>
    <div class="my-submissions-body"><div class="spinner"></div></div>
  </section>`;
}

function statusBadge(status: MySubmission['status']): string {
  return `<span class="status-badge status-${esc(status)}">${esc(t(`submit.status.${status}`))}</span>`;
}

function submissionCard(s: MySubmission): string {
  const comment = s.lastComment
    ? `<blockquote class="sub-comment">
        <p>${esc(s.lastComment.body)}</p>
        <footer>— <a href="${esc(s.lastComment.htmlUrl)}" target="_blank" rel="noopener">${esc(
          s.lastComment.author,
        )}</a></footer>
      </blockquote>`
    : `<p class="muted">${esc(t('submit.noUpdate'))}</p>`;
  return `
  <article class="sub-card">
    <header class="sub-card-head">
      <a class="sub-card-title" href="${esc(s.htmlUrl)}" target="_blank" rel="noopener">${esc(
        s.title,
      )}</a>
      ${statusBadge(s.status)}
    </header>
    <p class="muted sub-card-meta">${esc(t('submit.submittedOn', { date: s.createdAt.slice(0, 10) }))}</p>
    ${comment}
  </article>`;
}

async function refreshMySubmissions(host: HTMLElement): Promise<void> {
  const body = qs('.my-submissions-body', host);
  if (!body) return;
  try {
    const { submissions } = await mySubmissions();
    if (!submissions.length) {
      body.innerHTML = `<p class="muted">${esc(t('submit.myEmpty'))}</p>`;
      return;
    }
    body.innerHTML = submissions.map(submissionCard).join('');
  } catch {
    body.innerHTML = `<p class="muted">${esc(t('submit.signInToSee'))}</p>`;
  }
}
