import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, FileDown } from 'lucide-react';
import type { Candidate, DocConfig, PageOrientationMode } from '../types/cep';
import { ModCartes, toCardData } from '../utils/documentBuilders';
import { OrientationSelect } from './OrientationSelect';

interface CardsViewProps {
  candidates: Candidate[];
  classeParam: string;
  config: DocConfig;
  onTriggerPrint: (html: string, afterInsert?: (root: HTMLElement) => void) => void;
  onExportPdf: (opts: {
    html: string;
    filename: string;
    orientationMode?: PageOrientationMode;
    afterInsert?: (root: HTMLElement) => void;
  }) => Promise<void> | void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  candidates,
  classeParam,
  config,
  onTriggerPrint,
  onExportPdf,
}) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(candidates[0]?.matricule || null);
  const [orientationMode, setOrientationMode] = useState<PageOrientationMode>('auto');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!candidates.some((c) => c.matricule === activeId)) {
      setActiveId(candidates[0]?.matricule || null);
    }
    setCheckedIds(
      (prev) => new Set([...prev].filter((m) => candidates.some((c) => c.matricule === m)))
    );
  }, [candidates, activeId]);

  const activeCandidate = useMemo(
    () => candidates.find((c) => c.matricule === activeId) || null,
    [candidates, activeId]
  );

  const previewHtmls = useMemo(() => {
    if (!activeCandidate) return null;
    const d = toCardData(activeCandidate, config, classeParam);
    return {
      recto: ModCartes.recto(d),
      verso: ModCartes.verso(d),
    };
  }, [activeCandidate, config, classeParam]);

  useEffect(() => {
    if (previewRef.current) {
      ModCartes.ajuster(previewRef.current);
    }
  }, [previewHtmls]);

  const allChecked =
    candidates.length > 0 && candidates.every((c) => checkedIds.has(c.matricule));
  const targetList = checkedIds.size
    ? candidates.filter((c) => checkedIds.has(c.matricule))
    : candidates;
  const pageCount = Math.ceil(targetList.length / ModCartes.PAR_PAGE);

  const toggleAll = (checked: boolean) => {
    if (checked) setCheckedIds(new Set(candidates.map((c) => c.matricule)));
    else setCheckedIds(new Set());
  };

  const toggleOne = (matricule: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(matricule);
      else next.delete(matricule);
      return next;
    });
  };

  const handlePrint = (mode: 'recto' | 'verso' | 'rv') => {
    if (!targetList.length) return;
    const html = ModCartes.planches(
      targetList.map((c) => toCardData(c, config, classeParam)),
      mode
    );
    onTriggerPrint(html, (root) => ModCartes.ajuster(root));
  };

  const handleExportPdf = (mode: 'recto' | 'verso' | 'rv') => {
    if (!targetList.length) return;
    const html = ModCartes.planches(
      targetList.map((c) => toCardData(c, config, classeParam)),
      mode
    );
    onExportPdf({
      html,
      filename: `cartes_scolaires_${classeParam.toLowerCase()}_${mode}.pdf`,
      orientationMode,
      afterInsert: (root) => ModCartes.ajuster(root),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Cartes d&apos;identité scolaire
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Format 89,7 × 55,8 mm · 10 cartes par page A4 (2 × 5) · Pour le recto-verso, retournez la feuille sur le bord long.
            </p>
          </div>
          <OrientationSelect
            value={orientationMode}
            onChange={setOrientationMode}
            naturalOrientation="portrait"
            label="Orientation PDF"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!targetList.length}
            onClick={() => handleExportPdf('recto')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-45 whitespace-nowrap"
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF Rectos
          </button>
          <button
            type="button"
            disabled={!targetList.length}
            onClick={() => handleExportPdf('verso')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-45 whitespace-nowrap"
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF Versos
          </button>
          <button
            type="button"
            disabled={!targetList.length}
            onClick={() => handleExportPdf('rv')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-45 whitespace-nowrap"
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF Recto + Verso
          </button>

          <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:inline-block" />

          <button
            type="button"
            disabled={!targetList.length}
            onClick={() => handlePrint('recto')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer les rectos
          </button>
          <button
            type="button"
            disabled={!targetList.length}
            onClick={() => handlePrint('verso')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer les versos
          </button>
          <button
            type="button"
            disabled={!targetList.length}
            onClick={() => handlePrint('rv')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            Recto + Verso alternés
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        {checkedIds.size
          ? `${checkedIds.size} candidat(s) coché(s) · ${pageCount} page(s) de cartes`
          : `Aucun coché : les ${candidates.length} candidat(s) seront imprimés · ${pageCount} page(s) de cartes`}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_460px] items-start">
        {/* Candidate selection list */}
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-h-[540px] overflow-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Tout cocher pour cartes scolaires"
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                  </th>
                  <th className="px-3 py-3">Élève</th>
                  <th className="px-3 py-3">Matricule</th>
                  <th className="px-3 py-3">Classe</th>
                  <th className="px-3 py-3 text-center">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      Aucun candidat enregistré.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => {
                    const isActive = c.matricule === activeId;
                    const hasPhoto = Boolean(c.documents?.photo?.contenu);
                    return (
                      <tr
                        key={c.matricule}
                        onClick={() => setActiveId(c.matricule)}
                        className={`cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-blue-50/80 dark:bg-blue-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td
                          className="px-3 py-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checkedIds.has(c.matricule)}
                            onChange={(e) => toggleOne(c.matricule, e.target.checked)}
                            aria-label={`Cocher ${c.nom} ${c.prenoms}`}
                            className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                          />
                        </td>
                        <td
                          className={`px-3 py-2.5 ${
                            c.sexe === 'F'
                              ? 'font-bold text-[#8b0000] dark:text-red-400'
                              : 'font-normal text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {c.nom} {c.prenoms}
                        </td>
                        <td className="px-3 py-2.5 font-mono-tabular text-xs text-slate-600 dark:text-slate-400">
                          {c.matricule}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                          {c.classe || classeParam}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs">
                          {hasPhoto ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              OK
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SVG Preview */}
        <div
          ref={previewRef}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5"
        >
          {previewHtmls ? (
            <>
              <figure>
                <figcaption className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Recto —{' '}
                  <span
                    className={
                      activeCandidate?.sexe === 'F'
                        ? 'font-bold text-[#8b0000] dark:text-red-400'
                        : 'font-normal'
                    }
                  >
                    {activeCandidate?.nom} {activeCandidate?.prenoms}
                  </span>
                </figcaption>
                <div
                  className="[&>svg]:!static [&>svg]:!w-full [&>svg]:!h-auto [&>svg]:max-w-[440px] [&>svg]:shadow-md [&>svg]:rounded-xs"
                  dangerouslySetInnerHTML={{ __html: previewHtmls.recto }}
                />
              </figure>
              <figure>
                <figcaption className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Verso
                </figcaption>
                <div
                  className="[&>svg]:!static [&>svg]:!w-full [&>svg]:!h-auto [&>svg]:max-w-[440px] [&>svg]:bg-white [&>svg]:shadow-md [&>svg]:rounded-xs"
                  dangerouslySetInnerHTML={{ __html: previewHtmls.verso }}
                />
              </figure>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Ajoutez un candidat pour afficher l&apos;aperçu de la carte scolaire.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
