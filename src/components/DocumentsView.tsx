import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Search, Settings, Layers, AlertTriangle, FileDown } from 'lucide-react';
import type { Candidate, DocConfig, DocumentKind, PageOrientationMode } from '../types/cep';
import { getMissingDocFields, sansAccent, versCandidatDocument } from '../utils/cepRules';
import {
  buildDocumentHTML,
  buildDossierCompletHTML,
  DOCS_META,
} from '../utils/documentBuilders';
import { fitDocumentDataFonts } from '../utils/documentFit';
import { OrientationSelect } from './OrientationSelect';

interface DocumentsViewProps {
  candidates: Candidate[];
  classeParam: string;
  config: DocConfig;
  initialCandidateId: string | null;
  onOpenSettings: () => void;
  onTriggerPrint: (html: string) => void;
  onExportPdf: (opts: {
    html: string;
    filename: string;
    orientationMode?: PageOrientationMode;
  }) => Promise<void> | void;
}

const MM_TO_PX = 3.7795;

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  candidates,
  classeParam,
  config,
  initialCandidateId,
  onOpenSettings,
  onTriggerPrint,
  onExportPdf,
}) => {
  const [search, setSearch] = useState('');
  const [optionFilter, setOptionFilter] = useState<'tous' | 'EG' | 'EFTP'>('tous');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCandidateId || candidates[0]?.matricule || null
  );
  const [docType, setDocType] = useState<DocumentKind>('fiche');
  const [orientationMode, setOrientationMode] = useState<PageOrientationMode>('auto');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);

  useEffect(() => {
    if (initialCandidateId && candidates.some((c) => c.matricule === initialCandidateId)) {
      setSelectedId(initialCandidateId);
    }
  }, [initialCandidateId, candidates]);

  const docModels = useMemo(
    () => candidates.map((c) => versCandidatDocument(c, classeParam)),
    [candidates, classeParam]
  );

  useEffect(() => {
    if (!docModels.some((m) => m.id === selectedId)) {
      setSelectedId(docModels[0]?.id || null);
    }
    setCheckedIds((prev) => new Set([...prev].filter((id) => docModels.some((m) => m.id === id))));
  }, [docModels, selectedId]);

  const visibleModels = useMemo(() => {
    const q = sansAccent(search.trim());
    return docModels.filter((c) => {
      if (optionFilter !== 'tous' && c.option !== optionFilter) return false;
      if (!q) return true;
      return sansAccent(`${c.nom} ${c.prenom} ${c.matricule}`).includes(q);
    });
  }, [docModels, optionFilter, search]);

  const activeModel = useMemo(
    () => docModels.find((c) => c.id === selectedId) || null,
    [docModels, selectedId]
  );

  const meta = DOCS_META[docType];

  useEffect(() => {
    const updateScale = () => {
      const container = previewContainerRef.current;
      if (!container) return;
      const avail = container.clientWidth - 24;
      if (avail <= 0) return;
      const docWidthPx = meta.w * MM_TO_PX;
      setScale(Math.min(1, avail / docWidthPx));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (previewContainerRef.current) ro.observe(previewContainerRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [meta.w]);

  const missing = useMemo(() => {
    if (!activeModel) return [];
    return getMissingDocFields(docType, activeModel);
  }, [activeModel, docType]);

  const previewHTML = useMemo(() => {
    if (!activeModel) return '';
    return buildDocumentHTML(docType, activeModel, config);
  }, [activeModel, docType, config]);

  useEffect(() => {
    const el = previewContentRef.current;
    if (!el || !previewHTML) return;
    fitDocumentDataFonts(el);
    const rafId = requestAnimationFrame(() => fitDocumentDataFonts(el));
    return () => cancelAnimationFrame(rafId);
  }, [previewHTML, docType, activeModel?.id]);

  const allVisibleChecked =
    visibleModels.length > 0 && visibleModels.every((c) => checkedIds.has(c.id));

  const toggleAllVisible = (checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      visibleModels.forEach((c) => (checked ? next.add(c.id) : next.delete(c.id)));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handlePrintOne = () => {
    if (!activeModel) return;
    onTriggerPrint(buildDocumentHTML(docType, activeModel, config));
  };

  const handlePrintBatch = () => {
    const list = docModels.filter((c) => checkedIds.has(c.id));
    if (!list.length) return;
    onTriggerPrint(list.map((c) => buildDocumentHTML(docType, c, config)).join(''));
  };

  const handlePrintDossiers = () => {
    const ids = checkedIds.size ? [...checkedIds] : activeModel ? [activeModel.id] : [];
    const list = docModels.filter((c) => ids.includes(c.id));
    if (!list.length) return;
    onTriggerPrint(list.map((c) => buildDossierCompletHTML(c, config)).join(''));
  };

  const handleExportPdf = () => {
    if (!activeModel) return;
    const safeName = `${docType}_${activeModel.nom}_${activeModel.matricule || 'candidat'}`
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .toLowerCase();
    onExportPdf({
      html: buildDocumentHTML(docType, activeModel, config),
      filename: `${safeName}.pdf`,
      orientationMode,
    });
  };

  const handlePdfBatch = () => {
    const list = docModels.filter((c) => checkedIds.has(c.id));
    if (!list.length) return;
    onExportPdf({
      html: list.map((c) => buildDocumentHTML(docType, c, config)).join(''),
      filename: `${docType}_selection_${list.length}.pdf`,
      orientationMode,
    });
  };

  const handlePdfDossiers = () => {
    const ids = checkedIds.size ? [...checkedIds] : activeModel ? [activeModel.id] : [];
    const list = docModels.filter((c) => ids.includes(c.id));
    if (!list.length) return;
    const label = list.length === 1 ? `${list[0].nom}_${list[0].matricule}` : `${list.length}_candidats`;
    onExportPdf({
      html: list.map((c) => buildDossierCompletHTML(c, config)).join(''),
      filename: `dossier_complet_${label.replace(/[^a-zA-Z0-9_-]+/g, '_').toLowerCase()}.pdf`,
      orientationMode,
    });
  };

  const previewHeightPx = meta.h * MM_TO_PX * scale + 24;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Documents officiels
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sélectionnez un candidat, vérifiez les champs requis, puis imprimez à l&apos;échelle A4 exacte.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap self-start sm:self-auto"
        >
          <Settings className="h-3.5 w-3.5" />
          Informations de l&apos;école
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr] items-start">
        {/* Left: Candidate Picker */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              01. Candidat
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {checkedIds.size ? `${checkedIds.size} coché(s)` : `${docModels.length} au total`}
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher un candidat pour document"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-8 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1" role="group">
            {(['tous', 'EG', 'EFTP'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOptionFilter(opt)}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${
                  optionFilter === opt
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt === 'tous' ? 'Tous' : opt}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer px-1">
            <input
              type="checkbox"
              checked={allVisibleChecked}
              onChange={(e) => toggleAllVisible(e.target.checked)}
              className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span>Cocher toute la liste affichée</span>
          </label>

          <ul className="max-h-[460px] divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {visibleModels.length === 0 ? (
              <li className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Aucun candidat disponible.
              </li>
            ) : (
              visibleModels.map((c) => {
                const isActive = c.id === selectedId;
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-2 px-2.5 py-2 transition-colors ${
                      isActive
                        ? 'bg-blue-50/80 dark:bg-blue-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedIds.has(c.id)}
                      onChange={(e) => toggleOne(c.id, e.target.checked)}
                      aria-label={`Sélectionner ${c.nom} ${c.prenom}`}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div
                        className={`truncate text-sm ${
                          c.sexe === 'F'
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {c.nom} {c.prenom}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                        {c.matricule || 'Sans matricule'} · {c.option}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {/* Right: Document Type & Preview */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              02. Modèle de document
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(Object.entries(DOCS_META) as [DocumentKind, (typeof DOCS_META)[DocumentKind]][]).map(
                ([key, info]) => {
                  const active = key === docType;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDocType(key)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {info.titre}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {info.sous}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {activeModel && (
            <div className="space-y-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-slate-700 dark:text-slate-300">
                  <span
                    className={
                      activeModel.sexe === 'F'
                        ? 'font-bold text-[#8b0000] dark:text-red-400'
                        : 'font-normal text-slate-900 dark:text-slate-100'
                    }
                  >
                    {activeModel.nom} {activeModel.prenom}
                  </span>
                  {' · '}option {activeModel.option}
                  {docType === 'attestation' && (
                    <>
                      {' · '}
                      <span className={activeModel.libre ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                        {activeModel.libre ? 'Candidat libre' : 'Non libre (non jointe au dossier)'}
                      </span>
                    </>
                  )}
                </div>

                <OrientationSelect
                  value={orientationMode}
                  onChange={setOrientationMode}
                  naturalOrientation={meta.orientation}
                  label="PDF"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Exporter en PDF
                </button>
                <button
                  type="button"
                  disabled={checkedIds.size === 0}
                  onClick={handlePdfBatch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-45 whitespace-nowrap"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF cochés ({checkedIds.size})
                </button>
                <button
                  type="button"
                  onClick={handlePdfDossiers}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 whitespace-nowrap"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Dossiers PDF
                </button>

                <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:inline-block" />

                <button
                  type="button"
                  onClick={handlePrintOne}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer ce candidat
                </button>
                <button
                  type="button"
                  disabled={checkedIds.size === 0}
                  onClick={handlePrintBatch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer cochés ({checkedIds.size})
                </button>
                <button
                  type="button"
                  onClick={handlePrintDossiers}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Dossiers complets
                </button>
              </div>
            </div>
          )}

          {activeModel && missing.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Champs à compléter :</span> {missing.join(', ')}.
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              03. Aperçu temps réel ({meta.w} × {meta.h} mm)
            </h3>
            <div
              ref={previewContainerRef}
              className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-200/80 dark:bg-slate-950"
              style={{ height: activeModel ? `${previewHeightPx}px` : '220px' }}
            >
              {activeModel ? (
                <div
                  ref={previewContentRef}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '12px',
                    width: `${meta.w * MM_TO_PX}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Ajoutez au moins un candidat pour prévisualiser ses documents officiels.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
