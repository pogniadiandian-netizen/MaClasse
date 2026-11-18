import React, { useState } from 'react';
import { Lock, Unlock, RotateCcw, Plus, Trash2, Zap, UserPlus } from 'lucide-react';
import type {
  ClassesMatieres,
  DecisionThresholds,
  DocConfig,
  EnseignantConseil,
  Sexe,
  SubjectDef,
} from '../types/cep';
import {
  CHAMPS_VERROUILLES,
  CLASSES_LISTE,
  DEFAULT_DECISION_THRESHOLDS,
  MOT_DE_PASSE_ADMIN,
  createDefaultConfig,
} from '../constants/cepConstants';
import { compressImageFile } from '../utils/cepRules';
import { prefillSubjectsForClass } from '../utils/storage';
import type { ModalConfig } from './ConfirmModal';

interface SettingsViewProps {
  config: DocConfig;
  classeParam: string;
  classesMatieres: ClassesMatieres;
  onUpdateConfig: (next: DocConfig) => void;
  onChangeClasseParam: (classe: string) => void;
  onUpdateClassesMatieres: (next: ClassesMatieres) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenModal: (modal: ModalConfig) => void;
}

interface ParamField {
  key: keyof DocConfig;
  label: string;
  type?: 'text' | 'select' | 'tel' | 'date' | 'file';
  options?: string[];
  placeholder?: string;
}

const PARAM_GROUPS: Array<{ titre: string; champs: ParamField[] }> = [
  {
    titre: 'Établissement',
    champs: [
      { key: 'circonscription', label: "Circonscription d'Éducation de Base de", placeholder: 'KOMSILGA 1' },
      { key: 'ecole', label: "Nom de l'école", placeholder: 'TAMPOUY' },
      { key: 'ecoleType', label: 'École primaire', type: 'select', options: ['Publique', 'Privée'] },
      { key: 'telephone', label: 'Téléphone', type: 'tel', placeholder: '76138005' },
      { key: 'ville', label: 'Ville', placeholder: 'TAMPOUY' },
      { key: 'anneeScolaire', label: 'Année scolaire', placeholder: '2026/2027' },
      { key: 'session', label: "Session de l'examen", placeholder: '2027' },
      { key: 'centre', label: "Centre d'examen demandé", placeholder: 'KOMSILGA A' },
      { key: 'dateEdition', label: 'Date des documents', type: 'date' },
    ],
  },
  {
    titre: "Responsable de l'école",
    champs: [
      { key: 'responsable', label: 'Responsable', type: 'select', options: ['Directeur', 'Directrice'] },
      { key: 'directeurNom', label: 'Nom & Prénoms DE', placeholder: 'Maldja OUOBA' },
      { key: 'directeurGrade', label: 'Corps DE', placeholder: 'Professeur Certifié des Écoles' },
      { key: 'decoration', label: 'Décoration DE', placeholder: "Chevalier de l'Ordre du Mérite" },
      { key: 'contactDirecteur', label: 'Contact du Directeur (carte scolaire)', type: 'tel', placeholder: '70100895' },
    ],
  },
  {
    titre: 'Images et cachets',
    champs: [
      { key: 'signature', label: 'Signature DE', type: 'file' },
      { key: 'signatureCachet', label: 'Signature + Cachet DE', type: 'file' },
      { key: 'armoiries', label: 'Armoiries', type: 'file' },
    ],
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  classeParam,
  classesMatieres,
  onUpdateConfig,
  onChangeClasseParam,
  onUpdateClassesMatieres,
  onToast,
  onOpenModal,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatCoef, setNewMatCoef] = useState(1);
  const [newMatMax, setNewMatMax] = useState(10);

  const [newTeacher, setNewTeacher] = useState<Omit<EnseignantConseil, 'id'>>({
    classe: classeParam || 'CM2',
    matricule: '',
    nom: '',
    prenoms: '',
    sexe: 'M',
    corps: '',
    fonction: 'Titulaire',
    statut: 'Titulaire',
    contact: '',
  });

  const thresholds: DecisionThresholds = {
    ...DEFAULT_DECISION_THRESHOLDS,
    ...(config.seuilsFinAnnee || {}),
  };
  const teachers: EnseignantConseil[] = Array.isArray(config.enseignantsConseil)
    ? config.enseignantsConseil
    : [];

  const handleThresholdChange = (key: keyof DecisionThresholds, raw: string) => {
    const parsed = Number(raw);
    const clamped = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(10, parsed));
    onUpdateConfig({
      ...config,
      seuilsFinAnnee: {
        ...thresholds,
        [key]: clamped,
      },
    });
  };

  const handleResetThresholds = () => {
    onUpdateConfig({
      ...config,
      seuilsFinAnnee: { ...DEFAULT_DECISION_THRESHOLDS },
    });
    onToast('Seuils par défaut rétablis', 'info');
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.nom.trim() || !newTeacher.prenoms.trim()) {
      onToast('Nom et prénom(s) de l’enseignant requis', 'error');
      return;
    }
    const created: EnseignantConseil = {
      id: `ens-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...newTeacher,
      classe: newTeacher.classe.trim(),
      matricule: newTeacher.matricule.trim(),
      nom: newTeacher.nom.trim().toUpperCase(),
      prenoms: newTeacher.prenoms.trim(),
      corps: newTeacher.corps.trim(),
      fonction: newTeacher.fonction.trim(),
      statut: newTeacher.statut.trim(),
      contact: newTeacher.contact.trim(),
    };
    onUpdateConfig({
      ...config,
      enseignantsConseil: [...teachers, created],
    });
    setNewTeacher({
      classe: classeParam || 'CM2',
      matricule: '',
      nom: '',
      prenoms: '',
      sexe: 'M',
      corps: '',
      fonction: 'Titulaire',
      statut: 'Titulaire',
      contact: '',
    });
    onToast(`${created.nom} ${created.prenoms} ajouté(e) au conseil`, 'success');
  };

  const handleAddDirectorToCouncil = () => {
    const full = String(config.directeurNom || '').trim();
    const parts = full.split(/\s+/).filter(Boolean);
    const prenoms = parts.length > 1 ? parts.slice(0, -1).join(' ') : full;
    const nom = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : full.toUpperCase();
    const created: EnseignantConseil = {
      id: `ens-dir-${Date.now()}`,
      classe: 'Direction',
      matricule: '',
      nom,
      prenoms,
      sexe: config.responsable === 'Directrice' ? 'F' : 'M',
      corps: config.directeurGrade || '',
      fonction: config.responsable || 'Directeur',
      statut: 'Titulaire',
      contact: config.contactDirecteur || config.telephone || '',
    };
    onUpdateConfig({
      ...config,
      enseignantsConseil: [...teachers, created],
    });
    onToast(`${config.responsable} ajouté(e) au conseil`, 'success');
  };

  const handleUpdateTeacher = (
    id: string,
    field: keyof Omit<EnseignantConseil, 'id'>,
    value: string
  ) => {
    const next = teachers.map((t) =>
      t.id === id ? { ...t, [field]: field === 'sexe' ? (value as Sexe) : value } : t
    );
    onUpdateConfig({ ...config, enseignantsConseil: next });
  };

  const handleDeleteTeacher = (id: string) => {
    const target = teachers.find((t) => t.id === id);
    if (!target) return;
    onUpdateConfig({
      ...config,
      enseignantsConseil: teachers.filter((t) => t.id !== id),
    });
    onToast(`${target.nom} ${target.prenoms} retiré(e) de la liste`, 'info');
  };

  const toggleLock = () => {
    if (unlocked) {
      setUnlocked(false);
      return;
    }
    onOpenModal({
      mode: 'prompt',
      title: 'Déverrouiller les informations officielles',
      message: 'Saisissez le mot de passe administrateur pour modifier les champs protégés.',
      confirmLabel: 'Déverrouiller',
      inputType: 'password',
      inputPlaceholder: 'Mot de passe',
      validate: (val) => (val === MOT_DE_PASSE_ADMIN ? null : 'Mot de passe incorrect.'),
      onConfirm: () => {
        setUnlocked(true);
        onToast('Paramètres déverrouillés', 'success');
      },
    });
  };

  const handleFieldChange = (key: keyof DocConfig, value: string) => {
    if (!unlocked && CHAMPS_VERROUILLES.has(key)) return;
    onUpdateConfig({ ...config, [key]: value });
  };

  const handleImageUpload = async (key: keyof DocConfig, file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 480, 0.85);
      onUpdateConfig({ ...config, [key]: compressed });
      onToast('Image enregistrée', 'success');
    } catch {
      onToast("Erreur lors du chargement de l'image", 'error');
    }
  };

  const handleResetConfig = () => {
    onOpenModal({
      mode: 'confirm',
      title: 'Rétablir les valeurs par défaut ?',
      message: 'Les champs établissement et images seront réinitialisés aux valeurs par défaut.',
      confirmLabel: 'Rétablir',
      danger: true,
      onConfirm: () => {
        onUpdateConfig(createDefaultConfig());
        onToast('Paramètres rétablis', 'info');
      },
    });
  };

  const matieres = classesMatieres[classeParam] || [];

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = newMatName.trim();
    if (!nom) {
      onToast('Nom de matière requis', 'error');
      return;
    }
    const nextMat: SubjectDef = {
      id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nom,
      coef: Math.max(1, newMatCoef || 1),
      max: Math.max(1, newMatMax || 10),
    };
    onUpdateClassesMatieres({
      ...classesMatieres,
      [classeParam]: [...matieres, nextMat],
    });
    setNewMatName('');
    setNewMatCoef(1);
    setNewMatMax(10);
    onToast(`Matière « ${nom} » ajoutée à ${classeParam}`, 'success');
  };

  const handleUpdateSubject = (idx: number, field: keyof SubjectDef, raw: string) => {
    const nextList = matieres.map((m, i) => {
      if (i !== idx) return m;
      if (field === 'nom') return { ...m, nom: raw };
      if (field === 'coef') return { ...m, coef: Math.max(1, parseInt(raw, 10) || 1) };
      if (field === 'max') return { ...m, max: Math.max(1, parseInt(raw, 10) || 1) };
      return m;
    });
    onUpdateClassesMatieres({ ...classesMatieres, [classeParam]: nextList });
  };

  const handleDeleteSubject = (idx: number) => {
    const target = matieres[idx];
    if (!target) return;
    onOpenModal({
      mode: 'confirm',
      title: 'Retirer cette matière ?',
      message: `Retirer « ${target.nom} » de la classe ${classeParam} ?`,
      confirmLabel: 'Retirer',
      danger: true,
      onConfirm: () => {
        onUpdateClassesMatieres({
          ...classesMatieres,
          [classeParam]: matieres.filter((_, i) => i !== idx),
        });
        onToast('Matière retirée', 'info');
      },
    });
  };

  const handlePrefillCurrent = () => {
    const updated = prefillSubjectsForClass(matieres, classeParam);
    const added = updated.length - matieres.length;
    if (added > 0) {
      onUpdateClassesMatieres({ ...classesMatieres, [classeParam]: updated });
      onToast(`${added} matière(s) officielle(s) ajoutée(s) à ${classeParam}`, 'success');
    } else {
      onToast(`Les matières de ${classeParam} sont déjà complètes`, 'info');
    }
  };

  const handlePrefillAll = () => {
    const next: ClassesMatieres = { ...classesMatieres };
    let totalAdded = 0;
    CLASSES_LISTE.forEach((cls) => {
      const prev = next[cls] || [];
      const updated = prefillSubjectsForClass(prev, cls);
      totalAdded += updated.length - prev.length;
      next[cls] = updated;
    });
    if (totalAdded > 0) {
      onUpdateClassesMatieres(next);
      onToast(`${totalAdded} matière(s) ajoutée(s) sur les classes`, 'success');
    } else {
      onToast('Toutes les classes sont déjà complètes', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Document Settings */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Paramètres des documents officiels
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Informations reprises automatiquement sur les certificats, fiches, chemises, listes et cartes scolaires.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetConfig}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Rétablir
            </button>
            <button
              type="button"
              onClick={toggleLock}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                unlocked
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {unlocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {unlocked ? 'Verrouiller' : 'Déverrouiller'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {PARAM_GROUPS.map((group) => (
            <div key={group.titre} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.titre}
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.champs.map((f) => {
                  const val = String(config[f.key] ?? '');
                  const isLocked = !unlocked && CHAMPS_VERROUILLES.has(f.key);

                  if (f.type === 'file') {
                    return (
                      <div
                        key={f.key}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2"
                      >
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {f.label}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-24 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                            {val ? (
                              <img src={val} alt={f.label} className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="text-[11px] text-slate-400">Aucune</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="cursor-pointer rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-center">
                              Choisir
                              <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  handleImageUpload(f.key, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {val && (
                              <button
                                type="button"
                                onClick={() => onUpdateConfig({ ...config, [f.key]: '' })}
                                className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={f.key}>
                      <label
                        htmlFor={`param-${f.key}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        <span>{f.label}</span>
                        {isLocked && <Lock className="h-3 w-3 text-slate-400" />}
                      </label>
                      {f.type === 'select' ? (
                        <select
                          id={`param-${f.key}`}
                          value={val}
                          disabled={isLocked}
                          onChange={(e) => handleFieldChange(f.key, e.target.value)}
                          className={`w-full rounded-lg border px-3 py-2 text-sm ${
                            isLocked
                              ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {f.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`param-${f.key}`}
                          type={f.type || 'text'}
                          value={val}
                          readOnly={isLocked}
                          placeholder={f.placeholder || ''}
                          onChange={(e) => handleFieldChange(f.key, e.target.value)}
                          className={`w-full rounded-lg border px-3 py-2 text-sm ${
                            isLocked
                              ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Class & Subjects Management */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Classes &amp; Matières par classe
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              La classe choisie ici s&apos;applique automatiquement aux formulaires candidats et aux évaluations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="classe-param-select" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Classe active :
            </label>
            <select
              id="classe-param-select"
              value={classeParam}
              onChange={(e) => onChangeClasseParam(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {CLASSES_LISTE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrefillCurrent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          >
            <Zap className="h-3.5 w-3.5" />
            Pré-remplir {classeParam} (DPEPPNF)
          </button>
          <button
            type="button"
            onClick={handlePrefillAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Zap className="h-3.5 w-3.5" />
            Pré-remplir toutes les classes
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums ml-auto">
            {matieres.length} matière(s) définie(s) pour {classeParam}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5">Matière</th>
                <th className="w-24 px-3 py-2.5">Coef</th>
                <th className="w-28 px-3 py-2.5">Notée sur</th>
                <th className="w-16 px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {matieres.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    Aucune matière pour {classeParam}. Utilisez « Pré-remplir » ou ajoutez une matière ci-dessous.
                  </td>
                </tr>
              ) : (
                matieres.map((m, idx) => (
                  <tr key={m.id}>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={m.nom}
                        aria-label={`Nom matière ${idx + 1}`}
                        onChange={(e) => handleUpdateSubject(idx, 'nom', e.target.value)}
                        className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-sm text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={1}
                        value={m.coef}
                        aria-label={`Coefficient ${m.nom}`}
                        onChange={(e) => handleUpdateSubject(idx, 'coef', e.target.value)}
                        className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={1}
                        value={m.max}
                        aria-label={`Note max ${m.nom}`}
                        onChange={(e) => handleUpdateSubject(idx, 'max', e.target.value)}
                        className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(idx)}
                        aria-label={`Retirer ${m.nom}`}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleAddSubject} className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="text"
            value={newMatName}
            onChange={(e) => setNewMatName(e.target.value)}
            placeholder="Nouvelle matière..."
            aria-label="Nom de la nouvelle matière"
            className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
          <input
            type="number"
            min={1}
            value={newMatCoef}
            onChange={(e) => setNewMatCoef(Math.max(1, Number(e.target.value) || 1))}
            aria-label="Coefficient"
            title="Coefficient"
            className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
          />
          <input
            type="number"
            min={1}
            value={newMatMax}
            onChange={(e) => setNewMatMax(Math.max(1, Number(e.target.value) || 10))}
            aria-label="Notée sur"
            title="Notée sur"
            className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </form>
      </section>

      {/* Annual Council Thresholds */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Seuils des décisions de fin d&apos;année
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paramètres appliqués automatiquement dans le tableau « Proposition de fin d&apos;année » (moyenne sur 10).
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetThresholds}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 self-start sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser les seuils
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="seuil-promotion" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Seuil de promotion (/10)
            </label>
            <input
              id="seuil-promotion"
              type="number"
              min={0}
              max={10}
              step={0.25}
              value={thresholds.promotion}
              onChange={(e) => handleThresholdChange('promotion', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Moy. ≥ seuil → Promu(e)
            </p>
          </div>

          <div>
            <label htmlFor="seuil-redoublement" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Seuil de redoublement (/10)
            </label>
            <input
              id="seuil-redoublement"
              type="number"
              min={0}
              max={10}
              step={0.25}
              value={thresholds.redoublement}
              onChange={(e) => handleThresholdChange('redoublement', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Moy. ≥ seuil → Redouble
            </p>
          </div>

          <div>
            <label htmlFor="seuil-renvoi" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Seuil de renvoi (/10)
            </label>
            <input
              id="seuil-renvoi"
              type="number"
              min={0}
              max={10}
              step={0.25}
              value={thresholds.renvoi}
              onChange={(e) => handleThresholdChange('renvoi', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Moy. &lt; seuil → Renvoyé
            </p>
          </div>

          <div>
            <label htmlFor="seuil-abandons" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Seuil d&apos;abandons (/10)
            </label>
            <input
              id="seuil-abandons"
              type="number"
              min={0}
              max={10}
              step={0.25}
              value={thresholds.abandons}
              onChange={(e) => handleThresholdChange('abandons', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Moy. ≤ seuil ou sans note → Abandons
            </p>
          </div>

          <div>
            <label htmlFor="seuil-findecycle" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Seuil fin de cycle (/10)
            </label>
            <input
              id="seuil-findecycle"
              type="number"
              min={0}
              max={10}
              step={0.25}
              value={thresholds.finDeCycle}
              onChange={(e) => handleThresholdChange('finDeCycle', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              CM2 avec Moy. ≥ seuil → Fin de cycle
            </p>
          </div>
        </div>
      </section>

      {/* Council Teachers List */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Conseil des enseignants (participants)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Liste imprimée à la suite de la proposition de fin d&apos;année (colonne Signature laissée vierge pour émargement).
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddDirectorToCouncil}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 self-start sm:self-auto"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Ajouter {config.responsable === 'Directrice' ? 'la Directrice' : 'le Directeur'}
          </button>
        </div>

        <form onSubmit={handleAddTeacher} className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5 items-end rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
          <div>
            <label htmlFor="ens-classe" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Classe
            </label>
            <input
              id="ens-classe"
              type="text"
              list="ens-classes-opts"
              value={newTeacher.classe}
              onChange={(e) => setNewTeacher({ ...newTeacher, classe: e.target.value })}
              placeholder="CM2, CM1, Direction..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
            <datalist id="ens-classes-opts">
              <option value="Direction" />
              {CLASSES_LISTE.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="ens-matricule" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Matricule
            </label>
            <input
              id="ens-matricule"
              type="text"
              value={newTeacher.matricule}
              onChange={(e) => setNewTeacher({ ...newTeacher, matricule: e.target.value })}
              placeholder="Ex. 245189-B"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="ens-nom" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nom *
            </label>
            <input
              id="ens-nom"
              type="text"
              value={newTeacher.nom}
              onChange={(e) => setNewTeacher({ ...newTeacher, nom: e.target.value })}
              placeholder="OUEDRAOGO"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="ens-prenoms" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Prénoms *
            </label>
            <input
              id="ens-prenoms"
              type="text"
              value={newTeacher.prenoms}
              onChange={(e) => setNewTeacher({ ...newTeacher, prenoms: e.target.value })}
              placeholder="Mariam"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="ens-sexe" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sexe
            </label>
            <select
              id="ens-sexe"
              value={newTeacher.sexe}
              onChange={(e) => setNewTeacher({ ...newTeacher, sexe: e.target.value as Sexe })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label htmlFor="ens-corps" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Corps
            </label>
            <input
              id="ens-corps"
              type="text"
              value={newTeacher.corps}
              onChange={(e) => setNewTeacher({ ...newTeacher, corps: e.target.value })}
              placeholder="PE / IAC / PCE"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="ens-fonction" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Fonction
            </label>
            <input
              id="ens-fonction"
              type="text"
              value={newTeacher.fonction}
              onChange={(e) => setNewTeacher({ ...newTeacher, fonction: e.target.value })}
              placeholder="Titulaire / Adjoint"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="ens-statut" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Statut
            </label>
            <input
              id="ens-statut"
              type="text"
              value={newTeacher.statut}
              onChange={(e) => setNewTeacher({ ...newTeacher, statut: e.target.value })}
              placeholder="Titulaire / Stagiaire"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="ens-contact" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contact
            </label>
            <input
              id="ens-contact"
              type="tel"
              value={newTeacher.contact}
              onChange={(e) => setNewTeacher({ ...newTeacher, contact: e.target.value })}
              placeholder="70 00 00 00"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter l&apos;enseignant
            </button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                <th className="px-2.5 py-2">Classe</th>
                <th className="px-2.5 py-2">Matricule</th>
                <th className="px-2.5 py-2">Nom</th>
                <th className="px-2.5 py-2">Prénoms</th>
                <th className="px-2.5 py-2 w-16">Sexe</th>
                <th className="px-2.5 py-2">Corps</th>
                <th className="px-2.5 py-2">Fonction</th>
                <th className="px-2.5 py-2">Statut</th>
                <th className="px-2.5 py-2">Contact</th>
                <th className="px-2.5 py-2 w-12 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    Aucun enseignant enregistré. Ajoutez les participants ci-dessus (sinon 3 lignes vierges seront affichées à l&apos;impression).
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id}>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.classe}
                        aria-label={`Classe ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'classe', e.target.value)}
                        className="w-20 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.matricule}
                        aria-label={`Matricule ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'matricule', e.target.value)}
                        className="w-24 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs font-mono-tabular text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.nom}
                        aria-label={`Nom ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'nom', e.target.value)}
                        className={`w-28 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs ${
                          t.sexe === 'F' ? 'font-bold text-[#8b0000] dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.prenoms}
                        aria-label={`Prénoms ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'prenoms', e.target.value)}
                        className={`w-32 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs ${
                          t.sexe === 'F' ? 'font-bold text-[#8b0000] dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={t.sexe}
                        aria-label={`Sexe ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'sexe', e.target.value)}
                        className={`w-14 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-1 text-xs ${
                          t.sexe === 'F' ? 'font-bold text-[#8b0000] dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.corps}
                        aria-label={`Corps ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'corps', e.target.value)}
                        className="w-24 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.fonction}
                        aria-label={`Fonction ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'fonction', e.target.value)}
                        className="w-24 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.statut}
                        aria-label={`Statut ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'statut', e.target.value)}
                        className="w-24 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={t.contact}
                        aria-label={`Contact ${t.nom}`}
                        onChange={(e) => handleUpdateTeacher(t.id, 'contact', e.target.value)}
                        className="w-24 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTeacher(t.id)}
                        aria-label={`Retirer ${t.nom} ${t.prenoms}`}
                        className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
