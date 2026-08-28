export type ListKind = "shared" | "private";

export function listPreferenceKey(kind: ListKind, listId: string | number) {
  return `${kind}:${String(listId)}`;
}
