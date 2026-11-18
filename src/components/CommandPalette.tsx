import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  LayoutDashboard,
  Users,
  FileText,
  Table2,
  Hash,
  CreditCard,
  GraduationCap,
  Settings,
  Download,
  UserPlus,
  X,
} from 'lucide-react';
import type { Candidate, NavTab } from '../types/cep';
import { sansAccent } from '../utils/cepRules';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onNavigate: (tab: NavTab) => void;
  onSelectCandidateDoc: (matricule: string) => void;
  onNewCandidate: () => void;
  onExportExcel: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  candidates,
  onNavigate,
  onSelectCandidateDoc,
  onNewCandidate,
  onExportExcel,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const navItems: Array<{ id: NavTab; label: string; sub: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Tableau de bord', sub: 'Synthèse et statistiques', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'candidats', label: 'Candidats', sub: 'Inscription, import et recherche', icon: <Users className="h-4 w-4" /> },
    { id: 'documents', label: 'Documents officiels', sub: 'Certificats, fiches et chemises', icon: <FileText className="h-4 w-4" /> },
    { id: 'listes', label: 'Listes & État numérique', sub: 'ESH, EDF, EOV, Pupilles', icon: <Table2 className="h-4 w-4" /> },
    { id: 'pv', label: 'N° PV', sub: 'Attribution et génération en lot (distinct du matricule)', icon: <Hash className="h-4 w-4" /> },
    { id: 'cartes', label: 'Cartes scolaires', sub: 'Impression recto / verso (10/page)', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'evaluations', label: 'Gestion évaluations', sub: 'Notes, rangs, mentions et bulletins', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'parametres', label: 'Paramètres', sub: 'École, cachets et matières par classe', icon: <Settings className="h-4 w-4" /> },
  ];

  const q = sansAccent(query.trim());

  const filteredNav = useMemo(
    () =>
      navItems.filter(
        (n) => !q || sansAccent(n.label).includes(q) || sansAccent(n.sub).includes(q)
      ),
    [q]
  );

  const filteredCandidates = useMemo(() => {
    if (!q) return candidates.slice(0, 5);
    return candidates
      .filter((c) =>
        sansAccent(`${c.matricule} ${c.nom} ${c.prenoms} ${c.pv}`).includes(q)
      )
      .slice(0, 8);
  }, [candidates, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-[2px] pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Recherche rapide et commandes"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un candidat, une section ou une action..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          <div>
            <div className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Actions rapides
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewCandidate();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Ajouter un nouveau candidat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExportExcel();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Exporter la liste en Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {filteredCandidates.length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Candidats ({filteredCandidates.length})
              </div>
              <div className="space-y-0.5">
                {filteredCandidates.map((c) => (
                  <button
                    key={c.matricule}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectCandidateDoc(c.matricule);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="min-w-0">
                      <div
                        className={`truncate ${
                          c.sexe === 'F'
                            ? 'font-bold text-[#8b0000] dark:text-red-400'
                            : 'font-normal text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {c.nom} {c.prenoms}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                        {c.matricule} · {c.classe || 'CM2'} · {c.categorie || 'Sans option'}
                      </div>
                    </div>
                    <span className="text-xs text-blue-700 dark:text-blue-400 shrink-0">
                      Ouvrir documents
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Navigation
              </div>
              <div className="space-y-0.5">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate(item.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="text-slate-400 shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-slate-400 ml-auto truncate">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
