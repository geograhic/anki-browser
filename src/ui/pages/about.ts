import { aboutBodyHtml, appLinks } from '../../content/render.mjs';

export function renderAbout(outlet: HTMLElement): void {
  outlet.innerHTML = aboutBodyHtml();
  const wrap = outlet.querySelector('.about-wrap');
  if (wrap) {
    const back = document.createElement('p');
    back.style.marginTop = '18px';
    back.innerHTML = `<a class="btn btn-secondary" href="${appLinks.home()}">Back to decks</a>`;
    wrap.append(back);
  }
}
