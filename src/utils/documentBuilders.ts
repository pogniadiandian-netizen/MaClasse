import { ARMOIRIES_DEFAUT, CATEGORIES } from '../constants/cepConstants';
import type {
  Candidate,
  CandidateDocumentModel,
  DocConfig,
  DocumentKind,
  EvalReportKind,
  PageOrientation,
  PageOrientationMode,
  Sexe,
  SubjectDef,
} from '../types/cep';
import {
  abbreviateSubject3,
  AnnualProposalSummary,
  calculateAge,
  categorieDe,
  computeEvaluationRows,
  computeExamBlancStats,
  computeSynoptiqueBySubject,
  esc,
  EvalComputedRow,
  formatDateLong,
  formatDateShort,
  getMentionEval,
  isLibreFlag,
  resolveDocumentOrientation,
  versCandidatDocument,
} from './cepRules';

const candClass = (sexe?: string) => (sexe === 'F' ? ' cand-rouge' : '');
const candSpanStyle = (sexe?: string) =>
  sexe === 'F' ? 'color:#8b0000;font-weight:700' : 'color:#000000;font-weight:400';
const candCellStyle = (sexe?: string) =>
  sexe === 'F' ? 'color:#8b0000;font-weight:bold' : 'color:#000000;font-weight:normal';

export interface DocMeta {
  titre: string;
  sous: string;
  w: number;
  h: number;
  orientation: PageOrientation;
}

export const DOCS_META: Record<DocumentKind, DocMeta> = {
  certificat: {
    titre: 'Certificat de scolarité',
    sous: '2 exemplaires sur une page · A4 portrait',
    w: 210,
    h: 297,
    orientation: 'portrait',
  },
  fiche: {
    titre: "Fiche d'inscription",
    sous: "Concours d'entrée en 6e · EG / ET",
    w: 210,
    h: 297,
    orientation: 'portrait',
  },
  chemiseCEP: {
    titre: 'Chemise du CEP',
    sous: 'Examen du CEP · A4 paysage',
    w: 297,
    h: 210,
    orientation: 'landscape',
  },
  chemise: {
    titre: 'Chemise du concours 6e',
    sous: 'EG / ET · A4 paysage',
    w: 297,
    h: 210,
    orientation: 'landscape',
  },
  attestation: {
    titre: 'Attestation de niveau CM2',
    sous: 'Candidats libres du CEP',
    w: 210,
    h: 297,
    orientation: 'portrait',
  },
};

function genreTexte(sexe: string) {
  if (sexe === 'F') return { ne: 'née', fils: 'fille' };
  if (sexe === 'M') return { ne: 'né', fils: 'fils' };
  return { ne: 'né(e)', fils: 'fils/fille' };
}

function unCertificat(
  c: CandidateDocumentModel,
  cfg: DocConfig,
  pos: 'haut' | 'bas'
): string {
  const typeEcole = String(cfg.ecoleType || 'Publique').toUpperCase();
  const typeEcoleMin = String(cfg.ecoleType || 'Publique').toLowerCase();
  const titreResp = cfg.responsable === 'Directrice' ? 'La Directrice' : 'Le Directeur';
  const sig = cfg.signatureCachet || cfg.signature;
  const { ne, fils } = genreTexte(c.sexe);
  const nomComplet = `${c.nom} ${c.prenom}`.trim();

  return `<div class="certif ${pos}">
    <div class="entete">
      CIRCONSCRIPTION D'EDUCATION<br>DE BASE DE ${esc(cfg.circonscription)}
      <div class="tirets"></div>
      ECOLE PRIMAIRE ${esc(typeEcole)}<br>${esc(cfg.ecole)}
      ${cfg.telephone ? `<div class="tel">Tél. : ${esc(cfg.telephone)}</div>` : ''}
    </div>
    <div class="armoiries">
      ${cfg.armoiries ? `<img src="${esc(cfg.armoiries)}" alt="Armoiries">` : `<div class="vide">Armoiries</div>`}
    </div>
    <div class="annee">Année scolaire : ${esc(cfg.anneeScolaire)}</div>
    <div class="lieu-date">${esc(cfg.ville)}, le ${esc(formatDateShort(cfg.dateEdition))}</div>
    <div class="titre"><span>CERTIFICAT DE SCOLARITE</span></div>
    <div class="l l1">${titreResp} de l'école primaire ${esc(typeEcoleMin)}<span class="v">${esc(cfg.ecole)}</span></div>
    <div class="l l2">soussigné(e), certifie que<span class="v${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(nomComplet)}</span></div>
    <div class="l l3">${ne}<span class="v date">le ${esc(formatDateLong(c.date_naiss))}</span>à<span class="v">${esc(c.lieu_naiss)}</span></div>
    <div class="l l4">${fils} de<span class="v">${esc(c.nom_pere)}</span></div>
    <div class="l l5">et de<span class="v">${esc(c.nom_mere)}</span></div>
    <div class="l l6">est inscrit(e) dans l'établissement depuis le<span class="v dinsc">${esc(formatDateShort(c.date_inscription))}</span>où il/elle fréquente la classe de<span class="v">${esc(c.classe)}</span></div>
    <div class="l l7">sous le matricule<span class="v mat">${esc(c.matricule)}</span>Classe(s) redoublée(s) :<span class="v">${esc(c.redoublements || 'Néant')}</span></div>
    <div class="l l8">En foi de quoi, le présent certificat est délivré pour servir et valoir ce que de droit.</div>
    <div class="dir">
      <div class="t">${titreResp}</div>
      <div class="sig">${sig ? `<img src="${esc(sig)}" alt="Signature">` : ''}</div>
      <div class="nom">${esc(cfg.directeurNom)}</div>
      <div class="grade">${esc(cfg.directeurGrade)}</div>
      ${cfg.decoration ? `<div class="deco">${esc(cfg.decoration)}</div>` : ''}
    </div>
  </div>`;
}

export function buildCertificatScolarite(c: CandidateDocumentModel, cfg: DocConfig, copies = 2): string {
  return `<section class="certif-page">${unCertificat(c, cfg, 'haut')}${copies > 1 ? unCertificat(c, cfg, 'bas') : ''}</section>`;
}

export function buildFicheInscription6e(c: CandidateDocumentModel, cfg: DocConfig): string {
  const filiere = c.option === 'EFTP' ? c.filiere : '';
  const eftp = !!filiere;
  const sig = cfg.signatureCachet || cfg.signature;
  const respEcole = cfg.responsable === 'Directrice' ? 'la Directrice' : 'le Directeur';
  const sc = c.scolarite || [];
  const anneesScolaires = String(cfg.anneeScolaire || '').match(/\d{4}/g) || [];
  const finActuelle = anneesScolaires.length ? +anneesScolaires[anneesScolaires.length - 1] : 2027;
  let cm2Idx = sc.findIndex((s) => /CM2/i.test(String(s || '')));
  if (cm2Idx < 0) {
    cm2Idx = 5;
    for (let k = 0; k < 8; k++) if (String(sc[k] || '').trim()) cm2Idx = k;
  }
  const annees = Array.from({ length: 8 }, (_, k) => {
    const d = finActuelle - 1 + (k - cm2Idx);
    return `${d}-${d + 1}`;
  });
  const entete = eftp
    ? `<div class="hd gris hd-pv eftp">N° PV<span>${esc(c.pv)}</span></div>
       <div class="hd gris hd-opt eftp">
         <div class="r1"><div class="c1">Option</div><div class="c2">${esc(c.option)}</div></div>
         <div class="r2">Filière</div>
         <div class="r3">${esc(filiere)}</div>
       </div>`
    : `<div class="hd gris hd-pv eg">N° PV<span>${esc(c.pv)}</span></div>
       <div class="hd gris hd-opt eg"><div class="o1">OPTION</div><div class="o2">${esc(c.option)}</div></div>`;
  const titu = !!c.cep_session;
  const duree = c.duree || String(sc.filter(Boolean).length || '');

  return `<section class="fiche-page">
    <div class="hd gris hd-titre">
      <div>FICHE D'INSCRIPTION AU CONCOURS</div>
      <div>D'ENTREE EN CLASSE DE SIXIEME</div>
      <div>SESSION DE ${esc(cfg.session || '2027')}</div>
    </div>
    ${entete}
    <div class="circ">CIRCONSCRIPTION DE ${esc(cfg.circonscription)}</div>
    <div class="l nom">NOM :<span class="v${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(String(c.nom).toUpperCase())}</span></div>
    <div class="l pre">PRENOM(S) :<span class="v${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(c.prenom)}</span></div>
    <div class="l nai">DATE DE NAISSANCE :<span class="v naiss">${esc(formatDateLong(c.date_naiss))}</span><span class="sep">LIEU :</span><span class="v">${esc(c.lieu_naiss)}</span></div>
    <div class="l nat">NATIONALITE :<span class="v nat">${esc(c.nationalite || 'Burkinabè')}</span><span class="sep">SEXE :</span><span class="v${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(c.sexe)}</span></div>
    <div class="l eco">ECOLE FREQUENTEE EN ${esc(cfg.anneeScolaire)} :<span class="v">${esc(c.ecole || cfg.ecole)}</span></div>
    <div class="l reg">REGION :<span class="v reg">${esc(c.region)}</span><span class="sep">PROVINCE :</span><span class="v">${esc(c.province)}</span></div>
    <div class="l com">COMMUNE/ARRONDISSEMENT :<span class="v">${esc(c.commune)}</span></div>
    <div class="l dero"><b>DEROULEMENT DE LA SCOLARITE :</b></div>
    ${annees.map((a, i) => `<div class="l an" style="top:${(108.7 + i * 5.45).toFixed(1)}mm">${a} :<span class="v">${esc(sc[i])}</span></div>`).join('')}
    <div class="duree">DUREE TOTALE DE LA SCOLARITE :<span class="v">${esc(duree)}</span>ANNEES</div>
    <div class="l decl titu ${titu ? '' : 'rayee'}">- Je suis titulaire du CEP de la session de <span class="blanc">${esc(c.cep_session) || '________'}</span> et ci-joint une copie de mon diplôme.</div>
    <div class="marque" style="left:186.5mm;top:154.8mm">(1)</div>
    <div class="l decl cand ${titu ? 'rayee' : ''}">- Je suis candidat(e) au CEP de la session de ${esc(cfg.session || '2027')}.</div>
    <div class="l pere">Profession du père :<span class="v">${esc(c.profession_pere)}</span></div>
    <div class="l mere">Profession de la mère :<span class="v">${esc(c.profession_mere)}</span></div>
    <div class="l res1"><b>RESIDENCE ACTUELLE DES PARENTS :</b><span class="sep">- Ville/Village :</span><span class="v">${esc(c.res_ville)}</span></div>
    <div class="l res2">- Secteur/Arrondissement/Quartier :<span class="v">${esc(c.res_secteur)}</span></div>
    <div class="l res3">- Contact des parents/tuteurs :<span class="v">${esc(c.contact)}</span></div>
    <div class="etabs">
      <div class="t">Etablissements demandés en cas de succès et classés par ordre de préférence :</div>
      <div class="l e1">- 1°)<span class="v">${esc(c.choix[0])}</span></div>
      <div class="l e2">- 2°)<span class="v">${esc(c.choix[1])}</span></div>
      <div class="l e3">- 3°)<span class="v">${esc(c.choix[2])}</span></div>
      <div class="m2">(2)</div>
    </div>
    <div class="sig-g">Signature du père ou tuteur</div>
    <div class="sig-d">Signature du candidat</div>
    <div class="certifie">Renseignements certifiés exacts par ${respEcole} de l'école à ${esc(cfg.ville)}, le ${esc(formatDateShort(cfg.dateEdition))}</div>
    <div class="notes">(1) : Rayer la mention inutile.<br>(2) : Rappeler en cette occasion que les élèves affectés<br><span class="s">dans les établissements privés conventionnés doivent</span><br><span class="s">contribuer au paiement des frais de scolarité.</span></div>
    <div class="dir">
      <div class="sig">${sig ? `<img src="${esc(sig)}" alt="Signature">` : ''}</div>
      <div class="nom">${esc(cfg.directeurNom)}</div>
      <div class="grade">${esc(cfg.directeurGrade)}</div>
      ${cfg.decoration ? `<div class="deco">${esc(cfg.decoration)}</div>` : ''}
    </div>
  </section>`;
}

export function buildChemiseCEP(c: CandidateDocumentModel, cfg: DocConfig): string {
  const typeEcoleMin = String(cfg.ecoleType || 'Publique').toLowerCase();
  return `<section class="chemise-cep-page">
    <div class="bande"></div>
    <div class="titre">
      <div>EXAMEN DU CERTIFICAT D'ETUDES PRIMAIRES</div>
      <div>SESSION DE ${esc(cfg.session || '2027')}</div>
    </div>
    <div class="cadre">
      <div class="centre">
        <div class="lib">Centre d'examen demandé</div>
        <div class="val">${esc(c.centre_examen || cfg.centre)}</div>
      </div>
      <div class="champ f-pv"><b>N° PV :</b><span class="v">${esc(c.pv)}</span></div>
      <div class="champ f-nom"><b>NOM :</b><span class="v${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(String(c.nom).toUpperCase())}</span></div>
      <div class="champ f-prenoms"><b>PRENOM(S) :</b><span class="v${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(c.prenom)}</span></div>
      <div class="champ f-sexe"><b>SEXE :</b><span class="v court${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(c.sexe)}</span><b>DATE DE NAISSANCE :</b><span class="v">${esc(formatDateLong(c.date_naiss))}</span></div>
      <div class="champ f-ecole"><b>Ecole primaire ${esc(typeEcoleMin)} :</b><span class="v">${esc(c.ecole || cfg.ecole)}</span></div>
    </div>
  </section>`;
}

export function buildChemiseConcours6e(c: CandidateDocumentModel, cfg: DocConfig): string {
  const filiere = c.option === 'EFTP' ? c.filiere : '';
  const typeEcoleMin = String(cfg.ecoleType || 'Publique').toLowerCase();
  const optionLigne = filiere
    ? `<b>Option :</b><span class="v opt">${esc(c.option)}</span><b>Filière :</b><span class="v">${esc(filiere)}</span>`
    : `<b>Option :</b><span class="v">${esc(c.option)}</span>`;
  const pupilleText = c.pupille || 'Non';
  const refPupille = c.pupille === 'Oui' ? c.numero_identification || '—' : '—';

  return `<section class="chemise-page">
    <div class="titre rose">CONCOURS D'ENTREE EN CLASSE DE 6È, SESSION DE ${esc(cfg.session || '2027')}</div>
    <div class="cadre rose">
      <div class="centre">
        <div class="lib">Centre d'examen demandé</div>
        <div class="val">${esc(c.centre_examen || cfg.centre)}</div>
      </div>
      <div class="lib-col c-points">Points</div>
      <div class="lib-col c-moy">Moyenne</div>
      <div class="lib-col c-apt">Aptitude physique</div>
      <div class="case rose c-points">${esc(c.points)}</div>
      <div class="case rose c-moy">${esc(c.moyenne)}</div>
      <div class="case rose c-apt">${esc(c.aptitude)}</div>
      <div class="ligne f-option">${optionLigne}</div>
      <div class="ligne f-ecole"><b>Ecole primaire ${esc(typeEcoleMin)} :</b><span class="v">${esc(c.ecole || cfg.ecole)}</span></div>
      <div class="ligne f-ceb"><b>CEB :</b><span class="v">${esc(c.ceb || cfg.circonscription)}</span></div>
      <div class="ligne f-comm"><b>Commune :</b><span class="v">${esc(c.commune)}</span></div>
      <div class="ligne f-prov"><b>Province :</b><span class="v">${esc(c.province)}</span></div>
      <div class="lib-nom n-nom">Nom du candidat</div>
      <div class="lib-nom n-pre">Prénom(s) du candidat</div>
      <div class="nom-box rose n-nom${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(String(c.nom).toUpperCase())}</div>
      <div class="nom-box rose n-pre${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(c.prenom)}</div>
    </div>
    <div class="pupille-bar rose"><b>Pupille :</b><span class="v pup">${esc(pupilleText)}</span><b>Référence :</b><span class="v">${esc(refPupille)}</span></div>
    <div class="adr-titre">ADRESSE ACTUELLE DES PARENTS :</div>
    <div class="ligne adr a-lieu">Lieu de résidence :<span class="v res">${esc(c.res_ville)}</span><b>Tél.</b><span class="v">${esc(c.contact)}</span></div>
    <div class="ligne adr a-comm">Commune :<span class="v">${esc(c.res_commune || c.commune)}</span></div>
    <div class="ligne adr a-prov"><b>Province :</b><span class="v">${esc(c.province)}</span></div>
    <div class="etabs rose">
      <div class="titre2">Etablissements demandés par ordre de préférence :</div>
      <div class="ligne e1"><b>- 1er choix :</b><span class="v petit">${esc(c.choix[0])}</span></div>
      <div class="ligne e2"><b>- 2è choix :</b><span class="v petit">${esc(c.choix[1])}</span></div>
      <div class="ligne e3"><b>- 3è choix :</b><span class="v petit">${esc(c.choix[2])}</span></div>
    </div>
  </section>`;
}

function uneAttestation(
  c: CandidateDocumentModel,
  cfg: DocConfig,
  pos: 'haut' | 'bas'
): string {
  const typeEcole = String(cfg.ecoleType || 'Publique').toUpperCase();
  const typeEcoleMin = String(cfg.ecoleType || 'Publique').toLowerCase();
  const titreResp = cfg.responsable === 'Directrice' ? 'La Directrice' : 'Le Directeur';
  const sig = cfg.signatureCachet || cfg.signature;
  const { ne, fils } = genreTexte(c.sexe);

  return `<div class="certif ${pos}">
    <div class="entete">
      CIRCONSCRIPTION D'EDUCATION<br>DE BASE DE ${esc(cfg.circonscription)}
      <div class="tirets"></div>
      ECOLE PRIMAIRE ${esc(typeEcole)}<br>${esc(cfg.ecole)}
      ${cfg.telephone ? `<div class="tel">Tél. : ${esc(cfg.telephone)}</div>` : ''}
    </div>
    <div class="armoiries">
      ${cfg.armoiries ? `<img src="${esc(cfg.armoiries)}" alt="Armoiries">` : `<div class="vide">Armoiries</div>`}
    </div>
    <div class="annee">Année scolaire : ${esc(cfg.anneeScolaire)}</div>
    <div class="lieu-date">${esc(cfg.ville)}, le ${esc(formatDateShort(cfg.dateEdition))}</div>
    <div class="titre"><span>ATTESTATION DE NIVEAU CM2</span></div>
    <div class="l l1">${titreResp} de l'école primaire ${esc(typeEcoleMin)}<span class="v">${esc(cfg.ecole)}</span></div>
    <div class="l l2">soussigné(e), atteste que<span class="v${candClass(c.sexe)}" style="${candSpanStyle(c.sexe)}">${esc(`${String(c.nom).toUpperCase()} ${c.prenom}`.trim())}</span></div>
    <div class="l l3">${ne}<span class="v date">le ${esc(formatDateLong(c.date_naiss))}</span>à<span class="v">${esc(c.lieu_naiss)}</span></div>
    <div class="l l4">${fils} de<span class="v">${esc(c.nom_pere)}</span></div>
    <div class="l l5">et de<span class="v">${esc(c.nom_mere)}</span></div>
    <div class="l l6">a fréquenté l'établissement durant l'année scolaire<span class="v dinsc">${esc(cfg.anneeScolaire)}</span>la classe du<span class="v">CM2</span></div>
    <div class="l l7">sous le matricule<span class="v mat">${esc(c.matricule)}</span></div>
    <div class="l l8">La présente attestation est délivrée pour servir et valoir ce que de droit.</div>
    <div class="dir">
      <div class="t">${titreResp}</div>
      <div class="sig">${sig ? `<img src="${esc(sig)}" alt="Signature">` : ''}</div>
      <div class="nom">${esc(cfg.directeurNom)}</div>
      <div class="grade">${esc(cfg.directeurGrade)}</div>
      ${cfg.decoration ? `<div class="deco">${esc(cfg.decoration)}</div>` : ''}
    </div>
  </div>`;
}

export function buildAttestationNiveau(c: CandidateDocumentModel, cfg: DocConfig): string {
  return `<section class="certif-page">${uneAttestation(c, cfg, 'haut')}${uneAttestation(c, cfg, 'bas')}</section>`;
}

export function buildDocumentHTML(
  kind: DocumentKind,
  c: CandidateDocumentModel,
  cfg: DocConfig
): string {
  switch (kind) {
    case 'certificat':
      return buildCertificatScolarite(c, cfg);
    case 'fiche':
      return buildFicheInscription6e(c, cfg);
    case 'chemiseCEP':
      return buildChemiseCEP(c, cfg);
    case 'chemise':
      return buildChemiseConcours6e(c, cfg);
    case 'attestation':
      return buildAttestationNiveau(c, cfg);
  }
}

export function buildDossierCompletHTML(c: CandidateDocumentModel, cfg: DocConfig): string {
  return [
    buildCertificatScolarite(c, cfg),
    buildFicheInscription6e(c, cfg),
    buildChemiseCEP(c, cfg),
    buildChemiseConcours6e(c, cfg),
    c.libre ? buildAttestationNiveau(c, cfg) : '',
  ].join('');
}

/* =========================================================
   Word Export (.doc)
   ========================================================= */
export function buildDossiersWordHTML(
  candidates: Candidate[],
  cfg: DocConfig,
  classeActive: string
): string {
  const dt = (v: string) => (v ? formatDateLong(v) : '—');
  const row = (l: string, v: string | undefined, style?: string, allowEmpty = false) =>
    `<tr><td class="lab">${esc(l)}</td><td${style ? ` style="${style}"` : ''}>${esc(allowEmpty ? (v ?? '') : (v || '—'))}</td></tr>`;
  const rowRaw = (l: string, htmlVal: string) =>
    `<tr><td class="lab">${esc(l)}</td><td>${htmlVal}</td></tr>`;
  const table = (rows: string[]) => `<table class="champs">${rows.join('')}</table>`;
  const saut = `<br clear="all" style="mso-special-character:line-break;page-break-before:always">`;
  const typeEcoleMin = String(cfg.ecoleType || 'Publique').toLowerCase();
  const entete = `<p class="entete">École primaire ${esc(typeEcoleMin)} de ${esc(cfg.ecole)} — Circonscription d'Éducation de Base de ${esc(cfg.circonscription)}${cfg.telephone ? ' — Tél. : ' + esc(cfg.telephone) : ''}</p>`;
  const signature = `<table class="sig"><tr><td class="vide"></td><td class="droite"><p><b>${esc(cfg.responsable === 'Directrice' ? 'La Directrice' : 'Le Directeur')}</b></p><p class="espace">&nbsp;</p><p><b>${esc(cfg.directeurNom)}</b></p><p>${esc(cfg.directeurGrade)}</p>${cfg.decoration ? `<p class="deco">${esc(cfg.decoration)}</p>` : ''}</td></tr></table>`;
  const respEcole = cfg.responsable === 'Directrice' ? 'la Directrice' : 'le Directeur';
  const pages: string[] = [];

  candidates.forEach((c) => {
    const opt = c.option6e === 'ET' ? 'ET' : 'EG';
    const candStyle = candCellStyle(c.sexe);
    const nomComplet = `${c.nom || ''} ${c.prenoms || ''}`.trim();
    const nomCompletHTML = `<span style="${candStyle}">${esc(nomComplet || '—')}</span>`;
    const scolarite =
      String(c.scolarite || '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' · ') || '—';
    const libre = isLibreFlag(c.libre);

    pages.push(
      `${entete}<h1>Certificat de scolarité</h1>${table([
        rowRaw('Nom et prénom(s)', nomCompletHTML),
        row('Né(e) le', dt(c.dateNaiss)),
        row('À', c.lieuNaiss),
        row('Fils / fille de', c.pere),
        row('Et de', c.mere),
        row("Inscrit(e) dans l'établissement depuis le", dt(c.dateInscription)),
        row('Classe', c.classe || classeActive),
        row('Matricule', c.matricule),
        row('Classe(s) redoublée(s)', c.redoublements || 'Néant'),
        row('Année scolaire', cfg.anneeScolaire),
      ])}<p>En foi de quoi, le présent certificat est délivré pour servir et valoir ce que de droit.</p><p class="lieu">Fait à ${esc(cfg.ville)}, le ${esc(dt(cfg.dateEdition))}.</p>${signature}`
    );

    pages.push(
      `${entete}<h1>Fiche d'inscription — option ${esc(opt)}${opt === 'ET' && c.filiere ? ' (' + esc(c.filiere) + ')' : ''}</h1>${table([
        row('Session', cfg.session),
        row('N° PV', c.pv || '', undefined, true),
        row('Nom', String(c.nom || '').toUpperCase(), candStyle),
        row('Prénom(s)', c.prenoms, candStyle),
        row('Date de naissance', dt(c.dateNaiss)),
        row('Lieu de naissance', c.lieuNaiss),
        row('Nationalité', c.nationalite || 'Burkinabè'),
        row('Sexe', c.sexe, candStyle),
        row('École fréquentée', cfg.ecole),
        row('Année scolaire', cfg.anneeScolaire),
        row('Région', c.region),
        row('Province', c.fonction),
        row('Commune', c.village),
        row('Nom et prénom(s) du père', c.pere),
        row('Nom et prénom(s) de la mère', c.mere),
        row('Ville / village de résidence', c.village),
        row('Contact des parents', c.contact),
        row('Option', opt),
        row('Filière', opt === 'ET' ? c.filiere : ''),
        row('Déroulement de la scolarité', scolarite),
        row('Titulaire du CEP (session)', c.cepSession),
        row('1er établissement demandé', c.choix1),
        row('2e établissement demandé', c.choix2),
        row('3e établissement demandé', c.choix3),
      ])}<p class="lieu">Fait à ${esc(cfg.ville)}, le ${esc(dt(cfg.dateEdition))}.</p>${signature}`
    );

    pages.push(
      `${entete}<h1>Chemise du CEP — session ${esc(cfg.session)}</h1>${table([
        row("Centre d'examen demandé", cfg.centre),
        row('N° PV', c.pv || '', undefined, true),
        row('Nom', String(c.nom || '').toUpperCase(), candStyle),
        row('Prénom(s)', c.prenoms, candStyle),
        row('Sexe', c.sexe, candStyle),
        row('Date de naissance', dt(c.dateNaiss)),
        row('École primaire', cfg.ecole),
      ])}${libre ? `<p><b>Candidat libre au CEP</b> : l'attestation de niveau CM2 est jointe.</p>` : ''}`
    );

    pages.push(
      `${entete}<h1>Chemise du concours 6e — option ${esc(opt)}${opt === 'ET' && c.filiere ? ' (' + esc(c.filiere) + ')' : ''}</h1>${table([
        row('Session', cfg.session),
        row("Centre d'examen demandé", cfg.centre),
        row('Points', c.points),
        row('Moyenne', c.moyenne),
        row('Aptitude physique', c.aptitude),
        row('Option', opt),
        row('Filière', opt === 'ET' ? c.filiere : ''),
        row('École primaire', cfg.ecole),
        row('CEB', cfg.circonscription),
        row('Commune', c.village),
        row('Province', c.fonction),
        row('Nom', String(c.nom || '').toUpperCase(), candStyle),
        row('Prénom(s)', c.prenoms, candStyle),
        row('Pupille', c.pupille || 'Non'),
        row('Référence Pupille', c.pupille === 'Oui' ? c.numeroIdentification || '—' : '—'),
        row('Lieu de résidence', c.village),
        row('Tél. des parents', c.contact),
        row('1er choix', c.choix1),
        row('2e choix', c.choix2),
        row('3e choix', c.choix3),
      ])}`
    );

    if (libre) {
      pages.push(
        `${entete}<h1>Attestation de niveau CM2</h1><p>Je soussigné(e), <b>${esc(cfg.directeurNom)}</b>, agissant en qualité de ${respEcole} de l'école <b>${esc(cfg.ecole)}</b>,</p><p><b>Atteste que :</b></p><p>L'élève ${nomCompletHTML}, né(e) le <b>${esc(dt(c.dateNaiss))}</b> à <b>${esc(c.lieuNaiss)}</b>, a fréquenté l'établissement durant l'année scolaire <b>${esc(cfg.anneeScolaire)}</b> la classe du <b>CM2</b> sous le matricule <b>${esc(c.matricule)}</b>.</p><p>La présente attestation est délivrée pour servir et valoir ce que de droit.</p><p>Fait à <b>${esc(cfg.ville)}</b>, le <b>${esc(dt(cfg.dateEdition))}</b>.</p>${signature}`
      );
    }

    pages.push('<p class="fin">&nbsp;</p>');
  });

  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Dossiers CEP</title><style>@page{size:21cm 29.7cm;margin:1.7cm 1.6cm}body{font-family:"Times New Roman",serif;font-size:11pt;color:#000}h1{font-size:15pt;text-align:center;text-transform:uppercase;text-decoration:underline;margin:0 0 12pt}p{margin:0 0 6pt;text-align:justify}p.entete{text-align:center;font-size:9.5pt;text-transform:uppercase;border-bottom:1pt solid #000;padding-bottom:5pt;margin-bottom:14pt}p.lieu{text-align:right;margin-top:10pt}p.fin{margin:0}table.champs{width:100%;border-collapse:collapse;margin:0 0 12pt}table.champs td{border:.5pt solid #999;padding:3pt 5pt;vertical-align:middle;text-align:left}table.champs td.lab{width:38%;font-weight:bold;background:#f2f2f2}table.sig{width:100%;border-collapse:collapse;margin-top:14pt}table.sig td.vide{width:55%}table.sig td.droite{text-align:center}table.sig p{margin:0 0 2pt;text-align:center}table.sig p.espace{margin:0;line-height:55pt}table.sig p.deco{font-size:9pt;font-style:italic}</style></head><body>${pages.join(saut)}</body></html>`;
}

/* =========================================================
   Cartes d'identité scolaire (SVG)
   ========================================================= */
export interface CardData {
  cfg: DocConfig;
  matricule: string;
  pv: string;
  nom: string;
  prenoms: string;
  naissance: string;
  lieu: string;
  sexe: string;
  classe: string;
  tel: string;
  photo: string;
}

export function toCardData(c: Candidate, cfg: DocConfig, classeActive: string): CardData {
  return {
    cfg,
    matricule: c.matricule || '',
    pv: c.pv || '',
    nom: String(c.nom || '').toUpperCase(),
    prenoms: c.prenoms || '',
    naissance: formatDateShort(c.dateNaiss),
    lieu: c.lieuNaiss || '',
    sexe: c.sexe || '',
    classe: c.classe || classeActive,
    tel: c.contact || '',
    photo: c.documents?.photo?.contenu || '',
  };
}

export const ModCartes = (() => {
  const W = 89.7;
  const H = 55.82;
  const EPAIS = 0.35;
  const COLS = 2;
  const LIGNES = 5;
  const PAR_PAGE = COLS * LIGNES;
  const GAP = 1.5;
  const PT = 25.4 / 72;
  const F_TAHOMA = "Tahoma, 'Liberation Sans', Arial, 'DejaVu Sans', sans-serif";
  const F_CALIBRI = "Calibri, Carlito, 'Segoe UI', Arial, sans-serif";
  const F_GEORGIA = "Georgia, 'Times New Roman', 'Liberation Serif', serif";

  function t(
    x: number,
    y: number,
    texte: string,
    o: {
      f?: string;
      pt?: number;
      gras?: boolean;
      italique?: boolean;
      fill?: string;
      ancre?: string;
      max?: number;
      fit?: boolean;
      ul?: boolean;
    } = {}
  ) {
    const attrs = [
      `x="${x}"`,
      `y="${y}"`,
      `font-family="${o.f || F_TAHOMA}"`,
      `font-size="${(o.pt || 8.01) * PT}"`,
      o.gras ? 'font-weight="700"' : '',
      o.italique ? 'font-style="italic"' : '',
      o.fill ? `fill="${o.fill}"` : '',
      o.ancre ? `text-anchor="${o.ancre}"` : '',
      o.max ? `data-max="${o.max}"` : '',
      o.fit ? 'data-fit="1"' : '',
      o.ul ? 'data-ul="1"' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<text ${attrs}>${esc(texte)}</text>`;
  }

  function img(src: string, x: number, y: number, w: number, h: number, mode?: string) {
    if (!src) return '';
    const s = esc(src);
    return `<image href="${s}" xlink:href="${s}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${mode || 'xMidYMid meet'}"/>`;
  }

  function etoile(cx: number, cy: number, R: number) {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? R * 0.382 : R;
      const a = ((-90 + i * 36) * Math.PI) / 180;
      pts.push((cx + r * Math.cos(a)).toFixed(3) + ',' + (cy + r * Math.sin(a)).toFixed(3));
    }
    return `<polygon points="${pts.join(' ')}" fill="#fee833"/>`;
  }

  const svg = (corps: string) =>
    `<svg class="carte-svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">${corps}</svg>`;

  function recto(e: CardData): string {
    const cfg = e.cfg;
    const typeEcole = String(cfg.ecoleType || 'Publique').toUpperCase();
    const annee = String(cfg.anneeScolaire || '').replace(/\s*-\s*/g, '/');
    const arm = cfg.armoiries || ARMOIRIES_DEFAUT;
    const cachet = cfg.signatureCachet || cfg.signature;
    const corpsDir = String(cfg.directeurGrade || '').trim();
    const GRIS_DIR = '#AEABAB';
    const V = { f: F_CALIBRI, pt: 9.02, gras: true };

    const isGirl = e.sexe === 'F';
    const candFill = isGirl ? '#8b0000' : '#000000';
    return svg(`
      <rect x="${EPAIS / 2}" y="${EPAIS / 2}" width="${W - EPAIS}" height="${H - EPAIS}" fill="#fff" stroke="#dfa7a5" stroke-width="${EPAIS}"/>
      <g transform="translate(0.91 0.99)">
        <rect width="13.69" height="3.8" fill="#fa0b0e"/><rect y="3.8" width="13.69" height="3.92" fill="#248744"/>
        ${etoile(6.85, 3.85, 1.5)}
      </g>
      ${img(arm, 74.63, 0.72, 13.74, 14.82)}
      ${t(44.31, 4.34, "CIRCONSCRIPTION D'EDUCATION DE BASE", { pt: 7.03, gras: true, ancre: 'middle', max: 59.5 })}
      ${t(44.31, 7.51, 'DE ' + cfg.circonscription, { pt: 7.03, gras: true, ancre: 'middle', max: 57, ul: true })}
      <rect data-ul-rect="1" x="35.53" y="8.5" width="17.52" height="0.36" fill="#000"/>
      ${t(44.31, 12.28, 'ECOLE PRIMAIRE ' + typeEcole, { pt: 7.03, gras: true, ancre: 'middle', max: 59.5 })}
      ${t(44.31, 15.46, cfg.ecole, { pt: 7.03, gras: true, ancre: 'middle', max: 59.5 })}
      ${t(1.7, 22.05, "CARTE D'IDENTITE SCOLAIRE", { f: F_GEORGIA, pt: 10.03, gras: true, fill: '#f00' })}
      <line x1="1.70" y1="22.37" x2="59.33" y2="22.37" stroke="#f00" stroke-width="0.212"/>

      ${t(1.96, 28.24, 'Matricule :')}${t(16.32, 28.43, e.matricule, { ...V, max: 18.4 })}
      ${t(35.72, 28.22, 'N° PV :')}${t(46.7, 28.43, e.pv, { ...V, max: 17 })}
      ${t(1.96, 32.21, 'Nom :')}${t(10.73, 32.41, e.nom, { ...V, max: 53.3, fill: candFill, gras: isGirl })}
      ${t(1.96, 36.18, 'Prénom(s) :')}${t(17.65, 36.38, e.prenoms, { ...V, max: 46.3, fill: candFill, gras: isGirl })}
      ${t(1.96, 40.15, 'Né(e) le :')}${t(15.31, 40.29, e.naissance, { ...V, max: 48.7 })}
      ${t(1.96, 44.13, 'Lieu :')}${t(9.94, 44.31, e.lieu, { ...V, max: 54 })}
      ${t(1.96, 48.09, 'Sexe :')}${t(10.47, 48.28, e.sexe, { ...V, fill: candFill, gras: isGirl })}
      ${t(15.0, 48.09, 'Classe :')}${t(25.37, 48.28, e.classe, { ...V, max: 7.5 })}
      ${t(33.19, 48.33, 'Tél parent :', { f: F_CALIBRI, pt: 9.02 })}${t(49.5, 48.33, e.tel, { ...V, max: 14.5 })}

      <rect data-fit-rect="1" x="1.79" y="49.98" width="50" height="4.43" fill="#000"/>
      ${t(2.87, 53.12, 'ANNEE SCOLAIRE : ' + annee, { pt: 8.01, gras: true, fill: '#fff', fit: true })}

      ${
        e.photo
          ? img(e.photo, 65.57, 16.87, 23.16, 23.22, 'xMidYMid slice')
          : '<rect class="photo-vide" x="65.57" y="16.87" width="23.16" height="23.22"/>'
      }
      <rect x="65.57" y="40.15" width="23.27" height="14.65" fill="#fff"/>
      ${cachet ? img(cachet, 65.57, 40.15, 23.27, 14.65, 'xMidYMid slice') : ''}
      ${t(77.205, 50.32, cfg.directeurNom, { pt: 7.4, gras: true, ancre: 'middle', max: 22.3, fill: GRIS_DIR })}
      ${corpsDir ? t(77.205, 53.82, corpsDir, { pt: 8, italique: true, ancre: 'middle', max: 22.3, fill: GRIS_DIR }) : ''}
    `);
  }

  function verso(e: CardData): string {
    const cfg = e.cfg;
    const arm = cfg.armoiries || ARMOIRIES_DEFAUT;
    const contact = cfg.contactDirecteur || cfg.telephone || '';
    const L = { pt: 7.03, gras: true, ancre: 'middle', max: 80 };
    return svg(`
      ${t(45.35, 4.39, "MINISTERE DE L'EDUCATION DE BASE,", L)}
      ${t(45.35, 7.57, "DE L'ALPHABETISATION ET DE LA", L)}
      ${t(45.35, 10.75, 'PROMOTION DES LANGUES NATIONALES', L)}
      ${img(arm, 30.42, 15.75, 28, 30.24)}
      ${t(45.4, 53.12, 'Contact du Directeur : ' + contact, { pt: 8.01, gras: true, ancre: 'middle', max: 80 })}
    `);
  }

  function ajuster(racine: HTMLElement) {
    racine.querySelectorAll('svg.carte-svg').forEach((s) => {
      try {
        s.querySelectorAll<SVGTextElement>('text[data-max]').forEach((el) => {
          const max = parseFloat(el.dataset.max || '0');
          if (!(max > 0)) return;
          const origSize = parseFloat(el.dataset.origFont || el.getAttribute('font-size') || '0');
          if (origSize > 0) {
            el.dataset.origFont = String(origSize);
            el.setAttribute('font-size', String(origSize));
          }
          el.removeAttribute('textLength');
          el.removeAttribute('lengthAdjust');

          let len = el.getComputedTextLength();
          if (len > max && origSize > 0) {
            const minSize = origSize * 0.58;
            const scaled = Math.max(minSize, origSize * (max / len) * 0.97);
            el.setAttribute('font-size', scaled.toFixed(3));
            len = el.getComputedTextLength();
          }
          if (len > max) {
            el.setAttribute('textLength', String(max));
            el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
          }
        });
        const fit = s.querySelector<SVGTextElement>('text[data-fit]');
        const r = s.querySelector<SVGRectElement>('rect[data-fit-rect]');
        if (fit && r) {
          r.setAttribute('width', Math.max(50, fit.getComputedTextLength() + 4).toFixed(2));
        }
        const ul = s.querySelector<SVGTextElement>('text[data-ul]');
        const ur = s.querySelector<SVGRectElement>('rect[data-ul-rect]');
        if (ul && ur) {
          const w = ul.getComputedTextLength() + 1.06;
          const cx = parseFloat(ul.getAttribute('x') || '0');
          ur.setAttribute('width', w.toFixed(2));
          ur.setAttribute('x', (cx - w / 2).toFixed(2));
        }
      } catch {
        // ignore SVG measurement failure in headless contexts
      }
    });
  }

  const PAS_X = W + GAP;
  const PAS_Y = H + GAP;
  const MARGE_X = (210 - (COLS * W + (COLS - 1) * GAP)) / 2;
  const MARGE_Y = (297 - (LIGNES * H + (LIGNES - 1) * GAP)) / 2;

  function feuille(cartes: string[], miroir: boolean): string {
    const html = cartes
      .map((c, i) => {
        let col = i % COLS;
        const lig = Math.floor(i / COLS);
        if (miroir) col = COLS - 1 - col;
        const x = (MARGE_X + col * PAS_X).toFixed(2);
        const y = (MARGE_Y + lig * PAS_Y).toFixed(2);
        return c.replace('<svg class="carte-svg"', `<svg class="carte-svg" style="left:${x}mm;top:${y}mm"`);
      })
      .join('');
    return `<div class="cartes-feuille">${html}</div>`;
  }

  function planches(liste: CardData[], mode: 'recto' | 'verso' | 'rv'): string {
    const pages: string[] = [];
    for (let i = 0; i < liste.length; i += PAR_PAGE) {
      const lot = liste.slice(i, i + PAR_PAGE);
      if (mode !== 'verso') pages.push(feuille(lot.map(recto), false));
      if (mode !== 'recto') pages.push(feuille(lot.map(verso), true));
    }
    return pages.join('');
  }

  return { recto, verso, planches, ajuster, PAR_PAGE };
})();

/* =========================================================
   Print HTML helpers for Lists, Evaluations & Bulletins
   ========================================================= */
export function buildOfficialHeaderAndSignature(cfg: DocConfig) {
  const typeEcole = String(cfg.ecoleType || 'Publique').toUpperCase();
  const titreResp = cfg.responsable === 'Directrice' ? 'La Directrice' : 'Le Directeur';
  const sig = cfg.signatureCachet || cfg.signature;

  const enteteHTML = `<div class="report-header" style="display:flex;justify-content:space-between;align-items:flex-start;font-family:Arial,Tahoma,sans-serif;font-size:9pt;text-transform:uppercase;margin-bottom:22px;color:#000000">
    <div class="report-header-left" style="text-align:center;width:52%;line-height:1.45">
      <div>CIRCONSCRIPTION D&apos;EDUCATION</div>
      <div>DE BASE DE <b>${esc(cfg.circonscription)}</b></div>
      <div style="height:6px"></div>
      <div>ECOLE PRIMAIRE ${esc(typeEcole)}</div>
      <div><b>${esc(cfg.ecole)}</b></div>
      ${cfg.telephone ? `<div style="font-size:7.5pt;text-transform:none;margin-top:3px">Tél. : ${esc(cfg.telephone)}</div>` : ''}
    </div>
    <div class="report-header-right" style="text-align:right;width:44%;text-transform:none;font-size:9pt;line-height:1.7;padding-top:2px">
      <div>Année scolaire : ${esc(cfg.anneeScolaire)}</div>
      <div>${esc(cfg.ville)}, le ${esc(formatDateLong(cfg.dateEdition))}</div>
    </div>
  </div>`;

  const signatureHTML = `<div class="report-signature" style="margin-top:24px;display:flex;justify-content:flex-end;page-break-inside:avoid;color:#000000">
    <div class="report-signature-box" style="text-align:center;width:72mm;font-family:Arial,Tahoma,sans-serif;font-size:9pt;line-height:1.4">
      <div style="margin-bottom:4px">${esc(titreResp)}</div>
      <div class="report-sig-img" style="height:18mm;display:flex;align-items:center;justify-content:center">${sig ? `<img src="${esc(sig)}" style="max-width:50mm;max-height:18mm;object-fit:contain">` : ''}</div>
      <div style="font-weight:bold;font-size:8.5pt">${esc(cfg.directeurNom)}</div>
      <div style="font-style:italic;font-size:7pt">${esc(cfg.directeurGrade)}</div>
      ${cfg.decoration ? `<div style="font-style:italic;font-size:6.2pt;margin-top:1px">${esc(cfg.decoration)}</div>` : ''}
    </div>
  </div>`;

  return { enteteHTML, signatureHTML };
}

export type ListPrintType = 'all' | 'handicap' | 'deplace' | 'eov' | 'pupille' | 'etat';

export function getNaturalListOrientation(type: ListPrintType): PageOrientation {
  return type === 'etat' ? 'landscape' : 'portrait';
}

export function getNaturalEvalReportOrientation(
  kind: EvalReportKind,
  matieresCount = 0
): PageOrientation {
  if (kind === 'synoptique' || kind === 'proposition' || kind === 'resultat_exam') return 'landscape';
  if (kind === 'fiche_notes') return matieresCount > 5 ? 'landscape' : 'portrait';
  return 'portrait';
}

export function buildEtatNumeriqueRows(candidates: Candidate[]) {
  const categories = CATEGORIES.map((label) => ({
    label,
    filter: (c: Candidate) => categorieDe(c) === label,
  }));
  const populations = [
    { label: 'Candidats ESH', filter: (c: Candidate) => c.handicap === 'Oui', total: false },
    { label: 'Candidats EDF', filter: (c: Candidate) => c.deplace === 'Oui', total: false },
    { label: 'Candidats Pupille', filter: (c: Candidate) => c.pupille === 'Oui', total: false },
    { label: 'Candidats EOV', filter: (c: Candidate) => c.eov === 'Oui', total: false },
    { label: 'Total École', filter: () => true, total: true },
  ];

  const countStats = (list: Candidate[]) => ({
    f: list.filter((c) => c.sexe === 'F').length,
    g: list.filter((c) => c.sexe === 'M').length,
    t: list.length,
  });

  const listes = categories.map((cat) => candidates.filter(cat.filter));
  return {
    categories: categories.map((c) => c.label),
    rows: populations.map((pop) => {
      const stats = listes.map((l) => countStats(l.filter(pop.filter)));
      const tot = stats.reduce(
        (a, x) => ({ f: a.f + x.f, g: a.g + x.g, t: a.t + x.t }),
        { f: 0, g: 0, t: 0 }
      );
      return {
        label: pop.label,
        total: pop.total,
        cells: [...stats, tot],
      };
    }),
  };
}

export function buildPrintListHTML(
  type: ListPrintType,
  candidates: Candidate[],
  cfg: DocConfig,
  orientationMode: PageOrientationMode = 'auto'
): string {
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);
  const orientation = resolveDocumentOrientation(getNaturalListOrientation(type), orientationMode);
  let title = '';
  let tableHTML = '';

  if (type === 'all') {
    title = 'LISTE DES ÉLÈVES';
    tableHTML = `<table class="print-list-table"><colgroup><col style="width:11%"><col style="width:10%"><col style="width:14%"><col style="width:19%"><col style="width:6.5%"><col style="width:6.5%"><col style="width:7.5%"><col style="width:7.5%"><col style="width:7.5%"><col style="width:10.5%"></colgroup><thead><tr><th>Matricule</th><th>N° PV</th><th>Nom</th><th>Prénom(s)</th><th>Sexe</th><th>Âge</th><th>ESH</th><th>EDF</th><th>EOV</th><th>Pupille</th></tr></thead><tbody>${
      candidates
        .map(
          (c) => {
            const cs = candCellStyle(c.sexe);
            return `<tr><td>${esc(c.matricule)}</td><td>${esc(c.pv)}</td><td style="${cs}">${esc(c.nom)}</td><td style="${cs}">${esc(c.prenoms)}</td><td style="${cs}">${esc(c.sexe)}</td><td>${esc(calculateAge(c.dateNaiss))}</td><td>${esc(c.handicap)}</td><td>${esc(c.deplace)}</td><td>${esc(c.eov)}</td><td>${esc(c.pupille)}</td></tr>`;
          }
        )
        .join('') || '<tr><td colspan="10">Aucun élève</td></tr>'
    }</tbody></table>`;
  } else if (type === 'handicap') {
    title = 'LISTE DES ÉLÈVES EN SITUATION DE HANDICAP';
    const list = candidates.filter((c) => c.handicap === 'Oui');
    tableHTML = `<table class="print-list-table"><colgroup><col style="width:13%"><col style="width:12%"><col style="width:17%"><col style="width:22%"><col style="width:8%"><col style="width:7%"><col style="width:21%"></colgroup><thead><tr><th>Matricule</th><th>N° PV</th><th>Nom</th><th>Prénom(s)</th><th>Sexe</th><th>Âge</th><th>Nature</th></tr></thead><tbody>${
      list
        .map(
          (c) => {
            const cs = candCellStyle(c.sexe);
            return `<tr><td>${esc(c.matricule)}</td><td>${esc(c.pv)}</td><td style="${cs}">${esc(c.nom)}</td><td style="${cs}">${esc(c.prenoms)}</td><td style="${cs}">${esc(c.sexe)}</td><td>${esc(calculateAge(c.dateNaiss))}</td><td>${esc(c.natureHandicap)}</td></tr>`;
          }
        )
        .join('') || '<tr><td colspan="7">Aucun élève</td></tr>'
    }</tbody></table>`;
  } else if (type === 'deplace') {
    title = 'LISTE DES ÉLÈVES DÉPLACÉS FORCÉS';
    const list = candidates.filter((c) => c.deplace === 'Oui');
    tableHTML = `<table class="print-list-table"><colgroup><col style="width:15%"><col style="width:14%"><col style="width:23%"><col style="width:29%"><col style="width:9.5%"><col style="width:9.5%"></colgroup><thead><tr><th>Matricule</th><th>N° PV</th><th>Nom</th><th>Prénom(s)</th><th>Sexe</th><th>Âge</th></tr></thead><tbody>${
      list
        .map(
          (c) => {
            const cs = candCellStyle(c.sexe);
            return `<tr><td>${esc(c.matricule)}</td><td>${esc(c.pv)}</td><td style="${cs}">${esc(c.nom)}</td><td style="${cs}">${esc(c.prenoms)}</td><td style="${cs}">${esc(c.sexe)}</td><td>${esc(calculateAge(c.dateNaiss))}</td></tr>`;
          }
        )
        .join('') || '<tr><td colspan="6">Aucun élève</td></tr>'
    }</tbody></table>`;
  } else if (type === 'pupille') {
    title = 'LISTE DES ÉLÈVES PUPILLES DE LA NATION';
    const list = candidates.filter((c) => c.pupille === 'Oui');
    tableHTML = `<table class="print-list-table"><colgroup><col style="width:13%"><col style="width:12%"><col style="width:17%"><col style="width:22%"><col style="width:8%"><col style="width:7%"><col style="width:21%"></colgroup><thead><tr><th>Matricule</th><th>N° PV</th><th>Nom</th><th>Prénom(s)</th><th>Sexe</th><th>Âge</th><th>N° identification</th></tr></thead><tbody>${
      list
        .map(
          (c) => {
            const cs = candCellStyle(c.sexe);
            return `<tr><td>${esc(c.matricule)}</td><td>${esc(c.pv)}</td><td style="${cs}">${esc(c.nom)}</td><td style="${cs}">${esc(c.prenoms)}</td><td style="${cs}">${esc(c.sexe)}</td><td>${esc(calculateAge(c.dateNaiss))}</td><td>${esc(c.numeroIdentification)}</td></tr>`;
          }
        )
        .join('') || '<tr><td colspan="7">Aucun élève</td></tr>'
    }</tbody></table>`;
  } else if (type === 'eov') {
    title = 'LISTE DES ÉLÈVES ORPHELINS VULNÉRABLES';
    const list = candidates.filter((c) => c.eov === 'Oui');
    tableHTML = `<table class="print-list-table"><colgroup><col style="width:12%"><col style="width:11%"><col style="width:16%"><col style="width:20%"><col style="width:7%"><col style="width:7%"><col style="width:27%"></colgroup><thead><tr><th>Matricule</th><th>N° PV</th><th>Nom</th><th>Prénom(s)</th><th>Sexe</th><th>Âge</th><th>Vulnérabilité</th></tr></thead><tbody>${
      list
        .map(
          (c) => {
            const cs = candCellStyle(c.sexe);
            return `<tr><td>${esc(c.matricule)}</td><td>${esc(c.pv)}</td><td style="${cs}">${esc(c.nom)}</td><td style="${cs}">${esc(c.prenoms)}</td><td style="${cs}">${esc(c.sexe)}</td><td>${esc(calculateAge(c.dateNaiss))}</td><td>${esc(c.vulnerabilite)}</td></tr>`;
          }
        )
        .join('') || '<tr><td colspan="7">Aucun élève</td></tr>'
    }</tbody></table>`;
  } else {
    title = 'ÉTAT NUMÉRIQUE DES CANDIDATS';
    const etat = buildEtatNumeriqueRows(candidates);
    const colgroup = `<colgroup><col style="width:120px">${'<col>'.repeat((etat.categories.length + 1) * 3)}</colgroup>`;
    const thead = `<thead><tr><th rowspan="2" style="text-align:center;vertical-align:middle">Catégorie</th>${etat.categories
      .map((c) => `<th colspan="3">${esc(c)}</th>`)
      .join('')}<th colspan="3">Total</th></tr><tr>${'<th>F</th><th>G</th><th>T</th>'.repeat(
      etat.categories.length + 1
    )}</tr></thead>`;
    const tbody = `<tbody>${etat.rows
      .map(
        (r) =>
          `<tr${r.total ? ' style="background:#f4f7fb;font-weight:bold"' : ''}><td><b>${esc(r.label)}</b></td>${r.cells
            .map((cell) => `<td>${cell.f}</td><td>${cell.g}</td><td><b>${cell.t}</b></td>`)
            .join('')}</tr>`
      )
      .join('')}</tbody>`;
    tableHTML = `<table class="print-list-table compact">${colgroup}${thead}${tbody}</table>`;
  }

  return `<section class="pdf-report-page" data-orientation="${orientation}">${enteteHTML}<div class="report-title">${title}</div>${tableHTML}${signatureHTML}</section>`;
}

export function buildPrintEvalResultsHTML(params: {
  titre: string;
  libelle: string;
  cfg: DocConfig;
  rows: EvalComputedRow[];
  seuil: number;
  orientationMode?: PageOrientationMode;
}): string {
  const { titre, libelle, cfg, rows, seuil, orientationMode = 'auto' } = params;
  const orientation = resolveDocumentOrientation('portrait', orientationMode);
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);

  const admis = rows
    .filter((r) => r.moyenne >= seuil)
    .sort((a, b) => b.moyenne - a.moyenne || a.label.localeCompare(b.label, 'fr'));
  const ajournes = rows
    .filter((r) => r.moyenne < seuil)
    .sort((a, b) => b.moyenne - a.moyenne || a.label.localeCompare(b.label, 'fr'));

  const moyenneClasse = rows.length ? rows.reduce((x, r) => x + r.moyenne, 0) / rows.length : 0;
  const meilleure = rows.length ? Math.max(...rows.map((r) => r.moyenne)) : 0;
  const tauxReussite = rows.length ? (admis.length / rows.length) * 100 : 0;

  const filles = rows.filter((r) => r.sexe === 'F');
  const garcons = rows.filter((r) => r.sexe === 'M');
  const fillesAdmis = filles.filter((r) => r.moyenne >= seuil).length;
  const garconsAdmis = garcons.filter((r) => r.moyenne >= seuil).length;
  const hasGenderInfo = filles.length > 0 || garcons.length > 0;

  const formatEvalStudentHTML = (r: EvalComputedRow) => {
    const text = r.nom ? `${r.nom}${r.prenoms ? ` ${r.prenoms}` : ''}` : r.label;
    return `<span style="${candCellStyle(r.sexe)}">${esc(text)}</span>`;
  };

  const ligneHTML = (r: EvalComputedRow, couleur: string, decision: string) => {
    const mention = getMentionEval(r.moyenne);
    const cs = candCellStyle(r.sexe);
    return `<tr>
      <td style="font-weight:bold">${r.rank}</td>
      <td style="${cs}">${formatEvalStudentHTML(r)}</td>
      <td style="${cs}">${esc(r.sexe || '—')}</td>
      <td style="font-weight:bold;color:${couleur}">${r.moyenne.toFixed(2)}/10</td>
      <td>${esc(mention.label)}</td>
      <td>${esc(decision)}</td>
    </tr>`;
  };

  const statsHTML = `<div class="report-kpi-row">
    <div class="report-kpi-box"><div class="report-kpi-val" style="color:#1d4ed8">${rows.length}</div><div class="report-kpi-lbl">Candidats</div></div>
    <div class="report-kpi-box"><div class="report-kpi-val" style="color:#15803d">${admis.length}</div><div class="report-kpi-lbl">Admis (≥${seuil})</div></div>
    <div class="report-kpi-box"><div class="report-kpi-val" style="color:#b91c1c">${ajournes.length}</div><div class="report-kpi-lbl">Ajournés</div></div>
    <div class="report-kpi-box"><div class="report-kpi-val" style="color:#1d4ed8">${tauxReussite.toFixed(1)}%</div><div class="report-kpi-lbl">Réussite</div></div>
    <div class="report-kpi-box"><div class="report-kpi-val">${moyenneClasse.toFixed(2)}/10</div><div class="report-kpi-lbl">Moy. classe</div></div>
    <div class="report-kpi-box"><div class="report-kpi-val">${meilleure.toFixed(2)}/10</div><div class="report-kpi-lbl">Meilleure moy.</div></div>
  </div>${
    hasGenderInfo
      ? `<table class="print-list-table compact" style="margin-bottom:10px">
          <thead><tr><th>Genre</th><th>Effectif</th><th>Admis</th><th>Ajournés</th><th>Taux de réussite</th></tr></thead>
          <tbody>
            <tr><td><b>Filles</b></td><td>${filles.length}</td><td style="color:#15803d;font-weight:bold">${fillesAdmis}</td><td>${filles.length - fillesAdmis}</td><td>${filles.length ? ((fillesAdmis / filles.length) * 100).toFixed(1) : '0.0'}%</td></tr>
            <tr><td><b>Garçons</b></td><td>${garcons.length}</td><td style="color:#15803d;font-weight:bold">${garconsAdmis}</td><td>${garcons.length - garconsAdmis}</td><td>${garcons.length ? ((garconsAdmis / garcons.length) * 100).toFixed(1) : '0.0'}%</td></tr>
            <tr style="background:#f1f5f9;font-weight:bold"><td>Total</td><td>${rows.length}</td><td>${admis.length}</td><td>${ajournes.length}</td><td>${tauxReussite.toFixed(1)}%</td></tr>
          </tbody>
        </table>`
      : ''
  }`;

  const tableauAdmis = admis.length
    ? `<h4 class="report-section-title" style="color:#15803d">Liste des admis par ordre de mérite (${admis.length})</h4>
       <table class="print-list-table"><thead><tr>
         <th style="width:45px">Rang</th><th>Nom &amp; Prénom(s)</th><th style="width:45px">Sexe</th>
         <th style="width:85px">Moyenne</th><th style="width:95px">Mention</th>
         <th style="width:85px">Décision</th></tr></thead>
       <tbody>${admis.map((r) => ligneHTML(r, '#15803d', 'Admis(e)')).join('')}</tbody></table>`
    : '<p style="text-align:center;font-style:italic;color:#64748b;margin:14px 0">Aucun élève admis.</p>';

  const tableauAjournes = ajournes.length
    ? `<h4 class="report-section-title" style="color:#b91c1c">Liste des ajournés (${ajournes.length})</h4>
       <table class="print-list-table"><thead><tr>
         <th style="width:45px">Rang</th><th>Nom &amp; Prénom(s)</th><th style="width:45px">Sexe</th>
         <th style="width:85px">Moyenne</th><th style="width:95px">Mention</th>
         <th style="width:85px">Décision</th></tr></thead>
       <tbody>${ajournes.map((r) => ligneHTML(r, '#b91c1c', 'Ajourné(e)')).join('')}</tbody></table>`
    : '';

  return `<section class="pdf-report-page" data-orientation="${orientation}">
    ${enteteHTML}
    <div class="report-title">${esc(titre)}</div>
    <p class="report-subtitle">${esc(libelle)}</p>
    ${statsHTML}
    ${tableauAdmis}
    ${tableauAjournes}
    ${signatureHTML}
  </section>`;
}

export function buildExamBlancResultsHTML(params: {
  niveauLabel: string;
  classe: string;
  date?: string;
  cfg: DocConfig;
  rows: EvalComputedRow[];
  seuil: number;
  orientationMode?: PageOrientationMode;
}): string {
  const {
    niveauLabel,
    classe,
    date,
    cfg,
    rows,
    seuil,
    orientationMode = 'auto',
  } = params;
  const orientation = resolveDocumentOrientation(
    getNaturalEvalReportOrientation('resultat_exam'),
    orientationMode
  );
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);

  const composed = [...rows]
    .filter((r) => r.notesEntered > 0)
    .sort((a, b) => {
      if (Math.abs(b.moyenne - a.moyenne) > 1e-9) return b.moyenne - a.moyenne;
      return a.label.localeCompare(b.label, 'fr');
    });
  const uncomposed = [...rows]
    .filter((r) => r.notesEntered === 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

  let curRank = 0;
  let prevMoy: number | null = null;
  const composedWithRank = composed.map((r, idx) => {
    if (prevMoy === null || Math.abs(r.moyenne - prevMoy) > 1e-9) {
      curRank = idx + 1;
    }
    prevMoy = r.moyenne;
    return { ...r, computedRank: curRank };
  });
  const orderedRows = [
    ...composedWithRank,
    ...uncomposed.map((r) => ({ ...r, computedRank: null as number | null })),
  ];

  const tbody = orderedRows.length
    ? orderedRows
        .map((r) => {
          const cs = candCellStyle(r.sexe);
          const hasNotes = r.notesEntered > 0;
          const passed = hasNotes && r.moyenne >= seuil;
          const moyColor = !hasNotes ? '#64748b' : passed ? '#15803d' : '#b91c1c';
          const nom = r.nom || r.label;
          const prenoms = r.prenoms || '';
          const mention = hasNotes ? getMentionEval(r.moyenne).label : '—';
          return `<tr>
            <td style="font-weight:bold">${r.computedRank !== null ? r.computedRank : '—'}</td>
            <td style="font-family:monospace">${esc(r.matricule || r.key)}</td>
            <td style="${cs}">${esc(nom)}</td>
            <td style="${cs}">${esc(prenoms)}</td>
            <td style="${cs}">${esc(r.sexe || '—')}</td>
            <td>${esc(r.esh || 'Non')}</td>
            <td>${esc(r.edf || 'Non')}</td>
            <td>${esc(r.pupille || 'Non')}</td>
            <td>${hasNotes ? r.total.toFixed(2) : '—'}</td>
            <td style="font-weight:bold;color:${moyColor}">${hasNotes ? r.moyenne.toFixed(2) : '—'}</td>
            <td>${esc(mention)}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="11" style="padding:14px">Aucun élève dans cette classe.</td></tr>';

  const stats = computeExamBlancStats(rows, seuil);
  const statsRowsHTML = stats.lines
    .map(
      (line) => `<tr${line.highlight ? ' style="background:#f4f7fb;font-weight:bold"' : ''}>
        <td><b>${esc(line.designation)}</b></td>
        <td>${line.effectif.f}</td>
        <td>${line.effectif.g}</td>
        <td><b>${line.effectif.t}</b></td>
        <td>${line.composed.f}</td>
        <td>${line.composed.g}</td>
        <td><b>${line.composed.t}</b></td>
        <td>${line.passed.f}</td>
        <td>${line.passed.g}</td>
        <td><b>${line.passed.t}</b></td>
        <td>${line.taux.f.toFixed(1)}%</td>
        <td>${line.taux.g.toFixed(1)}%</td>
        <td><b>${line.taux.t.toFixed(1)}%</b></td>
      </tr>`
    )
    .join('');

  const statsTableHTML = `<div class="report-section-block">
    <h4 class="report-section-title">2. Statistiques de l&apos;examen blanc</h4>
    <table class="print-list-table compact">
      <colgroup>
        <col style="width:16%">
        <col style="width:7%"><col style="width:7%"><col style="width:7%">
        <col style="width:7%"><col style="width:7%"><col style="width:7%">
        <col style="width:7%"><col style="width:7%"><col style="width:7%">
        <col style="width:7%"><col style="width:7%"><col style="width:7%">
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2" style="text-align:center;vertical-align:middle">Désignation</th>
          <th colspan="3">Effectif</th>
          <th colspan="3">Ayant composé</th>
          <th colspan="3">Ayant eu la moyenne</th>
          <th colspan="3">Taux</th>
        </tr>
        <tr>${'<th>F</th><th>G</th><th>T</th>'.repeat(4)}</tr>
      </thead>
      <tbody>${statsRowsHTML}</tbody>
    </table>
  </div>`;

  const dateStr = formatDateLong(date) || date || '—';

  return `<section class="pdf-report-page" data-orientation="${orientation}">
    ${enteteHTML}
    <div class="report-title">RÉSULTATS DE L&apos;EXAMEN BLANC NIVEAU ${esc(niveauLabel.toUpperCase())}</div>
    <p class="report-subtitle">Classe : <b>${esc(classe)}</b> · Date : ${esc(dateStr)} · Année scolaire : ${esc(cfg.anneeScolaire)} · Seuil d&apos;admission : ${seuil}/10</p>
    <h4 class="report-section-title">1. Tableau des résultats</h4>
    <table class="print-list-table compact main-report-table">
      <colgroup>
        <col style="width:5%">
        <col style="width:10%">
        <col style="width:14%">
        <col style="width:18%">
        <col style="width:5%">
        <col style="width:5.5%">
        <col style="width:5.5%">
        <col style="width:7%">
        <col style="width:9%">
        <col style="width:9%">
        <col style="width:12%">
      </colgroup>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Matricule</th>
          <th>Nom</th>
          <th>Prénoms</th>
          <th>Sexe</th>
          <th>ESH</th>
          <th>EDF</th>
          <th>PUPILLE</th>
          <th>Total</th>
          <th>Moyenne</th>
          <th>Mention</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
    ${statsTableHTML}
    ${signatureHTML}
  </section>`;
}

export function buildFicheNotesHTML(params: {
  titre?: string;
  periodeLabel: string;
  classe: string;
  cfg: DocConfig;
  students: Array<{ key: string; matricule?: string; pv?: string; nom: string; prenoms: string; sexe: Sexe }>;
  matieres: SubjectDef[];
  notes?: Record<string, Record<string, string>>;
  blank?: boolean;
  includeSummaryCols?: boolean;
  orientationMode?: PageOrientationMode;
}): string {
  const {
    titre = 'FICHE DES NOTES',
    periodeLabel,
    classe,
    cfg,
    students,
    matieres,
    notes = {},
    blank = false,
    includeSummaryCols = !blank && matieres.length > 2,
    orientationMode = 'auto',
  } = params;

  const natural = getNaturalEvalReportOrientation('fiche_notes', matieres.length);
  const orientation = resolveDocumentOrientation(natural, orientationMode);
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);

  const evalRows = !blank
    ? computeEvaluationRows(
        students.map((s) => ({
          key: s.key,
          label: `${s.nom} ${s.prenoms}`.trim(),
          nom: s.nom,
          prenoms: s.prenoms,
          sexe: s.sexe,
        })),
        matieres,
        notes
      )
    : [];
  const evalMap = new Map(evalRows.map((r) => [r.key, r]));

  const compact = matieres.length > 5 || orientation === 'landscape';
  const useFixedCols = matieres.length > 4;
  const colgroup = useFixedCols
    ? `<colgroup>
        <col style="width:22px">
        <col style="width:52px">
        <col style="width:46px">
        <col style="width:148px">
        <col style="width:24px">
        ${matieres.map(() => '<col>').join('')}
        ${
          includeSummaryCols
            ? '<col style="width:38px"><col style="width:40px"><col style="width:28px">'
            : '<col style="width:72px">'
        }
      </colgroup>`
    : `<colgroup>
        <col style="width:6%">
        <col style="width:14%">
        <col style="width:12%">
        <col style="width:34%">
        <col style="width:7%">
        ${matieres.map(() => '<col>').join('')}
        ${
          includeSummaryCols
            ? '<col style="width:8%"><col style="width:8%"><col style="width:6%">'
            : '<col style="width:13%">'
        }
      </colgroup>`;

  const thead = `<thead><tr>
    <th>N°</th>
    <th>Matricule</th>
    <th>N° PV</th>
    <th>Nom &amp; Prénom(s)</th>
    <th>Sexe</th>
    ${matieres.map((m) => `<th title="${esc(m.nom)}">${esc(abbreviateSubject3(m.nom))}</th>`).join('')}
    ${includeSummaryCols ? '<th>Total</th><th>Moy./10</th><th>Rang</th>' : '<th>Obs.</th>'}
  </tr></thead>`;

  const tbody = students.length
    ? students
        .map((st, idx) => {
          const cs = candCellStyle(st.sexe);
          const computed = evalMap.get(st.key);
          const subjectCells = matieres
            .map((m) => {
              const raw = blank ? '' : (notes[st.key]?.[m.id] ?? '');
              return `<td>${raw !== '' ? esc(raw) : ''}</td>`;
            })
            .join('');
          const tailCells = includeSummaryCols
            ? `<td style="font-weight:bold">${computed && computed.notesEntered > 0 ? computed.total.toFixed(2) : ''}</td>
               <td style="font-weight:bold">${computed && computed.notesEntered > 0 ? computed.moyenne.toFixed(2) : ''}</td>
               <td style="font-weight:bold">${computed && computed.notesEntered > 0 ? computed.rank : ''}</td>`
            : '<td></td>';
          return `<tr>
            <td>${idx + 1}</td>
            <td style="font-family:monospace">${esc(st.matricule || '')}</td>
            <td style="font-family:monospace">${esc(st.pv || '')}</td>
            <td style="${cs}">${esc(`${st.nom} ${st.prenoms}`.trim())}</td>
            <td style="${cs}">${esc(st.sexe)}</td>
            ${subjectCells}
            ${tailCells}
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="${6 + matieres.length + (includeSummaryCols ? 2 : 0)}" style="padding:14px">Aucun élève dans cette classe.</td></tr>`;

  const legendHTML = matieres.length
    ? `<p class="report-legend"><b>Matières :</b> ${matieres
        .map((m) => `${esc(abbreviateSubject3(m.nom).toUpperCase())} = ${esc(m.nom)} (/${m.max})`)
        .join(' · ')}</p>`
    : '';

  return `<section class="pdf-report-page single-page-report fiche-notes-page" data-orientation="${orientation}">
    ${enteteHTML}
    <div class="report-title">${esc(titre)}</div>
    <p class="report-subtitle">${esc(periodeLabel)} · Classe : <b>${esc(classe)}</b> · Effectif : ${students.length} élève(s)</p>
    <table class="print-list-table${compact ? ' compact' : ''} fiche-notes-table">
      ${colgroup}
      ${thead}
      <tbody>${tbody}</tbody>
    </table>
    ${legendHTML}
    ${signatureHTML}
  </section>`;
}

export function buildTableauSynoptiqueHTML(params: {
  trimestre: string;
  classe: string;
  cfg: DocConfig;
  students: Array<{ key: string; matricule?: string; nom: string; prenoms: string; sexe: Sexe }>;
  matieres: SubjectDef[];
  notes: Record<string, Record<string, string>>;
  seuil?: number;
  orientationMode?: PageOrientationMode;
}): string {
  const {
    trimestre,
    classe,
    cfg,
    students,
    matieres,
    notes,
    orientationMode = 'auto',
  } = params;
  const syn = computeSynoptiqueBySubject(students, matieres, notes);
  const orientation = resolveDocumentOrientation(
    getNaturalEvalReportOrientation('synoptique', syn.subjects.length),
    orientationMode
  );
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);

  const colgroup = `<colgroup><col style="width:74px">${syn.subjects
    .map(() => '<col><col><col>')
    .join('')}</colgroup>`;

  const thead = syn.subjects.length
    ? `<thead>
        <tr>
          <th rowspan="2" style="text-align:center;vertical-align:middle">Notes</th>
          ${syn.subjects.map((s) => `<th colspan="3">${esc(s.matiere.nom)}</th>`).join('')}
        </tr>
        <tr>${'<th>F</th><th>G</th><th>T</th>'.repeat(syn.subjects.length)}</tr>
      </thead>`
    : '<thead><tr><th>Notes</th><th>Aucune matière</th></tr></thead>';

  const renderCells = (pick: (s: (typeof syn.subjects)[number]) => { f: number; g: number; t: number }) =>
    syn.subjects
      .map((s) => {
        const c = pick(s);
        return `<td>${c.f}</td><td>${c.g}</td><td><b>${c.t}</b></td>`;
      })
      .join('');

  const tbody = syn.subjects.length
    ? `<tbody>
        <tr><td><b>0 à 4.99</b></td>${renderCells((s) => s.palierBas)}</tr>
        <tr><td><b>5 à 10</b></td>${renderCells((s) => s.palierHaut)}</tr>
        <tr style="background:#f4f7fb;font-weight:bold"><td><b>Total</b></td>${renderCells((s) => s.total)}</tr>
      </tbody>`
    : '<tbody><tr><td colspan="2">Aucune matière évaluée.</td></tr></tbody>';

  return `<section class="pdf-report-page synoptique-page" data-orientation="${orientation}">
    ${enteteHTML}
    <div class="report-title">TABLEAU SYNOPTIQUE DE L&apos;ÉVALUATION — ${esc(trimestre.toUpperCase())}</div>
    <p class="report-subtitle">Classe : <b>${esc(classe)}</b> · Effectif : ${students.length} élève(s) · Année scolaire : ${esc(cfg.anneeScolaire)}</p>
    <table class="print-list-table compact synoptique-table">
      ${colgroup}
      ${thead}
      ${tbody}
    </table>
    ${signatureHTML}
  </section>`;
}

export function buildPropositionFinAnneeHTML(params: {
  summary: AnnualProposalSummary;
  cfg: DocConfig;
  orientationMode?: PageOrientationMode;
}): string {
  const { summary, cfg, orientationMode = 'auto' } = params;
  const orientation = resolveDocumentOrientation(
    getNaturalEvalReportOrientation('proposition'),
    orientationMode
  );
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);

  const fmtMoy = (v: number | null) => (v !== null ? v.toFixed(2) : '—');
  const decisionColor = (d: AnnualProposalSummary['rows'][number]['decision']) => {
    if (d === 'Promu(e)' || d === 'Fin de cycle') return '#15803d';
    if (d === 'Redouble') return '#b45309';
    if (d === 'Renvoyé') return '#b91c1c';
    return '#475569';
  };

  const tbody = summary.rows.length
    ? summary.rows
        .map((r) => {
          const cs = candCellStyle(r.sexe);
          const decCol = decisionColor(r.decision);
          const rangDisplay = r.trimestersCount > 0 ? String(r.rank) : '—';
          return `<tr>
            <td style="font-weight:bold">${esc(rangDisplay)}</td>
            <td style="font-family:monospace">${esc(r.matricule)}</td>
            <td style="${cs}">${esc(r.nom)}</td>
            <td style="${cs}">${esc(r.prenoms)}</td>
            <td style="${cs}">${esc(r.sexe || '—')}</td>
            <td>${esc(r.esh)}</td>
            <td>${esc(r.edf)}</td>
            <td>${esc(r.pupille)}</td>
            <td>${fmtMoy(r.moyT1)}</td>
            <td>${fmtMoy(r.moyT2)}</td>
            <td>${fmtMoy(r.moyT3)}</td>
            <td style="font-weight:bold;color:${decCol}">${r.trimestersCount > 0 ? r.moyAnnuelle.toFixed(2) : '—'}</td>
            <td style="font-weight:bold;color:${decCol}">${esc(r.decision)}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="13" style="padding:12px">Aucun élève dans cette classe.</td></tr>';

  const statsRows: Array<{ label: string; data: AnnualProposalSummary['statsByStatus']['effectif']; highlight?: boolean }> = [
    { label: 'EFFECTIF', data: summary.statsByStatus.effectif, highlight: true },
    { label: 'PROMUS', data: summary.statsByStatus.promus },
    { label: 'REDOUBLANTS', data: summary.statsByStatus.redoublants },
    { label: 'ABANDONS', data: summary.statsByStatus.abandons },
    { label: 'RENVOYES', data: summary.statsByStatus.renvoyes },
    { label: 'FIN DE CYCLE', data: summary.statsByStatus.finDeCycle },
  ];

  const statsTableHTML = `<div class="report-section-block">
    <h4 class="report-section-title">2. Statistiques de fin d&apos;année</h4>
    <table class="print-list-table compact" style="max-width:560px">
      <colgroup><col style="width:170px"><col style="width:90px"><col style="width:90px"><col style="width:100px"><col style="width:110px"></colgroup>
      <thead>
        <tr>
          <th>Désignation</th>
          <th>ESH</th>
          <th>EDF</th>
          <th>PUPILLE</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${statsRows
          .map(
            (sr) => `<tr${sr.highlight ? ' style="background:#f4f7fb;font-weight:bold"' : ''}>
              <td><b>${esc(sr.label)}</b></td>
              <td>${sr.data.esh}</td>
              <td>${sr.data.edf}</td>
              <td>${sr.data.pupille}</td>
              <td><b>${sr.data.total}</b></td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>`;

  const teachers = Array.isArray(cfg.enseignantsConseil) ? cfg.enseignantsConseil : [];
  const teachersRowsHTML = teachers.length
    ? teachers
        .map((t) => {
          const colStyle = candCellStyle(t.sexe);
          return `<tr>
            <td>${esc(t.classe)}</td>
            <td style="font-family:monospace">${esc(t.matricule)}</td>
            <td style="${colStyle}">${esc(t.nom)}</td>
            <td style="${colStyle}">${esc(t.prenoms)}</td>
            <td style="${colStyle}">${esc(t.sexe || '—')}</td>
            <td>${esc(t.corps)}</td>
            <td>${esc(t.fonction)}</td>
            <td>${esc(t.statut)}</td>
            <td>${esc(t.contact)}</td>
            <td style="height:20px"></td>
          </tr>`;
        })
        .join('')
    : Array.from({ length: 3 })
        .map(
          () =>
            '<tr><td style="height:20px">&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'
        )
        .join('');

  const teachersTableHTML = `<div class="report-section-block">
    <h4 class="report-section-title">3. Liste des enseignants ayant pris part au conseil des enseignants</h4>
    <table class="print-list-table compact teachers-council-table">
      <colgroup>
        <col style="width:6%">
        <col style="width:9%">
        <col style="width:12%">
        <col style="width:15%">
        <col style="width:4.5%">
        <col style="width:11%">
        <col style="width:11%">
        <col style="width:9.5%">
        <col style="width:10%">
        <col style="width:12%">
      </colgroup>
      <thead>
        <tr>
          <th>Classe</th>
          <th>Matricule</th>
          <th>Nom</th>
          <th>Prénoms</th>
          <th>Sexe</th>
          <th>Corps</th>
          <th>Fonction</th>
          <th>Statut</th>
          <th>Contact</th>
          <th>Signature</th>
        </tr>
      </thead>
      <tbody>${teachersRowsHTML}</tbody>
    </table>
  </div>`;

  const t = summary.thresholds;
  return `<section class="pdf-report-page" data-orientation="${orientation}">
    ${enteteHTML}
    <div class="report-title">PROPOSITION DE FIN D&apos;ANNÉE SCOLAIRE</div>
    <p class="report-subtitle">Classe : <b>${esc(summary.classe)}</b> → <b>${esc(summary.nextClasse)}</b> · Année scolaire : ${esc(cfg.anneeScolaire)} · Seuils (/10) — Promotion ≥ ${t.promotion} · Redoublement ≥ ${t.redoublement} · Renvoi &lt; ${t.renvoi} · Abandons ≤ ${t.abandons} · Fin de cycle ≥ ${t.finDeCycle}</p>
    <h4 class="report-section-title">1. Tableau de notes</h4>
    <table class="print-list-table compact main-report-table">
      <colgroup>
        <col style="width:4%">
        <col style="width:8%">
        <col style="width:12%">
        <col style="width:15%">
        <col style="width:4%">
        <col style="width:4.5%">
        <col style="width:4.5%">
        <col style="width:6%">
        <col style="width:7%">
        <col style="width:7%">
        <col style="width:7%">
        <col style="width:7%">
        <col style="width:14%">
      </colgroup>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Matricule</th>
          <th>Nom</th>
          <th>Prénoms</th>
          <th>Sexe</th>
          <th>ESH</th>
          <th>EDF</th>
          <th>PUPILLE</th>
          <th>MOY Trim1</th>
          <th>MOY Trim2</th>
          <th>MOY Trim3</th>
          <th>MOY Géné</th>
          <th>DECISION DU CONSEIL</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
    ${statsTableHTML}
    ${teachersTableHTML}
    ${signatureHTML}
  </section>`;
}

export function buildBulletinHTML(params: {
  student: EvalComputedRow;
  totalStudents: number;
  moyenneClasse: number;
  matieres: SubjectDef[];
  notes: Record<string, string>;
  periodeLibelle: string;
  classe: string;
  cfg: DocConfig;
  seuil: number;
  orientationMode?: PageOrientationMode;
}): string {
  const {
    student,
    totalStudents,
    moyenneClasse,
    matieres,
    notes,
    periodeLibelle,
    classe,
    cfg,
    seuil,
    orientationMode = 'auto',
  } = params;
  const orientation = resolveDocumentOrientation('portrait', orientationMode);
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);
  const mention = getMentionEval(student.moyenne);
  const admis = student.moyenne >= seuil;

  const rowsHTML = matieres
    .map((m) => {
      const raw = notes[m.id];
      const n = raw !== undefined && raw !== '' ? Number(raw) : null;
      const noteSur10 = n !== null && !Number.isNaN(n) ? (n / m.max) * 10 : null;
      const points = noteSur10 !== null ? noteSur10 * m.coef : 0;
      return `<tr>
        <td>${esc(m.nom)}</td>
        <td>${n !== null ? `${n} / ${m.max}` : '—'}</td>
        <td>${m.coef}</td>
        <td>${noteSur10 !== null ? noteSur10.toFixed(2) : '—'}</td>
        <td style="font-weight:bold">${noteSur10 !== null ? points.toFixed(2) : '0.00'}</td>
      </tr>`;
    })
    .join('');

  return `<section class="pdf-report-page" data-orientation="${orientation}">
    ${enteteHTML}
    <div class="report-title">RELEVÉ DE NOTES / BULLETIN SCOLAIRE</div>
    <p class="report-subtitle">${esc(periodeLibelle)} · Classe : <b>${esc(classe)}</b></p>
    <div class="report-bulletin-box" style="border:1px solid #1e293b;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;font-size:10.5pt">
      <div><b>Élève :</b> <span style="${candCellStyle(student.sexe)}">${esc(student.nom ? `${student.nom}${student.prenoms ? ` ${student.prenoms}` : ''}` : student.label)}</span></div>
      <div><b>Effectif :</b> ${totalStudents} élèves</div>
      <div><b>Rang :</b> ${student.rank}<sup>e</sup> / ${totalStudents}</div>
    </div>
    <table class="print-list-table">
      <colgroup><col style="width:40%"><col style="width:16%"><col style="width:10%"><col style="width:16%"><col style="width:18%"></colgroup>
      <thead>
        <tr>
          <th>Matière</th>
          <th>Note brute</th>
          <th>Coef</th>
          <th>Note /10</th>
          <th>Total pondéré</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>
    <div class="report-bulletin-box" style="border:1px solid #1e293b;padding:10px 14px;margin-top:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:10.5pt;background:#f8fafc">
      <div><b>Total :</b> ${student.total.toFixed(2)} / ${(student.sommeCoef * 10).toFixed(0)}</div>
      <div><b>Moyenne :</b> <span style="color:${admis ? '#15803d' : '#b91c1c'};font-weight:bold">${student.moyenne.toFixed(2)} / 10</span></div>
      <div><b>Moyenne classe :</b> ${moyenneClasse.toFixed(2)} / 10</div>
      <div><b>Mention :</b> ${esc(mention.label)}</div>
      <div><b>Décision :</b> <b>${admis ? 'Admis(e)' : 'Ajourné(e)'}</b></div>
    </div>
    ${signatureHTML}
  </section>`;
}

export { versCandidatDocument };

