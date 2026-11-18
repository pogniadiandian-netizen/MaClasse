import {
  ARMOIRIES_DEFAUT,
  CFG_VERSION,
  CFG_VERROUILLE,
  CLASSES_LISTE,
  DEFAULT_DECISION_THRESHOLDS,
  MATIERES_OFFICIELLES,
  STORAGE_KEYS,
  createDefaultConfig,
} from '../constants/cepConstants';
import type {
  Candidate,
  ClassesMatieres,
  DocConfig,
  EvaluationsStore,
  SubjectDef,
} from '../types/cep';

export function loadCandidates(): Candidate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CANDIDATS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCandidates(list: Candidate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CANDIDATS, JSON.stringify(list));
  } catch {
    // ignore storage quota errors gracefully
  }
}

export function loadDocConfig(): DocConfig {
  const def = createDefaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) {
      saveDocConfig(def);
      return def;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return def;
    const version = parsed.version ?? 1;
    const merged: DocConfig = {
      ...def,
      ...parsed,
      seuilsFinAnnee: {
        ...DEFAULT_DECISION_THRESHOLDS,
        ...(parsed.seuilsFinAnnee && typeof parsed.seuilsFinAnnee === 'object'
          ? parsed.seuilsFinAnnee
          : {}),
      },
      enseignantsConseil: Array.isArray(parsed.enseignantsConseil)
        ? parsed.enseignantsConseil
        : [],
    };
    const isLegacyBase64Armoiries =
      typeof merged.armoiries === 'string' &&
      merged.armoiries.startsWith('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAeAB4AAD');
    if (isLegacyBase64Armoiries || (version !== CFG_VERSION && !merged.armoiries)) {
      merged.armoiries = ARMOIRIES_DEFAUT;
    }
    if (version !== CFG_VERSION) {
      Object.assign(merged, CFG_VERROUILLE, { version: CFG_VERSION });
      saveDocConfig(merged);
    }
    return merged;
  } catch {
    return def;
  }
}

export function saveDocConfig(cfg: DocConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(cfg));
  } catch {
    try {
      localStorage.setItem(
        STORAGE_KEYS.CONFIG,
        JSON.stringify({ ...cfg, armoiries: '', signature: '', signatureCachet: '' })
      );
    } catch {
      // ignore
    }
  }
}

export function loadClasseParam(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.CLASSE_PARAM);
    if (v && CLASSES_LISTE.includes(v)) return v;
  } catch {
    // ignore
  }
  return 'CM2';
}

export function saveClasseParam(classe: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSE_PARAM, classe);
  } catch {
    // ignore
  }
}

export function prefillSubjectsForClass(
  existing: SubjectDef[],
  classe: string
): SubjectDef[] {
  const official = MATIERES_OFFICIELLES[classe];
  if (!official || !official.length) return existing;
  const norm = (t: string) =>
    String(t || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const seen = new Set(existing.map((m) => norm(m.nom)));
  const added: SubjectDef[] = [];
  official.forEach((nom, idx) => {
    if (seen.has(norm(nom))) return;
    seen.add(norm(nom));
    added.push({
      id: `cm-${classe}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      nom,
      coef: 1,
      max: 10,
    });
  });
  return [...existing, ...added];
}

export function loadClassesMatieres(): ClassesMatieres {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSES_MATIERES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const result: ClassesMatieres = {};
        CLASSES_LISTE.forEach((c) => {
          const arr = Array.isArray(parsed[c]) ? parsed[c] : [];
          result[c] = arr.map((m: Partial<SubjectDef>, idx: number) => ({
            id: m.id || `cm-${c}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            nom: m.nom || 'Matière',
            coef: Number(m.coef) > 0 ? Number(m.coef) : 1,
            max: Number(m.max) > 0 ? Number(m.max) : 10,
          }));
        });
        if (Object.values(result).some((arr) => arr.length > 0)) {
          return result;
        }
      }
    }
  } catch {
    // fallback to prefilled
  }

  const init: ClassesMatieres = {};
  CLASSES_LISTE.forEach((c) => {
    init[c] = prefillSubjectsForClass([], c);
  });
  saveClassesMatieres(init);
  return init;
}

export function saveClassesMatieres(data: ClassesMatieres): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSES_MATIERES, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadEvaluations(): EvaluationsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVALUATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          journalieres: parsed.journalieres || {},
          trimestrielles: parsed.trimestrielles || {},
          examens: parsed.examens || {},
        };
      }
    }
  } catch {
    // ignore
  }
  return { journalieres: {}, trimestrielles: {}, examens: {} };
}

export function saveEvaluations(data: EvaluationsStore): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadTheme(): 'light' | 'dark' {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.THEME);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    // ignore
  }
  return 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // ignore
  }
}
