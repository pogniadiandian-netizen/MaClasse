import React, { useMemo } from 'react';
import {
  UserPlus,
  FileText,
  CreditCard,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import type {
  Candidate,
  ClassesMatieres,
  DocConfig,
  EvaluationsStore,
  NavTab,
} from '../types/cep';
import {
  computeDashboardKeyIndicators,
  computeEvaluationRows,
  computeEvaluationStats,
  getCandidateCompleteness,
  isLibreFlag,
} from '../utils/cepRules';

interface DashboardViewProps {
  candidates: Candidate[];
  classeParam: string;
  config: DocConfig;
  classesMatieres: ClassesMatieres;
  evaluations: EvaluationsStore;
  onNavigate: (tab: NavTab) => void;
  onNewCandidate: () => void;
  onLoadDemo: () => void;
}

const OPTION_BAR_COLORS: Record<string, string> = {
  'CEP Seul': '#64748b',
  'CEP + EG': '#2563eb',
  'CEP + ET': '#d97706',
  'EG Seul': '#0ea5e9',
  'ET Seul': '#f59e0b',
  'Non définie': '#94a3b8',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  candidates,
  classeParam,
  config,
  classesMatieres,
  evaluations,
  onNavigate,
  onNewCandidate,
  onLoadDemo,
}) => {
  const stats = useMemo(() => {
    const total = candidates.length;
    const filles = candidates.filter((c) => c.sexe === 'F').length;
    const garcons = candidates.filter((c) => c.sexe === 'M').length;
    const pupilles = candidates.filter((c) => c.pupille === 'Oui').length;
    const esh = candidates.filter((c) => c.handicap === 'Oui').length;
    const edf = candidates.filter((c) => c.deplace === 'Oui').length;
    const eov = candidates.filter((c) => c.eov === 'Oui').length;
    const eg = candidates.filter((c) => c.option6e === 'EG').length;
    const et = candidates.filter((c) => c.option6e === 'ET').length;
    const libres = candidates.filter((c) => isLibreFlag(c.libre)).length;
    const avecPhoto = candidates.filter((c) => Boolean(c.documents?.photo?.fourni)).length;
    const avecPV = candidates.filter((c) => Boolean(c.pv && c.pv.trim())).length;

    const avgCompleteness = total
      ? Math.round(
          candidates.reduce((sum, c) => sum + getCandidateCompleteness(c).pct, 0) / total
        )
      : 0;

    return {
      total,
      filles,
      garcons,
      pupilles,
      esh,
      edf,
      eov,
      eg,
      et,
      libres,
      avecPhoto,
      avecPV,
      avgCompleteness,
    };
  }, [candidates]);

  const keyIndicators = useMemo(
    () => computeDashboardKeyIndicators(candidates, evaluations, classeParam, 5),
    [candidates, evaluations, classeParam]
  );

  const latestEvalSummary = useMemo(() => {
    const allRecords = [
      ...Object.entries(evaluations.trimestrielles).map(([k, r]) => ({
        kind: 'Trimestre',
        label: r.trimestre || k,
        record: r,
      })),
      ...Object.entries(evaluations.examens).map(([k, r]) => ({
        kind: 'Examen blanc',
        label: `${r.niveau || ''} · ${r.date || k}`,
        record: r,
      })),
    ];
    if (!allRecords.length) return null;

    const sorted = allRecords.sort((a, b) =>
      String(b.record.savedAt || '').localeCompare(String(a.record.savedAt || ''))
    );
    const latest = sorted[0];
    const targetClasse = (latest.record.classe || classeParam).trim().toUpperCase();
    const students = candidates
      .filter((c) => (c.classe || '').trim().toUpperCase() === targetClasse)
      .map((c) => ({
        key: c.matricule || `anon-${c.nom}-${c.prenoms}`,
        label: `${c.nom} ${c.prenoms}`.trim(),
      }));

    if (!students.length || !latest.record.matieres.length) return null;
    const rows = computeEvaluationRows(students, latest.record.matieres, latest.record.notes);
    const evStats = computeEvaluationStats(rows, 5);
    return {
      kind: latest.kind,
      label: latest.label,
      classe: latest.record.classe,
      ...evStats,
    };
  }, [evaluations, candidates, classeParam]);

  const subjectsCount = (classesMatieres[classeParam] || []).length;
  const pctFilles = stats.total ? Math.round((stats.filles / stats.total) * 100) : 0;
  const pctGarcons = stats.total ? 100 - pctFilles : 0;

  return (
    <div className="space-y-6">
      {/* Hero / Contextual header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {config.circonscription} · École {config.ecole} ({config.ecoleType}) · Session {config.session}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            Tableau de bord de la classe {classeParam}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {stats.total === 0 && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Charger données d&apos;exemple
            </button>
          )}
          <button
            type="button"
            onClick={onNewCandidate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            Nouveau candidat
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Candidats inscrits
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {stats.filles} F · {stats.garcons} G
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Complétude des dossiers
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {stats.avgCompleteness}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {stats.avecPhoto}/{stats.total} photos
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-700 dark:bg-blue-500 transition-all"
              style={{ width: `${stats.avgCompleteness}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Options 6ème &amp; Candidats libres
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {stats.eg + stats.et}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {stats.eg} EG · {stats.et} ET · {stats.libres} libres
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Matières configurées ({classeParam})
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {subjectsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {stats.avecPV}/{stats.total} N° PV
            </span>
          </div>
        </div>
      </div>

      {/* Indicateurs clés (graphiques simples) */}
      <section aria-labelledby="indicateurs-cles-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <h3
              id="indicateurs-cles-heading"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Indicateurs clés
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Réussite par matière, effectifs par option et répartition par sexe
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 1. Taux de réussite par matière */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Taux de réussite par matière
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {keyIndicators.latestEval
                    ? `${keyIndicators.latestEval.kind} · ${keyIndicators.latestEval.label} (note ≥ 5/10)`
                    : 'Seuil de réussite : 5/10'}
                </p>
              </div>
              {keyIndicators.latestEval?.hasNotes && (
                <button
                  type="button"
                  onClick={() => onNavigate('evaluations')}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline shrink-0"
                >
                  Détails
                </button>
              )}
            </div>

            {keyIndicators.latestEval?.hasNotes ? (
              <div
                className="mt-4 max-h-56 overflow-y-auto pr-1 pb-1 space-y-2"
                role="img"
                aria-label="Graphique des taux de réussite par matière"
              >
                {keyIndicators.subjectSuccessRates
                  .filter((s) => s.totalNotes > 0)
                  .map((subj) => {
                    const barColor =
                      subj.tauxReussite >= 75
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : subj.tauxReussite >= 50
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : subj.tauxReussite >= 35
                            ? 'bg-amber-500 dark:bg-amber-400'
                            : 'bg-red-500 dark:bg-red-400';
                    return (
                      <div key={subj.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span
                            className="font-medium text-slate-700 dark:text-slate-200 truncate"
                            title={subj.nom}
                          >
                            {subj.nom}
                          </span>
                          <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {subj.tauxReussite.toFixed(0)}%
                            <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                              ({subj.passedCount}/{subj.totalNotes})
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, subj.tauxReussite))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="mt-4 flex-1 flex flex-col items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aucune note d&apos;évaluation saisie pour calculer le taux de réussite par matière.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('evaluations')}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <GraduationCap className="h-4 w-4" />
                  Saisir des notes
                </button>
              </div>
            )}
          </div>

          {/* 2. Nombre total de candidats par option (graphique en colonnes) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Candidats par option
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Effectifs inscrits par catégorie d&apos;entrée
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                Total : {stats.total}
              </span>
            </div>

            {(() => {
              const items = keyIndicators.optionCounts;
              const maxCount = Math.max(1, ...items.map((o) => o.count));
              const svgW = 320;
              const topPad = 20;
              const chartH = 92;
              const baseLine = topPad + chartH;
              const colW = svgW / Math.max(1, items.length);
              const barW = Math.min(34, colW * 0.54);

              return (
                <div className="mt-3 flex-1 flex flex-col justify-between">
                  <svg
                    viewBox={`0 0 ${svgW} 142`}
                    className="w-full h-36"
                    role="img"
                    aria-label="Graphique en barres du nombre de candidats par option"
                  >
                    {[0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = baseLine - chartH * ratio;
                      return (
                        <line
                          key={ratio}
                          x1={8}
                          x2={svgW - 8}
                          y1={y}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-100 dark:text-slate-800"
                          strokeDasharray="3 3"
                          strokeWidth={1}
                        />
                      );
                    })}
                    <line
                      x1={8}
                      x2={svgW - 8}
                      y1={baseLine}
                      y2={baseLine}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-700"
                      strokeWidth={1}
                    />
                    {items.map((item, idx) => {
                      const cx = colW * idx + colW / 2;
                      const barH = item.count > 0 ? Math.max(6, (item.count / maxCount) * chartH) : 2;
                      const y = baseLine - barH;
                      const fill = item.count > 0 ? OPTION_BAR_COLORS[item.key] || '#2563eb' : '#cbd5e1';
                      return (
                        <g key={item.key}>
                          <text
                            x={cx}
                            y={Math.max(12, y - 5)}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            fill="currentColor"
                            className="text-slate-800 dark:text-slate-100"
                          >
                            {item.count}
                          </text>
                          <rect
                            x={cx - barW / 2}
                            y={y}
                            width={barW}
                            height={barH}
                            rx={4}
                            fill={fill}
                            opacity={item.count > 0 ? 1 : 0.45}
                          />
                          <text
                            x={cx}
                            y={baseLine + 16}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="500"
                            fill="currentColor"
                            className="text-slate-600 dark:text-slate-400"
                          >
                            {item.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    <span>EG : <strong className="text-slate-900 dark:text-slate-100">{keyIndicators.optionTotals.eg}</strong></span>
                    <span>ET : <strong className="text-slate-900 dark:text-slate-100">{keyIndicators.optionTotals.et}</strong></span>
                    <span>CEP Seul : <strong className="text-slate-900 dark:text-slate-100">{keyIndicators.optionTotals.cepSeul}</strong></span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 3. Répartition par sexe (graphique circulaire) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Répartition par sexe
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Parité filles / garçons des candidats
              </p>
            </div>

            {(() => {
              const { total, filles, garcons, nonRenseigne, pctFilles, pctGarcons, pctNonRenseigne } =
                keyIndicators.gender;
              const radius = 42;
              const circumference = 2 * Math.PI * radius;
              const lenF = total > 0 ? (filles / total) * circumference : 0;
              const lenG = total > 0 ? (garcons / total) * circumference : 0;
              const lenNR = total > 0 ? (nonRenseigne / total) * circumference : 0;

              return (
                <div className="mt-4 flex-1 flex items-center gap-5">
                  <svg
                    viewBox="0 0 116 116"
                    className="h-28 w-28 shrink-0"
                    role="img"
                    aria-label={`Répartition par sexe : ${filles} filles (${pctFilles}%), ${garcons} garçons (${pctGarcons}%)`}
                  >
                    <circle
                      cx={58}
                      cy={58}
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth={16}
                    />
                    {total > 0 && (
                      <g transform="rotate(-90 58 58)">
                        {filles > 0 && (
                          <circle
                            cx={58}
                            cy={58}
                            r={radius}
                            fill="none"
                            stroke="#e11d48"
                            strokeWidth={16}
                            strokeDasharray={`${lenF} ${circumference}`}
                            strokeDashoffset={0}
                          />
                        )}
                        {garcons > 0 && (
                          <circle
                            cx={58}
                            cy={58}
                            r={radius}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth={16}
                            strokeDasharray={`${lenG} ${circumference}`}
                            strokeDashoffset={-lenF}
                          />
                        )}
                        {nonRenseigne > 0 && (
                          <circle
                            cx={58}
                            cy={58}
                            r={radius}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth={16}
                            strokeDasharray={`${lenNR} ${circumference}`}
                            strokeDashoffset={-(lenF + lenG)}
                          />
                        )}
                      </g>
                    )}
                    <text
                      x={58}
                      y={56}
                      textAnchor="middle"
                      fontSize="18"
                      fontWeight="700"
                      fill="currentColor"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      {total}
                    </text>
                    <text
                      x={58}
                      y={70}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="currentColor"
                      className="text-slate-500 dark:text-slate-400"
                    >
                      {total <= 1 ? 'élève' : 'élèves'}
                    </text>
                  </svg>

                  <div className="flex-1 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0" />
                        Filles
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {filles}{' '}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          ({pctFilles}%)
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
                        Garçons
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {garcons}{' '}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          ({pctGarcons}%)
                        </span>
                      </span>
                    </div>

                    {nonRenseigne > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                          Non précisé
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {nonRenseigne}{' '}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            ({pctNonRenseigne}%)
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Empty CTA or Analytical Panels */}
      {stats.total === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Aucun candidat enregistré pour cette session
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Commencez par saisir un premier candidat, importez votre liste depuis un fichier Excel/CSV, ou chargez un jeu de démonstration pour explorer les documents et évaluations.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onNewCandidate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              <UserPlus className="h-4 w-4" />
              Saisir le premier candidat
            </button>
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Charger 6 candidats d&apos;exemple
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Gender & Category Breakdown */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Répartition par genre &amp; profils
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Effectifs et populations spécifiques suivies
            </p>

            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                <span>Filles : {stats.filles} ({pctFilles}%)</span>
                <span>Garçons : {stats.garcons} ({pctGarcons}%)</span>
              </div>
              <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="bg-rose-500 dark:bg-rose-400 transition-all"
                  style={{ width: `${pctFilles}%` }}
                />
                <div
                  className="bg-blue-600 dark:bg-blue-500 transition-all"
                  style={{ width: `${pctGarcons}%` }}
                />
              </div>
            </div>

            <dl className="mt-5 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-600 dark:text-slate-400">Pupilles de la Nation</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{stats.pupilles}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-600 dark:text-slate-400">Situation de handicap (ESH)</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{stats.esh}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-600 dark:text-slate-400">Déplacés forcés (EDF)</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{stats.edf}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-600 dark:text-slate-400">Orphelins vulnérables (EOV)</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{stats.eov}</dd>
              </div>
            </dl>
          </div>

          {/* Checklist de préparation CEP */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Préparation des dossiers CEP
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Vérification avant impression officielle
            </p>

            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {stats.avecPV === stats.total ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  N° PV attribués
                </span>
                <span className="font-mono-tabular text-xs font-medium text-slate-600 dark:text-slate-400">
                  {stats.avecPV}/{stats.total}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {stats.avecPhoto === stats.total ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  Photos d&apos;identité jointes
                </span>
                <span className="font-mono-tabular text-xs font-medium text-slate-600 dark:text-slate-400">
                  {stats.avecPhoto}/{stats.total}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {config.armoiries && (config.signatureCachet || config.signature) ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  Cachet &amp; armoiries
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {config.signatureCachet || config.signature ? 'Configuré' : 'À ajouter'}
                </span>
              </li>
            </ul>

            <div className="mt-5 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('documents')}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Générer les documents
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('cartes')}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Cartes d&apos;identité scolaire
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Latest evaluation analytics */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Dernière évaluation enregistrée
            </h3>
            {latestEvalSummary ? (
              <div className="mt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {latestEvalSummary.kind} · {latestEvalSummary.label} · {latestEvalSummary.classe}
                </p>
                <div className="mt-4 flex items-baseline gap-4">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {latestEvalSummary.tauxReussite.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Taux de réussite</div>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {latestEvalSummary.moyenneClasse.toFixed(2)}/10
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Moyenne classe</div>
                  </div>
                </div>

                {/* Mention distribution bars */}
                <div className="mt-4 space-y-1.5 text-xs">
                  {(
                    [
                      ['Très Bien', latestEvalSummary.mentions.tb, 'bg-emerald-500'],
                      ['Bien', latestEvalSummary.mentions.b, 'bg-blue-500'],
                      ['Assez Bien', latestEvalSummary.mentions.ab, 'bg-violet-500'],
                      ['Passable', latestEvalSummary.mentions.p, 'bg-amber-500'],
                      ['Échec', latestEvalSummary.mentions.e, 'bg-red-500'],
                    ] as const
                  ).map(([label, count, color]) => {
                    const pct = latestEvalSummary.totalCandidats
                      ? (count / latestEvalSummary.totalCandidats) * 100
                      : 0;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-20 text-slate-600 dark:text-slate-400 truncate">{label}</span>
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aucune évaluation trimestrielle ou examen blanc enregistré pour le moment.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('evaluations')}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <GraduationCap className="h-4 w-4" />
                  Saisir une évaluation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
