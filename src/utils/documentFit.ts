const FIXED_DATA_SELECTOR = [
  '.certif .v',
  '.fiche-page .v',
  '.fiche-page .hd-pv span',
  '.fiche-page .hd-opt .o2',
  '.fiche-page .hd-opt .c2',
  '.fiche-page .hd-opt .r3',
  '.fiche-page .duree .v',
  '.fiche-page .decl .blanc',
  '.chemise-cep-page .v',
  '.chemise-cep-page .centre .val',
  '.chemise-page .v',
  '.chemise-page .centre .val',
  '.chemise-page .case',
  '.chemise-page .nom-box',
].join(', ');

function shrinkElementToFit(
  el: HTMLElement,
  opts: { minPx?: number; allowWrapAtMin?: boolean } = {}
): void {
  const minPx = opts.minPx ?? 6.5;
  el.style.fontSize = '';
  el.style.whiteSpace = 'nowrap';
  el.style.lineHeight = '1.08';

  const cw = el.clientWidth;
  const ch = el.clientHeight;
  if (cw <= 2 || ch <= 2) return;

  let fontPx = parseFloat(getComputedStyle(el).fontSize) || 12;

  for (let i = 0; i < 10; i++) {
    const sw = el.scrollWidth;
    const sh = el.scrollHeight;
    if (sw <= cw + 1 && sh <= ch + 1) break;
    if (fontPx <= minPx) break;

    const ratioW = sw > cw + 1 ? cw / sw : 1;
    const ratioH = sh > ch + 1 ? ch / sh : 1;
    const ratio = Math.min(ratioW, ratioH) * 0.96;
    const nextPx = Math.max(minPx, Math.min(fontPx - 0.5, fontPx * ratio));
    if (nextPx >= fontPx - 0.05) break;
    fontPx = nextPx;
    el.style.fontSize = `${fontPx.toFixed(2)}px`;
  }

  if (opts.allowWrapAtMin && el.scrollWidth > el.clientWidth + 1) {
    el.style.whiteSpace = 'normal';
    el.style.wordBreak = 'break-word';
    el.style.lineHeight = '1.1';
    for (let i = 0; i < 6; i++) {
      if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) break;
      if (fontPx <= minPx) break;
      fontPx = Math.max(minPx, fontPx - 0.8);
      el.style.fontSize = `${fontPx.toFixed(2)}px`;
    }
  }
}

export function fitDocumentDataFonts(root: HTMLElement | null | undefined): void {
  if (!root || typeof window === 'undefined') return;

  // 1. Fit all fixed-form candidate/school data fields
  const dataEls = root.querySelectorAll<HTMLElement>(FIXED_DATA_SELECTOR);
  dataEls.forEach((el) => {
    if (!el.textContent || !el.textContent.trim()) return;
    const isNomBox = el.classList.contains('nom-box');
    shrinkElementToFit(el, {
      minPx: isNomBox ? 7.5 : 6.5,
      allowWrapAtMin: isNomBox,
    });
  });

  // 2. Fit wide tables cleanly inside their .pdf-report-page container
  const pages = root.querySelectorAll<HTMLElement>('.pdf-report-page');
  pages.forEach((page) => {
    const maxPageW = page.clientWidth;
    if (maxPageW <= 0) return;

    page.querySelectorAll<HTMLTableElement>('table.print-list-table').forEach((table) => {
      table.style.fontSize = '';
      let basePx = parseFloat(getComputedStyle(table).fontSize) || 11;
      const minTablePx = 7;

      // Shrink table font if total table width exceeds the printable area
      for (let i = 0; i < 8; i++) {
        if (table.scrollWidth <= page.clientWidth - 2 || basePx <= minTablePx) break;
        const ratio = (page.clientWidth - 4) / Math.max(1, table.scrollWidth);
        basePx = Math.max(minTablePx, Math.min(basePx - 0.5, basePx * ratio * 0.98));
        table.style.fontSize = `${basePx.toFixed(2)}px`;
      }

      // Shrink individual fixed-width cells whose content overflows horizontally
      table.querySelectorAll<HTMLElement>('td').forEach((td) => {
        if (!td.textContent || !td.textContent.trim()) return;
        td.style.fontSize = '';
        const cw = td.clientWidth;
        if (cw <= 2 || td.scrollWidth <= cw + 1) return;
        let tdPx = parseFloat(getComputedStyle(td).fontSize) || basePx;
        const minTdPx = 6.5;
        for (let j = 0; j < 6; j++) {
          if (td.scrollWidth <= td.clientWidth + 1 || tdPx <= minTdPx) break;
          tdPx = Math.max(minTdPx, Math.min(tdPx - 0.5, tdPx * (td.clientWidth / td.scrollWidth) * 0.96));
          td.style.fontSize = `${tdPx.toFixed(2)}px`;
        }
      });
    });
  });
}
