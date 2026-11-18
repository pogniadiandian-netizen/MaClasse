export type Sexe = '' | 'M' | 'F';
export type OuiNon = '' | 'Oui' | 'Non';
export type CategorieEntree = '' | 'CEP Seul' | 'CEP + EG' | 'CEP + ET' | 'EG Seul' | 'ET Seul';
export type Option6e = '' | 'EG' | 'ET';

export interface UploadedDoc {
  fourni: boolean;
  nom?: string;
  taille?: number;
  type?: string;
  contenu?: string | null;
}

export interface Candidate {
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: Sexe;
  dateNaiss: string;
  lieuNaiss: string;
  pupille: OuiNon;
  numeroIdentification: string;
  handicap: OuiNon;
  natureHandicap: string;
  deplace: OuiNon;
  eov: OuiNon;
  vulnerabilite: string;
  pere: string;
  mere: string;
  professionPere?: string;
  professionMere?: string;
  village: string;
  fonction: string;
  contact: string;
  classe: string;
  categorie: CategorieEntree;
  option6e: Option6e;
  filiere: string;
  libre: OuiNon | boolean;
  pv: string;
  dateInscription: string;
  redoublements: string;
  nationalite: string;
  region: string;
  resSecteur: string;
  cepSession: string;
  choix1: string;
  choix2: string;
  choix3: string;
  scolarite: string;
  aptitude: string;
  points: string;
  moyenne: string;
  ecole?: string;
  ceb?: string;
  documents?: {
    photo?: UploadedDoc;
  };
}

export type CouncilDecisionKind =
  | 'Promu(e)'
  | 'Redouble'
  | 'Renvoyé'
  | 'Fin de cycle'
  | 'Abandons';

export interface DecisionThresholds {
  promotion: number;
  redoublement: number;
  renvoi: number;
  abandons: number;
  finDeCycle: number;
}

export interface EnseignantConseil {
  id: string;
  classe: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: Sexe;
  corps: string;
  fonction: string;
  statut: string;
  contact: string;
}

export interface DocConfig {
  version: number;
  circonscription: string;
  ecole: string;
  ecoleType: 'Publique' | 'Privée';
  telephone: string;
  ville: string;
  anneeScolaire: string;
  session: string;
  centre: string;
  dateEdition: string;
  responsable: 'Directeur' | 'Directrice';
  directeurNom: string;
  directeurGrade: string;
  decoration: string;
  contactDirecteur: string;
  armoiries: string;
  signature: string;
  signatureCachet: string;
  seuilsFinAnnee: DecisionThresholds;
  enseignantsConseil: EnseignantConseil[];
}

export interface SubjectDef {
  id: string;
  nom: string;
  coef: number;
  max: number;
}

export type ClassesMatieres = Record<string, SubjectDef[]>;

export type EvaluationType = 'jour' | 'trim' | 'exam';
export type ExamNiveau = 'ecole' | 'ceb' | 'provincial' | 'regional';

export interface EvaluationRecord {
  classe: string;
  date?: string;
  trimestre?: string;
  niveau?: ExamNiveau;
  matieres: SubjectDef[];
  notes: Record<string, Record<string, string>>;
  savedAt?: string;
}

export interface EvaluationsStore {
  journalieres: Record<string, EvaluationRecord>;
  trimestrielles: Record<string, EvaluationRecord>;
  examens: Record<string, EvaluationRecord>;
}

export interface CandidateDocumentModel {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  prenoms: string;
  sexe: string;
  date_naiss: string;
  lieu_naiss: string;
  nationalite: string;
  option: 'EG' | 'EFTP';
  filiere: string;
  libre: boolean;
  pv: string;
  ecole: string;
  ceb: string;
  commune: string;
  province: string;
  region: string;
  classe: string;
  date_inscription: string;
  redoublements: string;
  nom_pere: string;
  nom_mere: string;
  profession_pere: string;
  profession_mere: string;
  contact: string;
  res_ville: string;
  res_secteur: string;
  res_commune: string;
  choix: string[];
  scolarite: string[];
  cep_session: string;
  aptitude: string;
  points: string;
  moyenne: string;
  centre_examen?: string;
  duree?: string;
  pupille: OuiNon;
  numero_identification: string;
}

export type DocumentKind = 'certificat' | 'fiche' | 'chemiseCEP' | 'chemise' | 'attestation';

export type PageOrientation = 'portrait' | 'landscape';
export type PageOrientationMode = 'auto' | PageOrientation;
export type EvalReportKind = 'fiche_notes' | 'synoptique' | 'proposition' | 'resultat_exam';
export type EvaluationTab = EvaluationType | 'rapports';

export type NavTab =
  | 'dashboard'
  | 'candidats'
  | 'documents'
  | 'listes'
  | 'pv'
  | 'cartes'
  | 'evaluations'
  | 'parametres';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

