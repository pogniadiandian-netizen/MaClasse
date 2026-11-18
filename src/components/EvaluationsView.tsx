import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus,
  Save,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  FileDown,
  ClipboardList,
  Table2,
  Award,
  GraduationCap,
} from 'lucide-react';
import type {
  Candidate,
  ClassesMatieres,
  DocConfig,
  EvalReportKind,
  EvaluationRecord,
  EvaluationsStore,
  EvaluationTab,
  EvaluationType,
  ExamNiveau,
  PageOrientationMode,
  SubjectDef,
} from '../types/cep';
import {
  computeAnnualProposals,
  computeEvaluationRows,
  computeEvaluationStats,
  EXAM_NIVEAU_LABELS,
  formatDateLong,
  getMentionEval,
  getNextClassLabel,
  resolveDocumentOrientation,
} from '../utils/cepRules';
import {
  buildBulletinHTML,
  buildExamBlancResultsHTML,
  buildFicheNotesHTML,
  buildPrintEvalResultsHTML,
  buildPropositionFinAnneeHTML,
  buildTableauSynoptiqueHTML,
  getNaturalEvalReportOrientation,
} from '../utils/documentBuilders';
import { fitDocumentDataFonts } from '../utils/documentFit';
import { OrientationSelect } from './OrientationSelect';
import type { ModalConfig } from './ConfirmModal';

import { Settings } from 'lucide-react';
import { DEFAULT_DECISION_THRESHOLDS } from '../constants/cepConstants';

interface EvaluationsViewProps {
  candidates: Candidate[];
  classeParam: string;
  classesMatieres: ClassesMatieres;
  evaluations: EvaluationsStore;
  config: DocConfig;
  onSaveEvaluations: (next: EvaluationsStore) => void;
  onTriggerPrint: (html: string) => void;
  onExportPdf: (opts: {
    html: string;
    filename: string;
    orientationMode?: PageOrientationMode;
  }) => Promise<void> | void;
  onOpenSettings?: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenModal: (modal: ModalConfig) => void;
}

const MM_TO_PX = 3.7795;

const todayStr = () => new Date().toISOString().slice(0, 10);

export const EvaluationsView: React.FC<EvaluationsViewProps> = ({
  candidates,
  classeParam,
  classesMatieres,
  evaluations,
  config,
  onSaveEvaluations,
  onTriggerPrint,
  onExportPdf,
  onOpenSettings,
  onToast,
  onOpenModal,
}) => {
  const [subTab, setSubTab] = useState<EvaluationTab>('jour');
  const [jourDate, setJourDate] = useState(todayStr());
  const [trimestre, setTrimestre] = useState('1er Trimestre');
  const [examNiveau, setExamNiveau] = useState<ExamNiveau>('ecole');
  const [examDate, setExamDate] = useState(todayStr());
  const [seuilAdmission, setSeuilAdmission] = useState(5);

  const [jourSelection, setJourSelection] = useState<string[]>([]);
  const [activeMatieres, setActiveMatieres] = useState<SubjectDef[]>([]);
  const [notes, setNotes] = useState<Record<string, Record<string, string>>>({});
  const [isVisible, setIsVisible] = useState(false);

  // Rapports / Fiches & Tableaux tab state
  const [reportKind, setReportKind] = useState<EvalReportKind>('fiche_notes');
  const [reportOrientation, setReportOrientation] = useState<PageOrientationMode>('auto');
  const [ficheSourceType, setFicheSourceType] = useState<EvaluationType>('jour');
  const [ficheBlank, setFicheBlank] = useState(false);
  const [reportDate, setReportDate] = useState(todayStr());
  const [reportTrimestre, setReportTrimestre] = useState('1er Trimestre');
  const [reportExamNiveau, setReportExamNiveau] = useState<ExamNiveau>('ecole');
  const [nextClasseInput, setNextClasseInput] = useState(() => getNextClassLabel(classeParam));
  const reportPreviewRef = useRef<HTMLDivElement>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [reportScale, setReportScale] = useState(0.65);

  useEffect(() => {
    setNextClasseInput(getNextClassLabel(classeParam));
  }, [classeParam]);

  const currentKey = useMemo(() => {
    if (!classeParam || subTab === 'rapports') return null;
    if (subTab === 'jour') return jourDate ? `${classeParam}__${jourDate}` : null;
    if (subTab === 'trim') return trimestre ? `${classeParam}__${trimestre}` : null;
    return examNiveau && examDate ? `${classeParam}__${examNiveau}__${examDate}` : null;
  }, [classeParam, subTab, jourDate, trimestre, examNiveau, examDate]);

  const availableSubjects = useMemo<SubjectDef[]>(() => {
    return (classesMatieres[classeParam] || []).map((m, i) => ({
      id: m.id || `cm-${i}-${m.nom}`,
      nom: m.nom || 'Matière',
      coef: Number(m.coef) > 0 ? Number(m.coef) : 1,
      max: Number(m.max) > 0 ? Number(m.max) : 10,
    }));
  }, [classesMatieres, classeParam]);

  useEffect(() => {
    if (subTab === 'rapports') return;
    const storeMap: Record<EvaluationType, Record<string, EvaluationRecord>> = {
      jour: evaluations.journalieres,
      trim: evaluations.trimestrielles,
      exam: evaluations.examens,
    };
    const saved = currentKey ? storeMap[subTab][currentKey] : undefined;
    if (saved) {
      const mats =
        subTab === 'jour'
          ? JSON.parse(JSON.stringify(saved.matieres || [])).slice(0, 2)
          : JSON.parse(JSON.stringify(saved.matieres || []));
      setActiveMatieres(mats);
      setNotes(JSON.parse(JSON.stringify(saved.notes || {})));
      if (subTab === 'jour') setJourSelection(mats.map((m: SubjectDef) => m.id));
      setIsVisible(true);
    } else {
      setActiveMatieres([]);
      setNotes({});
      setJourSelection([]);
      setIsVisible(false);
    }
  }, [currentKey, subTab, evaluations]);

  const students = useMemo(() => {
    const target = classeParam.trim().toUpperCase();
    return candidates
      .filter((c) => (c.classe || '').trim().toUpperCase() === target)
      .map((c) => ({
        key: c.matricule || `anon-${c.nom}-${c.prenoms}`,
        matricule: c.matricule || '',
        pv: c.pv || '',
        label: `${c.nom} ${c.prenoms}`.trim(),
        nom: c.nom,
        prenoms: c.prenoms,
        sexe: c.sexe,
        esh: (c.handicap === 'Oui' ? 'Oui' : 'Non') as 'Oui' | 'Non',
        edf: (c.deplace === 'Oui' ? 'Oui' : 'Non') as 'Oui' | 'Non',
        pupille: (c.pupille === 'Oui' ? 'Oui' : 'Non') as 'Oui' | 'Non',
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [candidates, classeParam]);

  const computedRows = useMemo(
    () => computeEvaluationRows(students, activeMatieres, notes),
    [students, activeMatieres, notes]
  );

  const evalStats = useMemo(
    () => computeEvaluationStats(computedRows, seuilAdmission),
    [computedRows, seuilAdmission]
  );

  const toggleJourSubject = (id: string, checked: boolean) => {
    setJourSelection((prev) => {
      const filtered = prev.filter((x) => x !== id);
      if (checked) {
        if (filtered.length >= 2) {
          onToast('2 matières maximum pour une évaluation journalière', 'error');
          return prev;
        }
        return [...filtered, id];
      }
      return filtered;
    });
  };

  const handleStartEval = () => {
    if (!availableSubjects.length) {
      onToast("Ajoutez d'abord des matières dans Paramètres", 'error');
      return;
    }
    if (subTab === 'jour') {
      if (!jourSelection.length) {
        onToast('Choisissez au moins une matière', 'error');
        return;
      }
      setActiveMatieres(availableSubjects.filter((m) => jourSelection.includes(m.id)));
    } else {
      setActiveMatieres(availableSubjects);
    }
    setNotes({});
    setIsVisible(true);
    onToast('Grille de saisie créée', 'success');
  };

  const handleResetSubjects = () => {
    onOpenModal({
      mode: 'confirm',
      title: 'Changer les matières ?',
      message: 'Les notes saisies dans cette grille non enregistrée seront effacées.',
      confirmLabel: 'Continuer',
      danger: true,
      onConfirm: () => {
        setIsVisible(false);
        setActiveMatieres([]);
        setNotes({});
        setJourSelection([]);
      },
    });
  };

  const handleReloadClassSubjects = () => {
    onOpenModal({
      mode: 'confirm',
      title: 'Recharger les matières de la classe ?',
      message: 'Les notes déjà saisies seront conservées pour les matières portant le même nom.',
      confirmLabel: 'Recharger',
      onConfirm: () => {
        const nextNotes: Record<string, Record<string, string>> = {};
        Object.keys(notes).forEach((stKey) => {
          nextNotes[stKey] = {};
          availableSubjects.forEach((nm) => {
            const oldM = activeMatieres.find((x) => x.nom === nm.nom);
            if (oldM && notes[stKey]?.[oldM.id] !== undefined) {
              nextNotes[stKey][nm.id] = notes[stKey][oldM.id];
            }
          });
        });
        setActiveMatieres(availableSubjects);
        setNotes(nextNotes);
        onToast('Matières rechargées', 'success');
      },
    });
  };

  const handleNoteChange = (studentKey: string, matId: string, val: string) => {
    setNotes((prev) => ({
      ...prev,
      [studentKey]: {
        ...(prev[studentKey] || {}),
        [matId]: val,
      },
    }));
  };

  const handleSave = () => {
    if (subTab === 'rapports') return;
    if (!currentKey) {
      onToast('Sélectionnez une classe et une date/période', 'error');
      return;
    }
    const record: EvaluationRecord = {
      classe: classeParam,
      date: subTab === 'jour' ? jourDate : subTab === 'exam' ? examDate : undefined,
      trimestre: subTab === 'trim' ? trimestre : undefined,
      niveau: subTab === 'exam' ? examNiveau : undefined,
      matieres: JSON.parse(JSON.stringify(activeMatieres)),
      notes: JSON.parse(JSON.stringify(notes)),
      savedAt: new Date().toISOString(),
    };
    const next: EvaluationsStore = {
      journalieres: { ...evaluations.journalieres },
      trimestrielles: { ...evaluations.trimestrielles },
      examens: { ...evaluations.examens },
    };
    if (subTab === 'jour') next.journalieres[currentKey] = record;
    else if (subTab === 'trim') next.trimestrielles[currentKey] = record;
    else next.examens[currentKey] = record;

    onSaveEvaluations(next);
    onToast(`Évaluation enregistrée (${Object.keys(notes).length} élève(s))`, 'success');
  };

  const handleExportExcel = () => {
    if (!computedRows.length) return;
    const headers = [
      'Rang',
      'Élève',
      ...activeMatieres.map((m) => `${m.nom} (/${m.max})`),
      ...(subTab !== 'jour' ? ['Total pondéré', 'Moyenne /10', 'Mention', 'Décision'] : []),
    ];
    const dataRows = [...computedRows]
      .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'fr'))
      .map((r) => [
        subTab !== 'jour' ? r.rank : '',
        r.label,
        ...activeMatieres.map((m) => notes[r.key]?.[m.id] ?? ''),
        ...(subTab !== 'jour'
          ? [
              Number(r.total.toFixed(2)),
              Number(r.moyenne.toFixed(2)),
              getMentionEval(r.moyenne).label,
              r.moyenne >= seuilAdmission ? 'Admis(e)' : 'Ajourné(e)',
            ]
          : []),
      ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Évaluation');
    XLSX.writeFile(wb, `evaluation_${classeParam}_${subTab}.xlsx`);
    onToast('Tableau exporté en Excel', 'success');
  };

  const buildCurrentResultsHTML = () => {
    const niveauLabel = EXAM_NIVEAU_LABELS[examNiveau];
    if (subTab === 'exam') {
      return buildExamBlancResultsHTML({
        niveauLabel,
        classe: classeParam,
        date: examDate,
        cfg: config,
        rows: computedRows,
        seuil: seuilAdmission,
      });
    }
    return buildPrintEvalResultsHTML({
      titre: 'RÉSULTATS TRIMESTRIELS',
      libelle: `${classeParam} — ${trimestre}`,
      cfg: config,
      rows: computedRows,
      seuil: seuilAdmission,
    });
  };

  const handlePrintResults = () => {
    if (subTab === 'jour' || subTab === 'rapports' || !computedRows.length) return;
    onTriggerPrint(buildCurrentResultsHTML());
  };

  const handlePdfResults = () => {
    if (subTab === 'jour' || subTab === 'rapports' || !computedRows.length) return;
    const filename =
      subTab === 'trim'
        ? `resultats_${classeParam}_${trimestre.replace(/\s+/g, '_')}.pdf`
        : `resultat_examen_blanc_${examNiveau}_${classeParam}_${examDate}.pdf`;
    onExportPdf({
      html: buildCurrentResultsHTML(),
      filename: filename.toLowerCase(),
      orientationMode: 'auto',
    });
  };

  const handlePdfFicheNotesActive = () => {
    if (!activeMatieres.length || !students.length) return;
    const periodeLabel =
      subTab === 'jour'
        ? `Évaluation journalière du ${formatDateLong(jourDate)}`
        : subTab === 'trim'
          ? `Évaluation — ${trimestre}`
          : `Examen blanc niveau ${EXAM_NIVEAU_LABELS[examNiveau]} du ${formatDateLong(examDate)}`;
    const html = buildFicheNotesHTML({
      periodeLabel,
      classe: classeParam,
      cfg: config,
      students,
      matieres: activeMatieres,
      notes,
      blank: false,
      orientationMode: 'auto',
    });
    onExportPdf({
      html,
      filename: `fiche_notes_${classeParam.toLowerCase()}_${subTab}.pdf`,
      orientationMode: 'auto',
    });
  };

  const handlePdfSynoptiqueActive = () => {
    if (subTab !== 'trim' || !activeMatieres.length || !students.length) return;
    const html = buildTableauSynoptiqueHTML({
      trimestre,
      classe: classeParam,
      cfg: config,
      students,
      matieres: activeMatieres,
      notes,
      seuil: seuilAdmission,
      orientationMode: 'auto',
    });
    onExportPdf({
      html,
      filename: `tableau_synoptique_${classeParam.toLowerCase()}_${trimestre.replace(/\s+/g, '_').toLowerCase()}.pdf`,
      orientationMode: 'auto',
    });
  };

  const buildStudentBulletin = (studentKey: string) => {
    const student = computedRows.find((r) => r.key === studentKey);
    if (!student) return null;
    const periodeLibelle =
      subTab === 'trim'
        ? trimestre
        : `Examen blanc niveau ${EXAM_NIVEAU_LABELS[examNiveau]} · ${formatDateLong(examDate)}`;
    return {
      student,
      html: buildBulletinHTML({
        student,
        totalStudents: computedRows.length,
        moyenneClasse: evalStats.moyenneClasse,
        matieres: activeMatieres,
        notes: notes[student.key] || {},
        periodeLibelle,
        classe: classeParam,
        cfg: config,
        seuil: seuilAdmission,
      }),
    };
  };

  const handlePrintBulletin = (studentKey: string) => {
    const res = buildStudentBulletin(studentKey);
    if (!res) return;
    onTriggerPrint(res.html);
  };

  const handlePdfBulletin = (studentKey: string) => {
    const res = buildStudentBulletin(studentKey);
    if (!res) return;
    const safeName = `bulletin_${res.student.nom || res.student.label}_${classeParam}`
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .toLowerCase();
    onExportPdf({
      html: res.html,
      filename: `${safeName}.pdf`,
      orientationMode: 'auto',
    });
  };

  // Saved dates helpers for Fiches & Tableaux
  const savedJourDates = useMemo(
    () =>
      Object.values(evaluations.journalieres)
        .filter((r) => r.classe === classeParam && r.date)
        .map((r) => r.date!)
        .sort()
        .reverse(),
    [evaluations.journalieres, classeParam]
  );

  const savedExamDates = useMemo(
    () =>
      Object.values(evaluations.examens)
        .filter((r) => r.classe === classeParam && r.niveau === reportExamNiveau && r.date)
        .map((r) => r.date!)
        .sort()
        .reverse(),
    [evaluations.examens, classeParam, reportExamNiveau]
  );

  const activeThresholds = useMemo(
    () => ({
      ...DEFAULT_DECISION_THRESHOLDS,
      ...(config.seuilsFinAnnee || {}),
    }),
    [config.seuilsFinAnnee]
  );

  const annualProposalSummary = useMemo(
    () =>
      computeAnnualProposals({
        candidates,
        evaluations,
        classe: classeParam,
        thresholds: activeThresholds,
        nextClasse: nextClasseInput,
      }),
    [candidates, evaluations, classeParam, activeThresholds, nextClasseInput]
  );

  const reportPayload = useMemo(() => {
    if (reportKind === 'fiche_notes') {
      const storeMap: Record<EvaluationType, Record<string, EvaluationRecord>> = {
        jour: evaluations.journalieres,
        trim: evaluations.trimestrielles,
        exam: evaluations.examens,
      };
      const key =
        ficheSourceType === 'jour'
          ? `${classeParam}__${reportDate}`
          : ficheSourceType === 'trim'
            ? `${classeParam}__${reportTrimestre}`
            : `${classeParam}__${reportExamNiveau}__${reportDate}`;
      const saved = storeMap[ficheSourceType][key];
      const mats =
        saved?.matieres?.length
          ? saved.matieres
          : ficheSourceType === 'jour'
            ? availableSubjects.slice(0, 2)
            : availableSubjects;
      const periodeLabel =
        ficheSourceType === 'jour'
          ? `Évaluation journalière du ${formatDateLong(reportDate) || reportDate}`
          : ficheSourceType === 'trim'
            ? `Évaluation — ${reportTrimestre}`
            : `Examen blanc niveau ${EXAM_NIVEAU_LABELS[reportExamNiveau]} du ${formatDateLong(reportDate) || reportDate}`;
      const natural = getNaturalEvalReportOrientation('fiche_notes', mats.length);
      const html = buildFicheNotesHTML({
        titre: ficheBlank ? 'FICHE DES NOTES (VIERGE)' : 'FICHE DES NOTES',
        periodeLabel,
        classe: classeParam,
        cfg: config,
        students,
        matieres: mats,
        notes: saved?.notes || {},
        blank: ficheBlank,
        orientationMode: reportOrientation,
      });
      return {
        html,
        natural,
        hasSaved: Boolean(saved),
        filename: `fiche_notes_${classeParam}_${ficheSourceType}_${ficheSourceType === 'trim' ? reportTrimestre : reportDate}`
          .replace(/[^a-zA-Z0-9_-]+/g, '_')
          .toLowerCase() + '.pdf',
      };
    }

    if (reportKind === 'synoptique') {
      const saved = evaluations.trimestrielles[`${classeParam}__${reportTrimestre}`];
      const mats = saved?.matieres?.length ? saved.matieres : availableSubjects;
      const natural = getNaturalEvalReportOrientation('synoptique', mats.length);
      const html = buildTableauSynoptiqueHTML({
        trimestre: reportTrimestre,
        classe: classeParam,
        cfg: config,
        students,
        matieres: mats,
        notes: saved?.notes || {},
        seuil: seuilAdmission,
        orientationMode: reportOrientation,
      });
      return {
        html,
        natural,
        hasSaved: Boolean(saved),
        filename: `tableau_synoptique_${classeParam}_${reportTrimestre}`
          .replace(/[^a-zA-Z0-9_-]+/g, '_')
          .toLowerCase() + '.pdf',
      };
    }

    if (reportKind === 'proposition') {
      const natural = getNaturalEvalReportOrientation('proposition');
      const html = buildPropositionFinAnneeHTML({
        summary: annualProposalSummary,
        cfg: config,
        orientationMode: reportOrientation,
      });
      return {
        html,
        natural,
        hasSaved:
          annualProposalSummary.hasT1 ||
          annualProposalSummary.hasT2 ||
          annualProposalSummary.hasT3,
        filename: `proposition_fin_annee_${classeParam.toLowerCase()}.pdf`,
      };
    }

    // resultat_exam
    const key = `${classeParam}__${reportExamNiveau}__${reportDate}`;
    const saved = evaluations.examens[key];
    const mats = saved?.matieres?.length ? saved.matieres : availableSubjects;
    const rows = computeEvaluationRows(students, mats, saved?.notes || {});
    const niveauLabel = EXAM_NIVEAU_LABELS[reportExamNiveau];
    const natural = getNaturalEvalReportOrientation('resultat_exam');
    const html = buildExamBlancResultsHTML({
      niveauLabel,
      classe: classeParam,
      date: reportDate,
      cfg: config,
      rows,
      seuil: seuilAdmission,
      orientationMode: reportOrientation,
    });
    return {
      html,
      natural,
      hasSaved: Boolean(saved),
      filename: `resultat_examen_blanc_${reportExamNiveau}_${classeParam}_${reportDate}`
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .toLowerCase() + '.pdf',
    };
  }, [
    reportKind,
    reportOrientation,
    ficheSourceType,
    ficheBlank,
    reportDate,
    reportTrimestre,
    reportExamNiveau,
    classeParam,
    evaluations,
    availableSubjects,
    config,
    students,
    seuilAdmission,
    annualProposalSummary,
  ]);

  const resolvedReportOrientation = resolveDocumentOrientation(
    reportPayload.natural,
    reportOrientation
  );
  const previewDocW = resolvedReportOrientation === 'landscape' ? 297 : 210;
  const previewDocH = resolvedReportOrientation === 'landscape' ? 210 : 297;

  useEffect(() => {
    if (subTab !== 'rapports') return;
    const updateScale = () => {
      const el = reportPreviewRef.current;
      if (!el) return;
      const avail = el.clientWidth - 24;
      if (avail <= 0) return;
      setReportScale(Math.min(1, avail / (previewDocW * MM_TO_PX)));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (reportPreviewRef.current) ro.observe(reportPreviewRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [subTab, previewDocW]);

  useEffect(() => {
    if (subTab !== 'rapports') return;
    const el = reportContentRef.current;
    if (!el) return;
    fitDocumentDataFonts(el);
    const rafId = requestAnimationFrame(() => fitDocumentDataFonts(el));
    return () => cancelAnimationFrame(rafId);
  }, [subTab, reportPayload.html]);

  const subjectAverages = useMemo(() => {
    if (!activeMatieres.length || !students.length) return [];
    return activeMatieres.map((m) => {
      let sum = 0;
      let count = 0;
      students.forEach((st) => {
        const raw = notes[st.key]?.[m.id];
        if (raw !== undefined && raw !== '') {
          const val = Number(raw);
          if (!Number.isNaN(val)) {
            sum += (val / m.max) * 10;
            count++;
          }
        }
      });
      return {
        id: m.id,
        nom: m.nom,
        avg10: count > 0 ? sum / count : null,
        count,
      };
    });
  }, [activeMatieres, students, notes]);

  const showFull = subTab === 'trim' || subTab === 'exam';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Gestion des évaluations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Classe active : {classeParam} · Calcul pondéré sur 10, rangs ex-æquo, mentions et bulletins individuels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1 w-fit">
          {(
            [
              ['jour', 'Journalières'],
              ['trim', 'Trimestrielles'],
              ['exam', 'Examens blancs'],
              ['rapports', 'Fiches & Tableaux'],
            ] as [EvaluationTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                subTab === id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'rapports' ? (
        <div className="space-y-5">
          {/* 4 Report cards selector */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                {
                  id: 'fiche_notes',
                  title: 'Fiche des notes',
                  desc: 'Jour, trimestre ou examen blanc',
                  icon: <ClipboardList className="h-4 w-4 text-blue-700 dark:text-blue-400" />,
                },
                {
                  id: 'synoptique',
                  title: 'Tableau synoptique',
                  desc: '1er, 2e ou 3e Trimestre complet',
                  icon: <Table2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />,
                },
                {
                  id: 'proposition',
                  title: "Proposition de fin d'année",
                  desc: 'Moyenne T1–T3, passage / redoublement',
                  icon: <GraduationCap className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />,
                },
                {
                  id: 'resultat_exam',
                  title: "Résultat de l'examen blanc",
                  desc: 'Par niveau (École, CEB, Prov., Rég.)',
                  icon: <Award className="h-4 w-4 text-amber-700 dark:text-amber-400" />,
                },
              ] as Array<{
                id: EvalReportKind;
                title: string;
                desc: string;
                icon: React.ReactNode;
              }>
            ).map((item) => {
              const active = reportKind === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReportKind(item.id)}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Report parameters */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              {reportKind === 'fiche_notes' && (
                <>
                  <div>
                    <label htmlFor="rep-fiche-src" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Type d&apos;évaluation
                    </label>
                    <select
                      id="rep-fiche-src"
                      value={ficheSourceType}
                      onChange={(e) => setFicheSourceType(e.target.value as EvaluationType)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    >
                      <option value="jour">Évaluation journalière</option>
                      <option value="trim">Évaluation trimestrielle</option>
                      <option value="exam">Examen blanc</option>
                    </select>
                  </div>

                  {ficheSourceType === 'trim' ? (
                    <div>
                      <label htmlFor="rep-fiche-trim" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Période (Trimestre)
                      </label>
                      <select
                        id="rep-fiche-trim"
                        value={reportTrimestre}
                        onChange={(e) => setReportTrimestre(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                      >
                        <option>1er Trimestre</option>
                        <option>2ème Trimestre</option>
                        <option>3ème Trimestre</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      {ficheSourceType === 'exam' && (
                        <div>
                          <label htmlFor="rep-fiche-niv" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Niveau
                          </label>
                          <select
                            id="rep-fiche-niv"
                            value={reportExamNiveau}
                            onChange={(e) => setReportExamNiveau(e.target.value as ExamNiveau)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                          >
                            <option value="ecole">École</option>
                            <option value="ceb">CEB</option>
                            <option value="provincial">Provincial</option>
                            <option value="regional">Régional</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label htmlFor="rep-fiche-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Date sélectionnable
                        </label>
                        <input
                          id="rep-fiche-date"
                          type="date"
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </>
                  )}

                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer h-[38px]">
                    <input
                      type="checkbox"
                      checked={ficheBlank}
                      onChange={(e) => setFicheBlank(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700"
                    />
                    Fiche vierge (sans notes)
                  </label>
                </>
              )}

              {reportKind === 'synoptique' && (
                <>
                  <div>
                    <label htmlFor="rep-syn-trim" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Trimestre
                    </label>
                    <select
                      id="rep-syn-trim"
                      value={reportTrimestre}
                      onChange={(e) => setReportTrimestre(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    >
                      <option>1er Trimestre</option>
                      <option>2ème Trimestre</option>
                      <option>3ème Trimestre</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rep-syn-seuil" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Seuil d&apos;admission (/10)
                    </label>
                    <input
                      id="rep-syn-seuil"
                      type="number"
                      min={1}
                      max={10}
                      step={0.25}
                      value={seuilAdmission}
                      onChange={(e) => setSeuilAdmission(Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              {reportKind === 'proposition' && (
                <>
                  <div>
                    <label htmlFor="rep-prop-next" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Classe supérieure (si promu)
                    </label>
                    <input
                      id="rep-prop-next"
                      type="text"
                      value={nextClasseInput}
                      onChange={(e) => setNextClasseInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Seuils actifs (/10) :</span>
                      <span>Promotion ≥ <b>{activeThresholds.promotion}</b></span>
                      <span>Redoublement ≥ <b>{activeThresholds.redoublement}</b></span>
                      <span>Renvoi &lt; <b>{activeThresholds.renvoi}</b></span>
                      <span>Abandons ≤ <b>{activeThresholds.abandons}</b></span>
                      <span>Fin de cycle ≥ <b>{activeThresholds.finDeCycle}</b></span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span>Trimestres :</span>
                      <span className={annualProposalSummary.hasT1 ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}>
                        T1 {annualProposalSummary.hasT1 ? 'OK' : '—'}
                      </span>
                      <span className={annualProposalSummary.hasT2 ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}>
                        T2 {annualProposalSummary.hasT2 ? 'OK' : '—'}
                      </span>
                      <span className={annualProposalSummary.hasT3 ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}>
                        T3 {annualProposalSummary.hasT3 ? 'OK' : '—'}
                      </span>
                      <span>· Conseil : <b>{(config.enseignantsConseil || []).length}</b> enseignant(s)</span>
                      {onOpenSettings && (
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Settings className="h-3 w-3" />
                          Modifier seuils &amp; enseignants
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {reportKind === 'resultat_exam' && (
                <>
                  <div>
                    <label htmlFor="rep-exam-niv" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Niveau de l&apos;examen blanc
                    </label>
                    <select
                      id="rep-exam-niv"
                      value={reportExamNiveau}
                      onChange={(e) => setReportExamNiveau(e.target.value as ExamNiveau)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    >
                      <option value="ecole">École</option>
                      <option value="ceb">CEB</option>
                      <option value="provincial">Provincial</option>
                      <option value="regional">Régional</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rep-exam-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Date de l&apos;examen
                    </label>
                    <input
                      id="rep-exam-date"
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="rep-exam-seuil" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Seuil d&apos;admission (/10)
                    </label>
                    <input
                      id="rep-exam-seuil"
                      type="number"
                      min={1}
                      max={10}
                      step={0.25}
                      value={seuilAdmission}
                      onChange={(e) => setSeuilAdmission(Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Quick saved dates pills for journalieres or examens */}
            {((reportKind === 'fiche_notes' && ficheSourceType === 'jour' && savedJourDates.length > 0) ||
              ((reportKind === 'resultat_exam' || (reportKind === 'fiche_notes' && ficheSourceType === 'exam')) &&
                savedExamDates.length > 0)) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Dates enregistrées :</span>
                {(reportKind === 'fiche_notes' && ficheSourceType === 'jour'
                  ? savedJourDates
                  : savedExamDates
                ).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setReportDate(d)}
                    className={`rounded-md border px-2 py-1 font-mono-tabular transition-colors ${
                      reportDate === d
                        ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <OrientationSelect
                value={reportOrientation}
                onChange={setReportOrientation}
                naturalOrientation={reportPayload.natural}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onExportPdf({
                      html: reportPayload.html,
                      filename: reportPayload.filename,
                      orientationMode: reportOrientation,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Exporter PDF
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerPrint(reportPayload.html)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>

          {/* Live A4 Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Aperçu A4 ({previewDocW} × {previewDocH} mm · {resolvedReportOrientation === 'landscape' ? 'Paysage' : 'Portrait'})
              </span>
              {!reportPayload.hasSaved && reportKind !== 'fiche_notes' && (
                <span className="text-amber-600 dark:text-amber-400">
                  Aucune note enregistrée pour cette sélection (aperçu vierge)
                </span>
              )}
            </div>
            <div
              ref={reportPreviewRef}
              className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-200/80 dark:bg-slate-950 p-3"
              style={{ height: `${Math.min(760, previewDocH * MM_TO_PX * reportScale + 26)}px` }}
            >
              <div
                className="mx-auto"
                style={{
                  width: `${previewDocW * MM_TO_PX * reportScale}px`,
                  height: `${previewDocH * MM_TO_PX * reportScale}px`,
                  position: 'relative',
                }}
              >
                <div
                  ref={reportContentRef}
                  style={{
                    width: `${previewDocW * MM_TO_PX}px`,
                    transform: `scale(${reportScale})`,
                    transformOrigin: 'top left',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.16)',
                  }}
                  dangerouslySetInnerHTML={{ __html: reportPayload.html }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Period selector */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4 items-end">
          <div>
            <label htmlFor="eval-classe" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Classe
            </label>
            <input
              id="eval-classe"
              type="text"
              readOnly
              value={classeParam}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed"
            />
          </div>

          {subTab === 'jour' && (
            <div>
              <label htmlFor="eval-jour-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Date
              </label>
              <input
                id="eval-jour-date"
                type="date"
                value={jourDate}
                onChange={(e) => setJourDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {subTab === 'trim' && (
            <div>
              <label htmlFor="eval-trim" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Trimestre
              </label>
              <select
                id="eval-trim"
                value={trimestre}
                onChange={(e) => setTrimestre(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option>1er Trimestre</option>
                <option>2ème Trimestre</option>
                <option>3ème Trimestre</option>
              </select>
            </div>
          )}

          {subTab === 'exam' && (
            <>
              <div>
                <label htmlFor="eval-exam-niveau" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Niveau
                </label>
                <select
                  id="eval-exam-niveau"
                  value={examNiveau}
                  onChange={(e) => setExamNiveau(e.target.value as ExamNiveau)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="ecole">École</option>
                  <option value="ceb">CEB</option>
                  <option value="provincial">Provincial</option>
                  <option value="regional">Régional</option>
                </select>
              </div>
              <div>
                <label htmlFor="eval-exam-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  id="eval-exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </>
          )}

          {showFull && (
            <div>
              <label htmlFor="eval-seuil" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Seuil d&apos;admission (/10)
              </label>
              <input
                id="eval-seuil"
                type="number"
                min={1}
                max={10}
                step={0.25}
                value={seuilAdmission}
                onChange={(e) => setSeuilAdmission(Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* Setup before adding evaluation */}
      {!isVisible ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          {availableSubjects.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucune matière définie pour la classe {classeParam}. Rendez-vous dans Paramètres pour configurer les matières.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {subTab === 'jour'
                    ? `Choisir 1 ou 2 matières (${jourSelection.length}/2)`
                    : `Matières incluses pour ${classeParam} (${availableSubjects.length})`}
                </h3>
              </div>

              {subTab === 'jour' ? (
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map((m) => {
                    const checked = jourSelection.includes(m.id);
                    const disabled = !checked && jourSelection.length >= 2;
                    return (
                      <label
                        key={m.id}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        } ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => toggleJourSubject(m.id, e.target.checked)}
                          className="rounded border-slate-300 text-blue-700"
                        />
                        <span className="font-medium">{m.nom}</span>
                        <span className="text-slate-400">/{m.max} · coef {m.coef}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {availableSubjects.map((m) => `${m.nom} (/${m.max})`).join(' · ')}
                </p>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleStartEval}
                  disabled={subTab === 'jour' && jourSelection.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-45"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter l&apos;évaluation
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Active Subjects Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Matières ({activeMatieres.length}) :{' '}
              </span>
              {activeMatieres.map((m) => `${m.nom} /${m.max}`).join(' · ')}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {subTab === 'jour' ? (
                <button
                  type="button"
                  onClick={handleResetSubjects}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Changer les matières
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReloadClassSubjects}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Recharger matières classe
                </button>
              )}
              <button
                type="button"
                onClick={handlePdfFicheNotesActive}
                disabled={!students.length || !activeMatieres.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-45"
              >
                <FileDown className="h-3.5 w-3.5" />
                Fiche notes PDF
              </button>
              {subTab === 'trim' && (
                <button
                  type="button"
                  onClick={handlePdfSynoptiqueActive}
                  disabled={!students.length || !activeMatieres.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-45"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Synoptique PDF
                </button>
              )}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!computedRows.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Excel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
              >
                <Save className="h-3.5 w-3.5" />
                Enregistrer les notes
              </button>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucun élève dans la classe {classeParam}. Ajoutez des candidats dans cette classe pour saisir les notes.
            </div>
          ) : (
            <>
              {/* Grades Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-center text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <th className="w-10 px-3 py-3">#</th>
                        <th className="min-w-[170px] px-3 py-3 text-left">Élève</th>
                        {activeMatieres.map((m) => (
                          <th key={m.id} className="px-2 py-3" title={`${m.nom} /${m.max} · coef ${m.coef}`}>
                            <div className="max-w-[90px] truncate mx-auto">{m.nom}</div>
                            <div className="text-[10px] font-normal text-slate-400">/{m.max}</div>
                          </th>
                        ))}
                        {showFull && (
                          <>
                            <th className="px-3 py-3">Total</th>
                            <th className="px-3 py-3">Moy. /10</th>
                            <th className="px-3 py-3">Rang</th>
                            <th className="px-3 py-3">Mention</th>
                            <th className="px-3 py-3">Bulletin</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                      {computedRows.map((r, idx) => {
                        const mention = getMentionEval(r.moyenne);
                        const admis = r.moyenne >= seuilAdmission;
                        return (
                          <tr key={r.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                            <td
                              className={`px-3 py-2 text-left ${
                                r.sexe === 'F'
                                  ? 'font-bold text-[#8b0000] dark:text-red-400'
                                  : 'font-normal text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {r.nom || r.label}
                              {r.prenoms ? ` ${r.prenoms}` : ''}
                            </td>
                            {activeMatieres.map((m) => {
                              const v = notes[r.key]?.[m.id] ?? '';
                              const num = Number(v);
                              const over = v !== '' && (num > m.max || num < 0);
                              return (
                                <td key={m.id} className="px-1.5 py-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={m.max}
                                    step={0.25}
                                    value={v}
                                    aria-label={`Note ${m.nom} pour ${r.label}`}
                                    onChange={(e) => handleNoteChange(r.key, m.id, e.target.value)}
                                    className={`w-16 rounded-md border px-1.5 py-1 text-center text-sm font-mono-tabular focus:outline-none ${
                                      over
                                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-blue-600'
                                    }`}
                                  />
                                </td>
                              );
                            })}
                            {showFull && (
                              <>
                                <td className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {r.total.toFixed(2)}
                                  <span className="block text-[10px] font-normal text-slate-400">
                                    /{(r.sommeCoef * 10).toFixed(0)}
                                  </span>
                                </td>
                                <td
                                  className={`px-3 py-2 font-bold font-mono-tabular ${
                                    admis
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {r.moyenne.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 font-semibold text-blue-700 dark:text-blue-400">
                                  {r.rank}
                                </td>
                                <td className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {mention.label}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handlePdfBulletin(r.key)}
                                      aria-label={`Exporter le bulletin PDF de ${r.label}`}
                                      className="inline-flex items-center gap-1 rounded-md border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 text-xs text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                    >
                                      <FileDown className="h-3.5 w-3.5" />
                                      PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePrintBulletin(r.key)}
                                      aria-label={`Imprimer le bulletin de ${r.label}`}
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      Impr.
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Full Results + Subject Averages + Admis/Ajournes */}
              {showFull && (
                <div className="space-y-5 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Résultats &amp; Liste des admis (seuil {seuilAdmission}/10)
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePdfResults}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Exporter résultats PDF
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintResults}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Imprimer les résultats
                      </button>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Candidats</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {evalStats.totalCandidats}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Admis</div>
                      <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {evalStats.admis.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Ajournés</div>
                      <div className="mt-1 text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                        {evalStats.ajournes.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Taux de réussite</div>
                      <div className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                        {evalStats.tauxReussite.toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Moyenne classe</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {evalStats.moyenneClasse.toFixed(2)}/10
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Meilleure moy.</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {evalStats.meilleure.toFixed(2)}/10
                      </div>
                    </div>
                  </div>

                  {/* Subject Performance Bars */}
                  {subjectAverages.some((s) => s.avg10 !== null) && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Moyennes par matière (ramenées sur 10)
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {subjectAverages.map((sa) => (
                          <div key={sa.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="truncate text-slate-700 dark:text-slate-300 pr-2">
                                {sa.nom}
                              </span>
                              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                                {sa.avg10 !== null ? `${sa.avg10.toFixed(2)}/10` : '—'}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full ${
                                  (sa.avg10 ?? 0) >= seuilAdmission
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, ((sa.avg10 ?? 0) / 10) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admis & Ajournes Tables */}
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          Admis par ordre de mérite ({evalStats.admis.length})
                        </h4>
                        <span className="text-xs text-slate-400">≥ {seuilAdmission}/10</span>
                      </div>
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                            <th className="px-3 py-2">Rang</th>
                            <th className="px-3 py-2">Élève</th>
                            <th className="px-3 py-2 text-right">Moyenne</th>
                            <th className="px-3 py-2 text-right">Mention</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                          {evalStats.admis.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                                Aucun élève admis.
                              </td>
                            </tr>
                          ) : (
                            evalStats.admis.map((r) => (
                              <tr key={r.key}>
                                <td className="px-3 py-2 font-semibold text-blue-700 dark:text-blue-400">
                                  {r.rank}
                                </td>
                                <td
                                  className={`px-3 py-2 ${
                                    r.sexe === 'F'
                                      ? 'font-bold text-[#8b0000] dark:text-red-400'
                                      : 'font-normal text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {r.nom || r.label}
                                  {r.prenoms ? ` ${r.prenoms}` : ''}
                                </td>
                                <td className="px-3 py-2 text-right font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                                  {r.moyenne.toFixed(2)}/10
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
                                  {getMentionEval(r.moyenne).label}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
                          Ajournés ({evalStats.ajournes.length})
                        </h4>
                        <span className="text-xs text-slate-400">&lt; {seuilAdmission}/10</span>
                      </div>
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                            <th className="px-3 py-2">Rang</th>
                            <th className="px-3 py-2">Élève</th>
                            <th className="px-3 py-2 text-right">Moyenne</th>
                            <th className="px-3 py-2 text-right">Mention</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                          {evalStats.ajournes.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                                Aucun élève ajourné.
                              </td>
                            </tr>
                          ) : (
                            evalStats.ajournes.map((r) => (
                              <tr key={r.key}>
                                <td className="px-3 py-2 font-semibold text-slate-500">{r.rank}</td>
                                <td
                                  className={`px-3 py-2 ${
                                    r.sexe === 'F'
                                      ? 'font-bold text-[#8b0000] dark:text-red-400'
                                      : 'font-normal text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {r.nom || r.label}
                                  {r.prenoms ? ` ${r.prenoms}` : ''}
                                </td>
                                <td className="px-3 py-2 text-right font-mono-tabular font-semibold text-red-600 dark:text-red-400">
                                  {r.moyenne.toFixed(2)}/10
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
                                  {getMentionEval(r.moyenne).label}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
};

