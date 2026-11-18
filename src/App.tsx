/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard,
  Users,
  FileText,
  Table2,
  Hash,
  CreditCard,
  GraduationCap,
  Settings,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import type {
  Candidate,
  ClassesMatieres,
  DocConfig,
  EvaluationsStore,
  NavTab,
  PageOrientationMode,
  ToastItem,
} from './types/cep';
import { ALL_FIELDS, buildDemoCandidates } from './constants/cepConstants';
import {
  loadCandidates,
  loadClasseParam,
  loadClassesMatieres,
  loadDocConfig,
  loadEvaluations,
  loadTheme,
  saveCandidates,
  saveClasseParam,
  saveClassesMatieres,
  saveDocConfig,
  saveEvaluations,
  saveTheme,
} from './utils/storage';
import { isLibreFlag, normalizeCandidateInput, versCandidatDocument } from './utils/cepRules';
import { buildDossierCompletHTML } from './utils/documentBuilders';
import { fitDocumentDataFonts } from './utils/documentFit';
import { exportHtmlToPdf } from './utils/pdfExporter';
import { ConfirmModal, ModalConfig } from './components/ConfirmModal';
import { CommandPalette } from './components/CommandPalette';
import { DashboardView } from './components/DashboardView';
import { CandidatesView } from './components/CandidatesView';
import { DocumentsView } from './components/DocumentsView';
import { ListsView } from './components/ListsView';
import { PVManagerView } from './components/PVManagerView';
import { CardsView } from './components/CardsView';
import { EvaluationsView } from './components/EvaluationsView';
import { SettingsView } from './components/SettingsView';

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  section: string;
  icon: React.ReactNode;
}> = [
  { id: 'dashboard', label: 'Tableau de bord', section: 'Pilotage', icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { id: 'candidats', label: 'Candidats', section: 'Pilotage', icon: <Users className="h-4 w-4 shrink-0" /> },
  { id: 'documents', label: 'Documents officiels', section: 'Dossiers', icon: <FileText className="h-4 w-4 shrink-0" /> },
  { id: 'listes', label: 'Listes & État', section: 'Dossiers', icon: <Table2 className="h-4 w-4 shrink-0" /> },
  { id: 'pv', label: 'N° PV', section: 'Dossiers', icon: <Hash className="h-4 w-4 shrink-0" /> },
  { id: 'cartes', label: 'Cartes scolaires', section: 'Dossiers', icon: <CreditCard className="h-4 w-4 shrink-0" /> },
  { id: 'evaluations', label: 'Évaluations', section: 'Pédagogie', icon: <GraduationCap className="h-4 w-4 shrink-0" /> },
  { id: 'parametres', label: 'Paramètres', section: 'Administration', icon: <Settings className="h-4 w-4 shrink-0" /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [candidateFormOpen, setCandidateFormOpen] = useState(false);
  const [selectedDocCandidateId, setSelectedDocCandidateId] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>(() => loadCandidates());
  const [config, setConfig] = useState<DocConfig>(() => loadDocConfig());
  const [classeParam, setClasseParam] = useState<string>(() => loadClasseParam());
  const [classesMatieres, setClassesMatieres] = useState<ClassesMatieres>(() =>
    loadClassesMatieres()
  );
  const [evaluations, setEvaluations] = useState<EvaluationsStore>(() => loadEvaluations());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const printRootRef = useRef<HTMLDivElement | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveTheme(theme);
  }, [theme]);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Clear print portal after printing finishes
  useEffect(() => {
    const onAfterPrint = () => {
      if (printRootRef.current) {
        printRootRef.current.innerHTML = '';
      }
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const handleSaveCandidates = useCallback((next: Candidate[]) => {
    setCandidates(next);
    saveCandidates(next);
  }, []);

  const handleUpdateConfig = useCallback((next: DocConfig) => {
    setConfig(next);
    saveDocConfig(next);
  }, []);

  const handleChangeClasseParam = useCallback((classe: string) => {
    setClasseParam(classe);
    saveClasseParam(classe);
  }, []);

  const handleUpdateClassesMatieres = useCallback((next: ClassesMatieres) => {
    setClassesMatieres(next);
    saveClassesMatieres(next);
  }, []);

  const handleSaveEvaluations = useCallback((next: EvaluationsStore) => {
    setEvaluations(next);
    saveEvaluations(next);
  }, []);

  const triggerPrint = useCallback(
    (html: string, afterInsert?: (root: HTMLElement) => void) => {
      const el = printRootRef.current;
      if (!el) return;
      el.innerHTML = html;
      requestAnimationFrame(() => {
        if (afterInsert) {
          afterInsert(el);
        }
        fitDocumentDataFonts(el);
        requestAnimationFrame(() => {
          window.print();
        });
      });
    },
    []
  );

  const handleLoadDemo = useCallback(() => {
    const applyDemo = () => {
      const demo = buildDemoCandidates(classeParam).map((c) =>
        normalizeCandidateInput(c, classeParam)
      );
      handleSaveCandidates(demo);
      addToast(`${demo.length} candidats de démonstration chargés`, 'success');
    };

    if (candidates.length > 0) {
      setModal({
        mode: 'confirm',
        title: 'Charger le jeu de démonstration ?',
        message: `Cette action remplacera les ${candidates.length} candidat(s) actuel(s) par 6 profils d'exemple complets.`,
        confirmLabel: 'Remplacer et charger',
        danger: true,
        onConfirm: applyDemo,
      });
    } else {
      applyDemo();
    }
  }, [candidates.length, classeParam, handleSaveCandidates, addToast]);

  const handleExportExcelQuick = useCallback(() => {
    if (!candidates.length) {
      addToast('Aucun candidat à exporter', 'error');
      return;
    }
    const headers = ALL_FIELDS.map((f) => f.label);
    const rows = candidates.map((c) =>
      ALL_FIELDS.map((f) => {
        if (f.key === 'libre') return isLibreFlag(c.libre) ? 'Oui' : 'Non';
        return String((c as unknown as Record<string, unknown>)[f.key] ?? '');
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidats');
    XLSX.writeFile(wb, `candidats_${classeParam.toLowerCase()}.xlsx`);
    addToast('Export Excel téléchargé');
  }, [candidates, classeParam, addToast]);

  const handleExportPdf = useCallback(
    async (opts: {
      html: string;
      filename: string;
      orientationMode?: PageOrientationMode;
      afterInsert?: (root: HTMLElement) => void;
    }) => {
      try {
        addToast('Génération du PDF en cours…', 'info');
        const res = await exportHtmlToPdf(opts);
        const hasP = res.orientations.includes('portrait');
        const hasL = res.orientations.includes('landscape');
        const orientInfo =
          hasP && hasL ? 'Portrait + Paysage' : hasL ? 'Paysage' : 'Portrait';
        addToast(
          `PDF téléchargé (${res.pageCount} page${res.pageCount > 1 ? 's' : ''} · ${orientInfo})`,
          'success'
        );
      } catch (err) {
        addToast(
          err instanceof Error ? `Erreur PDF : ${err.message}` : 'Échec de génération du PDF',
          'error'
        );
      }
    },
    [addToast]
  );

  const handleExportAllDossiersPdf = useCallback(async () => {
    if (!candidates.length) {
      addToast('Aucun candidat dans la base', 'error');
      return;
    }
    const html = candidates
      .map((c) => buildDossierCompletHTML(versCandidatDocument(c, classeParam), config))
      .join('');
    await handleExportPdf({
      html,
      filename: `dossiers_complets_${classeParam.toLowerCase()}.pdf`,
      orientationMode: 'auto',
    });
  }, [candidates, config, classeParam, handleExportPdf, addToast]);

  const handleOpenNewCandidate = useCallback(() => {
    setActiveTab('candidats');
    setCandidateFormOpen(true);
    setMobileMenuOpen(false);
  }, []);

  const handleSelectCandidateDoc = useCallback((matricule: string) => {
    setSelectedDocCandidateId(matricule);
    setActiveTab('documents');
    setMobileMenuOpen(false);
  }, []);

  const currentNavMeta = useMemo(
    () => NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0],
    [activeTab]
  );

  const groupedNav = useMemo(() => {
    const sections = ['Pilotage', 'Dossiers', 'Pédagogie', 'Administration'];
    return sections.map((sec) => ({
      section: sec,
      items: NAV_ITEMS.filter((i) => i.section === sec),
    }));
  }, []);

  const navBadge = (id: NavTab): string | null => {
    if (id === 'candidats' && candidates.length > 0) return String(candidates.length);
    if (id === 'pv') {
      const missing = candidates.filter((c) => !c.pv?.trim()).length;
      if (missing > 0) return String(missing);
    }
    return null;
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">
              CEP
            </span>
            <span className="truncate font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              CEP Gestion
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {config.ecole || 'École'} · {config.anneeScolaire}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fermer le menu"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Navigation principale">
        {groupedNav.map((group) => (
          <div key={group.section}>
            <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = activeTab === item.id;
                const badge = navBadge(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                          active
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-200'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer summary */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center justify-between">
          <span>Classe active</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{classeParam}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Session</span>
          <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200">
            {config.session}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Clean 3-zone Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir la navigation"
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {currentNavMeta.section}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
              <h1 className="truncate font-display text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {currentNavMeta.label}
              </h1>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Recherche rapide</span>
              <kbd className="hidden md:inline-block rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono-tabular text-slate-500 dark:text-slate-400">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
              title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Active View Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              candidates={candidates}
              classeParam={classeParam}
              config={config}
              classesMatieres={classesMatieres}
              evaluations={evaluations}
              onNavigate={setActiveTab}
              onNewCandidate={handleOpenNewCandidate}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {activeTab === 'candidats' && (
            <CandidatesView
              candidates={candidates}
              classeParam={classeParam}
              config={config}
              formOpen={candidateFormOpen}
              setFormOpen={setCandidateFormOpen}
              onSaveCandidates={handleSaveCandidates}
              onOpenDocsFor={handleSelectCandidateDoc}
              onPrintAllDossiers={handleExportAllDossiersPdf}
              onLoadDemo={handleLoadDemo}
              onToast={addToast}
              onOpenModal={setModal}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              candidates={candidates}
              classeParam={classeParam}
              config={config}
              initialCandidateId={selectedDocCandidateId}
              onOpenSettings={() => setActiveTab('parametres')}
              onTriggerPrint={triggerPrint}
              onExportPdf={handleExportPdf}
            />
          )}

          {activeTab === 'listes' && (
            <ListsView
              candidates={candidates}
              config={config}
              onTriggerPrint={triggerPrint}
              onExportPdf={handleExportPdf}
            />
          )}

          {activeTab === 'pv' && (
            <PVManagerView
              candidates={candidates}
              session={config.session}
              onSaveCandidates={handleSaveCandidates}
              onToast={addToast}
            />
          )}

          {activeTab === 'cartes' && (
            <CardsView
              candidates={candidates}
              classeParam={classeParam}
              config={config}
              onTriggerPrint={triggerPrint}
              onExportPdf={handleExportPdf}
            />
          )}

          {activeTab === 'evaluations' && (
            <EvaluationsView
              candidates={candidates}
              classeParam={classeParam}
              classesMatieres={classesMatieres}
              evaluations={evaluations}
              config={config}
              onSaveEvaluations={handleSaveEvaluations}
              onTriggerPrint={triggerPrint}
              onExportPdf={handleExportPdf}
              onOpenSettings={() => setActiveTab('parametres')}
              onToast={addToast}
              onOpenModal={setModal}
            />
          )}

          {activeTab === 'parametres' && (
            <SettingsView
              config={config}
              classeParam={classeParam}
              classesMatieres={classesMatieres}
              onUpdateConfig={handleUpdateConfig}
              onChangeClasseParam={handleChangeClasseParam}
              onUpdateClassesMatieres={handleUpdateClassesMatieres}
              onToast={addToast}
              onOpenModal={setModal}
            />
          )}
        </main>
      </div>

      {/* Print Portal directly on document.body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="cep-print-root" ref={printRootRef} aria-hidden="true" />,
          document.body
        )}

      {/* Command Palette */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        candidates={candidates}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        onSelectCandidateDoc={handleSelectCandidateDoc}
        onNewCandidate={handleOpenNewCandidate}
        onExportExcel={handleExportExcelQuick}
      />

      {/* Confirm / Password Modal */}
      <ConfirmModal modal={modal} onClose={() => setModal(null)} />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-lg ${
                t.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
                  : t.type === 'info'
                    ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              }`}
            >
              {t.type === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : t.type === 'info' ? (
                <Info className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span className="flex-1">{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
