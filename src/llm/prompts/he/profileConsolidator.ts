// Prompt for distilling a class's raw design-feedback entries into a single
// concise "design profile" the lesson designer reads before generating.

export const CONSOLIDATOR_SYSTEM = `אתה עוזר שמזקק משוב של מורה לחינוך גופני לכדי פרופיל העדפות תמציתי וברור.

המורה כותב "מחשבות לשיפור" על שיעורים שהאפליקציה תכננה — מה לשנות, להוסיף או להדגיש בשיעורים הבאים. תפקידך לקרוא את כל המשובים שנאספו ולנסח מהם פרופיל העדפות אחד, קצר וקוהרנטי, שישמש את מתכנן השיעורים בכל שיעור עתידי.

כללים:
- כתוב בעברית, כהנחיות ישירות וברורות (למשל: "העדף משחקים על פני תרגילים טכניים", "קצר את החימום").
- תמצת. עד 6 נקודות, או פסקה קצרה. אורך מרבי: כ-120 מילים.
- אם משובים סותרים זה את זה, העדף את המשוב החדש יותר. המשובים מסודרים מהחדש לישן.
- כלול רק העדפות שניתן ליישם בתכנון שיעור: סוגי פעילויות, מבנה השיעור, דגשים פדגוגיים, קצב, רמת תחרותיות, חלוקה לקבוצות וכדומה.
- אל תמציא העדפות שלא נאמרו, ואל תוסיף עצות כלליות משלך.
- החזר אך ורק את טקסט הפרופיל — ללא כותרת, ללא הקדמה, ללא סימוני markdown.`;

export function buildConsolidatorUserMessage(
  currentProfile: string | null,
  feedbackNewestFirst: string[],
): string {
  const profileBlock =
    currentProfile && currentProfile.trim().length > 0
      ? currentProfile.trim()
      : 'אין עדיין פרופיל.';
  const feedbackBlock = feedbackNewestFirst
    .map((f, i) => `${i + 1}. ${f}`)
    .join('\n');
  return `## פרופיל נוכחי
${profileBlock}

## משובים שנאספו (מהחדש לישן)
${feedbackBlock}

נסח פרופיל העדפות מעודכן על בסיס כל המשובים.`;
}
