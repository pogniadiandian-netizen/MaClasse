import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { PageOrientation, PageOrientationMode } from '../types/cep';
import { fitDocumentDataFonts } from './documentFit';
import { OFFICIAL_PRINT_CSS } from './printStyles';

const PAGE_SELECTOR =
  '.certif-page, .fiche-page, .chemise-cep-page, .chemise-page, .cartes-feuille, .pdf-report-page';

const dataUrlCache = new Map<string, string>();

async function toDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (dataUrlCache.has(url)) return dataUrlCache.get(url)!;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || url));
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
    dataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return url;
  }
}

async function inlineExternalImages(doc: Document): Promise<void> {
  const htmlImgs = Array.from(doc.querySelectorAll('img'));
  await Promise.all(
    htmlImgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        const resolved = await toDataUrl(src);
        img.setAttribute('src', resolved);
      }
    })
  );

  const svgImages = Array.from(doc.querySelectorAll('svg image'));
  await Promise.all(
    svgImages.map(async (img) => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href');
      if (href && !href.startsWith('data:')) {
        const resolved = await toDataUrl(href);
        img.setAttribute('href', resolved);
        img.setAttribute('xlink:href', resolved);
      }
    })
  );
}

async function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 2500);
      });
    })
  );
}

function getNaturalOrientation(el: HTMLElement): PageOrientation {
  if (el.classList.contains('chemise-page') || el.classList.contains('chemise-cep-page')) {
    return 'landscape';
  }
  if (el.classList.contains('pdf-report-page')) {
    return el.dataset.orientation === 'landscape' ? 'landscape' : 'portrait';
  }
  return 'portrait';
}

function paginateReportPages(doc: Document, pxPerMm: number): void {
  const reports = Array.from(doc.querySelectorAll<HTMLElement>('.pdf-report-page'));
  reports.forEach((page) => {
    const orientation = getNaturalOrientation(page);
    const maxHeightPx = (orientation === 'landscape' ? 210 : 297) * pxPerMm;
    if (page.scrollHeight <= maxHeightPx + 4) return;

    if (page.classList.contains('single-page-report')) {
      const table = page.querySelector<HTMLTableElement>('table.print-list-table');
      if (table) {
        const steps = [
          { fontPt: 6.4, padY: '2px', padX: '2px' },
          { fontPt: 5.8, padY: '1.5px', padX: '1.8px' },
          { fontPt: 5.3, padY: '1px', padX: '1.5px' },
          { fontPt: 4.8, padY: '0.6px', padX: '1.2px' },
        ];
        for (const s of steps) {
          table.style.fontSize = `${s.fontPt}pt`;
          table.querySelectorAll<HTMLTableCellElement>('th, td').forEach((cell) => {
            cell.style.padding = `${s.padY} ${s.padX}`;
            cell.style.lineHeight = '1.15';
          });
          if (page.scrollHeight <= maxHeightPx + 2) break;
        }
      }
      return;
    }

    const tables = Array.from(page.querySelectorAll<HTMLTableElement>('table.print-list-table'));
    const mainTable =
      page.querySelector<HTMLTableElement>('table.main-report-table') ||
      tables.find((t) => (t.tBodies[0]?.rows.length ?? 0) > 1) ||
      tables[0];
    if (!mainTable || !mainTable.tBodies[0]) return;

    const signatureEl = page.querySelector<HTMLElement>('.report-signature');
    if (signatureEl) {
      signatureEl.remove();
    }

    const trailingNodes: HTMLElement[] = [];
    let sibling = mainTable.nextElementSibling as HTMLElement | null;
    while (sibling) {
      const nextSib = sibling.nextElementSibling as HTMLElement | null;
      trailingNodes.push(sibling);
      sibling.remove();
      sibling = nextSib;
    }

    const titleEl = page.querySelector('.report-title')?.cloneNode(true) as HTMLElement | null;
    const subtitleEl = page.querySelector('.report-subtitle')?.cloneNode(true) as HTMLElement | null;
    const colgroupEl = mainTable.querySelector('colgroup');

    const overflowRows: HTMLTableRowElement[] = [];

    while (page.scrollHeight > maxHeightPx + 2 && mainTable.tBodies[0].rows.length > 1) {
      const last = mainTable.tBodies[0].rows[mainTable.tBodies[0].rows.length - 1];
      overflowRows.unshift(last);
      last.remove();
    }

    let currentPage: HTMLElement = page;
    let remaining = overflowRows;
    let safety = 0;

    while (remaining.length > 0 && safety < 50) {
      safety++;
      const nextPage = doc.createElement('section');
      nextPage.className = page.className;
      nextPage.dataset.orientation = orientation;
      if (titleEl) nextPage.appendChild(titleEl.cloneNode(true));
      if (subtitleEl) nextPage.appendChild(subtitleEl.cloneNode(true));

      const nextTable = doc.createElement('table');
      nextTable.className = mainTable.className;
      if (colgroupEl) {
        nextTable.appendChild(colgroupEl.cloneNode(true));
      }
      if (mainTable.tHead) {
        nextTable.appendChild(mainTable.tHead.cloneNode(true));
      }
      const nextTbody = doc.createElement('tbody');
      nextTable.appendChild(nextTbody);
      nextPage.appendChild(nextTable);

      currentPage.insertAdjacentElement('afterend', nextPage);

      const stillLeft: HTMLTableRowElement[] = [];
      for (let i = 0; i < remaining.length; i++) {
        const row = remaining[i];
        nextTbody.appendChild(row);
        if (nextPage.scrollHeight > maxHeightPx + 2 && nextTbody.rows.length > 1) {
          row.remove();
          stillLeft.push(...remaining.slice(i));
          break;
        }
      }
      currentPage = nextPage;
      remaining = stillLeft;
    }

    for (const node of trailingNodes) {
      currentPage.appendChild(node);
      if (currentPage.scrollHeight > maxHeightPx + 4) {
        node.remove();
        const extraPage = doc.createElement('section');
        extraPage.className = page.className;
        extraPage.dataset.orientation = orientation;
        extraPage.appendChild(node);
        currentPage.insertAdjacentElement('afterend', extraPage);
        currentPage = extraPage;
      }
    }

    if (signatureEl) {
      currentPage.appendChild(signatureEl);
      if (currentPage.scrollHeight > maxHeightPx + 6) {
        const sigPage = doc.createElement('section');
        sigPage.className = page.className;
        sigPage.dataset.orientation = orientation;
        sigPage.appendChild(signatureEl);
        currentPage.insertAdjacentElement('afterend', sigPage);
      }
    }
  });
}

function rotateCanvas90CW(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement('canvas');
  dst.width = src.height;
  dst.height = src.width;
  const ctx = dst.getContext('2d');
  if (!ctx) return src;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, dst.width, dst.height);
  ctx.translate(dst.width / 2, dst.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return dst;
}

async function renderCardsSheetToCanvas(sheet: HTMLElement): Promise<HTMLCanvasElement> {
  const pxPerMm = 12; // ~305 DPI crisp rendering on 210x297mm
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(210 * pxPerMm);
  canvas.height = Math.round(297 * pxPerMm);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const svgs = Array.from(sheet.querySelectorAll<SVGSVGElement>('svg.carte-svg'));
  const serializer = new XMLSerializer();

  await Promise.all(
    svgs.map(async (svg) => {
      const leftMm = parseFloat(svg.style.left || '0') || 0;
      const topMm = parseFloat(svg.style.top || '0') || 0;
      const wMm = 89.7;
      const hMm = 55.82;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', String(Math.round(wMm * pxPerMm)));
      clone.setAttribute('height', String(Math.round(hMm * pxPerMm)));
      const xml = serializer.serializeToString(clone);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(
            img,
            leftMm * pxPerMm,
            topMm * pxPerMm,
            wMm * pxPerMm,
            hMm * pxPerMm
          );
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });
    })
  );

  return canvas;
}

async function loadImageDimensions(dataUrl: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function sanitizePdfText(raw: string): string {
  return String(raw ?? '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2192/g, '->')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeKeepSpaces(raw: string): string {
  return String(raw ?? '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2192/g, '->')
    .replace(/\s+/g, ' ');
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseRgb(color: string): RgbColor {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  };
}

function getFontStyle(cs: CSSStyleDeclaration): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  const w = cs.fontWeight;
  const isBold = w === 'bold' || Number(w) >= 600;
  const isItalic = cs.fontStyle === 'italic';
  if (isBold && isItalic) return 'bolditalic';
  if (isBold) return 'bold';
  if (isItalic) return 'italic';
  return 'normal';
}

interface InlineRun {
  text: string;
  style: 'normal' | 'bold' | 'italic' | 'bolditalic';
  color: RgbColor;
  fontPt: number;
}

function collectInlineRuns(el: Element, win: Window): InlineRun[] {
  const runs: InlineRun[] = [];
  const walk = (node: Node, inheritedEl: Element) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = sanitizeKeepSpaces(node.textContent || '');
      if (!txt) return;
      const cs = win.getComputedStyle(inheritedEl);
      runs.push({
        text: txt,
        style: getFontStyle(cs),
        color: parseRgb(cs.color),
        fontPt: Math.max(5.5, (parseFloat(cs.fontSize) || 12) * 0.75),
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childEl = node as Element;
      Array.from(childEl.childNodes).forEach((n) => walk(n, childEl));
    }
  };
  walk(el, el);

  // Trim leading/trailing whitespace across the full sequence
  while (runs.length && !runs[0].text.trim()) runs.shift();
  while (runs.length && !runs[runs.length - 1].text.trim()) runs.pop();
  if (runs.length) {
    runs[0].text = runs[0].text.replace(/^\s+/, '');
    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '');
  }
  return runs;
}

function drawInlineRunsLine(
  pdf: jsPDF,
  runs: InlineRun[],
  anchorX: number,
  baselineY: number,
  align: 'left' | 'center' | 'right',
  maxWidthMm?: number
): void {
  if (!runs.length) return;
  let totalW = 0;
  let widths = runs.map((r) => {
    pdf.setFont('helvetica', r.style);
    pdf.setFontSize(r.fontPt);
    const w = pdf.getTextWidth(r.text);
    totalW += w;
    return w;
  });

  let scale = 1;
  if (maxWidthMm && totalW > maxWidthMm && totalW > 0) {
    scale = Math.max(0.65, (maxWidthMm / totalW) * 0.98);
    totalW = 0;
    widths = runs.map((r) => {
      pdf.setFont('helvetica', r.style);
      pdf.setFontSize(r.fontPt * scale);
      const w = pdf.getTextWidth(r.text);
      totalW += w;
      return w;
    });
  }

  let curX =
    align === 'center' ? anchorX - totalW / 2 : align === 'right' ? anchorX - totalW : anchorX;

  runs.forEach((r, idx) => {
    pdf.setFont('helvetica', r.style);
    pdf.setFontSize(r.fontPt * scale);
    pdf.setTextColor(r.color.r, r.color.g, r.color.b);
    pdf.text(r.text, curX, baselineY);
    curX += widths[idx];
  });
}

function fitLinesAndFont(
  pdf: jsPDF,
  logicalLines: Array<{ text: string; style: 'normal' | 'bold' | 'italic' | 'bolditalic'; fontPt: number }>,
  availW: number,
  availH: number,
  minPt: number
): {
  lines: Array<{ text: string; style: 'normal' | 'bold' | 'italic' | 'bolditalic'; fontPt: number }>;
  scale: number;
} {
  let scale = 1;
  for (let step = 0; step < 16; step++) {
    const out: Array<{ text: string; style: 'normal' | 'bold' | 'italic' | 'bolditalic'; fontPt: number }> = [];
    let wordTooWide = false;

    for (const line of logicalLines) {
      const pt = Math.max(minPt, line.fontPt * scale);
      pdf.setFont('helvetica', line.style);
      pdf.setFontSize(pt);
      const tokens = line.text.split(/\s+/).filter(Boolean);
      for (const tok of tokens) {
        if (pdf.getTextWidth(tok) > availW - 0.1) {
          wordTooWide = true;
          break;
        }
      }
      const wrapped = pdf.splitTextToSize(line.text, Math.max(1.5, availW)) as string[];
      wrapped.forEach((wLine) => out.push({ text: wLine, style: line.style, fontPt: pt }));
    }

    const totalH = out.reduce((sum, l) => sum + l.fontPt * 0.352778 * 1.24, 0);
    const minLinePt = Math.min(...out.map((l) => l.fontPt));
    if ((!wordTooWide && totalH <= availH) || minLinePt <= minPt + 0.05) {
      return { lines: out, scale };
    }
    scale *= 0.91;
  }
  return { lines: logicalLines, scale };
}

async function renderReportPageToVectorPdf(
  pageEl: HTMLElement,
  pdf: jsPDF,
  pxPerMm: number,
  win: Window
): Promise<void> {
  const pageRect = pageEl.getBoundingClientRect();
  const toMmRect = (el: Element) => {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - pageRect.left) / pxPerMm,
      y: (r.top - pageRect.top) / pxPerMm,
      w: r.width / pxPerMm,
      h: r.height / pxPerMm,
    };
  };

  // 1. Official Header (.report-header)
  const header = pageEl.querySelector('.report-header');
  if (header) {
    const left = header.querySelector('.report-header-left');
    if (left) {
      const lRect = toMmRect(left);
      const centerX = lRect.x + lRect.w / 2;
      Array.from(left.children).forEach((child) => {
        const text = sanitizePdfText(child.textContent || '');
        if (!text) return;
        const cRect = toMmRect(child);
        const runs = collectInlineRuns(child, win);
        const basePt = runs[0]?.fontPt || 9;
        const baselineY = cRect.y + cRect.h * 0.74;
        if (runs.length) {
          drawInlineRunsLine(pdf, runs, centerX, baselineY, 'center', lRect.w);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(basePt);
          pdf.setTextColor(0, 0, 0);
          pdf.text(text, centerX, baselineY, { align: 'center' });
        }
      });
    }

    const right = header.querySelector('.report-header-right');
    if (right) {
      const rRect = toMmRect(right);
      const rightX = rRect.x + rRect.w;
      Array.from(right.children).forEach((child) => {
        const text = sanitizePdfText(child.textContent || '');
        if (!text) return;
        const cRect = toMmRect(child);
        const cs = win.getComputedStyle(child);
        let fontPt = (parseFloat(cs.fontSize) || 12) * 0.75;
        pdf.setFont('helvetica', getFontStyle(cs));
        pdf.setFontSize(fontPt);
        while (fontPt > 6.5 && pdf.getTextWidth(text) > rRect.w) {
          fontPt -= 0.3;
          pdf.setFontSize(fontPt);
        }
        pdf.setTextColor(0, 0, 0);
        pdf.text(text, rightX, cRect.y + cRect.h * 0.74, { align: 'right' });
      });
    }
  }

  // 2. Report Title (.report-title) with crisp underline cleanly below descenders
  const titleEl = pageEl.querySelector('.report-title');
  if (titleEl) {
    const tRect = toMmRect(titleEl);
    const titleText = sanitizePdfText(titleEl.textContent || '');
    const cs = win.getComputedStyle(titleEl);
    let fontPt = (parseFloat(cs.fontSize) || 17) * 0.75;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(fontPt);
    pdf.setTextColor(0, 0, 0);
    const pageMmW = pageRect.width / pxPerMm;
    const maxTitleW = Math.max(40, pageMmW - 22);
    while (fontPt > 8.5 && pdf.getTextWidth(titleText) > maxTitleW) {
      fontPt -= 0.4;
      pdf.setFontSize(fontPt);
    }
    const centerX = pageMmW / 2;
    const textW = pdf.getTextWidth(titleText);
    const baselineY = tRect.y + tRect.h * 0.72;
    pdf.text(titleText, centerX, baselineY, { align: 'center' });
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.38);
    pdf.line(centerX - textW / 2, baselineY + 1.1, centerX + textW / 2, baselineY + 1.1);
  }

  // 3. Report Subtitle (.report-subtitle)
  const subEl = pageEl.querySelector('.report-subtitle');
  if (subEl) {
    const sRect = toMmRect(subEl);
    const runs = collectInlineRuns(subEl, win);
    if (runs.length) {
      drawInlineRunsLine(pdf, runs, sRect.x + sRect.w / 2, sRect.y + sRect.h * 0.74, 'center', sRect.w);
    }
  }

  // 4. KPI Row Boxes (.report-kpi-row)
  pageEl.querySelectorAll('.report-kpi-box').forEach((box) => {
    const bRect = toMmRect(box);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(bRect.x, bRect.y, bRect.w, bRect.h, 1, 1, 'FD');

    const valEl = box.querySelector('.report-kpi-val');
    const lblEl = box.querySelector('.report-kpi-lbl');
    if (valEl) {
      const vr = toMmRect(valEl);
      const vcs = win.getComputedStyle(valEl);
      const vColor = parseRgb(vcs.color);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize((parseFloat(vcs.fontSize) || 17) * 0.75);
      pdf.setTextColor(vColor.r, vColor.g, vColor.b);
      pdf.text(sanitizePdfText(valEl.textContent || ''), vr.x, vr.y + vr.h * 0.74);
    }
    if (lblEl) {
      const lr = toMmRect(lblEl);
      const lcs = win.getComputedStyle(lblEl);
      const lColor = parseRgb(lcs.color);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize((parseFloat(lcs.fontSize) || 10) * 0.75);
      pdf.setTextColor(lColor.r, lColor.g, lColor.b);
      pdf.text(sanitizePdfText(lblEl.textContent || '').toUpperCase(), lr.x, lr.y + lr.h * 0.75);
    }
  });

  // 5. Bulletin Info / Summary Boxes (.report-bulletin-box)
  pageEl.querySelectorAll('.report-bulletin-box').forEach((box) => {
    const bRect = toMmRect(box);
    const bcs = win.getComputedStyle(box);
    const bg = parseRgb(bcs.backgroundColor);
    const hasBg = bg.a > 0 && !(bg.r === 255 && bg.g === 255 && bg.b === 255);
    if (hasBg) {
      pdf.setFillColor(bg.r, bg.g, bg.b);
    }
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.28);
    pdf.rect(bRect.x, bRect.y, bRect.w, bRect.h, hasBg ? 'FD' : 'S');

    Array.from(box.children).forEach((item) => {
      const ir = toMmRect(item);
      const runs = collectInlineRuns(item, win);
      if (runs.length) {
        drawInlineRunsLine(pdf, runs, ir.x, ir.y + ir.h * 0.74, 'left');
      }
    });
  });

  // 6. Section Titles (.report-section-title) & standalone italic notes
  pageEl.querySelectorAll('.report-section-title').forEach((h4) => {
    const hr = toMmRect(h4);
    const hcs = win.getComputedStyle(h4);
    const col = parseRgb(hcs.color);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize((parseFloat(hcs.fontSize) || 14) * 0.75);
    pdf.setTextColor(col.r, col.g, col.b);
    pdf.text(sanitizePdfText(h4.textContent || ''), hr.x, hr.y + hr.h * 0.75);
  });

  pageEl.querySelectorAll(':scope > p:not(.report-subtitle):not(.report-legend)').forEach((p) => {
    const pr = toMmRect(p);
    const pcs = win.getComputedStyle(p);
    const col = parseRgb(pcs.color);
    pdf.setFont('helvetica', getFontStyle(pcs));
    pdf.setFontSize((parseFloat(pcs.fontSize) || 12) * 0.75);
    pdf.setTextColor(col.r, col.g, col.b);
    pdf.text(sanitizePdfText(p.textContent || ''), pr.x + pr.w / 2, pr.y + pr.h * 0.72, {
      align: 'center',
    });
  });

  pageEl.querySelectorAll(':scope > p.report-legend').forEach((p) => {
    const pr = toMmRect(p);
    const pcs = win.getComputedStyle(p);
    const col = parseRgb(pcs.color);
    const fontPt = Math.max(5.2, (parseFloat(pcs.fontSize) || 9) * 0.75);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontPt);
    pdf.setTextColor(col.r, col.g, col.b);
    const lines = pdf.splitTextToSize(sanitizePdfText(p.textContent || ''), Math.max(20, pr.w)) as string[];
    const step = fontPt * 0.352778 * 1.3;
    let y = pr.y + fontPt * 0.352778 * 0.9;
    lines.forEach((line) => {
      pdf.text(line, pr.x, y);
      y += step;
    });
  });

  // 7. Tables (table.print-list-table) — crisp vector borders + perfectly vertically centered text
  pageEl.querySelectorAll<HTMLTableElement>('table.print-list-table').forEach((table) => {
    const isCompact = table.classList.contains('compact');
    const isSynoptique = table.classList.contains('synoptique-table');
    const isFicheNotes = table.classList.contains('fiche-notes-table');

    const cells = Array.from(table.querySelectorAll<HTMLTableCellElement>('th, td'));
    // Pass 1: Fills + Crisp Borders
    cells.forEach((cell) => {
      const rect = toMmRect(cell);
      if (rect.w <= 0 || rect.h <= 0) return;
      const cs = win.getComputedStyle(cell);
      const bg = parseRgb(cs.backgroundColor);
      const trBg = cell.parentElement ? parseRgb(win.getComputedStyle(cell.parentElement).backgroundColor) : null;
      const effBg = bg.a > 0.05 ? bg : trBg && trBg.a > 0.05 ? trBg : null;
      const hasFill = Boolean(effBg && !(effBg.r === 255 && effBg.g === 255 && effBg.b === 255));
      if (hasFill && effBg) {
        pdf.setFillColor(effBg.r, effBg.g, effBg.b);
      }
      pdf.setDrawColor(30, 41, 59);
      pdf.setLineWidth(0.24);
      pdf.rect(rect.x, rect.y, rect.w, rect.h, hasFill ? 'FD' : 'S');
    });

    // Pass 2: Cell text (centered headers, middle-left data cells, word-safe fitting)
    cells.forEach((cell) => {
      const rect = toMmRect(cell);
      if (rect.w <= 0.5 || rect.h <= 0.5) return;
      const isTh = cell.tagName === 'TH';
      const cs = win.getComputedStyle(cell);

      // Rotated subject header if ever present
      if (isTh && cell.classList.contains('syn-subj-th')) {
        let label = sanitizePdfText(cell.textContent || '');
        if (!label) return;
        let fontPt = 5.8;
        const maxLen = Math.max(4, rect.h - 2.4);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontPt);
        while (fontPt > 4.4 && pdf.getTextWidth(label) > maxLen) {
          fontPt -= 0.25;
          pdf.setFontSize(fontPt);
        }
        if (pdf.getTextWidth(label) > maxLen) {
          while (label.length > 3 && pdf.getTextWidth(`${label}…`) > maxLen) {
            label = label.slice(0, -1);
          }
          label = `${label}…`;
        }
        pdf.setTextColor(15, 23, 42);
        const cx = rect.x + rect.w / 2 + fontPt * 0.352778 * 0.32;
        const by = rect.y + rect.h - 1.4;
        pdf.text(label, cx, by, { angle: 90 });
        return;
      }

      if (isTh) {
        const padX = isSynoptique ? 0.5 : isFicheNotes ? 0.65 : isCompact ? 1.2 : 1.9;
        const padY = isSynoptique || isFicheNotes ? 0.5 : 0.8;
        const availW = Math.max(1.5, rect.w - padX * 2);
        const availH = Math.max(2, rect.h - padY * 2);
        const basePt = Math.max(5.5, Math.min(9.5, (parseFloat(cs.fontSize) || 10.4) * 0.75));

        const rawHtml = cell.innerHTML;
        let logicalLines: Array<{ text: string; style: 'normal' | 'bold'; fontPt: number }> = [];
        if (/<br\s*\/?>/i.test(rawHtml)) {
          const parts = rawHtml.split(/<br\s*\/?>/i);
          logicalLines = parts
            .map((part, i) => {
              const tmp = win.document.createElement('div');
              tmp.innerHTML = part;
              const txt = sanitizePdfText(tmp.textContent || '');
              return txt
                ? {
                    text: txt.toUpperCase(),
                    style: (i === 0 ? 'bold' : 'normal') as 'bold' | 'normal',
                    fontPt: i === 0 ? basePt : Math.max(5.5, basePt * 0.88),
                  }
                : null;
            })
            .filter(Boolean) as Array<{ text: string; style: 'normal' | 'bold'; fontPt: number }>;
        } else {
          const txt = sanitizePdfText(cell.textContent || '').toUpperCase();
          if (txt) {
            logicalLines = [{ text: txt, style: 'bold', fontPt: basePt }];
          }
        }
        if (!logicalLines.length) return;

        const minPt = isSynoptique ? 4.0 : isFicheNotes ? 4.6 : 5.6;
        const fitted = fitLinesAndFont(pdf, logicalLines, availW, availH, minPt);
        const lineSteps = fitted.lines.map((l) => l.fontPt * 0.352778 * 1.22);
        const firstFontMm = fitted.lines[0].fontPt * 0.352778;
        const totalBlockH =
          fitted.lines.length === 1
            ? firstFontMm * 0.72
            : lineSteps.slice(0, -1).reduce((a, b) => a + b, 0) +
              fitted.lines[fitted.lines.length - 1].fontPt * 0.352778 * 0.72;

        let curBaselineY = rect.y + (rect.h - totalBlockH) / 2 + firstFontMm * 0.7;
        const thColor = parseRgb(cs.color);

        fitted.lines.forEach((line, idx) => {
          pdf.setFont('helvetica', line.style);
          pdf.setFontSize(line.fontPt);
          pdf.setTextColor(thColor.r, thColor.g, thColor.b);
          pdf.text(line.text, rect.x + rect.w / 2, curBaselineY, { align: 'center' });
          curBaselineY += lineSteps[idx];
        });
      } else {
        // Data cell (<td>): vertically centered, horizontally left-aligned
        const txt = sanitizePdfText(cell.textContent || '');
        if (!txt) return;

        const padX = isSynoptique ? 0.65 : isFicheNotes ? 0.8 : isCompact ? 1.45 : 2.1;
        const padY = isSynoptique || isFicheNotes ? 0.45 : 0.8;
        const availW = Math.max(1.5, rect.w - padX * 2);
        const availH = Math.max(2, rect.h - padY * 2);

        const styledChild = cell.querySelector('span, b, strong');
        const styleSource = styledChild ? win.getComputedStyle(styledChild) : cs;
        const tdColor = parseRgb(styleSource.color);
        const tdStyle = getFontStyle(styleSource);
        const basePt = Math.max(5.5, Math.min(9.5, (parseFloat(styleSource.fontSize) || 11) * 0.75));

        const fitted = fitLinesAndFont(
          pdf,
          [{ text: txt, style: tdStyle, fontPt: basePt }],
          availW,
          availH,
          isSynoptique || isFicheNotes ? 4.6 : 5.4
        );
        const lineSteps = fitted.lines.map((l) => l.fontPt * 0.352778 * 1.24);
        const firstFontMm = fitted.lines[0].fontPt * 0.352778;
        const totalBlockH =
          fitted.lines.length === 1
            ? firstFontMm * 0.72
            : lineSteps.slice(0, -1).reduce((a, b) => a + b, 0) +
              fitted.lines[fitted.lines.length - 1].fontPt * 0.352778 * 0.72;

        let curBaselineY = rect.y + (rect.h - totalBlockH) / 2 + firstFontMm * 0.7;

        fitted.lines.forEach((line, idx) => {
          pdf.setFont('helvetica', line.style);
          pdf.setFontSize(line.fontPt);
          pdf.setTextColor(tdColor.r, tdColor.g, tdColor.b);
          pdf.text(line.text, rect.x + padX, curBaselineY);
          curBaselineY += lineSteps[idx];
        });
      }
    });
  });

  // 8. Official Signature Block (.report-signature-box)
  const sigBox = pageEl.querySelector('.report-signature-box');
  if (sigBox) {
    const sRect = toMmRect(sigBox);
    const centerX = sRect.x + sRect.w / 2;
    const children = Array.from(sigBox.children);
    for (const child of children) {
      const cr = toMmRect(child);
      if (child.classList.contains('report-sig-img')) {
        const img = child.querySelector('img');
        const src = img?.getAttribute('src');
        if (img && src && src.startsWith('data:image/')) {
          const dims = await loadImageDimensions(src);
          const ir = toMmRect(img);
          const maxW = Math.max(4, ir.w || cr.w);
          const maxH = Math.max(4, ir.h || cr.h);
          let drawW = maxW;
          let drawH = maxH;
          if (dims) {
            const scale = Math.min(maxW / dims.w, maxH / dims.h);
            drawW = dims.w * scale;
            drawH = dims.h * scale;
          }
          const fmt = src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          pdf.addImage(src, fmt, centerX - drawW / 2, cr.y + (cr.h - drawH) / 2, drawW, drawH);
        }
      } else {
        const text = sanitizePdfText(child.textContent || '');
        if (!text) continue;
        const ccs = win.getComputedStyle(child);
        const fontPt = (parseFloat(ccs.fontSize) || 11) * 0.75;
        pdf.setFont('helvetica', getFontStyle(ccs));
        pdf.setFontSize(fontPt);
        pdf.setTextColor(0, 0, 0);
        pdf.text(text, centerX, cr.y + cr.h * 0.74, { align: 'center' });
      }
    }
  }
}

export interface ExportPdfOptions {
  html: string;
  filename: string;
  orientationMode?: PageOrientationMode;
  afterInsert?: (root: HTMLElement) => void;
}

export async function exportHtmlToPdf({
  html,
  filename,
  orientationMode = 'auto',
  afterInsert,
}: ExportPdfOptions): Promise<{ pageCount: number; orientations: PageOrientation[] }> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '0';
  iframe.style.width = '1400px';
  iframe.style.height = '1400px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${OFFICIAL_PRINT_CSS}</style></head><body>${html}<div id="__mm_probe" style="position:absolute;width:100mm;height:100mm;visibility:hidden;pointer-events:none"></div></body></html>`;

  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = srcdoc;
    });

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      throw new Error("Impossible d'initialiser le moteur PDF.");
    }

    await inlineExternalImages(doc);
    if (afterInsert) {
      afterInsert(doc.body);
    }
    if (doc.fonts?.ready) {
      await doc.fonts.ready;
    }
    await waitForImages(doc);
    fitDocumentDataFonts(doc.body);

    const probe = doc.getElementById('__mm_probe');
    const pxPerMm = probe ? probe.getBoundingClientRect().width / 100 : 96 / 25.4;

    if (orientationMode !== 'auto') {
      doc.querySelectorAll<HTMLElement>('.pdf-report-page').forEach((rp) => {
        rp.dataset.orientation = orientationMode;
      });
    }

    paginateReportPages(doc, pxPerMm);
    fitDocumentDataFonts(doc.body);

    let pageElements = Array.from(doc.querySelectorAll<HTMLElement>(PAGE_SELECTOR));
    if (pageElements.length === 0) {
      const wrapper = doc.createElement('section');
      wrapper.className = 'pdf-report-page';
      wrapper.dataset.orientation = orientationMode === 'landscape' ? 'landscape' : 'portrait';
      while (doc.body.firstChild && doc.body.firstChild !== probe) {
        wrapper.appendChild(doc.body.firstChild);
      }
      doc.body.insertBefore(wrapper, probe);
      pageElements = [wrapper];
    }

    let pdf: jsPDF | null = null;
    const orientations: PageOrientation[] = [];

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i];
      const natural = getNaturalOrientation(el);
      const target = orientationMode === 'auto' ? natural : orientationMode;
      orientations.push(target);

      const pageW = target === 'landscape' ? 297 : 210;
      const pageH = target === 'landscape' ? 210 : 297;

      if (!pdf) {
        pdf = new jsPDF({
          orientation: target,
          unit: 'mm',
          format: [pageW, pageH],
          compress: true,
        });
      } else {
        pdf.addPage([pageW, pageH], target);
      }

      if (el.classList.contains('pdf-report-page')) {
        await renderReportPageToVectorPdf(el, pdf, pxPerMm, win);
        continue;
      }

      let canvas: HTMLCanvasElement;
      if (el.classList.contains('cartes-feuille')) {
        canvas = await renderCardsSheetToCanvas(el);
      } else {
        canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          width: el.offsetWidth,
          height: el.offsetHeight,
        });
      }

      // Automatic 90° rotation when fixed-orientation page is forced to opposite orientation
      if (natural !== target) {
        canvas = rotateCanvas90CW(canvas);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.94);
      const imgAspect = canvas.width / Math.max(1, canvas.height);
      const pageAspect = pageW / pageH;

      let drawW = pageW;
      let drawH = pageW / imgAspect;
      if (drawH > pageH) {
        drawH = pageH;
        drawW = pageH * imgAspect;
      }
      if (Math.abs(imgAspect - pageAspect) < 0.03) {
        drawW = pageW;
        drawH = pageH;
      }
      const offsetX = Math.max(0, (pageW - drawW) / 2);
      const offsetY = Math.max(0, (pageH - drawH) / 2);

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH, undefined, 'FAST');
    }

    if (!pdf) {
      throw new Error('Aucune page à exporter.');
    }

    pdf.save(safeFilename);
    return { pageCount: pageElements.length, orientations };
  } finally {
    iframe.remove();
  }
}
