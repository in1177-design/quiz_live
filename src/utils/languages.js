// Optional second display language for a quiz. Hebrew is always the base language for every
// field; when a quiz's displayLanguage is 'en' or 'ru', each question also gets a translated
// version of its text/options/explanation, shown on the presenter/projector screen. Players'
// phones always show the Hebrew text, regardless of the quiz's display language.
export const DISPLAY_LANGUAGES = {
  he: { code: 'he', label: 'עברית בלבד' },
  en: {
    code: 'en',
    label: 'אנגלית',
    questionPlaceholder: 'Question text (English)',
    answerPlaceholder: (i) => `Answer ${i + 1} (English)`,
    explanationPlaceholder: 'Answer explanation (English)',
  },
  ru: {
    code: 'ru',
    label: 'רוסית',
    questionPlaceholder: 'Текст вопроса (русский)',
    answerPlaceholder: (i) => `Ответ ${i + 1} (русский)`,
    explanationPlaceholder: 'Объяснение ответа (русский)',
  },
};

export function displayLanguageLabel(code) {
  return DISPLAY_LANGUAGES[code]?.label || DISPLAY_LANGUAGES.he.label;
}
