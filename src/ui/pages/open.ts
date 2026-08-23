import { openPackage } from '../review';
import { setSession } from '../state';
import { saveLastFile } from '../storage';
import { qs } from '../dom';
import { navigate } from '../router';

export function renderOpen(outlet: HTMLElement): void {
  outlet.innerHTML = `
    <div class="open-wrap">
      <h1>Open an Anki deck</h1>
      <p class="muted">Choose an <code>.apkg</code> (shared deck) or <code>.colpkg</code> (full collection backup). Parsing happens entirely on your device.</p>
      <div class="dropzone" id="dz">
        <h2>Drop your file here</h2>
        <p>or</p>
        <button class="btn btn-primary" id="pick" type="button">Choose file</button>
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
    status.innerHTML = `<p class="parsing-note">Reading ${escape(file.name)} (${(file.size / 1048576).toFixed(1)} MB)…</p>`;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      status.innerHTML = `<p class="parsing-note">Parsing collection…</p>`;
      const session = await openPackage(bytes, file.name);
      setSession(session);
      // Keep the file around so a reload (or any in-app navigation) does not
      // lose the open deck. The most recent file is what gets restored.
      void saveLastFile(file.name, bytes);
      navigate('#/study');
    } catch (err) {
      status.innerHTML = `<div class="error-note">Could not open this file: ${(err as Error).message}</div>`;
    }
  }
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
