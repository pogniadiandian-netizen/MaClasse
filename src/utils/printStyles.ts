export const OFFICIAL_PRINT_CSS = `
* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
}
.cand-rouge {
  color: #8b0000 !important;
}

/* Chemise 6e (Paysage 297x210) */
.chemise-page {
  position: relative;
  width: 297mm;
  height: 210mm;
  background: #ffffff;
  color: #000000;
  font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif;
  font-size: 11pt;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.chemise-page .rose { border: 0.55mm solid #d9a5a5; }
.chemise-page::after {
  content: '';
  position: absolute;
  left: 148.5mm;
  top: 0;
  bottom: 0;
  border-left: 0.5mm solid #d9a5a5;
  z-index: 10;
}
.chemise-page .titre {
  position: absolute;
  left: 158.5mm;
  top: 16mm;
  width: 133.5mm;
  height: 7.7mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11pt;
  white-space: nowrap;
}
.chemise-page .cadre {
  position: absolute;
  left: 158.5mm;
  top: 26.2mm;
  width: 133.5mm;
  height: 96.9mm;
}
.chemise-page .centre {
  position: absolute;
  left: 21.35mm;
  top: 0.3mm;
  width: 90.8mm;
  text-align: center;
  font-weight: 700;
}
.chemise-page .centre .lib {
  height: 6.6mm;
  background: #d9d9d9;
  border: 0.55mm solid #d9a5a5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chemise-page .centre .val {
  height: 6.9mm;
  border: 0.55mm solid #d9a5a5;
  border-top: 0;
  padding: 0 2mm;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  text-transform: uppercase;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}
.chemise-page .lib-col {
  position: absolute;
  top: 16.3mm;
  height: 5mm;
  text-align: center;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chemise-page .case {
  position: absolute;
  top: 22.1mm;
  height: 8mm;
  padding: 0 2mm;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}
.chemise-page .c-points { left: 0.5mm; width: 38mm; }
.chemise-page .c-moy { left: 40.5mm; width: 35mm; }
.chemise-page .c-apt { left: 77.5mm; width: 55mm; }
.chemise-page .lib-nom {
  position: absolute;
  top: 77.3mm;
  height: 5mm;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chemise-page .nom-box {
  position: absolute;
  top: 82.5mm;
  height: 14.4mm;
  padding: 0.8mm 2mm;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  font-weight: 700;
  overflow: hidden;
}
.chemise-page .n-nom { left: 0.5mm; width: 55mm; }
.chemise-page .n-pre { left: 57.5mm; width: 75mm; }
.chemise-page .ligne {
  position: absolute;
  height: 5mm;
  display: flex;
  align-items: center;
  gap: 1.6mm;
  white-space: nowrap;
}
.chemise-page .ligne b { font-weight: 700; }
.chemise-page .ligne .v {
  flex: 1;
  min-width: 0;
  height: 100%;
  border-bottom: 0.4mm dotted #444444;
  padding: 0 1.5mm;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  line-height: 1.05;
  overflow: hidden;
  white-space: nowrap;
  font-weight: 700;
}
.chemise-page .ligne .v.opt { flex: 0 0 17mm; }
.chemise-page .ligne .v.res { flex: 0 0 47.7mm; }
.chemise-page .ligne .v.petit { font-size: 8.5pt; text-transform: uppercase; }
.chemise-page .cadre .ligne { left: 1.4mm; right: 1.7mm; }
.chemise-page .f-option { top: 33.1mm; }
.chemise-page .f-ecole { top: 41.7mm; }
.chemise-page .f-ceb { top: 50.8mm; }
.chemise-page .f-comm { top: 59mm; }
.chemise-page .f-prov { top: 67.6mm; }
.chemise-page .pupille-bar {
  position: absolute;
  left: 158.5mm;
  top: 125.5mm;
  width: 133.5mm;
  height: 7.5mm;
  padding: 0 2mm;
  display: flex;
  align-items: center;
  gap: 2mm;
  white-space: nowrap;
  font-size: 10pt;
}
.chemise-page .pupille-bar b { font-weight: 700; }
.chemise-page .pupille-bar .v {
  flex: 1;
  min-width: 0;
  height: 5.5mm;
  border-bottom: 0.4mm dotted #444444;
  padding: 0 1.5mm;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  line-height: 1.05;
  overflow: hidden;
  white-space: nowrap;
  font-weight: 700;
}
.chemise-page .pupille-bar .v.pup {
  flex: 0 0 18mm;
  justify-content: flex-start;
  text-align: left;
}
.chemise-page .adr-titre {
  position: absolute;
  left: 158.5mm;
  width: 133.5mm;
  top: 135.8mm;
  text-align: center;
  font-weight: 700;
  text-decoration: underline;
}
.chemise-page .adr { left: 158.5mm; right: 5mm; }
.chemise-page .a-lieu { top: 143mm; }
.chemise-page .a-comm { top: 150.5mm; }
.chemise-page .a-prov { top: 157.6mm; }
.chemise-page .etabs {
  position: absolute;
  left: 158.5mm;
  top: 167.3mm;
  width: 133.5mm;
  height: 33.1mm;
}
.chemise-page .etabs .titre2 {
  position: absolute;
  left: 0;
  right: 0;
  top: 2mm;
  text-align: center;
  font-weight: 700;
  text-decoration: underline;
}
.chemise-page .etabs .ligne { left: 1.4mm; right: 1.7mm; }
.chemise-page .e1 { top: 9.6mm; }
.chemise-page .e2 { top: 18mm; }
.chemise-page .e3 { top: 26.4mm; }

/* Certificat & Attestation (Portrait 210x297) */
.certif-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  background: #ffffff;
  color: #000000;
  font-family: Tahoma, Verdana, "DejaVu Sans", Arial, sans-serif;
  font-size: 9.5pt;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.certif-page .certif {
  position: absolute;
  left: 13.7mm;
  width: 182.6mm;
  height: 124.7mm;
  border: 0.55mm solid #d9a5a5;
}
.certif-page .certif.haut { top: 15.4mm; }
.certif-page .certif.bas { top: 155.6mm; }
.certif .entete {
  position: absolute;
  left: 11mm;
  top: 1.4mm;
  width: 64mm;
  text-align: center;
  font-size: 9pt;
  line-height: 4.5mm;
  text-transform: uppercase;
}
.certif .entete .tirets {
  width: 22mm;
  margin: 1mm auto 1.2mm;
  border-bottom: 0.35mm dashed #444444;
  height: 0.6mm;
}
.certif .entete .tel { font-size: 7pt; line-height: 3mm; text-transform: none; }
.certif .armoiries { position: absolute; left: 88mm; top: 1.8mm; width: 17mm; height: 18mm; }
.certif .armoiries img { width: 100%; height: 100%; object-fit: contain; }
.certif .armoiries .vide {
  width: 100%;
  height: 100%;
  border: 0.3mm dashed #aaaaaa;
  border-radius: 50%;
  font-size: 6pt;
  color: #aaaaaa;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.certif .annee { position: absolute; right: 2mm; top: 1.6mm; font-size: 9pt; }
.certif .lieu-date { position: absolute; right: 2.7mm; top: 20.2mm; font-size: 9pt; }
.certif .titre { position: absolute; left: 0; right: 0; top: 27mm; text-align: center; }
.certif .titre span {
  display: inline-block;
  border: 0.4mm solid #000000;
  padding: 0.8mm 2.2mm;
  font-weight: 700;
  font-size: 13pt;
  white-space: nowrap;
}
.certif .l {
  position: absolute;
  left: 1.9mm;
  right: 1.9mm;
  height: 5mm;
  display: flex;
  align-items: center;
  gap: 1.4mm;
  white-space: nowrap;
}
.certif .l .v {
  flex: 1;
  min-width: 0;
  height: 100%;
  border-bottom: 0.4mm dotted #444444;
  padding: 0 1.5mm;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  line-height: 1.05;
  overflow: hidden;
  white-space: nowrap;
  font-weight: 700;
}
.certif .l .v.date { flex: 0 0 59mm; justify-content: flex-start; text-align: left; font-weight: 700; }
.certif .l .v.dinsc { flex: 0 0 26mm; justify-content: flex-start; text-align: left; padding: 0 1mm; font-weight: 700; }
.certif .l .v.mat { flex: 0 0 26mm; justify-content: flex-start; text-align: left; font-weight: 700; }
.certif .l1 { top: 36.1mm; left: 27.8mm; }
.certif .l2 { top: 43.8mm; }
.certif .l3 { top: 51.5mm; }
.certif .l4 { top: 58.5mm; }
.certif .l5 { top: 66.2mm; }
.certif .l6 { top: 75.1mm; }
.certif .l7 { top: 81.6mm; }
.certif .l8 { top: 89mm; left: 21.6mm; }
.certif .dir { position: absolute; left: 121.3mm; width: 40mm; text-align: center; }
.certif .dir .t { position: absolute; top: 97mm; width: 100%; }
.certif .dir .sig { position: absolute; top: 99mm; left: 0; width: 40mm; height: 16mm; }
.certif .dir .sig img { width: 100%; height: 100%; object-fit: contain; }
.certif .dir .nom { position: absolute; top: 113.6mm; width: 100%; font-size: 8pt; font-weight: 700; }
.certif .dir .grade { position: absolute; top: 117.9mm; width: 100%; font-size: 6.5pt; font-style: italic; }
.certif .dir .deco { position: absolute; top: 120.9mm; left: -10mm; width: 60mm; text-align: center; font-size: 5.8pt; font-style: italic; line-height: 1.05; }

/* Fiche d'inscription (Portrait 210x297) */
.fiche-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  background: #ffffff;
  color: #000000;
  font-family: Verdana, "DejaVu Sans", Tahoma, sans-serif;
  font-size: 9pt;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.fiche-page .gris { border: 0.8mm solid #a6a6a6; }
.fiche-page .hd {
  position: absolute;
  top: 14.8mm;
  height: 21.1mm;
  font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif;
  font-weight: 700;
  text-align: center;
}
.fiche-page .hd-titre {
  left: 14.3mm;
  width: 91.7mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 13pt;
  line-height: 6.2mm;
}
.fiche-page .hd-pv { left: 108.3mm; padding-top: 1.6mm; font-size: 13pt; }
.fiche-page .hd-pv span {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  padding: 0 2mm;
  height: 9.5mm;
  font-weight: 700;
  font-size: 11pt;
  margin-top: 2.5mm;
  overflow: hidden;
  white-space: nowrap;
}
.fiche-page .hd-pv.eg { width: 49.5mm; }
.fiche-page .hd-pv.eftp { width: 34.7mm; }
.fiche-page .hd-opt.eg { left: 159.8mm; width: 35.4mm; font-size: 12pt; }
.fiche-page .hd-opt.eg .o1 { padding-top: 1.8mm; }
.fiche-page .hd-opt.eg .o2 {
  height: 10mm;
  padding: 0 2mm;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}
.fiche-page .hd-opt.eftp { left: 144.6mm; width: 53.3mm; font-size: 11pt; padding: 0; }
.fiche-page .hd-opt.eftp > div { border-bottom: 0.5mm solid #a6a6a6; display: flex; align-items: center; justify-content: center; }
.fiche-page .hd-opt.eftp .r1 { height: 7.5mm; }
.fiche-page .hd-opt.eftp .r1 .c1 { width: 16.6mm; height: 100%; background: #d9d9d9; border-right: 0.5mm solid #a6a6a6; display: flex; align-items: center; justify-content: center; }
.fiche-page .hd-opt.eftp .r1 .c2 { flex: 1; height: 100%; font-weight: 700; display: flex; align-items: center; justify-content: flex-start; text-align: left; padding: 0 1.8mm; overflow: hidden; white-space: nowrap; }
.fiche-page .hd-opt.eftp .r2 { height: 6.1mm; background: #d9d9d9; }
.fiche-page .hd-opt.eftp .r3 { height: 7.5mm; border-bottom: 0; justify-content: flex-start; text-align: left; padding: 0 1.5mm; font-weight: 700; font-size: 9pt; overflow: hidden; white-space: nowrap; }
.fiche-page .circ {
  position: absolute;
  left: 0;
  right: 0;
  top: 38.6mm;
  text-align: center;
  font-family: "Times New Roman", Cambria, serif;
  font-weight: 700;
  font-size: 14pt;
}
.fiche-page .l {
  position: absolute;
  left: 14.1mm;
  right: 14.1mm;
  height: 5mm;
  display: flex;
  align-items: center;
  gap: 1.5mm;
  white-space: nowrap;
}
.fiche-page .l b { font-weight: 700; }
.fiche-page .l .v {
  flex: 1;
  min-width: 0;
  height: 100%;
  border-bottom: 0.4mm dotted #333333;
  padding: 0 1.5mm;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  line-height: 1.05;
  overflow: hidden;
  white-space: nowrap;
  font-weight: 700;
}
.fiche-page .l .v.naiss { flex: 0 0 48mm; justify-content: flex-start; text-align: left; }
.fiche-page .l .v.nat { flex: 0 0 61mm; }
.fiche-page .l .v.reg { flex: 0 0 75mm; }
.fiche-page .l .sep { margin-left: 2mm; }
.fiche-page .l.nom { top: 47.4mm; }
.fiche-page .l.pre { top: 55.4mm; }
.fiche-page .l.nai { top: 63.1mm; }
.fiche-page .l.nat { top: 70.6mm; }
.fiche-page .l.eco { top: 77.6mm; }
.fiche-page .l.reg { top: 85.3mm; }
.fiche-page .l.com { top: 92.6mm; }
.fiche-page .l.dero { top: 101mm; }
.fiche-page .an { left: 19.3mm; right: auto; width: 46mm; }
.fiche-page .an .v { flex: 0 0 21.6mm; }
.fiche-page .duree {
  position: absolute;
  left: 84.4mm;
  top: 123.7mm;
  width: 105.8mm;
  height: 7.3mm;
  border: 0.5mm solid #a6a6a6;
  display: flex;
  align-items: center;
  gap: 1.5mm;
  padding: 0 3mm;
  white-space: nowrap;
}
.fiche-page .duree .v {
  flex: 0 0 15mm;
  height: 5mm;
  padding: 0 1.5mm;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  border-bottom: 0.4mm dotted #333333;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}
.fiche-page .decl { left: 20.4mm; }
.fiche-page .rayee { text-decoration: line-through; }
.fiche-page .decl .blanc { display: inline-flex; min-width: 16mm; align-items: center; justify-content: flex-start; text-align: left; padding: 0 1mm; }
.fiche-page .marque { position: absolute; font-size: 10.5pt; }
.fiche-page .l.titu { top: 155.7mm; }
.fiche-page .l.cand { top: 161.6mm; }
.fiche-page .l.pere { top: 168.2mm; }
.fiche-page .l.mere { top: 174.6mm; }
.fiche-page .l.res1 { top: 182.1mm; }
.fiche-page .l.res2 { top: 189.3mm; left: 15.9mm; }
.fiche-page .l.res3 { top: 196.4mm; left: 15.9mm; }
.fiche-page .etabs {
  position: absolute;
  left: 15.4mm;
  top: 204.1mm;
  width: 179.1mm;
  height: 32.7mm;
  border: 0.8mm solid #a6a6a6;
}
.fiche-page .etabs .t { position: absolute; left: 0; right: 0; top: 0.5mm; text-align: center; font-weight: 700; text-decoration: underline; }
.fiche-page .etabs .l { left: 9.1mm; right: 8.4mm; }
.fiche-page .etabs .l .v { font-size: 8pt; font-weight: 700; }
.fiche-page .etabs .e1 { top: 7.5mm; right: 27mm; }
.fiche-page .etabs .e2 { top: 14.8mm; }
.fiche-page .etabs .e3 { top: 21.8mm; }
.fiche-page .etabs .m2 { position: absolute; left: 172.5mm; top: 14.5mm; font-size: 10.5pt; }
.fiche-page .sig-g { position: absolute; left: 15.4mm; top: 239.3mm; }
.fiche-page .sig-d { position: absolute; right: 15mm; top: 239.3mm; }
.fiche-page .certifie { position: absolute; left: 0; right: 0; top: 248.3mm; text-align: center; }
.fiche-page .notes {
  position: absolute;
  left: 14.3mm;
  top: 254.9mm;
  width: 81.5mm;
  height: 17mm;
  border: 0.5mm solid #a6a6a6;
  padding: 0.8mm 1.2mm;
  font-size: 7.5pt;
  line-height: 3.6mm;
}
.fiche-page .notes .s { padding-left: 1.8mm; }
.fiche-page .dir { position: absolute; left: 121mm; width: 60mm; text-align: center; }
.fiche-page .dir .sig { position: absolute; left: 0; top: 253.5mm; width: 60mm; height: 16mm; }
.fiche-page .dir .sig img { width: 100%; height: 100%; object-fit: contain; }
.fiche-page .dir .nom { position: absolute; width: 100%; top: 269.4mm; font-weight: 700; text-decoration: underline; font-size: 8.5pt; }
.fiche-page .dir .grade { position: absolute; width: 100%; top: 274.2mm; font-style: italic; font-size: 7.5pt; }
.fiche-page .dir .deco { position: absolute; width: 100%; top: 278.2mm; font-style: italic; font-size: 6.8pt; line-height: 1.05; }

/* Chemise CEP (Paysage 297x210) */
.chemise-cep-page {
  position: relative;
  width: 297mm;
  height: 210mm;
  background: #ffffff;
  color: #000000;
  font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif;
  font-size: 11pt;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.chemise-cep-page::after {
  content: '';
  position: absolute;
  left: 148.5mm;
  top: 0;
  bottom: 0;
  border-left: 0.5mm solid #d9a5a5;
  z-index: 10;
}
.chemise-cep-page .bande {
  position: absolute;
  left: 158.5mm;
  right: 5mm;
  top: 0;
  height: 2.2mm;
  border-top: 0.9mm solid #d6252b;
  border-bottom: 0.3mm solid #333333;
}
.chemise-cep-page .titre {
  position: absolute;
  left: 158.5mm;
  top: 27.7mm;
  width: 133.5mm;
  height: 17.3mm;
  border: 0.7mm solid #dba7a7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14.5pt;
  line-height: 1.25;
  text-align: center;
}
.chemise-cep-page .cadre {
  position: absolute;
  left: 158.5mm;
  top: 48mm;
  width: 133.5mm;
  height: 152mm;
  border: 0.7mm solid #dba7a7;
}
.chemise-cep-page .centre {
  position: absolute;
  left: 19.75mm;
  top: 12.5mm;
  width: 94mm;
  height: 15.5mm;
  border: 0.6mm solid #777777;
  text-align: center;
  font-weight: 700;
  font-size: 11pt;
}
.chemise-cep-page .centre .lib {
  background: #d9d9d9;
  height: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 0.6mm solid #777777;
}
.chemise-cep-page .centre .val {
  height: 50%;
  padding: 0 2mm;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  text-transform: uppercase;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}
.chemise-cep-page .champ {
  position: absolute;
  left: 1mm;
  right: 2mm;
  height: 6mm;
  display: flex;
  align-items: center;
  gap: 2mm;
  font-size: 11pt;
  white-space: nowrap;
}
.chemise-cep-page .champ b { font-weight: 700; }
.chemise-cep-page .champ .v {
  flex: 1;
  min-width: 0;
  height: 100%;
  border-bottom: 0.45mm dotted #444444;
  padding: 0 1.5mm;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  line-height: 1.05;
  font-size: 11pt;
  overflow: hidden;
  white-space: nowrap;
  font-weight: 700;
}
.chemise-cep-page .champ .v.court { flex: 0 0 12mm; justify-content: flex-start; text-align: left; }
.chemise-cep-page .f-pv { top: 47mm; }
.chemise-cep-page .f-nom { top: 68mm; }
.chemise-cep-page .f-prenoms { top: 88.5mm; }
.chemise-cep-page .f-sexe { top: 111mm; }
.chemise-cep-page .f-ecole { top: 132mm; }

/* Cartes scolaires */
.cartes-feuille {
  position: relative;
  width: 210mm;
  height: 297mm;
  background: #ffffff;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.carte-svg {
  position: absolute;
  display: block;
}
.photo-vide {
  stroke: #b8c2d0;
  stroke-dasharray: 0.8 0.6;
  fill: none;
  stroke-width: 0.15;
}

/* Reflowable A4 Reports (Listes, Notes, Synoptique, Propositions, Examens, Bulletins) */
.pdf-report-page {
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 13mm;
  background: #ffffff;
  color: #111827;
  font-family: Arial, Tahoma, sans-serif;
  font-size: 9.5pt;
  page-break-after: always;
  break-after: page;
}
.pdf-report-page[data-orientation="landscape"] {
  width: 297mm;
  min-height: 210mm;
  padding: 10mm 12mm;
}
.pdf-report-page:last-child {
  page-break-after: auto;
  break-after: auto;
}
.report-title {
  display: table;
  text-align: center;
  font-weight: 700;
  font-size: 13pt;
  margin: 12px auto 12px;
  padding-bottom: 2px;
  border-bottom: 1.5px solid #000000;
  text-decoration: none;
  color: #000000;
  line-height: 1.25;
}
.report-subtitle {
  text-align: center;
  font-size: 9.8pt;
  margin: 0 0 14px;
  color: #1e293b;
}
.report-kpi-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0 14px;
}
.report-kpi-box {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 6px 11px;
  border-radius: 4px;
  min-width: 85px;
}
.report-kpi-val {
  font-size: 13pt;
  font-weight: 700;
  color: #0f172a;
}
.report-kpi-lbl {
  font-size: 7.5pt;
  color: #475569;
  text-transform: uppercase;
}
.print-list-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 14px;
  font-size: 8.5pt;
  font-family: Arial, Tahoma, sans-serif;
}
.print-list-table th,
.print-list-table td {
  border: 1px solid #1e293b;
  padding: 6px 8px;
  line-height: 1.35;
  word-break: normal;
  overflow-wrap: break-word;
  text-align: left;
  vertical-align: middle;
}
.print-list-table td {
  text-align: left !important;
  vertical-align: middle !important;
}
.print-list-table th {
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 700;
  text-align: center !important;
  vertical-align: middle !important;
  text-transform: uppercase;
  font-size: 7.8pt;
}
.print-list-table.compact {
  font-size: 7.4pt;
}
.print-list-table.compact th,
.print-list-table.compact td {
  padding: 4.5px 5.5px;
  line-height: 1.3;
}
.print-list-table.compact th {
  font-size: 6.9pt;
}
.report-section-title {
  margin: 14px 0 6px;
  font-size: 10.5pt;
  font-weight: 700;
  color: #0f172a;
}
.report-section-block {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-top: 8px;
}
.report-legend {
  margin: 4px 0 8px;
  font-size: 6.8pt;
  line-height: 1.35;
  color: #475569;
  text-align: left;
}
.pdf-report-page.fiche-notes-page {
  padding: 7mm 8mm;
}
.pdf-report-page.fiche-notes-page .report-header {
  margin-bottom: 10px !important;
}
.pdf-report-page.fiche-notes-page .report-title {
  margin: 6px auto 6px;
  font-size: 12pt;
}
.pdf-report-page.fiche-notes-page .report-subtitle {
  margin: 0 0 8px;
  font-size: 8.8pt;
}
.pdf-report-page.fiche-notes-page .report-signature {
  margin-top: 10px !important;
}
.print-list-table.fiche-notes-table {
  table-layout: fixed;
  width: 100%;
  margin: 4px 0 6px;
  font-size: 7pt;
}
.print-list-table.fiche-notes-table th,
.print-list-table.fiche-notes-table td {
  padding: 3px 2.5px;
  line-height: 1.25;
  overflow: hidden;
}
.print-list-table.fiche-notes-table th {
  font-size: 6.6pt;
}
.pdf-report-page.synoptique-page {
  padding: 8mm 8mm;
}
.print-list-table.synoptique-table {
  table-layout: fixed;
  width: 100%;
  font-size: 7.2pt;
}
.print-list-table.synoptique-table th,
.print-list-table.synoptique-table td {
  padding: 4px 2.5px;
  line-height: 1.25;
  word-break: normal;
  overflow-wrap: normal;
}
.print-list-table.synoptique-table th {
  font-size: 6pt;
  vertical-align: middle;
}
`;
