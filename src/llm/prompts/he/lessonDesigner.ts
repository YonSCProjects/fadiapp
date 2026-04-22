import type { Activity, LessonBlock, PedagogicalModel } from '@/db/schema';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pedagogyCards = require('../../../../assets/kb/pedagogy_cards.json') as PedagogyCardsFile;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const safety = require('../../../../assets/kb/safety.json') as SafetyFile;

type PedagogyCardsFile = {
  cards: Array<{
    key: PedagogicalModel;
    name_he: string;
    summary_he: string;
    when_to_use_he: string;
    prompt_hint_he: string;
  }>;
};

type SafetyFile = {
  ramp_protocol: {
    phases: Array<{ key: string; name_he: string; goal_he: string; typical_duration_s: number }>;
  };
};

export type DesignerConstraints = {
  grade: number; // 7-12
  durationMin: 30 | 45 | 60 | 90;
  environment: 'gym' | 'outdoor' | 'studio';
  classSize: number;
  goalHe: string;
  equipmentAvailableHe: string[];
  preferredModel: PedagogicalModel | 'auto';
  specialConsiderationsHe?: string;
};

export type GeneratedLesson = {
  title_he: string;
  grade_band: string;
  duration_min: number;
  goal_he: string;
  equipment_json: string[];
  environment: 'gym' | 'outdoor' | 'studio';
  pedagogical_model: PedagogicalModel;
  pedagogical_rationale_he: string;
  safety_notes_he: string[];
  blocks_json: LessonBlock[];
};

const JSON_SCHEMA_HINT = `{
  "title_he": "string — שם מתאר לשיעור בעברית",
  "grade_band": "string — לדוגמה '7-9' או '10-12'",
  "duration_min": "number — חייב להיות שווה למשך שהתבקש",
  "goal_he": "string — מטרת השיעור, ניסוח מתוקן ומעוגן לעקרונות פדגוגיים",
  "equipment_json": ["array of strings — ציוד נדרש, מעברית"],
  "environment": "gym | outdoor | studio",
  "pedagogical_model": "מפתח המודל שנבחר מתוך הרשימה",
  "pedagogical_rationale_he": "string — למה נבחר המודל הזה עבור המאפיינים של השיעור",
  "safety_notes_he": ["array of strings — אזהרות בטיחות ספציפיות לשיעור הזה"],
  "blocks_json": [
    {
      "id": "string — מזהה ייחודי קצר באנגלית, לדוגמה 'warmup-1'",
      "phase": "warmup | main | cooldown",
      "sub_phase": "raise | activate | mobilize | potentiate — חובה בבלוקי warmup. בבלוקי main ו-cooldown: אל תכלול את השדה כלל (אל תכתוב null או undefined)",
      "name_he": "string — שם השלב בעברית",
      "duration_s": "number — משך השלב בשניות",
      "activity_ids": ["array of strings — חייבים להופיע ברשימת המזהים ברשימת הפעילויות שסופקה"],
      "teacher_cues_he": "string — הנחיות הוראה לנקודת ההעברה",
      "notes_he": "string — הערות נוספות (אופציונלי)"
    }
  ]
}`;

function buildPedagogyCardsBlock(disabledModels: string[] = []): string {
  const disabled = new Set(disabledModels);
  return pedagogyCards.cards
    .filter((c) => !disabled.has(c.key))
    .map(
      (c) =>
        `- ${c.key}: ${c.name_he}. ${c.summary_he} מתי להשתמש: ${c.when_to_use_he}`,
    )
    .join('\n');
}

function buildRampBlock(): string {
  return safety.ramp_protocol.phases
    .map((p) => `- ${p.key}: ${p.name_he} (${p.typical_duration_s}s) — ${p.goal_he}`)
    .join('\n');
}

function buildActivitiesContext(activities: Activity[]): string {
  return activities
    .map((a) => {
      const tags = (a.tags_json ?? []).join(', ');
      const eq = (a.equipment_json ?? []).join(', ') || 'ללא ציוד';
      return `- id=${a.source_ref ?? a.id} | קטגוריה=${a.category} | ${a.name_he} | ציוד: ${eq} | תגיות: ${tags}`;
    })
    .join('\n');
}

export function buildSystemPrompt(opts: { disabledModels?: string[] } = {}): string {
  return `אתה מעצב שיעורים של מורה לחינוך גופני בבית ספר יסודי-תיכון בישראל (כיתות ז-יב). תפקידך לעצב שיעור אחד שלם על בסיס אילוצים שהמורה מספק.

## מודלים פדגוגיים זמינים
${buildPedagogyCardsBlock(opts.disabledModels)}

## מבנה חימום (פרוטוקול RAMP)
חימום סטנדרטי כולל ארבעה תת-שלבים:
${buildRampBlock()}
חימום חייב להוביל לפעילות העיקרית, לא להיות גנרי.

## חוקים נוקשים
1. עליך להשתמש אך ורק בפעילויות שמזהה ה-id שלהן מופיע ברשימת הפעילויות שסופקה בהודעת המשתמש. אסור לך להמציא פעילויות חדשות או להוסיף מזהים שלא הופיעו ברשימה.
2. סך משך כל הבלוקים (duration_s) חייב להיות שווה ל-duration_min * 60.
3. אסור לך להזכיר שמות תלמידים, מספרי זהות, או פרטים מזהים כלשהם. אם המשתמש מציין פרט כזה בטעות, התעלם ממנו.
4. אם המשתמש מבקש פעילות שדורשת ציוד שלא מופיע ברשימת הציוד הזמין, בחר פעילות חלופית מהרשימה שמתאימה לכוונה.
5. אסור לך לתת עצות רפואיות. אם המשתמש מתאר פציעה, הפנה בהערת בטיחות ("מומלץ לקבל אישור רפואי") והצע פעילות חלופית בטוחה.
6. אם המטרה דורשת בחירה בין שני מודלים פדגוגיים, נמק בצורה תמציתית ב-pedagogical_rationale_he.

## פורמט פלט
החזר JSON תקני אחד בלבד (ללא גדרות markdown, ללא טקסט לפניו או אחריו) בפורמט הבא:
${JSON_SCHEMA_HINT}`;
}

export function buildUserMessage(constraints: DesignerConstraints, activities: Activity[]): string {
  const gradeBand = constraints.grade <= 9 ? '7-9' : '10-12';
  const modelGuidance =
    constraints.preferredModel === 'auto'
      ? 'המורה מבקש שתבחר לבד את המודל הפדגוגי המתאים ביותר.'
      : `המורה ביקש להשתמש במודל: ${constraints.preferredModel}.`;
  const considerations = constraints.specialConsiderationsHe?.trim()
    ? `\n\nהתחשבויות מיוחדות: ${constraints.specialConsiderationsHe}`
    : '';

  return `## אילוצי השיעור

- כיתה: ${gradeBand} (כיתה ${constraints.grade})
- משך: ${constraints.durationMin} דקות
- סביבה: ${constraints.environment}
- מספר תלמידים: ${constraints.classSize}
- מטרה: ${constraints.goalHe}
- ציוד זמין: ${constraints.equipmentAvailableHe.length > 0 ? constraints.equipmentAvailableHe.join(', ') : 'ללא ציוד מיוחד'}
- ${modelGuidance}${considerations}

## רשימת פעילויות זמינות
ניתן להשתמש רק במזהים שמופיעים כאן. השתמש ב-id המוצג (לא בשם).

${buildActivitiesContext(activities)}

החזר JSON בפורמט שהוגדר במערכת.`;
}

const ALLOWED_PEDAGOGICAL_MODELS: ReadonlySet<string> = new Set([
  'tgfu',
  'sport-education',
  'tpsr',
  'skill-themes',
  'cooperative',
  'mosston-spectrum',
  'mosston-command',
  'mosston-practice',
  'mosston-reciprocal',
  'mosston-self-check',
  'mosston-inclusion',
  'mosston-guided-discovery',
  'mosston-convergent',
  'mosston-divergent',
  'mosston-individual',
  'mosston-learner-initiated',
  'mosston-self-teaching',
]);

const ALLOWED_SUB_PHASES: ReadonlySet<string> = new Set([
  'raise',
  'activate',
  'mobilize',
  'potentiate',
]);

export function parseLessonJson(raw: string): GeneratedLesson {
  // LLMs sometimes wrap JSON in markdown fences despite instructions. Be lenient.
  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error('no JSON object in LLM response');
  }
  const slice = stripped.slice(firstBrace, lastBrace + 1);

  const obj = JSON.parse(slice) as GeneratedLesson;

  // Minimal structural checks. Not a full schema validator; enough to surface
  // the most common LLM output failures early with a clear message.
  if (!obj.title_he || !Array.isArray(obj.blocks_json) || obj.blocks_json.length === 0) {
    throw new Error('lesson JSON missing required fields (title_he / blocks_json)');
  }
  if (!obj.pedagogical_model) {
    throw new Error('lesson JSON missing pedagogical_model');
  }
  if (!ALLOWED_PEDAGOGICAL_MODELS.has(obj.pedagogical_model)) {
    throw new Error(
      `lesson JSON pedagogical_model "${obj.pedagogical_model}" is not in the allowed set`,
    );
  }

  // Defensive cleanup: the LLM sometimes writes sub_phase: "undefined" (string
  // literal) for non-warmup blocks despite the prompt saying to omit. Strip
  // those and any value outside the enum so the DB column stays clean.
  obj.blocks_json = obj.blocks_json.map((b) => {
    if (b.sub_phase === undefined) return b;
    const v = b.sub_phase as unknown;
    if (typeof v !== 'string' || !ALLOWED_SUB_PHASES.has(v)) {
      const { sub_phase: _drop, ...rest } = b;
      return rest as typeof b;
    }
    return b;
  });

  return obj;
}
