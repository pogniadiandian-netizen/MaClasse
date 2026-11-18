import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, Wand2 } from 'lucide-react';
import type { Candidate } from '../types/cep';
import { generateBatchPVs } from '../utils/cepRules';

interface PVManagerViewProps {
  candidates: Candidate[];
  session: string;
  onSaveCandidates: (next: Candidate[]) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PVManagerView: React.FC<PVManagerViewProps> = ({
  candidates,
  session,
  onSaveCandidates,
  onToast,
}) => {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [prefix, setPrefix] = useState(`${session || '2027'}-`);
  const [startNum, setStartNum] = useState(1);
  const [padDigits, setPadDigits] = useState(3);

  useEffect(() => {
    const initial: Record<number, string> = {};
    candidates.forEach((c, idx) => {
      initial[idx] = c.pv || '';
    });
    setDrafts(initial);
  }, [candidates]);

  const handleGenerateBatch = () => {
    if (!candidates.length) {
      onToast('Aucun candidat dans la liste', 'error');
      return;
    }
    const generated = generateBatchPVs(candidates.length, prefix, startNum, padDigits);
    const nextDrafts: Record<number, string> = {};
    generated.forEach((val, idx) => {
      nextDrafts[idx] = val;
    });
    setDrafts(nextDrafts);
    onToast('N° PV générés en aperçu — cliquez sur Enregistrer pour valider', 'info');
  };

  const handleReset = () => {
    const reset: Record<number, string> = {};
    candidates.forEach((c, idx) => {
      reset[idx] = c.pv || '';
    });
    setDrafts(reset);
  };

  const handleSave = () => {
    if (!candidates.length) {
      onToast('Aucun candidat', 'error');
      return;
    }

    const finalValues = candidates.map((c, idx) => (drafts[idx] ?? c.pv ?? '').trim());

    const seen = new Map<string, number>();
    for (let i = 0; i < finalValues.length; i++) {
      if (!finalValues[i]) continue;
      const key = finalValues[i].toLowerCase();
      if (seen.has(key)) {
        onToast(
          `Doublon détecté : « ${finalValues[i]} » aux lignes ${seen.get(key)! + 1} et ${i + 1}`,
          'error'
        );
        return;
      }
      seen.set(key, i);
    }

    let modified = 0;
    const next = candidates.map((c, i) => {
      const v = finalValues[i];
      if ((c.pv || '') !== v) {
        modified++;
        return { ...c, pv: v };
      }
      return c;
    });

    onSaveCandidates(next);
    onToast(
      modified ? `${modified} N° PV enregistré(s)` : 'Aucun changement détecté',
      modified ? 'success' : 'info'
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Attribution des N° PV
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Le N° PV est distinct du matricule et reste vide tant qu&apos;il n&apos;est pas saisi ou généré.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!candidates.length}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-45 whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            Enregistrer
          </button>
        </div>
      </div>

      {/* Batch Generator */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="pv-prefix" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Préfixe
            </label>
            <input
              id="pv-prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="2027-"
              className="w-36 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="pv-start" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Numéro de départ
            </label>
            <input
              id="pv-start"
              type="number"
              min={1}
              value={startNum}
              onChange={(e) => setStartNum(Math.max(1, Number(e.target.value) || 1))}
              className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="pv-pad" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Chiffres (zéros)
            </label>
            <input
              id="pv-pad"
              type="number"
              min={1}
              max={6}
              value={padDigits}
              onChange={(e) => setPadDigits(Math.max(1, Math.min(6, Number(e.target.value) || 3)))}
              className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateBatch}
            disabled={!candidates.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-45 whitespace-nowrap"
          >
            <Wand2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Générer les N° PV
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            Exemple : {generateBatchPVs(1, prefix, startNum, padDigits)[0]}
          </span>
        </div>
      </div>

      {/* Inline Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
              <tr>
                <th className="w-16 px-4 py-3">N°</th>
                <th className="w-36 px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Prénom(s)</th>
                <th className="w-20 px-4 py-3">Sexe</th>
                <th className="w-56 px-4 py-3">N° PV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Aucun candidat enregistré.
                  </td>
                </tr>
              ) : (
                candidates.map((c, idx) => {
                  const isGirl = c.sexe === 'F';
                  return (
                    <tr key={`${c.matricule}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5 font-mono-tabular text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {c.matricule}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          isGirl
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {c.nom}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          isGirl
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c.prenoms}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          isGirl
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {c.sexe || '—'}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          maxLength={30}
                          placeholder="À saisir..."
                          aria-label={`N° PV pour ${c.nom} ${c.prenoms}`}
                          value={drafts[idx] ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm font-mono-tabular text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
