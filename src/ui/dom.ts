/** Tiny DOM helpers. No framework — just enough to keep the UI code readable. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | EventListener | undefined> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'html') node.innerHTML = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** Wrap an HTML string in a detached element and return it. */
export function fromHtml(html: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return (tpl.content.firstElementChild as HTMLElement) ?? document.createElement('div');
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

export function qs<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

export function qsa<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

/** Delegated event binding: listen on `root`, react to clicks on `selector`. */
export function onDelegate(
  root: HTMLElement,
  event: string,
  selector: string,
  handler: (target: HTMLElement, event: Event) => void,
): void {
  root.addEventListener(event, (e) => {
    const target = (e.target as HTMLElement)?.closest(selector) as HTMLElement | null;
    if (target && root.contains(target)) handler(target, e);
  });
}
