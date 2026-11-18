import React, { useMemo, useState } from 'react';
import { Printer, FileDown } from 'lucide-react';
import type { Candidate, DocConfig, PageOrientationMode } from '../types/cep';
import { calculateAge } from '../utils/cepRules';
import {
  buildEtatNumeriqueRows,
  buildPrintListHTML,
  getNaturalListOrientation,
  ListPrintType,
} from '../utils/documentBuilders';
import { OrientationSelect } from './OrientationSelect';

interface ListsViewProps {
  candidates: Candidate[];
  config: DocConfig;
  onTriggerPrint: (html: string) => void;
  onExportPdf: (opts: {
    html: string;
    filename: string;
    orientationMode?: PageOrientationMode;
  }) => Promise<void> | void;
}

const SUB_TABS: Array<{ id: ListPrintType; label: string; title: string }> = [
  { id: 'all', label: 'Tous', title: 'Liste générale des élèves' },
  { id: 'handicap', label: 'ESH', title: 'Élèves en situation de handicap' },
  { id: 'deplace', label: 'EDF', title: 'Élèves déplacés forcés' },
  { id: 'eov', label: 'EOV', title: 'Élèves orphelins vulnérables' },
  { id: 'pupille', label: 'Pupilles', title: 'Pupilles de la Nation' },
  { id: 'etat', label: 'État numérique', title: 'État numérique récapitulatif' },
];

export const ListsView: React.FC<ListsViewProps> = ({
  candidates,
  config,
  onTriggerPrint,
  onExportPdf,
}) => {
  const [activeSub, setActiveSub] = useState<ListPrintType>('all');
  const [orientationMode, setOrientationMode] = useState<PageOrientationMode>('auto');

  const filteredList = useMemo(() => {
    if (activeSub === 'handicap') return candidates.filter((c) => c.handicap === 'Oui');
    if (activeSub === 'deplace') return candidates.filter((c) => c.deplace === 'Oui');
    if (activeSub === 'eov') return candidates.filter((c) => c.eov === 'Oui');
    if (activeSub === 'pupille') return candidates.filter((c) => c.pupille === 'Oui');
    return candidates;
  }, [candidates, activeSub]);

  const etatData = useMemo(() => buildEtatNumeriqueRows(candidates), [candidates]);
  const currentMeta = SUB_TABS.find((t) => t.id === activeSub)!;
  const naturalOrientation = getNaturalListOrientation(activeSub);

  const handleExportPdf = () => {
    onExportPdf({
      html: buildPrintListHTML(activeSub, candidates, config, orientationMode),
      filename: `liste_${activeSub}.pdf`,
      orientationMode,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Listes officielles &amp; État numérique
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Consultez, exportez en PDF ou imprimez les listes réglementaires avec en-tête et signature.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <OrientationSelect
            value={orientationMode}
            onChange={setOrientationMode}
            naturalOrientation={naturalOrientation}
          />
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <FileDown className="h-4 w-4" />
            Exporter PDF « {currentMeta.label} »
          </button>
          <button
            type="button"
            onClick={() =>
              onTriggerPrint(buildPrintListHTML(activeSub, candidates, config, orientationMode))
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1 w-fit max-w-full">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSub(tab.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeSub === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {currentMeta.title}
          </h3>
          {activeSub !== 'etat' && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {filteredList.length} élève{filteredList.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {activeSub === 'etat' ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <th rowSpan={2} className="px-4 py-2.5 text-center align-middle font-semibold border-r border-slate-200 dark:border-slate-800">
                    Catégorie
                  </th>
                  {etatData.categories.map((cat) => (
                    <th
                      key={cat}
                      colSpan={3}
                      className="px-2 py-2 text-center align-middle font-semibold border-r border-slate-200 dark:border-slate-800"
                    >
                      {cat}
                    </th>
                  ))}
                  <th colSpan={3} className="px-2 py-2 text-center align-middle font-semibold">
                    Total
                  </th>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                  {[...etatData.categories, 'Total'].map((key) => (
                    <React.Fragment key={key}>
                      <th className="px-2 py-1.5 text-center align-middle font-medium">F</th>
                      <th className="px-2 py-1.5 text-center align-middle font-medium">G</th>
                      <th className="px-2 py-1.5 text-center align-middle font-semibold border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        T
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {etatData.rows.map((r) => (
                  <tr
                    key={r.label}
                    className={
                      r.total
                        ? 'bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-900 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-300'
                    }
                  >
                    <td className="px-4 py-2.5 text-left align-middle font-medium border-r border-slate-200 dark:border-slate-800">
                      {r.label}
                    </td>
                    {r.cells.map((cell, idx) => (
                      <React.Fragment key={idx}>
                        <td className="px-2 py-2.5 text-left align-middle">{cell.f}</td>
                        <td className="px-2 py-2.5 text-left align-middle">{cell.g}</td>
                        <td className="px-2 py-2.5 text-left align-middle font-semibold border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                          {cell.t}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 text-center align-middle">Matricule</th>
                  <th className="px-4 py-3 text-center align-middle">N° PV</th>
                  <th className="px-4 py-3 text-center align-middle">Nom</th>
                  <th className="px-4 py-3 text-center align-middle">Prénom(s)</th>
                  <th className="px-4 py-3 text-center align-middle">Sexe</th>
                  <th className="px-4 py-3 text-center align-middle">Âge</th>
                  {activeSub === 'all' && (
                    <>
                      <th className="px-4 py-3 text-center align-middle">ESH</th>
                      <th className="px-4 py-3 text-center align-middle">EDF</th>
                      <th className="px-4 py-3 text-center align-middle">EOV</th>
                      <th className="px-4 py-3 text-center align-middle">Pupille</th>
                    </>
                  )}
                  {activeSub === 'handicap' && <th className="px-4 py-3 text-center align-middle">Nature</th>}
                  {activeSub === 'eov' && <th className="px-4 py-3 text-center align-middle">Vulnérabilité</th>}
                  {activeSub === 'pupille' && <th className="px-4 py-3 text-center align-middle">N° identification</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {filteredList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center align-middle text-sm text-slate-500 dark:text-slate-400"
                    >
                      Aucun élève dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((c) => (
                    <tr key={c.matricule} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-left align-middle font-mono-tabular text-xs font-medium text-slate-800 dark:text-slate-200">
                        {c.matricule}
                      </td>
                      <td className="px-4 py-2.5 text-left align-middle font-mono-tabular text-xs text-slate-600 dark:text-slate-400">
                        {c.pv || '—'}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-left align-middle ${
                          c.sexe === 'F'
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {c.nom}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-left align-middle ${
                          c.sexe === 'F'
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c.prenoms}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-left align-middle ${
                          c.sexe === 'F'
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {c.sexe || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-left align-middle text-slate-600 dark:text-slate-400">
                        {calculateAge(c.dateNaiss) || '—'}
                      </td>
                      {activeSub === 'all' && (
                        <>
                          <td className="px-4 py-2.5 text-left align-middle text-slate-600 dark:text-slate-400">
                            {c.handicap || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-left align-middle text-slate-600 dark:text-slate-400">
                            {c.deplace || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-left align-middle text-slate-600 dark:text-slate-400">
                            {c.eov || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-left align-middle text-slate-600 dark:text-slate-400">
                            {c.pupille || '—'}
                          </td>
                        </>
                      )}
                      {activeSub === 'handicap' && (
                        <td className="px-4 py-2.5 text-left align-middle text-slate-700 dark:text-slate-300">
                          {c.natureHandicap || '—'}
                        </td>
                      )}
                      {activeSub === 'eov' && (
                        <td className="px-4 py-2.5 text-left align-middle text-slate-700 dark:text-slate-300">
                          {c.vulnerabilite || '—'}
                        </td>
                      )}
                      {activeSub === 'pupille' && (
                        <td className="px-4 py-2.5 text-left align-middle font-mono-tabular text-xs text-slate-700 dark:text-slate-300">
                          {c.numeroIdentification || '—'}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
