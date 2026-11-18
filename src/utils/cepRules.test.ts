import test from 'node:test';
import assert from 'node:assert/strict';
import {
  abbreviateSubject3,
  buildCandidatesCSV,
  calculateAge,
  categorieDe,
  classifyAnnualDecision,
  computeAnnualProposals,
  computeDashboardKeyIndicators,
  computeEvaluationRows,
  computeEvaluationStats,
  computeExamBlancStats,
  computeSynoptiqueBySubject,
  formatDateLong,
  formatDateShort,
  generateBatchPVs,
  getMentionEval,
  getMissingDocFields,
  getNextClassLabel,
  normalizeCandidateInput,
  optionDeCategorie,
  parseCSV,
  parseImportedRows,
  resolveDocumentOrientation,
  validateCandidate,
  versCandidatDocument,
} from './cepRules';
import {
  ARMOIRIES_DEFAUT,
  buildDemoCandidates,
  createDefaultConfig,
  MATIERES_OFFICIELLES,
} from '../constants/cepConstants';
import {
  buildAttestationNiveau,
  buildBulletinHTML,
  buildCertificatScolarite,
  buildChemiseCEP,
  buildChemiseConcours6e,
  buildDossiersWordHTML,
  buildExamBlancResultsHTML,
  buildFicheInscription6e,
  buildFicheNotesHTML,
  buildPrintEvalResultsHTML,
  buildPrintListHTML,
  buildPropositionFinAnneeHTML,
  buildTableauSynoptiqueHTML,
  DOCS_META,
  getNaturalEvalReportOrientation,
  getNaturalListOrientation,
  ModCartes,
  toCardData,
} from './documentBuilders';

test('date formatting handles YYYY-MM-DD without UTC timezone shift', () => {
  assert.equal(formatDateLong('2014-03-01'), '01 mars 2014');
  assert.equal(formatDateShort('2014-03-01'), '01/03/2014');
  assert.equal(formatDateLong('14/05/2015'), '14 mai 2015');
  assert.equal(formatDateLong('', '—'), '—');
});

test('calculateAge computes exact age relative to month and day', () => {
  const ref = new Date(2027, 2, 15); // 15 March 2027
  assert.equal(calculateAge('2014-03-14', ref), 13);
  assert.equal(calculateAge('2014-03-16', ref), 12);
  assert.equal(calculateAge('', ref), '');
});

test('category and option mapping preserves legacy and new formats', () => {
  assert.equal(optionDeCategorie('CEP + ET'), 'ET');
  assert.equal(optionDeCategorie('CEP + EG'), 'EG');
  assert.equal(optionDeCategorie('CEP Seul'), '');
  assert.equal(categorieDe({ option6e: 'ET', libre: 'Oui' }), 'CEP + ET');
  assert.equal(categorieDe({ option6e: 'EG', libre: 'Non' }), 'EG Seul');
  assert.equal(categorieDe({ categorie: 'CEP Seul' }), 'CEP Seul');
});

test('candidate validation enforces required, duplicate, and conditional fields', () => {
  const base = normalizeCandidateInput(
    { matricule: 'M001', nom: 'OUEDRAOGO', prenoms: 'Aminata', categorie: 'CEP + EG' },
    'CM2'
  );
  assert.equal(validateCandidate(base, []), null);
  assert.ok(validateCandidate(base, [base])?.includes('existe déjà'));
  assert.equal(validateCandidate(base, [base], 'M001'), null);

  const pupilleNoId = normalizeCandidateInput(
    { matricule: 'M002', nom: 'KABORE', prenoms: 'Paul', pupille: 'Oui' },
    'CM2'
  );
  assert.ok(validateCandidate(pupilleNoId, [])?.includes('identification'));

  const etNoFiliere = normalizeCandidateInput(
    { matricule: 'M003', nom: 'SAWADOGO', prenoms: 'Luc', categorie: 'CEP + ET' },
    'CM2'
  );
  assert.ok(validateCandidate(etNoFiliere, [])?.includes('filière'));
});

test('evaluation calculations compute weighted averages, tie ranks, and admission stats', () => {
  const students = [
    { key: 'S1', label: 'Awa' },
    { key: 'S2', label: 'Boubacar' },
    { key: 'S3', label: 'Clarisse' },
  ];
  const matieres = [
    { id: 'm1', nom: 'Lecture', coef: 2, max: 10 },
    { id: 'm2', nom: 'Arithmétique', coef: 1, max: 20 },
  ];
  const notes = {
    S1: { m1: '8', m2: '16' }, // (8/10*10*2 + 16/20*10*1) / 3 = (16 + 8)/3 = 8.00
    S2: { m1: '8', m2: '16' }, // tie at 8.00
    S3: { m1: '4', m2: '8' },  // (8 + 4)/3 = 4.00
  };

  const rows = computeEvaluationRows(students, matieres, notes);
  assert.equal(rows[0].moyenne, 8);
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[1].rank, 1);
  assert.equal(rows[2].moyenne, 4);
  assert.equal(rows[2].rank, 3);

  assert.equal(getMentionEval(8).label, 'Très Bien');
  assert.equal(getMentionEval(4).label, 'Échec');

  const stats = computeEvaluationStats(rows, 5);
  assert.equal(stats.admis.length, 2);
  assert.equal(stats.ajournes.length, 1);
  assert.ok(Math.abs(stats.tauxReussite - 66.666) < 0.1);
});

test('generateBatchPVs builds padded sequential numbers', () => {
  assert.deepEqual(generateBatchPVs(3, '2027-', 8, 3), ['2027-008', '2027-009', '2027-010']);
});

test('parseCSV handles semicolon, commas, BOM, and quoted strings', () => {
  const csv = '\uFEFFMatricule;Nom;Prénom(s)\n001;"OUEDRAOGO";"Aminata;Rose"\n002;KABORE;Paul';
  const rows = parseCSV(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][2], 'Aminata;Rose');
});

test('parseImportedRows normalizes imported spreadsheet rows and deduplicates matricules', () => {
  const existing = [
    normalizeCandidateInput({ matricule: '001', nom: 'EXIST', prenoms: 'Test' }, 'CM2'),
  ];
  const { imported, ignored } = parseImportedRows(
    [
      { Matricule: '001', Nom: 'DUP', 'Prénom(s)': 'A' },
      { Matricule: '002', Nom: 'ZIDA', 'Prénom(s)': 'B', ESH: 'Oui', 'Entrée en 6ième': 'CEP + ET', Filière: 'Couture' },
    ],
    existing,
    'CM2'
  );
  assert.equal(ignored, 1);
  assert.equal(imported.length, 1);
  assert.equal(imported[0].handicap, 'Oui');
  assert.equal(imported[0].option6e, 'ET');
  assert.equal(imported[0].filiere, 'Couture');
  assert.equal(imported[0].pv, '');
});

test('getMissingDocFields reports incomplete fields accurately', () => {
  const c = normalizeCandidateInput({ matricule: '001', nom: 'A', prenoms: 'B' }, 'CM2');
  const docModel = versCandidatDocument(c, 'CM2');
  const missing = getMissingDocFields('certificat', docModel);
  assert.ok(missing.includes('Date de naissance'));
  assert.ok(!missing.includes('Matricule'));
});

test('N° PV stays empty by default (distinct from matricule) and armoiries points to uploaded image', () => {
  assert.equal(ARMOIRIES_DEFAUT, '/assets/aistudio/armoiries-1_c0fb0fed.png');
  const cfg = createDefaultConfig();
  assert.equal(cfg.armoiries, '/assets/aistudio/armoiries-1_c0fb0fed.png');

  const demo = buildDemoCandidates('CM2');
  assert.ok(demo.length >= 6);
  demo.forEach((c) => {
    assert.ok(c.matricule.length > 0);
    assert.equal(c.pv, '');
    const doc = versCandidatDocument(c, 'CM2');
    assert.equal(doc.pv, '');
    const card = toCardData(c, cfg, 'CM2');
    assert.equal(card.pv, '');
  });

  const withExplicitPv = normalizeCandidateInput(
    { matricule: '2027-001', pv: 'PV-999', nom: 'OUEDRAOGO', prenoms: 'Aminata', sexe: 'F' },
    'CM2'
  );
  assert.equal(withExplicitPv.pv, 'PV-999');
  assert.equal(versCandidatDocument(withExplicitPv, 'CM2').pv, 'PV-999');
  assert.equal(toCardData(withExplicitPv, cfg, 'CM2').pv, 'PV-999');
});

test('all documents style girls nom, prenoms, and sexe in bold dark red, use new armoiries, and keep chemise EG/EFTP Pupille placement', () => {
  const cfg = createDefaultConfig();
  const girl = normalizeCandidateInput(
    {
      matricule: '2027-003',
      nom: 'KABORE',
      prenoms: 'Wendyam Claire',
      sexe: 'F',
      pupille: 'Oui',
      numeroIdentification: 'PN-2026-412',
      categorie: 'CEP + EG',
      libre: 'Oui',
    },
    'CM2'
  );
  const boy = normalizeCandidateInput(
    {
      matricule: '2027-004',
      nom: 'SAWADOGO',
      prenoms: 'Boukary',
      sexe: 'M',
      pupille: 'Non',
      categorie: 'CEP + EG',
      libre: 'Oui',
    },
    'CM2'
  );
  const docF = versCandidatDocument(girl, 'CM2');
  const docM = versCandidatDocument(boy, 'CM2');
  assert.equal(docF.pv, '');
  assert.equal(docF.pupille, 'Oui');
  assert.equal(docF.numero_identification, 'PN-2026-412');

  const chemise6eF = buildChemiseConcours6e(docF, cfg);
  assert.ok(chemise6eF.includes('Pupille :'));
  assert.ok(chemise6eF.includes('PN-2026-412'));
  assert.ok(chemise6eF.includes('color:#8b0000;font-weight:700">KABORE'));
  assert.ok(chemise6eF.includes('color:#8b0000;font-weight:700">Wendyam Claire'));
  const idxPrenom = chemise6eF.indexOf('Prénom(s) du candidat');
  const idxPupille = chemise6eF.indexOf('pupille-bar');
  const idxAdr = chemise6eF.indexOf('ADRESSE ACTUELLE DES PARENTS');
  assert.ok(idxPrenom > -1 && idxPupille > idxPrenom && idxPupille < idxAdr);

  const chemise6eM = buildChemiseConcours6e(docM, cfg);
  assert.ok(!chemise6eM.includes('cand-rouge'));
  assert.ok(chemise6eM.includes('color:#000000;font-weight:400">SAWADOGO'));
  assert.ok(chemise6eM.includes('color:#000000;font-weight:400">Boukary'));

  const ficheF = buildFicheInscription6e(docF, cfg);
  assert.ok(ficheF.includes('N° PV<span></span>'));
  assert.ok(ficheF.includes('color:#8b0000;font-weight:700">KABORE'));
  assert.ok(ficheF.includes('color:#8b0000;font-weight:700">Wendyam Claire'));
  assert.ok(ficheF.includes('color:#8b0000;font-weight:700">F<'));
  const ficheM = buildFicheInscription6e(docM, cfg);
  assert.ok(!ficheM.includes('cand-rouge'));
  assert.ok(ficheM.includes('color:#000000;font-weight:400">SAWADOGO'));
  assert.ok(ficheM.includes('color:#000000;font-weight:400">Boukary'));
  assert.ok(ficheM.includes('color:#000000;font-weight:400">M<'));

  const certifF = buildCertificatScolarite(docF, cfg);
  assert.ok(certifF.includes('src="/assets/aistudio/armoiries-1_c0fb0fed.png"'));
  assert.ok(certifF.includes('color:#8b0000;font-weight:700">KABORE Wendyam Claire<'));
  const certifM = buildCertificatScolarite(docM, cfg);
  assert.ok(!certifM.includes('cand-rouge'));
  assert.ok(certifM.includes('color:#000000;font-weight:400">SAWADOGO Boukary<'));

  const chemiseCepF = buildChemiseCEP(docF, cfg);
  assert.ok(chemiseCepF.includes('<b>N° PV :</b><span class="v"></span>'));
  assert.ok(chemiseCepF.includes('color:#8b0000;font-weight:700">KABORE'));
  assert.ok(chemiseCepF.includes('color:#8b0000;font-weight:700">Wendyam Claire'));
  assert.ok(chemiseCepF.includes('color:#8b0000;font-weight:700">F<'));
  const chemiseCepM = buildChemiseCEP(docM, cfg);
  assert.ok(!chemiseCepM.includes('cand-rouge'));
  assert.ok(chemiseCepM.includes('color:#000000;font-weight:400">SAWADOGO'));
  assert.ok(chemiseCepM.includes('color:#000000;font-weight:400">Boukary'));
  assert.ok(chemiseCepM.includes('color:#000000;font-weight:400">M<'));

  const attestF = buildAttestationNiveau(docF, cfg);
  assert.ok(attestF.includes('color:#8b0000;font-weight:700">KABORE Wendyam Claire<'));
  const attestM = buildAttestationNiveau(docM, cfg);
  assert.ok(!attestM.includes('cand-rouge'));
  assert.ok(attestM.includes('color:#000000;font-weight:400">SAWADOGO Boukary<'));

  const carteF = ModCartes.recto(toCardData(girl, cfg, 'CM2'));
  assert.ok(carteF.includes('href="/assets/aistudio/armoiries-1_c0fb0fed.png"'));
  assert.ok(carteF.includes('font-weight="700" fill="#8b0000" data-max="53.3">KABORE</text>'));
  assert.ok(carteF.includes('font-weight="700" fill="#8b0000" data-max="46.3">Wendyam Claire</text>'));
  assert.ok(carteF.includes('font-weight="700" fill="#8b0000">F</text>'));
  const carteVersoF = ModCartes.verso(toCardData(girl, cfg, 'CM2'));
  assert.ok(carteVersoF.includes('href="/assets/aistudio/armoiries-1_c0fb0fed.png"'));

  const carteM = ModCartes.recto(toCardData(boy, cfg, 'CM2'));
  assert.ok(carteM.includes('fill="#000000" data-max="53.3">SAWADOGO</text>'));
  assert.ok(carteM.includes('fill="#000000" data-max="46.3">Boukary</text>'));
  assert.ok(carteM.includes('fill="#000000">M</text>'));
  assert.ok(!carteM.includes('fill="#8b0000"'));

  const liste = buildPrintListHTML('all', [girl, boy], cfg);
  assert.ok(liste.includes('color:#8b0000;font-weight:bold">KABORE'));
  assert.ok(liste.includes('color:#8b0000;font-weight:bold">Wendyam Claire'));
  assert.ok(liste.includes('color:#8b0000;font-weight:bold">F</td>'));
  assert.ok(liste.includes('color:#000000;font-weight:normal">SAWADOGO'));
  assert.ok(liste.includes('color:#000000;font-weight:normal">Boukary'));
  assert.ok(liste.includes('color:#000000;font-weight:normal">M</td>'));

  const word = buildDossiersWordHTML([girl, boy], cfg, 'CM2');
  assert.ok(word.includes('Référence Pupille'));
  assert.ok(word.includes('PN-2026-412'));
  assert.ok(word.includes('<td class="lab">N° PV</td><td></td>'));
  assert.ok(word.includes('color:#8b0000;font-weight:bold">KABORE'));
  assert.ok(word.includes('color:#8b0000;font-weight:bold">Wendyam Claire'));
  assert.ok(word.includes('color:#8b0000;font-weight:bold">F</td>'));
  assert.ok(word.includes('color:#000000;font-weight:normal">SAWADOGO'));
  assert.ok(word.includes('color:#000000;font-weight:normal">Boukary'));
  assert.ok(word.includes('color:#000000;font-weight:normal">M</td>'));
  const wordChemiseStart = word.indexOf('Chemise du concours 6e');
  const wordPupilleIdx = word.indexOf('Référence Pupille', wordChemiseStart);
  const wordLieuIdx = word.indexOf('Lieu de résidence', wordChemiseStart);
  assert.ok(wordChemiseStart > -1 && wordPupilleIdx > wordChemiseStart && wordPupilleIdx < wordLieuIdx);

  const evalRes = buildPrintEvalResultsHTML({
    titre: 'Test',
    libelle: 'CM2',
    cfg,
    rows: [
      { key: '2027-003', label: 'KABORE Wendyam Claire', nom: 'KABORE', prenoms: 'Wendyam Claire', sexe: 'F', total: 8, sommeCoef: 1, moyenne: 8, rank: 1, notesEntered: 1 },
      { key: '2027-004', label: 'SAWADOGO Boukary', nom: 'SAWADOGO', prenoms: 'Boukary', sexe: 'M', total: 7, sommeCoef: 1, moyenne: 7, rank: 2, notesEntered: 1 },
    ],
    seuil: 5,
  });
  assert.ok(evalRes.includes('color:#8b0000;font-weight:bold">KABORE Wendyam Claire</span>'));
  assert.ok(evalRes.includes('color:#000000;font-weight:normal">SAWADOGO Boukary</span>'));
  assert.ok(evalRes.includes('color:#000000;font-weight:normal">M</td>'));

  const bulletinF = buildBulletinHTML({
    student: { key: '2027-003', label: 'KABORE Wendyam Claire', nom: 'KABORE', prenoms: 'Wendyam Claire', sexe: 'F', total: 8, sommeCoef: 1, moyenne: 8, rank: 1, notesEntered: 1 },
    totalStudents: 2,
    moyenneClasse: 7.5,
    matieres: [{ id: 'm1', nom: 'Lecture', coef: 1, max: 10 }],
    notes: { m1: '8' },
    periodeLibelle: '1er Trimestre',
    classe: 'CM2',
    cfg,
    seuil: 5,
  });
  assert.ok(bulletinF.includes('color:#8b0000;font-weight:bold">KABORE Wendyam Claire</span>'));

  const bulletinM = buildBulletinHTML({
    student: { key: '2027-004', label: 'SAWADOGO Boukary', nom: 'SAWADOGO', prenoms: 'Boukary', sexe: 'M', total: 7, sommeCoef: 1, moyenne: 7, rank: 2, notesEntered: 1 },
    totalStudents: 2,
    moyenneClasse: 7.5,
    matieres: [{ id: 'm1', nom: 'Lecture', coef: 1, max: 10 }],
    notes: { m1: '7' },
    periodeLibelle: '1er Trimestre',
    classe: 'CM2',
    cfg,
    seuil: 5,
  });
  assert.ok(bulletinM.includes('color:#000000;font-weight:normal">SAWADOGO Boukary</span>'));
});

test('orientation resolution and report defaults match Portrait/Paysage configuration', () => {
  assert.equal(DOCS_META.certificat.orientation, 'portrait');
  assert.equal(DOCS_META.fiche.orientation, 'portrait');
  assert.equal(DOCS_META.attestation.orientation, 'portrait');
  assert.equal(DOCS_META.chemiseCEP.orientation, 'landscape');
  assert.equal(DOCS_META.chemise.orientation, 'landscape');

  assert.equal(getNaturalListOrientation('all'), 'portrait');
  assert.equal(getNaturalListOrientation('etat'), 'landscape');
  assert.equal(getNaturalEvalReportOrientation('fiche_notes', 2), 'portrait');
  assert.equal(getNaturalEvalReportOrientation('fiche_notes', 7), 'landscape');
  assert.equal(getNaturalEvalReportOrientation('synoptique', 7), 'landscape');
  assert.equal(getNaturalEvalReportOrientation('proposition'), 'landscape');
  assert.equal(getNaturalEvalReportOrientation('resultat_exam'), 'landscape');

  assert.equal(resolveDocumentOrientation('landscape', 'auto'), 'landscape');
  assert.equal(resolveDocumentOrientation('landscape', 'portrait'), 'portrait');
  assert.equal(resolveDocumentOrientation('portrait', 'landscape'), 'landscape');

  const cfg = createDefaultConfig();
  const demo = buildDemoCandidates('CM2');
  const listeAllAuto = buildPrintListHTML('all', demo, cfg, 'auto');
  assert.ok(listeAllAuto.includes('data-orientation="portrait"'));
  const listeAllLandscape = buildPrintListHTML('all', demo, cfg, 'landscape');
  assert.ok(listeAllLandscape.includes('data-orientation="landscape"'));
  const etatAuto = buildPrintListHTML('etat', demo, cfg, 'auto');
  assert.ok(etatAuto.includes('data-orientation="landscape"'));
});

test('computeAnnualProposals aggregates T1, T2, T3 averages, ranks with ties, and determines promotion vs repeat', () => {
  assert.equal(getNextClassLabel('CP1'), 'CP2');
  assert.equal(getNextClassLabel('CM1'), 'CM2');
  assert.equal(getNextClassLabel('CM2'), '6ème / Entrée au secondaire');

  const cfg = createDefaultConfig();
  const girl = normalizeCandidateInput(
    { matricule: '2027-001', nom: 'OUEDRAOGO', prenoms: 'Aminata', sexe: 'F' },
    'CM2'
  );
  const boy = normalizeCandidateInput(
    { matricule: '2027-002', nom: 'SAWADOGO', prenoms: 'Boukary', sexe: 'M' },
    'CM2'
  );
  const subjects = [
    { id: 'm1', nom: 'Lecture', coef: 1, max: 10 },
    { id: 'm2', nom: 'Calcul', coef: 1, max: 10 },
  ];
  const evaluations = {
    journalieres: {},
    trimestrielles: {
      'CM2__1er Trimestre': {
        classe: 'CM2',
        trimestre: '1er Trimestre',
        matieres: subjects,
        notes: {
          '2027-001': { m1: '8', m2: '8' }, // 8.00
          '2027-002': { m1: '4', m2: '4' }, // 4.00
        },
      },
      'CM2__2ème Trimestre': {
        classe: 'CM2',
        trimestre: '2ème Trimestre',
        matieres: subjects,
        notes: {
          '2027-001': { m1: '7', m2: '7' }, // 7.00
          '2027-002': { m1: '5', m2: '3' }, // 4.00
        },
      },
      'CM2__3ème Trimestre': {
        classe: 'CM2',
        trimestre: '3ème Trimestre',
        matieres: subjects,
        notes: {
          '2027-001': { m1: '9', m2: '9' }, // 9.00 -> Ann = 8.00
          '2027-002': { m1: '4', m2: '4' }, // 4.00 -> Ann = 4.00
        },
      },
    },
    examens: {},
  };

  const summary = computeAnnualProposals({
    candidates: [girl, boy],
    evaluations,
    classe: 'CM2',
    seuil: 5,
  });

  assert.equal(summary.total, 2);
  assert.equal(summary.passants, 1);
  assert.equal(summary.redoublants, 1);
  assert.equal(summary.fillesPassantes, 1);
  assert.equal(summary.garconsPassants, 0);
  assert.equal(summary.hasT1, true);
  assert.equal(summary.hasT2, true);
  assert.equal(summary.hasT3, true);

  const rowF = summary.rows.find((r) => r.matricule === '2027-001')!;
  const rowM = summary.rows.find((r) => r.matricule === '2027-002')!;
  assert.equal(rowF.moyAnnuelle, 8);
  assert.equal(rowF.rank, 1);
  assert.equal(rowF.admis, true);
  assert.equal(rowF.decision, 'Fin de cycle');
  assert.equal(rowM.moyAnnuelle, 4);
  assert.equal(rowM.rank, 2);
  assert.equal(rowM.admis, false);
  assert.equal(rowM.decision, 'Redouble');

  const propHtml = buildPropositionFinAnneeHTML({ summary, cfg });
  assert.ok(propHtml.includes('PROPOSITION DE FIN D&apos;ANNÉE SCOLAIRE'));
  assert.ok(propHtml.includes('data-orientation="landscape"'));
  assert.ok(propHtml.includes('color:#8b0000;font-weight:bold">OUEDRAOGO'));
  assert.ok(propHtml.includes('color:#8b0000;font-weight:bold">F</td>'));

  const synHtml = buildTableauSynoptiqueHTML({
    trimestre: '2ème Trimestre',
    classe: 'CM2',
    cfg,
    students: [
      { key: '2027-001', matricule: '2027-001', nom: 'OUEDRAOGO', prenoms: 'Aminata', sexe: 'F' },
      { key: '2027-002', matricule: '2027-002', nom: 'SAWADOGO', prenoms: 'Boukary', sexe: 'M' },
    ],
    matieres: subjects,
    notes: evaluations.trimestrielles['CM2__2ème Trimestre'].notes,
    seuil: 5,
  });
  assert.ok(synHtml.includes('TABLEAU SYNOPTIQUE DE L&apos;ÉVALUATION — 2ÈME TRIMESTRE'));
  assert.ok(synHtml.includes('data-orientation="landscape"'));
  assert.ok(synHtml.includes('>Notes</th>'));
  assert.ok(synHtml.includes('>0 à 4.99</b>'));
  assert.ok(synHtml.includes('>5 à 10</b>'));
  assert.ok(synHtml.includes('>Total</b>'));

  const ficheHtml = buildFicheNotesHTML({
    periodeLabel: 'Évaluation journalière du 15 mai 2027',
    classe: 'CM2',
    cfg,
    students: [
      { key: '2027-001', matricule: '2027-001', pv: '', nom: 'OUEDRAOGO', prenoms: 'Aminata', sexe: 'F' },
    ],
    matieres: subjects,
    notes: { '2027-001': { m1: '9', m2: '8' } },
    blank: false,
  });
  assert.ok(ficheHtml.includes('FICHE DES NOTES'));
  assert.ok(ficheHtml.includes('single-page-report'));
  assert.ok(ficheHtml.includes('data-orientation="portrait"'));
  assert.ok(ficheHtml.includes('<th title="Lecture">Lec</th>'));
  assert.ok(ficheHtml.includes('<th title="Calcul">Cal</th>'));
  assert.ok(ficheHtml.includes('color:#8b0000;font-weight:bold">OUEDRAOGO Aminata'));
});

test('all official documents and Word tables center data vertically and align left', async () => {
  const { OFFICIAL_PRINT_CSS } = await import('./printStyles');
  assert.ok(OFFICIAL_PRINT_CSS.includes('align-items: center'));
  assert.ok(OFFICIAL_PRINT_CSS.includes('justify-content: flex-start'));
  assert.ok(OFFICIAL_PRINT_CSS.includes('.print-list-table td {\n  text-align: left !important;\n  vertical-align: middle !important;'));

  const cfg = createDefaultConfig();
  const demo = buildDemoCandidates('CM2');
  const word = buildDossiersWordHTML(demo.slice(0, 1), cfg, 'CM2');
  assert.ok(word.includes('table.champs td{border:.5pt solid #999;padding:3pt 5pt;vertical-align:middle;text-align:left}'));
});

test('buildCandidatesCSV produces Excel-readable UTF-8 BOM semicolon CSV with principal info and round-trips', () => {
  const candidates = [
    normalizeCandidateInput(
      {
        matricule: '2027-010',
        pv: 'PV-010',
        nom: 'OUEDRAOGO',
        prenoms: 'Aminata; "Claire"',
        sexe: 'F',
        dateNaiss: '2014-05-14',
        lieuNaiss: 'Ouagadougou',
        categorie: 'CEP + EG',
        libre: 'Oui',
        pupille: 'Oui',
        numeroIdentification: 'PN-100',
        pere: 'OUEDRAOGO Paul',
        mere: 'KABORE Awa',
        village: 'Tampouy',
        fonction: 'Kadiogo',
        contact: '70112233',
      },
      'CM2'
    ),
  ];

  const csv = buildCandidatesCSV(candidates);
  assert.ok(csv.startsWith('\uFEFF'));
  const parsed = parseCSV(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0][0], 'Matricule');
  assert.equal(parsed[0][1], 'N° PV');
  assert.equal(parsed[0][2], 'Nom');
  assert.equal(parsed[0][3], 'Prénom(s)');
  assert.ok(parsed[0].includes('Contact'));
  assert.equal(parsed[1][0], '2027-010');
  assert.equal(parsed[1][1], 'PV-010');
  assert.equal(parsed[1][2], 'OUEDRAOGO');
  assert.equal(parsed[1][3], 'Aminata; "Claire"');
  assert.equal(parsed[1][4], 'F');

  const headers = parsed[0];
  const rowObj: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    rowObj[h] = parsed[1][i];
  });
  const { imported } = parseImportedRows([rowObj], [], 'CM2');
  assert.equal(imported.length, 1);
  assert.equal(imported[0].matricule, '2027-010');
  assert.equal(imported[0].prenoms, 'Aminata; "Claire"');
  assert.equal(imported[0].contact, '70112233');
});

test('list and etat documents center headers and align data cells middle-left', async () => {
  const { OFFICIAL_PRINT_CSS } = await import('./printStyles');
  assert.ok(OFFICIAL_PRINT_CSS.includes('.print-list-table th {\n  background: #e2e8f0;\n  color: #0f172a;\n  font-weight: 700;\n  text-align: center !important;\n  vertical-align: middle !important;'));
  assert.ok(OFFICIAL_PRINT_CSS.includes('.print-list-table td {\n  text-align: left !important;\n  vertical-align: middle !important;'));

  const cfg = createDefaultConfig();
  const demo = buildDemoCandidates('CM2');
  const allHtml = buildPrintListHTML('all', demo, cfg, 'auto');
  const allTbody = allHtml.split('<tbody>')[1]?.split('</tbody>')[0] ?? '';
  assert.ok(allTbody.length > 0);
  assert.ok(!allTbody.includes('text-align:center'));
  assert.ok(!allTbody.includes('text-align:right'));

  const etatHtml = buildPrintListHTML('etat', demo, cfg, 'auto');
  assert.ok(etatHtml.includes('<th rowspan="2" style="text-align:center;vertical-align:middle">Catégorie</th>'));
  const etatTbody = etatHtml.split('<tbody>')[1]?.split('</tbody>')[0] ?? '';
  assert.ok(etatTbody.length > 0);
  assert.ok(!etatTbody.includes('text-align:center'));
  assert.ok(!etatTbody.includes('text-align:right'));
});

test('computeDashboardKeyIndicators computes subject success rates, option totals, and gender stats', () => {
  const demo = buildDemoCandidates('CM2');
  const matieres = [
    { id: 'm1', nom: 'Calcul', coef: 2, max: 20 },
    { id: 'm2', nom: 'Rédaction', coef: 1, max: 10 },
  ];
  const evaluations = {
    journalieres: {},
    trimestrielles: {
      'CM2__1er Trimestre': {
        classe: 'CM2',
        trimestre: '1er Trimestre',
        matieres,
        savedAt: '2027-01-15T10:00:00.000Z',
        notes: {
          '2027-001': { m1: '14', m2: '7' }, // 7/10 (pass), 7/10 (pass)
          '2027-002': { m1: '8', m2: '6' },  // 4/10 (fail), 6/10 (pass)
          '2027-003': { m1: '10', m2: '4' }, // 5/10 (pass), 4/10 (fail)
          '2027-004': { m1: '12', m2: '' },  // 6/10 (pass), ungraded
        },
      },
      'CM2__2ème Trimestre': {
        classe: 'CM2',
        trimestre: '2ème Trimestre',
        matieres,
        savedAt: '2027-03-20T10:00:00.000Z',
        notes: {}, // empty notes should not shadow scored T1
      },
    },
    examens: {},
  };

  const res = computeDashboardKeyIndicators(demo, evaluations, 'CM2', 5);
  assert.equal(res.gender.total, 6);
  assert.equal(res.gender.filles, 3);
  assert.equal(res.gender.garcons, 3);
  assert.equal(res.gender.pctFilles, 50);
  assert.equal(res.gender.pctGarcons, 50);

  assert.equal(res.optionTotals.eg, 4);
  assert.equal(res.optionTotals.et, 1);
  assert.equal(res.optionTotals.cepSeul, 1);
  assert.equal(res.optionCounts.find((o) => o.key === 'CEP + EG')?.count, 4);
  assert.equal(res.optionCounts.find((o) => o.key === 'CEP + ET')?.count, 1);
  assert.equal(res.optionCounts.find((o) => o.key === 'CEP Seul')?.count, 1);

  assert.equal(res.latestEval?.label, '1er Trimestre');
  assert.equal(res.latestEval?.hasNotes, true);
  assert.equal(res.subjectSuccessRates.length, 2);
  assert.deepEqual(res.subjectSuccessRates[0], {
    id: 'm1',
    nom: 'Calcul',
    totalNotes: 4,
    passedCount: 3,
    tauxReussite: 75,
    moyenne: 5.5,
  });
  assert.deepEqual(res.subjectSuccessRates[1], {
    id: 'm2',
    nom: 'Rédaction',
    totalNotes: 3,
    passedCount: 2,
    tauxReussite: 66.7,
    moyenne: 5.67,
  });
});

test('reports adopt clean version #2 header, proportional colgroups, and word-safe wrapping CSS', async () => {
  const { OFFICIAL_PRINT_CSS } = await import('./printStyles');
  const { buildOfficialHeaderAndSignature } = await import('./documentBuilders');

  const cfg = createDefaultConfig();
  const { enteteHTML, signatureHTML } = buildOfficialHeaderAndSignature(cfg);
  assert.ok(enteteHTML.includes('class="report-header"'));
  assert.ok(enteteHTML.includes('class="report-header-left"'));
  assert.ok(enteteHTML.includes('class="report-header-right"'));
  assert.ok(!enteteHTML.includes('border-bottom:1px dashed'));
  assert.ok(signatureHTML.includes('class="report-signature-box"'));

  const demo = buildDemoCandidates('CM2');
  const handicapHtml = buildPrintListHTML('handicap', demo, cfg);
  assert.ok(handicapHtml.includes('<colgroup>'));
  assert.ok(handicapHtml.includes('LISTE DES ÉLÈVES EN SITUATION DE HANDICAP'));

  assert.ok(OFFICIAL_PRINT_CSS.includes('border-bottom: 1.5px solid #000000'));
  assert.ok(OFFICIAL_PRINT_CSS.includes('word-break: normal'));
  assert.ok(OFFICIAL_PRINT_CSS.includes('overflow-wrap: break-word'));
});

test('abbreviateSubject3, Fiche des notes 3-letter headers, and computeSynoptiqueBySubject brackets F/G/T', () => {
  assert.equal(abbreviateSubject3('Lecture'), 'Lec');
  assert.equal(abbreviateSubject3('Éducation civique et morale'), 'Édu');
  assert.equal(abbreviateSubject3('  Calcul mental '), 'Cal');

  const cfg = createDefaultConfig();
  const subjects17 = MATIERES_OFFICIELLES['CM2'].map((nom, idx) => ({
    id: `m${idx + 1}`,
    nom,
    coef: 1,
    max: 10,
  }));
  const demo = buildDemoCandidates('CM2');
  const fiche17 = buildFicheNotesHTML({
    periodeLabel: '1er Trimestre',
    classe: 'CM2',
    cfg,
    students: demo.map((c) => ({
      key: c.matricule,
      matricule: c.matricule,
      pv: c.pv,
      nom: c.nom,
      prenoms: c.prenoms,
      sexe: c.sexe,
    })),
    matieres: subjects17,
    blank: true,
  });
  assert.ok(fiche17.includes('single-page-report'));
  assert.ok(fiche17.includes('data-orientation="landscape"'));
  subjects17.forEach((m) => {
    assert.ok(fiche17.includes(`>${abbreviateSubject3(m.nom)}</th>`));
  });

  const testMats = [
    { id: 'm1', nom: 'Lecture', coef: 1, max: 10 },
    { id: 'm2', nom: 'Calcul', coef: 2, max: 20 },
    { id: 'm3', nom: 'Dessin', coef: 1, max: 10 }, // unevaluated (no notes)
  ];
  const syn = computeSynoptiqueBySubject(
    [
      { key: 'S1', sexe: 'F' },
      { key: 'S2', sexe: 'F' },
      { key: 'S3', sexe: 'M' },
      { key: 'S4', sexe: 'M' },
    ],
    testMats,
    {
      S1: { m1: '4.5', m2: '10' }, // m1 <5 (F), m2 10/20 = 5.0 >=5 (F)
      S2: { m1: '8', m2: '9.5' },  // m1 >=5 (F), m2 9.5/20 = 4.75 <5 (F)
      S3: { m1: '5', m2: '18' },   // m1 >=5 (M), m2 18/20 = 9.0 >=5 (M)
      S4: { m1: '2', m2: '' },     // m1 <5 (M), m2 ungraded
    }
  );

  assert.equal(syn.hasAnyScore, true);
  assert.equal(syn.subjects.length, 2); // m3 excluded because not evaluated
  assert.deepEqual(syn.subjects[0].palierBas, { f: 1, g: 1, t: 2 });
  assert.deepEqual(syn.subjects[0].palierHaut, { f: 1, g: 1, t: 2 });
  assert.deepEqual(syn.subjects[0].total, { f: 2, g: 2, t: 4 });

  assert.deepEqual(syn.subjects[1].palierBas, { f: 1, g: 0, t: 1 });
  assert.deepEqual(syn.subjects[1].palierHaut, { f: 1, g: 1, t: 2 });
  assert.deepEqual(syn.subjects[1].total, { f: 2, g: 1, t: 3 });

  const synHtml = buildTableauSynoptiqueHTML({
    trimestre: '1er Trimestre',
    classe: 'CM2',
    cfg,
    students: [
      { key: 'S1', nom: 'A', prenoms: 'B', sexe: 'F' },
      { key: 'S2', nom: 'C', prenoms: 'D', sexe: 'F' },
      { key: 'S3', nom: 'E', prenoms: 'F', sexe: 'M' },
      { key: 'S4', nom: 'G', prenoms: 'H', sexe: 'M' },
    ],
    matieres: testMats,
    notes: {
      S1: { m1: '4.5', m2: '10' },
      S2: { m1: '8', m2: '9.5' },
      S3: { m1: '5', m2: '18' },
      S4: { m1: '2', m2: '' },
    },
  });
  assert.ok(synHtml.includes('>Notes</th>'));
  assert.ok(synHtml.includes('<th colspan="3">Lecture</th>'));
  assert.ok(synHtml.includes('<th colspan="3">Calcul</th>'));
  assert.ok(!synHtml.includes('Dessin'));
  assert.ok(synHtml.includes('<th>F</th><th>G</th><th>T</th>'));
  assert.ok(synHtml.includes('0 à 4.99'));
  assert.ok(synHtml.includes('5 à 10'));
});

test('Proposition de fin d année handles all 5 decision thresholds, statsByStatus (ESH/EDF/PUPILLE/TOTAL), and council teachers', () => {
  const thresholds = {
    promotion: 5,
    redoublement: 3.5,
    renvoi: 3.5,
    abandons: 0.5,
    finDeCycle: 6.5,
  };

  assert.equal(
    classifyAnnualDecision({ moyenne: 7.2, trimestersCount: 3, classe: 'CM2', thresholds }),
    'Fin de cycle'
  );
  assert.equal(
    classifyAnnualDecision({ moyenne: 5.5, trimestersCount: 3, classe: 'CM2', thresholds }),
    'Promu(e)'
  );
  assert.equal(
    classifyAnnualDecision({ moyenne: 7.2, trimestersCount: 3, classe: 'CM1', thresholds }),
    'Promu(e)'
  );
  assert.equal(
    classifyAnnualDecision({ moyenne: 4.0, trimestersCount: 3, classe: 'CM2', thresholds }),
    'Redouble'
  );
  assert.equal(
    classifyAnnualDecision({ moyenne: 2.0, trimestersCount: 3, classe: 'CM2', thresholds }),
    'Renvoyé'
  );
  assert.equal(
    classifyAnnualDecision({ moyenne: 0.25, trimestersCount: 1, classe: 'CM2', thresholds }),
    'Abandons'
  );
  assert.equal(
    classifyAnnualDecision({ moyenne: 0, trimestersCount: 0, classe: 'CM2', thresholds }),
    'Abandons'
  );

  const candidates = [
    normalizeCandidateInput({ matricule: 'C1', nom: 'KABORE', prenoms: 'Awa', sexe: 'F', handicap: 'Oui', deplace: 'Non', pupille: 'Oui' }, 'CM2'),
    normalizeCandidateInput({ matricule: 'C2', nom: 'TRAORE', prenoms: 'Issa', sexe: 'M', handicap: 'Non', deplace: 'Oui', pupille: 'Non' }, 'CM2'),
    normalizeCandidateInput({ matricule: 'C3', nom: 'ZIDA', prenoms: 'Salimata', sexe: 'F', handicap: 'Oui', deplace: 'Non', pupille: 'Non' }, 'CM2'),
    normalizeCandidateInput({ matricule: 'C4', nom: 'BARRY', prenoms: 'Moussa', sexe: 'M', handicap: 'Non', deplace: 'Oui', pupille: 'Oui' }, 'CM2'),
    normalizeCandidateInput({ matricule: 'C5', nom: 'DIALLO', prenoms: 'Rakieta', sexe: 'F', handicap: 'Non', deplace: 'Non', pupille: 'Non' }, 'CM2'),
  ];

  const subjects = [{ id: 'm1', nom: 'Lecture', coef: 1, max: 10 }];
  const evaluations = {
    journalieres: {},
    trimestrielles: {
      'CM2__1er Trimestre': {
        classe: 'CM2',
        trimestre: '1er Trimestre',
        matieres: subjects,
        notes: {
          C1: { m1: '7.5' }, // Fin de cycle (ESH + PUPILLE)
          C2: { m1: '5.5' }, // Promu(e) (EDF)
          C3: { m1: '4.0' }, // Redouble (ESH)
          C4: { m1: '2.0' }, // Renvoyé (EDF + PUPILLE)
          // C5 no notes -> Abandons
        },
      },
    },
    examens: {},
  };

  const summary = computeAnnualProposals({
    candidates,
    evaluations,
    classe: 'CM2',
    thresholds,
  });

  assert.deepEqual(summary.statsByStatus.effectif, { esh: 2, edf: 2, pupille: 2, total: 5 });
  assert.deepEqual(summary.statsByStatus.finDeCycle, { esh: 1, edf: 0, pupille: 1, total: 1 });
  assert.deepEqual(summary.statsByStatus.promus, { esh: 0, edf: 1, pupille: 0, total: 1 });
  assert.deepEqual(summary.statsByStatus.redoublants, { esh: 1, edf: 0, pupille: 0, total: 1 });
  assert.deepEqual(summary.statsByStatus.renvoyes, { esh: 0, edf: 1, pupille: 1, total: 1 });
  assert.deepEqual(summary.statsByStatus.abandons, { esh: 0, edf: 0, pupille: 0, total: 1 });

  const cfg = createDefaultConfig();
  cfg.enseignantsConseil = [
    {
      id: 'e1',
      classe: 'CM2',
      matricule: '10045-A',
      nom: 'SANOGO',
      prenoms: 'Bintou',
      sexe: 'F',
      corps: 'PE',
      fonction: 'Titulaire',
      statut: 'Titulaire',
      contact: '70112233',
    },
    {
      id: 'e2',
      classe: 'CM1',
      matricule: '10046-B',
      nom: 'OUEDRAOGO',
      prenoms: 'Hamidou',
      sexe: 'M',
      corps: 'IAC',
      fonction: 'Adjoint',
      statut: 'Contractuel',
      contact: '70223344',
    },
  ];

  const html = buildPropositionFinAnneeHTML({ summary, cfg });
  [
    '1. Tableau de notes',
    '<th>Rang</th>',
    '<th>Matricule</th>',
    '<th>Nom</th>',
    '<th>Prénoms</th>',
    '<th>Sexe</th>',
    '<th>ESH</th>',
    '<th>EDF</th>',
    '<th>PUPILLE</th>',
    '<th>MOY Trim1</th>',
    '<th>MOY Trim2</th>',
    '<th>MOY Trim3</th>',
    '<th>MOY Géné</th>',
    '<th>DECISION DU CONSEIL</th>',
    '2. Statistiques de fin d&apos;année',
    '<th>Désignation</th>',
    '<th>TOTAL</th>',
    '<b>EFFECTIF</b>',
    '<b>PROMUS</b>',
    '<b>REDOUBLANTS</b>',
    '<b>ABANDONS</b>',
    '<b>RENVOYES</b>',
    '<b>FIN DE CYCLE</b>',
    '3. Liste des enseignants ayant pris part au conseil des enseignants',
    '<th>Classe</th>',
    '<th>Corps</th>',
    '<th>Fonction</th>',
    '<th>Statut</th>',
    '<th>Contact</th>',
    '<th>Signature</th>',
    'color:#8b0000;font-weight:bold">SANOGO',
    'color:#8b0000;font-weight:bold">Bintou',
    'color:#000000;font-weight:normal">OUEDRAOGO',
    'color:#000000;font-weight:normal">Hamidou',
    'color:#000000;font-weight:normal">M</td>',
  ].forEach((token) => {
    assert.ok(html.includes(token), `Missing expected HTML token: ${token}`);
  });
});

test('computeExamBlancStats and buildExamBlancResultsHTML produce exact columns, ESH/EDF/PUPILLE/TOTAL stats with F/G/T, and gender colors', () => {
  const cfg = createDefaultConfig();
  const subjects = [
    { id: 'm1', nom: 'Rédaction', coef: 1, max: 10 },
    { id: 'm2', nom: 'Calcul', coef: 2, max: 20 },
  ];
  const students = [
    { key: 'M01', matricule: 'M01', label: 'KABORE Awa', nom: 'KABORE', prenoms: 'Awa', sexe: 'F' as const, esh: 'Oui' as const, edf: 'Non' as const, pupille: 'Oui' as const },
    { key: 'M02', matricule: 'M02', label: 'TRAORE Issa', nom: 'TRAORE', prenoms: 'Issa', sexe: 'M' as const, esh: 'Non' as const, edf: 'Oui' as const, pupille: 'Non' as const },
    { key: 'M03', matricule: 'M03', label: 'ZIDA Claire', nom: 'ZIDA', prenoms: 'Claire', sexe: 'F' as const, esh: 'Oui' as const, edf: 'Oui' as const, pupille: 'Non' as const },
    { key: 'M04', matricule: 'M04', label: 'BARRY Moussa', nom: 'BARRY', prenoms: 'Moussa', sexe: 'M' as const, esh: 'Non' as const, edf: 'Non' as const, pupille: 'Oui' as const },
  ];
  const notes = {
    M01: { m1: '8', m2: '16' },  // moy 8.00, total 24.00 (F, ESH+PUPILLE, composed, pass)
    M02: { m1: '4', m2: '8' },   // moy 4.00, total 12.00 (M, EDF, composed, fail)
    M03: { m1: '6', m2: '12' },  // moy 6.00, total 18.00 (F, ESH+EDF, composed, pass)
    // M04 absent (uncomposed, PUPILLE, M)
  };

  const rows = computeEvaluationRows(students, subjects, notes);
  const stats = computeExamBlancStats(rows, 5);

  const esh = stats.lines.find((l) => l.designation === 'ESH')!;
  const edf = stats.lines.find((l) => l.designation === 'EDF')!;
  const pup = stats.lines.find((l) => l.designation === 'PUPILLE')!;
  const tot = stats.lines.find((l) => l.designation === 'TOTAL')!;

  assert.deepEqual(esh.effectif, { f: 2, g: 0, t: 2 });
  assert.deepEqual(esh.composed, { f: 2, g: 0, t: 2 });
  assert.deepEqual(esh.passed, { f: 2, g: 0, t: 2 });
  assert.deepEqual(esh.taux, { f: 100, g: 0, t: 100 });

  assert.deepEqual(edf.effectif, { f: 1, g: 1, t: 2 });
  assert.deepEqual(edf.composed, { f: 1, g: 1, t: 2 });
  assert.deepEqual(edf.passed, { f: 1, g: 0, t: 1 });
  assert.deepEqual(edf.taux, { f: 100, g: 0, t: 50 });

  assert.deepEqual(pup.effectif, { f: 1, g: 1, t: 2 });
  assert.deepEqual(pup.composed, { f: 1, g: 0, t: 1 });
  assert.deepEqual(pup.passed, { f: 1, g: 0, t: 1 });
  assert.deepEqual(pup.taux, { f: 100, g: 0, t: 100 });

  assert.deepEqual(tot.effectif, { f: 2, g: 2, t: 4 });
  assert.deepEqual(tot.composed, { f: 2, g: 1, t: 3 });
  assert.deepEqual(tot.passed, { f: 2, g: 0, t: 2 });
  assert.deepEqual(tot.taux, { f: 100, g: 0, t: 66.7 });

  const html = buildExamBlancResultsHTML({
    niveauLabel: 'CEB',
    classe: 'CM2',
    date: '2027-04-15',
    cfg,
    rows,
    seuil: 5,
  });

  [
    'RÉSULTATS DE L&apos;EXAMEN BLANC NIVEAU CEB',
    'data-orientation="landscape"',
    '1. Tableau des résultats',
    '<th>Rang</th>',
    '<th>Matricule</th>',
    '<th>Nom</th>',
    '<th>Prénoms</th>',
    '<th>Sexe</th>',
    '<th>ESH</th>',
    '<th>EDF</th>',
    '<th>PUPILLE</th>',
    '<th>Total</th>',
    '<th>Moyenne</th>',
    '<th>Mention</th>',
    '2. Statistiques de l&apos;examen blanc',
    '>Désignation</th>',
    '<th colspan="3">Effectif</th>',
    '<th colspan="3">Ayant composé</th>',
    '<th colspan="3">Ayant eu la moyenne</th>',
    '<th colspan="3">Taux</th>',
    '<th>F</th><th>G</th><th>T</th>',
    '<b>ESH</b>',
    '<b>EDF</b>',
    '<b>PUPILLE</b>',
    '<b>TOTAL</b>',
    '66.7%',
    'color:#8b0000;font-weight:bold">KABORE</td>',
    'color:#8b0000;font-weight:bold">Awa</td>',
    'color:#8b0000;font-weight:bold">F</td>',
    'color:#000000;font-weight:normal">TRAORE</td>',
    'color:#000000;font-weight:normal">Issa</td>',
    'color:#000000;font-weight:normal">M</td>',
  ].forEach((token) => {
    assert.ok(html.includes(token), `Missing expected Mock Exam token: ${token}`);
  });
});


