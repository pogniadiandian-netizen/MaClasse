import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  UserPlus,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Pencil,
  Printer,
  X,
  Save,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import type { Candidate, DocConfig } from '../types/cep';
import { ALL_FIELDS, FIELDS, FIELDS_DOC } from '../constants/cepConstants';
import {
  buildCandidatesCSV,
  categorieDe,
  compressImageFile,
  formatDateShort,
  getCandidateCompleteness,
  isLibreFlag,
  normalizeCandidateInput,
  parseCSV,
  parseImportedRows,
  sansAccent,
  validateCandidate,
} from '../utils/cepRules';
import { buildDossiersWordHTML } from '../utils/documentBuilders';
import type { ModalConfig } from './ConfirmModal';

interface CandidatesViewProps {
  candidates: Candidate[];
  classeParam: string;
  config: DocConfig;
  formOpen: boolean;
  setFormOpen: (open: boolean) => void;
  onSaveCandidates: (next: Candidate[]) => void;
  onOpenDocsFor: (matricule: string) => void;
  onPrintAllDossiers: () => void;
  onLoadDemo: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenModal: (modal: ModalConfig) => void;
}

type FilterKey = 'tous' | 'F' | 'M' | 'EG' | 'ET' | 'pupille' | 'libre' | 'incomplet';

function createEmptyForm(classeParam: string): Candidate {
  return normalizeCandidateInput({ classe: classeParam }, classeParam);
}

export const CandidatesView: React.FC<CandidatesViewProps> = ({
  candidates,
  classeParam,
  config,
  formOpen,
  setFormOpen,
  onSaveCandidates,
  onOpenDocsFor,
  onPrintAllDossiers,
  onLoadDemo,
  onToast,
  onOpenModal,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('tous');
  const [editingMatricule, setEditingMatricule] = useState<string | null>(null);
  const [formData, setFormData] = useState<Candidate>(() => createEmptyForm(classeParam));
  const [sortKey, setSortKey] = useState<'nom' | 'matricule' | 'sexe'>('nom');
  const [sortAsc, setSortAsc] = useState(true);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!formOpen) {
      setEditingMatricule(null);
      setFormData(createEmptyForm(classeParam));
    }
  }, [formOpen, classeParam]);

  const openCreateForm = () => {
    setEditingMatricule(null);
    setFormData(createEmptyForm(classeParam));
    setFormOpen(true);
  };

  const openEditForm = (c: Candidate) => {
    setEditingMatricule(c.matricule);
    setFormData({
      ...createEmptyForm(classeParam),
      ...c,
      classe: classeParam,
      categorie: categorieDe(c),
    });
    setFormOpen(true);
  };

  const handleFieldChange = (key: keyof Candidate, val: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const isFieldVisible = (condition?: string) => {
    if (!condition) return true;
    const [triggerKey, expected] = condition.split('=');
    const val = String((formData as unknown as Record<string, unknown>)[triggerKey] ?? '');
    return expected.split('|').includes(val);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 480, 0.82);
      setFormData((prev) => ({
        ...prev,
        documents: {
          photo: {
            fourni: true,
            nom: file.name,
            taille: file.size,
            type: file.type,
            contenu: compressed,
          },
        },
      }));
      onToast("Photo d'identité optimisée et ajoutée", 'success');
    } catch {
      onToast("Erreur lors du chargement de la photo", 'error');
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeCandidateInput(
      {
        ...formData,
        classe: classeParam,
        documents: formData.documents,
      },
      classeParam
    );

    const err = validateCandidate(normalized, candidates, editingMatricule);
    if (err) {
      onToast(err, 'error');
      return;
    }

    if (editingMatricule) {
      const next = candidates.map((c) =>
        c.matricule === editingMatricule ? normalized : c
      );
      onSaveCandidates(next);
      onToast('Candidat modifié avec succès', 'success');
    } else {
      onSaveCandidates([...candidates, normalized]);
      onToast('Candidat ajouté à la liste', 'success');
    }
    setFormOpen(false);
    setEditingMatricule(null);
  };

  const handleDelete = (c: Candidate) => {
    onOpenModal({
      mode: 'confirm',
      title: 'Supprimer ce candidat ?',
      message: `Voulez-vous vraiment supprimer ${c.nom} ${c.prenoms} (${c.matricule}) ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: () => {
        onSaveCandidates(candidates.filter((x) => x.matricule !== c.matricule));
        onToast('Candidat supprimé', 'info');
      },
    });
  };

  const handleClearAll = () => {
    if (!candidates.length) return;
    onOpenModal({
      mode: 'confirm',
      title: 'Vider toute la liste ?',
      message: `Cette action supprimera les ${candidates.length} candidats enregistrés localement.`,
      confirmLabel: 'Vider la liste',
      danger: true,
      onConfirm: () => {
        onSaveCandidates([]);
        onToast('Liste vidée', 'info');
      },
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ALL_FIELDS.map((f) => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidats');
    XLSX.writeFile(wb, 'modele_candidats_cep.xlsx');
    onToast('Modèle Excel téléchargé', 'success');
  };

  const handleExportExcel = () => {
    if (!candidates.length) {
      onToast('Aucun candidat à exporter', 'error');
      return;
    }
    const headers = ALL_FIELDS.map((f) => f.label);
    const rows = candidates.map((c) =>
      ALL_FIELDS.map((f) => String((c as unknown as Record<string, unknown>)[f.key] ?? ''))
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidats');
    XLSX.writeFile(wb, `candidats_cep_${classeParam}.xlsx`);
    onToast('Export Excel téléchargé', 'success');
  };

  const handleExportCSV = () => {
    if (!candidates.length) {
      onToast('Aucun candidat à exporter', 'error');
      return;
    }
    const csv = buildCandidatesCSV(candidates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidats_cep_${classeParam}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    onToast('Export CSV téléchargé', 'success');
  };

  const handleExportWord = () => {
    if (!candidates.length) {
      onToast('Aucun candidat à exporter', 'error');
      return;
    }
    const html = buildDossiersWordHTML(candidates, config, classeParam);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossiers_cep_${classeParam}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    onToast('Export Word téléchargé', 'success');
  };

  const handleExportJSON = () => {
    if (!candidates.length) {
      onToast('Aucun candidat à sauvegarder', 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(candidates, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde_candidats_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    onToast('Sauvegarde JSON téléchargée', 'success');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCSV = /\.csv$/i.test(file.name);
    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        let rows: Record<string, unknown>[] = [];
        if (isCSV) {
          const lines = parseCSV(String(ev.target?.result || ''));
          const headers = (lines.shift() || []).map((h) => String(h).trim());
          rows = lines.map((line) => {
            const obj: Record<string, unknown> = {};
            headers.forEach((h, i) => {
              obj[h] = line[i] ?? '';
            });
            return obj;
          });
        } else {
          const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), {
            type: 'array',
          });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        }

        const { imported, ignored } = parseImportedRows(rows, candidates, classeParam);
        if (imported.length > 0) {
          onSaveCandidates([...candidates, ...imported]);
        }
        onToast(
          `${imported.length} importé(s)${ignored ? `, ${ignored} ignoré(s)` : ''}`,
          imported.length > 0 ? 'success' : 'info'
        );
      } catch {
        onToast('Erreur lors de la lecture du fichier', 'error');
      }
    };

    if (isCSV) reader.readAsText(file, 'utf-8');
    else reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || ''));
        if (!Array.isArray(parsed)) {
          onToast('Format JSON invalide', 'error');
          return;
        }
        onOpenModal({
          mode: 'confirm',
          title: 'Restaurer la sauvegarde JSON ?',
          message: `Cette action remplacera la liste actuelle par ${parsed.length} candidat(s) depuis le fichier.`,
          confirmLabel: 'Restaurer',
          onConfirm: () => {
            onSaveCandidates(parsed as Candidate[]);
            onToast('Sauvegarde restaurée avec succès', 'success');
          },
        });
      } catch {
        onToast('Impossible de lire ce fichier JSON', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const filteredCandidates = useMemo(() => {
    const q = sansAccent(search.trim());
    const list = candidates.filter((c) => {
      if (filter === 'F' && c.sexe !== 'F') return false;
      if (filter === 'M' && c.sexe !== 'M') return false;
      if (filter === 'EG' && c.option6e !== 'EG') return false;
      if (filter === 'ET' && c.option6e !== 'ET') return false;
      if (filter === 'pupille' && c.pupille !== 'Oui') return false;
      if (filter === 'libre' && !isLibreFlag(c.libre)) return false;
      if (filter === 'incomplet' && getCandidateCompleteness(c).pct === 100) return false;

      if (!q) return true;
      return sansAccent(
        `${c.matricule} ${c.pv} ${c.nom} ${c.prenoms} ${c.pere} ${c.mere} ${c.contact} ${c.filiere}`
      ).includes(q);
    });

    return [...list].sort((a, b) => {
      const av = String(a[sortKey] || '');
      const bv = String(b[sortKey] || '');
      const cmp = av.localeCompare(bv, 'fr', { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [candidates, search, filter, sortKey, sortAsc]);

  const toggleSort = (key: 'nom' | 'matricule' | 'sexe') => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Candidats enregistrés
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {candidates.length} candidat{candidates.length > 1 ? 's' : ''} · Classe active : {classeParam}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter un candidat
          </button>

          <button
            type="button"
            onClick={onPrintAllDossiers}
            disabled={!candidates.length}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            Dossiers PDF
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!candidates.length}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Excel
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!candidates.length}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <Download className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Exporter en CSV
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            disabled={!candidates.length}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Word
          </button>
        </div>
      </div>

      {/* Import / Backup Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleImportExcel}
          />
          <button
            type="button"
            onClick={() => excelInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            Importer Excel / CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Modèle Excel
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={!candidates.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" />
            Sauvegarder JSON
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            hidden
            onChange={handleImportJSON}
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurer JSON
          </button>
          {candidates.length === 0 && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Jeu de démo
            </button>
          )}
        </div>

        {candidates.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Vider la liste
          </button>
        )}
      </div>

      {/* Search & Segmented Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, matricule, parent..."
            aria-label="Rechercher un candidat"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <div
          className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1"
          role="group"
          aria-label="Filtrer les candidats"
        >
          {(
            [
              ['tous', 'Tous'],
              ['F', 'Filles'],
              ['M', 'Garçons'],
              ['EG', 'EG'],
              ['ET', 'ET'],
              ['pupille', 'Pupilles'],
              ['libre', 'Libres'],
              ['incomplet', 'Dossiers incomplets'],
            ] as [FilterKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('matricule')}
                    className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                  >
                    Matricule {sortKey === 'matricule' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('nom')}
                    className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                  >
                    Nom &amp; Prénom(s) {sortKey === 'nom' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('sexe')}
                    className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                  >
                    Sexe {sortKey === 'sexe' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">Naissance</th>
                <th className="px-4 py-3 whitespace-nowrap">Parents &amp; Contact</th>
                <th className="px-4 py-3 whitespace-nowrap">Option / Statut</th>
                <th className="px-4 py-3 whitespace-nowrap">Dossier</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    {candidates.length === 0
                      ? 'Aucun candidat enregistré. Cliquez sur « Ajouter un candidat » pour commencer.'
                      : 'Aucun candidat ne correspond aux critères de recherche.'}
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const comp = getCandidateCompleteness(c);
                  const libre = isLibreFlag(c.libre);
                  const hasPhoto = Boolean(c.documents?.photo?.fourni);
                  const flags = [
                    c.option6e || (c.categorie === 'CEP Seul' ? 'CEP' : '—'),
                    c.filiere ? c.filiere : null,
                    libre ? 'Libre' : null,
                    c.pupille === 'Oui' ? 'Pupille' : null,
                    c.handicap === 'Oui' ? 'ESH' : null,
                    c.deplace === 'Oui' ? 'EDF' : null,
                    c.eov === 'Oui' ? 'EOV' : null,
                  ].filter(Boolean);

                  return (
                    <tr
                      key={c.matricule}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono-tabular text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div>{c.matricule}</div>
                        {c.pv && (
                          <div className="text-slate-400">PV: {c.pv}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {c.documents?.photo?.contenu ? (
                            <img
                              src={c.documents.photo.contenu}
                              alt={`${c.nom} ${c.prenoms}`}
                              className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {(c.nom[0] || '?').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div
                              className={
                                c.sexe === 'F'
                                  ? 'font-bold text-[#8b0000] dark:text-red-400'
                                  : 'font-normal text-slate-900 dark:text-slate-100'
                              }
                            >
                              {c.nom.toUpperCase()} {c.prenoms}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {c.village || '—'}{c.fonction ? ` · ${c.fonction}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 tabular-nums ${
                          c.sexe === 'F'
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c.sexe || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        <div>{formatDateShort(c.dateNaiss) || '—'}</div>
                        <div className="text-slate-400 dark:text-slate-500">{c.lieuNaiss || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        <div className="truncate max-w-[190px]">{c.pere || '—'}</div>
                        <div className="text-slate-400 font-mono-tabular">{c.contact || 'Sans tél.'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        {flags.join(' · ')}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {comp.pct}% · {hasPhoto ? 'Photo OK' : 'Sans photo'}
                        </div>
                        {comp.missingImportant.length > 0 && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 truncate max-w-[150px]">
                            Manque : {comp.missingImportant.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(c)}
                            aria-label={`Modifier ${c.nom} ${c.prenoms}`}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDocsFor(c.matricule)}
                            aria-label={`Documents de ${c.nom} ${c.prenoms}`}
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            aria-label={`Supprimer ${c.nom} ${c.prenoms}`}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Slide-Over Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="candidate-form-title"
        >
          <div className="flex h-full w-full max-w-2xl flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 id="candidate-form-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingMatricule ? 'Modifier un candidat' : "Inscription d'un candidat"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Classe active : {classeParam} · Les champs marqués * sont obligatoires
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fermer le formulaire"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Photo section */}
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
                {formData.documents?.photo?.contenu ? (
                  <img
                    src={formData.documents.photo.contenu}
                    alt="Aperçu photo"
                    className="h-16 w-16 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 shrink-0">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Photo d&apos;identité récente (4×4)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formData.documents?.photo?.fourni
                      ? `${formData.documents.photo.nom || 'Photo enregistrée'} · prête pour la carte scolaire`
                      : 'Compression automatique pour impression sur carte scolaire'}
                  </p>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  {formData.documents?.photo?.fourni ? 'Remplacer' : 'Choisir photo'}
                </button>
              </div>

              {/* Main candidate fields */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  État civil, filiation &amp; inscription
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {FIELDS.map((f) => {
                    if (!isFieldVisible(f.condition)) return null;
                    const value = String((formData as unknown as Record<string, unknown>)[f.key] ?? '');
                    const inputId = `cand-${f.key}`;
                    return (
                      <div key={f.key}>
                        <label
                          htmlFor={inputId}
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          {f.label}
                          {f.required && <span className="text-red-500"> *</span>}
                        </label>
                        {f.key === 'classe' ? (
                          <input
                            id={inputId}
                            type="text"
                            value={classeParam}
                            readOnly
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-not-allowed"
                          />
                        ) : f.type === 'select' ? (
                          <select
                            id={inputId}
                            value={value}
                            onChange={(e) => handleFieldChange(f.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                          >
                            {f.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt === '' ? '—' : opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={inputId}
                            type={f.type || 'text'}
                            value={value}
                            required={f.required}
                            placeholder={f.placeholder || ''}
                            onChange={(e) => handleFieldChange(f.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                          />
                        )}
                        {f.helper && (
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {f.helper}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional document fields */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Informations pour les documents officiels (facultatif)
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {FIELDS_DOC.map((f) => {
                    const value = String((formData as unknown as Record<string, unknown>)[f.key] ?? '');
                    const inputId = `cand-doc-${f.key}`;
                    return (
                      <div key={f.key}>
                        <label
                          htmlFor={inputId}
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          {f.label}
                        </label>
                        <input
                          id={inputId}
                          type={f.type || 'text'}
                          value={value}
                          placeholder={f.placeholder || ''}
                          onChange={(e) => handleFieldChange(f.key, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 -mx-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  <Save className="h-4 w-4" />
                  {editingMatricule ? 'Enregistrer les modifications' : 'Ajouter le candidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
