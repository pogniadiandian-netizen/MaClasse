import {
  ALL_FIELDS,
  CATEGORIES,
  DEFAULT_DECISION_THRESHOLDS,
} from '../constants/cepConstants';
import type {
  Candidate,
  CandidateDocumentModel,
  CategorieEntree,
  CouncilDecisionKind,
  DecisionThresholds,
  DocumentKind,
  EvaluationRecord,
  EvaluationsStore,
  ExamNiveau,
  Option6e,
  PageOrientation,
  PageOrientationMode,
  Sexe,
  SubjectDef,
} from '../types/cep';

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[m] ?? m;
  });
}

export function sansAccent(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function parseDateParts(dateStr: string | undefined | null): { y: number; m: number; d: number } | null {
  if (!dateStr) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (iso) {
    return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  }
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(dateStr.trim());
  if (fr) {
    return { y: Number(fr[3]), m: Number(fr[2]), d: Number(fr[1]) };
  }
  return null;
}

export function formatDateLong(dateStr: string | undefined | null, fallback = ''): string {
  if (!dateStr) return fallback;
  const parts = parseDateParts(dateStr);
  if (!parts || parts.m < 1 || parts.m > 12) return String(dateStr);
  return `${String(parts.d).padStart(2, '0')} ${MOIS_FR[parts.m - 1]} ${parts.y}`;
}

export function formatDateShort(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const parts = parseDateParts(dateStr);
  if (!parts) return String(dateStr);
  return `${String(parts.d).padStart(2, '0')}/${String(parts.m).padStart(2, '0')}/${parts.y}`;
}

export function calculateAge(dateStr: string | undefined | null, referenceDate = new Date()): number | '' {
  const parts = parseDateParts(dateStr);
  if (!parts) return '';
  let age = referenceDate.getFullYear() - parts.y;
  const monthDiff = referenceDate.getMonth() + 1 - parts.m;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < parts.d)) {
    age--;
  }
  return age >= 0 ? age : '';
}

export function optionDeCategorie(cat: string | undefined): Option6e {
  if (!cat) return '';
  if (/ET$/.test(cat)) return 'ET';
  if (/EG$/.test(cat)) return 'EG';
  return '';
}

export function isLibreFlag(libre: unknown): boolean {
  return libre === true || /^(oui|1|true|vrai)$/i.test(String(libre ?? '').trim());
}

export function categorieDe(c: Partial<Candidate>): CategorieEntree {
  if (c.categorie && CATEGORIES.includes(c.categorie)) return c.categorie;
  const o = c.option6e;
  const libre = isLibreFlag(c.libre);
  if (libre) return o === 'EG' ? 'CEP + EG' : o === 'ET' ? 'CEP + ET' : 'CEP Seul';
  return o === 'EG' ? 'EG Seul' : o === 'ET' ? 'ET Seul' : '';
}

export function normalizeCandidateInput(
  raw: Partial<Candidate>,
  classeActive: string
): Candidate {
  const pupille = raw.pupille === 'Oui' ? 'Oui' : raw.pupille === 'Non' ? 'Non' : '';
  const handicap = raw.handicap === 'Oui' ? 'Oui' : raw.handicap === 'Non' ? 'Non' : '';
  const deplace = raw.deplace === 'Oui' ? 'Oui' : raw.deplace === 'Non' ? 'Non' : '';
  const eov = raw.eov === 'Oui' ? 'Oui' : raw.eov === 'Non' ? 'Non' : '';
  const categorie = CATEGORIES.includes(raw.categorie as CategorieEntree)
    ? (raw.categorie as CategorieEntree)
    : '';
  const option6e = categorie ? optionDeCategorie(categorie) : '';

  return {
    matricule: (raw.matricule ?? '').trim(),
    nom: (raw.nom ?? '').trim(),
    prenoms: (raw.prenoms ?? '').trim(),
    sexe: raw.sexe === 'M' || raw.sexe === 'F' ? raw.sexe : '',
    dateNaiss: (raw.dateNaiss ?? '').trim(),
    lieuNaiss: (raw.lieuNaiss ?? '').trim(),
    pupille,
    numeroIdentification: pupille === 'Oui' ? (raw.numeroIdentification ?? '').trim() : '',
    handicap,
    natureHandicap: handicap === 'Oui' ? (raw.natureHandicap ?? '').trim() : '',
    deplace,
    eov,
    vulnerabilite: eov === 'Oui' ? (raw.vulnerabilite ?? '').trim() : '',
    pere: (raw.pere ?? '').trim(),
    mere: (raw.mere ?? '').trim(),
    professionPere: (raw.professionPere ?? '').trim(),
    professionMere: (raw.professionMere ?? '').trim(),
    village: (raw.village ?? '').trim(),
    fonction: (raw.fonction ?? '').trim(),
    contact: (raw.contact ?? '').trim(),
    classe: (raw.classe ?? classeActive).trim() || classeActive,
    categorie,
    option6e,
    filiere: option6e === 'ET' ? (raw.filiere ?? '').trim() : '',
    libre: raw.libre === 'Oui' || raw.libre === 'Non' ? raw.libre : isLibreFlag(raw.libre) ? 'Oui' : '',
    pv: (raw.pv ?? '').trim(),
    dateInscription: (raw.dateInscription ?? '').trim(),
    redoublements: (raw.redoublements ?? '').trim(),
    nationalite: (raw.nationalite ?? '').trim(),
    region: (raw.region ?? '').trim(),
    resSecteur: (raw.resSecteur ?? '').trim(),
    cepSession: (raw.cepSession ?? '').trim(),
    choix1: (raw.choix1 ?? '').trim(),
    choix2: (raw.choix2 ?? '').trim(),
    choix3: (raw.choix3 ?? '').trim(),
    scolarite: (raw.scolarite ?? '').trim(),
    aptitude: (raw.aptitude ?? '').trim(),
    points: (raw.points ?? '').trim(),
    moyenne: (raw.moyenne ?? '').trim(),
    ecole: raw.ecole,
    ceb: raw.ceb,
    documents: raw.documents ?? { photo: { fourni: false } },
  };
}

export function validateCandidate(
  data: Candidate,
  existing: Candidate[],
  editingMatricule: string | null = null
): string | null {
  if (!data.matricule || !data.nom || !data.prenoms) {
    return 'Matricule, Nom et Prénom(s) sont obligatoires.';
  }
  const dup = existing.some(
    (c) =>
      c.matricule !== editingMatricule &&
      c.matricule.toLowerCase() === data.matricule.toLowerCase()
  );
  if (dup) {
    return `Le matricule « ${data.matricule} » existe déjà.`;
  }
  if (data.pupille === 'Oui' && !data.numeroIdentification) {
    return "Le N° d'identification est requis pour un élève pupille.";
  }
  if (data.option6e === 'ET' && !data.filiere) {
    return "La filière est requise pour l'option ET (Enseignement Technique).";
  }
  if (data.handicap === 'Oui' && !data.natureHandicap) {
    return 'La nature du handicap est requise si ESH = Oui.';
  }
  if (data.eov === 'Oui' && !data.vulnerabilite) {
    return "L'état de vulnérabilité est requis si EOV = Oui.";
  }
  return null;
}

export function getCandidateCompleteness(c: Candidate): {
  filled: number;
  total: number;
  pct: number;
  missingImportant: string[];
} {
  const checks: Array<{ ok: boolean; label: string }> = [
    { ok: Boolean(c.matricule), label: 'Matricule' },
    { ok: Boolean(c.nom && c.prenoms), label: 'Identité' },
    { ok: Boolean(c.sexe), label: 'Sexe' },
    { ok: Boolean(c.dateNaiss && c.lieuNaiss), label: 'Naissance' },
    { ok: Boolean(c.pere && c.mere), label: 'Filiation' },
    { ok: Boolean(c.contact), label: 'Contact' },
    { ok: Boolean(c.pv), label: 'N° PV' },
    { ok: Boolean(c.documents?.photo?.fourni), label: 'Photo' },
  ];
  const filled = checks.filter((x) => x.ok).length;
  return {
    filled,
    total: checks.length,
    pct: Math.round((filled / checks.length) * 100),
    missingImportant: checks.filter((x) => !x.ok).map((x) => x.label),
  };
}

export interface EvalComputedRow {
  key: string;
  matricule?: string;
  label: string;
  nom?: string;
  prenoms?: string;
  sexe?: Sexe;
  esh?: 'Oui' | 'Non';
  edf?: 'Oui' | 'Non';
  pupille?: 'Oui' | 'Non';
  total: number;
  sommeCoef: number;
  moyenne: number;
  rank: number;
  notesEntered: number;
}

export function getMentionEval(m: number): { code: 'tb' | 'b' | 'ab' | 'p' | 'e'; label: string } {
  if (m >= 8) return { code: 'tb', label: 'Très Bien' };
  if (m >= 7) return { code: 'b', label: 'Bien' };
  if (m >= 6) return { code: 'ab', label: 'Assez Bien' };
  if (m >= 5) return { code: 'p', label: 'Passable' };
  return { code: 'e', label: 'Échec' };
}

export function computeEvaluationRows(
  students: Array<{
    key: string;
    matricule?: string;
    label: string;
    nom?: string;
    prenoms?: string;
    sexe?: Sexe;
    esh?: 'Oui' | 'Non';
    edf?: 'Oui' | 'Non';
    pupille?: 'Oui' | 'Non';
  }>,
  matieres: SubjectDef[],
  notes: Record<string, Record<string, string>>
): EvalComputedRow[] {
  const rows: EvalComputedRow[] = students.map((st) => {
    let total = 0;
    let sommeCoef = 0;
    let notesEntered = 0;

    matieres.forEach((m) => {
      const raw = notes[st.key]?.[m.id];
      const hasVal = raw !== '' && raw !== undefined && raw !== null;
      const n = hasVal ? Number(raw) : null;
      const coef = Number(m.coef) > 0 ? Number(m.coef) : 1;
      const max = Number(m.max) > 0 ? Number(m.max) : 10;
      sommeCoef += coef;
      if (n !== null && !Number.isNaN(n)) {
        notesEntered++;
        total += (n / max) * 10 * coef;
      }
    });

    const moyenne = sommeCoef > 0 ? total / sommeCoef : 0;
    return {
      key: st.key,
      matricule: st.matricule,
      label: st.label,
      nom: st.nom,
      prenoms: st.prenoms,
      sexe: st.sexe,
      esh: st.esh,
      edf: st.edf,
      pupille: st.pupille,
      total,
      sommeCoef,
      moyenne,
      rank: 1,
      notesEntered,
    };
  });

  const sorted = [...rows].sort((a, b) => b.moyenne - a.moyenne);
  let rank = 0;
  let prev: number | null = null;
  sorted.forEach((r, i) => {
    if (prev === null || Math.abs(r.moyenne - prev) > 1e-9) {
      rank = i + 1;
    }
    r.rank = rank;
    prev = r.moyenne;
  });

  return rows;
}

export function computeEvaluationStats(rows: EvalComputedRow[], seuil = 5) {
  if (!rows.length) {
    return {
      totalCandidats: 0,
      admis: [] as EvalComputedRow[],
      ajournes: [] as EvalComputedRow[],
      moyenneClasse: 0,
      meilleure: 0,
      plusBasse: 0,
      tauxReussite: 0,
      mentions: { tb: 0, b: 0, ab: 0, p: 0, e: 0 },
    };
  }
  const admis = rows
    .filter((r) => r.moyenne >= seuil)
    .sort((a, b) => b.moyenne - a.moyenne || a.label.localeCompare(b.label, 'fr'));
  const ajournes = rows
    .filter((r) => r.moyenne < seuil)
    .sort((a, b) => b.moyenne - a.moyenne || a.label.localeCompare(b.label, 'fr'));
  const moyenneClasse = rows.reduce((x, r) => x + r.moyenne, 0) / rows.length;
  const meilleure = Math.max(...rows.map((r) => r.moyenne));
  const plusBasse = Math.min(...rows.map((r) => r.moyenne));
  const tauxReussite = (admis.length / rows.length) * 100;

  const mentions = { tb: 0, b: 0, ab: 0, p: 0, e: 0 };
  rows.forEach((r) => {
    const m = getMentionEval(r.moyenne);
    mentions[m.code]++;
  });

  return {
    totalCandidats: rows.length,
    admis,
    ajournes,
    moyenneClasse,
    meilleure,
    plusBasse,
    tauxReussite,
    mentions,
  };
}

export function generateBatchPVs(
  count: number,
  prefix: string,
  startNumber: number,
  padDigits: number
): string[] {
  const cleanPrefix = prefix.trim();
  const safeStart = Math.max(1, Math.floor(startNumber));
  const safePad = Math.max(1, Math.min(8, Math.floor(padDigits)));
  return Array.from({ length: count }, (_, idx) => {
    const num = String(safeStart + idx).padStart(safePad, '0');
    return `${cleanPrefix}${num}`;
  });
}

export function parseCSV(text: string): string[][] {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const premiereLigne = clean.split(/\r?\n/)[0] || '';
  const sep = premiereLigne.includes(';') ? ';' : ',';
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = '';
  let guillemet = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (guillemet) {
      if (c === '"' && clean[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        guillemet = false;
      } else {
        champ += c;
      }
    } else {
      if (c === '"') guillemet = true;
      else if (c === sep) {
        ligne.push(champ);
        champ = '';
      } else if (c === '\n') {
        ligne.push(champ);
        lignes.push(ligne);
        ligne = [];
        champ = '';
      } else if (c !== '\r') {
        champ += c;
      }
    }
  }
  if (champ !== '' || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((x) => String(x).trim() !== ''));
}

export function parseImportedRows(
  rows: Record<string, unknown>[],
  existing: Candidate[],
  classeActive: string
): { imported: Candidate[]; ignored: number } {
  const imported: Candidate[] = [];
  let ignored = 0;
  const seenMatricules = new Set(existing.map((c) => c.matricule.toLowerCase()));

  const ouiNon = (v: unknown): '' | 'Oui' | 'Non' => {
    const s = String(v ?? '').trim();
    if (/^(oui|o|1|x|vrai|true)$/i.test(s)) return 'Oui';
    if (/^(non|n|0|faux|false)$/i.test(s)) return 'Non';
    return '';
  };

  rows.forEach((row) => {
    const data: Record<string, string> = {};
    ALL_FIELDS.forEach((f) => {
      const v = row[f.label] !== undefined ? row[f.label] : row[f.key];
      data[f.key] = String(v ?? '').trim();
    });

    if (!data.categorie && row['Entrée en 6ième'] !== undefined) {
      data.categorie = String(row['Entrée en 6ième'] ?? '').trim();
    }
    if (!data.handicap) data.handicap = ouiNon(row['Ecole (ESH)'] ?? row['ESH'] ?? row['esh']);
    if (!data.deplace) data.deplace = ouiNon(row['CEB (EDF)'] ?? row['EDF'] ?? row['edf']);

    let option6e: Option6e = '';
    if (data.categorie === 'EG' || data.categorie === 'ET') {
      option6e = data.categorie;
      data.categorie = '';
    } else if (row['option6e'] !== undefined) {
      const rawOpt = String(row['option6e']).trim().toUpperCase();
      if (rawOpt === 'EG' || rawOpt === 'ET') option6e = rawOpt;
    }

    const tempPartial: Partial<Candidate> = {
      ...data,
      option6e,
    } as Partial<Candidate>;

    const cat = CATEGORIES.includes(data.categorie as CategorieEntree)
      ? (data.categorie as CategorieEntree)
      : categorieDe(tempPartial);

    const normalized = normalizeCandidateInput(
      {
        ...tempPartial,
        categorie: cat,
        classe: data.classe || classeActive,
      },
      classeActive
    );

    if (!normalized.matricule || !normalized.nom || seenMatricules.has(normalized.matricule.toLowerCase())) {
      ignored++;
      return;
    }

    seenMatricules.add(normalized.matricule.toLowerCase());
    imported.push(normalized);
  });

  return { imported, ignored };
}

export function versCandidatDocument(c: Candidate, classeActive: string): CandidateDocumentModel {
  const scolariteRaw = String(c.scolarite || '')
    .split(';')
    .map((s) => s.trim());
  const scolarite = Array.from({ length: 8 }, (_, k) => scolariteRaw[k] || '');
  return {
    id: c.matricule,
    matricule: c.matricule,
    nom: c.nom,
    prenom: c.prenoms,
    prenoms: c.prenoms,
    sexe: c.sexe,
    date_naiss: c.dateNaiss,
    lieu_naiss: c.lieuNaiss,
    nationalite: c.nationalite || 'Burkinabè',
    option: c.option6e === 'ET' ? 'EFTP' : 'EG',
    filiere: c.filiere || '',
    libre: isLibreFlag(c.libre),
    pv: c.pv || '',
    ecole: c.ecole || '',
    ceb: c.ceb || '',
    commune: c.village || '',
    province: c.fonction || '',
    region: c.region || '',
    classe: c.classe || classeActive,
    date_inscription: c.dateInscription || '',
    redoublements: c.redoublements || '',
    nom_pere: c.pere || '',
    nom_mere: c.mere || '',
    profession_pere: c.professionPere || '',
    profession_mere: c.professionMere || '',
    contact: c.contact || '',
    res_ville: c.village || '',
    res_secteur: c.resSecteur || '',
    res_commune: c.village || '',
    choix: [c.choix1 || '', c.choix2 || '', c.choix3 || ''],
    scolarite,
    cep_session: c.cepSession || '',
    aptitude: c.aptitude || '',
    points: c.points || '',
    moyenne: c.moyenne || '',
    pupille: c.pupille || '',
    numero_identification: c.numeroIdentification || '',
  };
}

const DOC_FIELD_LABELS: Record<string, string> = {
  nom: 'Nom',
  prenom: 'Prénom(s)',
  date_naiss: 'Date de naissance',
  lieu_naiss: 'Lieu de naissance',
  sexe: 'Sexe',
  matricule: 'Matricule',
  nom_pere: 'Nom du père',
  nom_mere: 'Nom de la mère',
  date_inscription: "Date d'inscription",
  province: 'Province',
  commune: 'Commune',
  contact: 'Contact des parents',
  res_ville: 'Ville/village de résidence',
  choix: 'Établissements demandés',
  scolarite: 'Déroulement de la scolarité',
  filiere: 'Filière',
  pv: 'N° PV',
};

export function getMissingDocFields(type: DocumentKind, c: CandidateDocumentModel): string[] {
  const reqMap: Record<DocumentKind, string[]> = {
    certificat: [
      'nom',
      'prenom',
      'date_naiss',
      'lieu_naiss',
      'matricule',
      'nom_pere',
      'nom_mere',
      'date_inscription',
    ],
    fiche: [
      'nom',
      'prenom',
      'date_naiss',
      'lieu_naiss',
      'sexe',
      'province',
      'commune',
      'contact',
      'res_ville',
      'choix',
      'scolarite',
      ...(c.option === 'EFTP' ? ['filiere'] : []),
    ],
    chemiseCEP: ['nom', 'prenom', 'sexe', 'date_naiss', 'pv'],
    chemise: [
      'nom',
      'prenom',
      'province',
      'commune',
      'res_ville',
      'contact',
      'choix',
      ...(c.option === 'EFTP' ? ['filiere'] : []),
    ],
    attestation: ['nom', 'prenom', 'date_naiss', 'lieu_naiss', 'matricule', 'nom_pere', 'nom_mere'],
  };

  const isEmpty = (k: string): boolean => {
    if (k === 'choix') return !c.choix.some(Boolean);
    if (k === 'scolarite') return !c.scolarite.some(Boolean);
    const val = (c as unknown as Record<string, unknown>)[k];
    return !String(val ?? '').trim();
  };

  return reqMap[type].filter(isEmpty).map((k) => DOC_FIELD_LABELS[k] || k);
}

export async function compressImageFile(file: File, maxDim = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (file.size <= 160 * 1024 && !/heic/i.test(file.type)) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outType, quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const EXAM_NIVEAU_LABELS: Record<ExamNiveau, string> = {
  ecole: 'École',
  ceb: 'CEB',
  provincial: 'Provincial',
  regional: 'Régional',
};

export function resolveDocumentOrientation(
  natural: PageOrientation,
  mode: PageOrientationMode = 'auto'
): PageOrientation {
  return mode === 'auto' ? natural : mode;
}

export function getNextClassLabel(classe: string): string {
  const norm = String(classe || '').trim().toUpperCase();
  const map: Record<string, string> = {
    CP: 'CP2',
    CP1: 'CP2',
    CP2: 'CE1',
    CE: 'CE2',
    CE1: 'CE2',
    CE2: 'CM1',
    CM: 'CM2',
    CM1: 'CM2',
    CM2: '6ème / Entrée au secondaire',
    CEBNF: 'Cycle suivant',
  };
  return map[norm] || 'Classe supérieure';
}

export interface AnnualProposalRow {
  key: string;
  matricule: string;
  nom: string;
  prenoms: string;
  label: string;
  sexe: Sexe;
  age: number | '';
  esh: 'Oui' | 'Non';
  edf: 'Oui' | 'Non';
  pupille: 'Oui' | 'Non';
  moyT1: number | null;
  moyT2: number | null;
  moyT3: number | null;
  moyAnnuelle: number;
  trimestersCount: number;
  rank: number;
  admis: boolean;
  decision: CouncilDecisionKind;
  mention: string;
}

export interface AnnualProposalStatsCounts {
  esh: number;
  edf: number;
  pupille: number;
  total: number;
}

export interface AnnualProposalSummary {
  classe: string;
  nextClasse: string;
  seuil: number;
  thresholds: DecisionThresholds;
  total: number;
  passants: number;
  redoublants: number;
  renvoyes: number;
  abandons: number;
  finDeCycle: number;
  fillesTotal: number;
  fillesPassantes: number;
  garconsTotal: number;
  garconsPassants: number;
  moyenneGenerale: number;
  tauxPassage: number;
  hasT1: boolean;
  hasT2: boolean;
  hasT3: boolean;
  statsByStatus: {
    effectif: AnnualProposalStatsCounts;
    promus: AnnualProposalStatsCounts;
    redoublants: AnnualProposalStatsCounts;
    abandons: AnnualProposalStatsCounts;
    renvoyes: AnnualProposalStatsCounts;
    finDeCycle: AnnualProposalStatsCounts;
  };
  rows: AnnualProposalRow[];
}

export function classifyAnnualDecision(params: {
  moyenne: number;
  trimestersCount: number;
  classe: string;
  thresholds: DecisionThresholds;
  override?: CouncilDecisionKind;
}): CouncilDecisionKind {
  if (params.override) return params.override;
  const { moyenne, trimestersCount, classe, thresholds } = params;
  if (trimestersCount === 0 || moyenne <= thresholds.abandons) {
    return 'Abandons';
  }
  const isTerminal = String(classe || '').trim().toUpperCase() === 'CM2';
  if (isTerminal && moyenne >= thresholds.finDeCycle) {
    return 'Fin de cycle';
  }
  if (moyenne >= thresholds.promotion) {
    return 'Promu(e)';
  }
  if (moyenne >= thresholds.redoublement) {
    return 'Redouble';
  }
  if (moyenne < thresholds.renvoi) {
    return 'Renvoyé';
  }
  return 'Redouble';
}

function getTrimestreStudentMoyenneMap(
  record: EvaluationRecord | undefined,
  students: Array<{ key: string; label: string; nom?: string; prenoms?: string; sexe?: Sexe }>
): Map<string, number> {
  const map = new Map<string, number>();
  if (!record || !record.matieres || !record.matieres.length) return map;
  const computed = computeEvaluationRows(students, record.matieres, record.notes || {});
  computed.forEach((r) => {
    if (r.notesEntered > 0) {
      map.set(r.key, r.moyenne);
    }
  });
  return map;
}

export function computeAnnualProposals(params: {
  candidates: Candidate[];
  evaluations: EvaluationsStore;
  classe: string;
  seuil?: number;
  thresholds?: Partial<DecisionThresholds>;
  decisionOverrides?: Record<string, CouncilDecisionKind>;
  nextClasse?: string;
}): AnnualProposalSummary {
  const { candidates, evaluations, classe, decisionOverrides } = params;
  const baseSeuil = params.seuil ?? params.thresholds?.promotion ?? DEFAULT_DECISION_THRESHOLDS.promotion;
  const thresholds: DecisionThresholds = {
    promotion: params.thresholds?.promotion ?? baseSeuil,
    redoublement: params.thresholds?.redoublement ?? DEFAULT_DECISION_THRESHOLDS.redoublement,
    renvoi: params.thresholds?.renvoi ?? DEFAULT_DECISION_THRESHOLDS.renvoi,
    abandons: params.thresholds?.abandons ?? DEFAULT_DECISION_THRESHOLDS.abandons,
    finDeCycle: params.thresholds?.finDeCycle ?? params.seuil ?? DEFAULT_DECISION_THRESHOLDS.finDeCycle,
  };
  const target = classe.trim().toUpperCase();
  const nextClasse = (params.nextClasse ?? getNextClassLabel(classe)).trim() || getNextClassLabel(classe);

  const classCandidates = candidates
    .filter((c) => (c.classe || '').trim().toUpperCase() === target)
    .sort((a, b) => `${a.nom} ${a.prenoms}`.localeCompare(`${b.nom} ${b.prenoms}`, 'fr'));

  const studentRefs = classCandidates.map((c) => ({
    key: c.matricule || `anon-${c.nom}-${c.prenoms}`,
    label: `${c.nom} ${c.prenoms}`.trim(),
    nom: c.nom,
    prenoms: c.prenoms,
    sexe: c.sexe,
  }));

  const t1Key = `${classe}__1er Trimestre`;
  const t2Key = `${classe}__2ème Trimestre`;
  const t3Key = `${classe}__3ème Trimestre`;
  const recT1 = evaluations.trimestrielles[t1Key];
  const recT2 = evaluations.trimestrielles[t2Key];
  const recT3 = evaluations.trimestrielles[t3Key];

  const mapT1 = getTrimestreStudentMoyenneMap(recT1, studentRefs);
  const mapT2 = getTrimestreStudentMoyenneMap(recT2, studentRefs);
  const mapT3 = getTrimestreStudentMoyenneMap(recT3, studentRefs);

  const hasT1 = mapT1.size > 0;
  const hasT2 = mapT2.size > 0;
  const hasT3 = mapT3.size > 0;

  const rows: AnnualProposalRow[] = classCandidates.map((c) => {
    const key = c.matricule || `anon-${c.nom}-${c.prenoms}`;
    const moyT1 = mapT1.has(key) ? mapT1.get(key)! : null;
    const moyT2 = mapT2.has(key) ? mapT2.get(key)! : null;
    const moyT3 = mapT3.has(key) ? mapT3.get(key)! : null;
    const vals = [moyT1, moyT2, moyT3].filter((v): v is number => v !== null);
    const moyAnnuelle = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    const decision = classifyAnnualDecision({
      moyenne: moyAnnuelle,
      trimestersCount: vals.length,
      classe,
      thresholds,
      override: decisionOverrides?.[key],
    });
    const admis = decision === 'Promu(e)' || decision === 'Fin de cycle';

    return {
      key,
      matricule: c.matricule,
      nom: c.nom,
      prenoms: c.prenoms,
      label: `${c.nom} ${c.prenoms}`.trim(),
      sexe: c.sexe,
      age: calculateAge(c.dateNaiss),
      esh: c.handicap === 'Oui' ? 'Oui' : 'Non',
      edf: c.deplace === 'Oui' ? 'Oui' : 'Non',
      pupille: c.pupille === 'Oui' ? 'Oui' : 'Non',
      moyT1,
      moyT2,
      moyT3,
      moyAnnuelle,
      trimestersCount: vals.length,
      rank: 1,
      admis,
      decision,
      mention: vals.length > 0 ? getMentionEval(moyAnnuelle).label : '—',
    };
  });

  const ranked = [...rows].sort((a, b) => {
    if (a.trimestersCount === 0 && b.trimestersCount > 0) return 1;
    if (b.trimestersCount === 0 && a.trimestersCount > 0) return -1;
    if (Math.abs(b.moyAnnuelle - a.moyAnnuelle) > 1e-9) return b.moyAnnuelle - a.moyAnnuelle;
    return a.label.localeCompare(b.label, 'fr');
  });
  let rank = 0;
  let prev: number | null = null;
  ranked.forEach((r, idx) => {
    if (prev === null || Math.abs(r.moyAnnuelle - prev) > 1e-9) {
      rank = idx + 1;
    }
    r.rank = rank;
    prev = r.moyAnnuelle;
  });

  const countGroup = (subset: AnnualProposalRow[]): AnnualProposalStatsCounts => ({
    esh: subset.filter((r) => r.esh === 'Oui').length,
    edf: subset.filter((r) => r.edf === 'Oui').length,
    pupille: subset.filter((r) => r.pupille === 'Oui').length,
    total: subset.length,
  });

  const promusRows = ranked.filter((r) => r.decision === 'Promu(e)');
  const redoublantsRows = ranked.filter((r) => r.decision === 'Redouble');
  const abandonsRows = ranked.filter((r) => r.decision === 'Abandons');
  const renvoyesRows = ranked.filter((r) => r.decision === 'Renvoyé');
  const finDeCycleRows = ranked.filter((r) => r.decision === 'Fin de cycle');

  const passants = promusRows.length + finDeCycleRows.length;
  const redoublants = redoublantsRows.length;
  const fillesTotal = ranked.filter((r) => r.sexe === 'F').length;
  const fillesPassantes = ranked.filter((r) => r.sexe === 'F' && r.admis).length;
  const garconsTotal = ranked.filter((r) => r.sexe === 'M').length;
  const garconsPassants = ranked.filter((r) => r.sexe === 'M' && r.admis).length;
  const moyenneGenerale = ranked.length
    ? ranked.reduce((s, r) => s + r.moyAnnuelle, 0) / ranked.length
    : 0;
  const tauxPassage = ranked.length ? (passants / ranked.length) * 100 : 0;

  return {
    classe,
    nextClasse,
    seuil: thresholds.promotion,
    thresholds,
    total: ranked.length,
    passants,
    redoublants,
    renvoyes: renvoyesRows.length,
    abandons: abandonsRows.length,
    finDeCycle: finDeCycleRows.length,
    fillesTotal,
    fillesPassantes,
    garconsTotal,
    garconsPassants,
    moyenneGenerale,
    tauxPassage,
    hasT1,
    hasT2,
    hasT3,
    statsByStatus: {
      effectif: countGroup(ranked),
      promus: countGroup(promusRows),
      redoublants: countGroup(redoublantsRows),
      abandons: countGroup(abandonsRows),
      renvoyes: countGroup(renvoyesRows),
      finDeCycle: countGroup(finDeCycleRows),
    },
    rows: ranked,
  };
}

function escapeCsvCell(value: unknown, sep = ';'): string {
  const str = String(value ?? '');
  if (str.includes(sep) || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCandidatesCSV(candidates: Candidate[]): string {
  const headers = [
    'Matricule',
    'N° PV',
    'Nom',
    'Prénom(s)',
    'Sexe',
    'Date de naissance',
    'Âge',
    'Lieu de naissance',
    'Classe',
    'Entrée en 6ème',
    'Filière',
    'Candidat libre au CEP',
    'Pupille',
    "N° d'identification",
    'Élève en situation de handicap (ESH)',
    'Nature du handicap',
    'Élève déplacé forcé (EDF)',
    'Élève orphelin vulnérable (EOV)',
    'État de vulnérabilité',
    'Nom Prénom(s) du père',
    'Nom prénom(s) de la mère',
    'Commune / Village',
    'Province / Région',
    'Contact',
  ];

  const rows = candidates.map((c) => [
    c.matricule || '',
    c.pv || '',
    c.nom || '',
    c.prenoms || '',
    c.sexe || '',
    c.dateNaiss || '',
    calculateAge(c.dateNaiss),
    c.lieuNaiss || '',
    c.classe || '',
    c.categorie || categorieDe(c) || '',
    c.filiere || '',
    isLibreFlag(c.libre) ? 'Oui' : c.libre || 'Non',
    c.pupille || '',
    c.numeroIdentification || '',
    c.handicap || '',
    c.natureHandicap || '',
    c.deplace || '',
    c.eov || '',
    c.vulnerabilite || '',
    c.pere || '',
    c.mere || '',
    c.village || '',
    c.fonction || '',
    c.contact || '',
  ]);

  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeCsvCell(cell, ';')).join(';')
  );
  return `\uFEFF${lines.join('\r\n')}`;
}

export interface SubjectSuccessRate {
  id: string;
  nom: string;
  totalNotes: number;
  passedCount: number;
  tauxReussite: number;
  moyenne: number;
}

export interface OptionCountItem {
  key: CategorieEntree | 'Non définie';
  label: string;
  count: number;
  pct: number;
}

export interface DashboardKeyIndicators {
  latestEval: {
    kind: 'Journalière' | 'Trimestre' | 'Examen blanc';
    label: string;
    classe: string;
    hasNotes: boolean;
  } | null;
  subjectSuccessRates: SubjectSuccessRate[];
  optionCounts: OptionCountItem[];
  optionTotals: {
    eg: number;
    et: number;
    cepSeul: number;
  };
  gender: {
    total: number;
    filles: number;
    garcons: number;
    nonRenseigne: number;
    pctFilles: number;
    pctGarcons: number;
    pctNonRenseigne: number;
  };
}

export function computeDashboardKeyIndicators(
  candidates: Candidate[],
  evaluations: EvaluationsStore,
  classeParam: string,
  seuil = 5
): DashboardKeyIndicators {
  const total = candidates.length;
  const filles = candidates.filter((c) => c.sexe === 'F').length;
  const garcons = candidates.filter((c) => c.sexe === 'M').length;
  const nonRenseigne = Math.max(0, total - filles - garcons);

  const pctFilles = total > 0 ? Math.round((filles / total) * 100) : 0;
  const pctNonRenseigne = total > 0 && nonRenseigne > 0 ? Math.round((nonRenseigne / total) * 100) : 0;
  const pctGarcons = total > 0 ? Math.max(0, 100 - pctFilles - pctNonRenseigne) : 0;

  const optionCountMap = new Map<CategorieEntree | 'Non définie', number>();
  CATEGORIES.forEach((cat) => optionCountMap.set(cat, 0));

  let eg = 0;
  let et = 0;
  let cepSeul = 0;

  candidates.forEach((c) => {
    const cat = categorieDe(c);
    if (cat) {
      optionCountMap.set(cat, (optionCountMap.get(cat) ?? 0) + 1);
      const opt = optionDeCategorie(cat);
      if (opt === 'EG') eg++;
      else if (opt === 'ET') et++;
      else if (cat === 'CEP Seul') cepSeul++;
    } else {
      optionCountMap.set('Non définie', (optionCountMap.get('Non définie') ?? 0) + 1);
    }
  });

  const optionCounts: OptionCountItem[] = Array.from(optionCountMap.entries()).map(([key, count]) => ({
    key,
    label: key,
    count,
    pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
  }));

  const evalEntries: Array<{
    kind: 'Journalière' | 'Trimestre' | 'Examen blanc';
    label: string;
    record: EvaluationRecord;
  }> = [
    ...Object.entries(evaluations.trimestrielles || {}).map(([k, r]) => ({
      kind: 'Trimestre' as const,
      label: r.trimestre || k,
      record: r,
    })),
    ...Object.entries(evaluations.examens || {}).map(([k, r]) => ({
      kind: 'Examen blanc' as const,
      label: `${r.niveau ? EXAM_NIVEAU_LABELS[r.niveau] || r.niveau : ''}${r.date ? ` · ${r.date}` : ''}`.trim() || k,
      record: r,
    })),
    ...Object.entries(evaluations.journalieres || {}).map(([k, r]) => ({
      kind: 'Journalière' as const,
      label: r.date || k,
      record: r,
    })),
  ];

  const computeRatesForRecord = (record: EvaluationRecord): SubjectSuccessRate[] => {
    const targetClasse = (record.classe || classeParam).trim().toUpperCase();
    const classStudents = candidates.filter(
      (c) => (c.classe || '').trim().toUpperCase() === targetClasse
    );
    const studentKeys =
      classStudents.length > 0
        ? classStudents.map((c) => c.matricule || `anon-${c.nom}-${c.prenoms}`)
        : Object.keys(record.notes || {});

    return (record.matieres || []).map((m) => {
      const max = Number(m.max) > 0 ? Number(m.max) : 10;
      let totalNotes = 0;
      let passedCount = 0;
      let sumOn10 = 0;

      studentKeys.forEach((key) => {
        const raw = record.notes?.[key]?.[m.id];
        if (raw !== '' && raw !== undefined && raw !== null) {
          const val = Number(raw);
          if (!Number.isNaN(val)) {
            const on10 = (val / max) * 10;
            totalNotes++;
            sumOn10 += on10;
            if (on10 >= seuil) passedCount++;
          }
        }
      });

      return {
        id: m.id,
        nom: m.nom,
        totalNotes,
        passedCount,
        tauxReussite: totalNotes > 0 ? Math.round((passedCount / totalNotes) * 1000) / 10 : 0,
        moyenne: totalNotes > 0 ? Math.round((sumOn10 / totalNotes) * 100) / 100 : 0,
      };
    });
  };

  let latestEval: DashboardKeyIndicators['latestEval'] = null;
  let subjectSuccessRates: SubjectSuccessRate[] = [];

  if (evalEntries.length > 0) {
    const sorted = [...evalEntries].sort((a, b) =>
      String(b.record.savedAt || '').localeCompare(String(a.record.savedAt || ''))
    );

    const scoredCandidate = sorted.find((entry) => {
      if (!entry.record.matieres?.length) return false;
      const rates = computeRatesForRecord(entry.record);
      return rates.some((r) => r.totalNotes > 0);
    });

    const chosen = scoredCandidate || sorted[0];
    if (chosen && chosen.record.matieres?.length) {
      subjectSuccessRates = computeRatesForRecord(chosen.record);
      const hasNotes = subjectSuccessRates.some((r) => r.totalNotes > 0);
      latestEval = {
        kind: chosen.kind,
        label: chosen.label,
        classe: chosen.record.classe || classeParam,
        hasNotes,
      };
    }
  }

  return {
    latestEval,
    subjectSuccessRates,
    optionCounts,
    optionTotals: { eg, et, cepSeul },
    gender: {
      total,
      filles,
      garcons,
      nonRenseigne,
      pctFilles,
      pctGarcons,
      pctNonRenseigne,
    },
  };
}

export function abbreviateSubject3(nom: string): string {
  return String(nom || '').trim().slice(0, 3);
}

export interface SynoptiqueBracketCounts {
  f: number;
  g: number;
  t: number;
}

export interface SynoptiqueSubjectStats {
  matiere: SubjectDef;
  palierBas: SynoptiqueBracketCounts; // 0 à 4.99
  palierHaut: SynoptiqueBracketCounts; // 5 à 10
  total: SynoptiqueBracketCounts;
}

export interface SynoptiqueSummary {
  subjects: SynoptiqueSubjectStats[];
  hasAnyScore: boolean;
}

export function computeSynoptiqueBySubject(
  students: Array<{ key: string; sexe: Sexe }>,
  matieres: SubjectDef[],
  notes: Record<string, Record<string, string>>
): SynoptiqueSummary {
  const allStats: SynoptiqueSubjectStats[] = matieres.map((m) => {
    const palierBas: SynoptiqueBracketCounts = { f: 0, g: 0, t: 0 };
    const palierHaut: SynoptiqueBracketCounts = { f: 0, g: 0, t: 0 };
    const max = Number(m.max) > 0 ? Number(m.max) : 10;

    students.forEach((st) => {
      const raw = notes[st.key]?.[m.id];
      if (raw === undefined || raw === null || String(raw).trim() === '') return;
      const val = Number(raw);
      if (Number.isNaN(val) || val < 0) return;

      const noteSur10 = (val / max) * 10;
      const target = noteSur10 < 5 ? palierBas : palierHaut;
      if (st.sexe === 'F') {
        target.f += 1;
      } else {
        target.g += 1;
      }
      target.t += 1;
    });

    return {
      matiere: m,
      palierBas,
      palierHaut,
      total: {
        f: palierBas.f + palierHaut.f,
        g: palierBas.g + palierHaut.g,
        t: palierBas.t + palierHaut.t,
      },
    };
  });

  const evaluated = allStats.filter((s) => s.total.t > 0);
  const hasAnyScore = evaluated.length > 0;
  return {
    subjects: hasAnyScore ? evaluated : allStats,
    hasAnyScore,
  };
}

export interface ExamBlancFGTCounts {
  f: number;
  g: number;
  t: number;
}

export interface ExamBlancStatLine {
  designation: 'ESH' | 'EDF' | 'PUPILLE' | 'TOTAL';
  highlight?: boolean;
  effectif: ExamBlancFGTCounts;
  composed: ExamBlancFGTCounts;
  passed: ExamBlancFGTCounts;
  taux: ExamBlancFGTCounts;
}

export interface ExamBlancStatsSummary {
  seuil: number;
  lines: ExamBlancStatLine[];
}

export function computeExamBlancStats(
  rows: EvalComputedRow[],
  seuil = 5
): ExamBlancStatsSummary {
  const countFGT = (subset: EvalComputedRow[]): ExamBlancFGTCounts => ({
    f: subset.filter((r) => r.sexe === 'F').length,
    g: subset.filter((r) => r.sexe === 'M').length,
    t: subset.length,
  });

  const buildLine = (
    designation: ExamBlancStatLine['designation'],
    subset: EvalComputedRow[],
    highlight = false
  ): ExamBlancStatLine => {
    const composedRows = subset.filter((r) => r.notesEntered > 0);
    const passedRows = composedRows.filter((r) => r.moyenne >= seuil);
    const effectif = countFGT(subset);
    const composed = countFGT(composedRows);
    const passed = countFGT(passedRows);
    const rate = (ok: number, comp: number) =>
      comp > 0 ? Math.round((ok / comp) * 1000) / 10 : 0;

    return {
      designation,
      highlight,
      effectif,
      composed,
      passed,
      taux: {
        f: rate(passed.f, composed.f),
        g: rate(passed.g, composed.g),
        t: rate(passed.t, composed.t),
      },
    };
  };

  return {
    seuil,
    lines: [
      buildLine('ESH', rows.filter((r) => r.esh === 'Oui')),
      buildLine('EDF', rows.filter((r) => r.edf === 'Oui')),
      buildLine('PUPILLE', rows.filter((r) => r.pupille === 'Oui')),
      buildLine('TOTAL', rows, true),
    ],
  };
}
