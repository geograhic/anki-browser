import { openPackage } from '../review';
import { setSession } from '../state';
import { saveLastFile } from '../storage';
import { qs } from '../dom';
import { navigate } from '../router';
import { t } from '../i18n';

export function renderOpen(outlet: HTMLElement): void {
  outlet.innerHTML = `
    <div class="open-wrap">
      <h1>${t('open.title')}</h1>
      <p class="muted">${t('open.lead')}</p>
      <div class="dropzone" id="dz">
        <h2>${t('open.drop')}</h2>
        <p>${t('open.or')}</p>
        <button class="btn btn-primary" id="pick" type="button">${t('open.choose')}</button>
        <input type="file" id="file" accept=".apkg,.colpkg,application/zip" />
      </div>
      <div id="status"></div>
    </div>`;

  const dz = qs('#dz', outlet)!;
  const input = qs<HTMLInputElement>('#file', outlet)!;
  const status = qs('#status', outlet)!;

  qs('#pick', outlet)!.addEventListener('click', (e) => {
    e.preventDefault();
    input.click();
  });

  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (f) void handle(f);
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('is-drag');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('is-drag');
    }),
  );
  dz.addEventListener('drop', (e) => {
    const f = (e as DragEvent).dataTransfer?.files?.[0];
    if (f) void handle(f);
  });

  async function handle(file: File): Promise<void> {
    status.innerHTML = `<p class="parsing-note">${t('open.reading', {
      name: escape(file.name),
      size: (file.size / 1048576).toFixed(1),
    })}</p>`;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      status.innerHTML = `<p class="parsing-note">${t('open.parsing')}</p>`;
      const session = await openPackage(bytes, file.name);
      setSession(session);
      // Keep the file around so a reload (or any in-app navigation) does not
      // lose the open deck. The most recent file is what gets restored.
      void saveLastFile(file.name, bytes);
      navigate('#/study');
    } catch (err) {
      status.innerHTML = `<div class="error-note">${t('open.failed', {
        message: (err as Error).message,
      })}</div>`;
    }
  }
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
