const birthdayWord = /\b(?:birthday|bday|birth[\s-]+day)\b/i;
const partyWord = /\bparty\b/i;

export function isBirthdayTitle(title: string) {
  return birthdayWord.test(title) && !partyWord.test(title);
}

export function isBirthdayEventTitle(title: string, category?: string | null) {
  return !partyWord.test(title) && (isBirthdayTitle(title) || category?.trim().toLocaleLowerCase() === "birthday");
}
