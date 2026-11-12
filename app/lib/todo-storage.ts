// 저장 코드는 이 파일에만 둔다. (docs/adr/0001 참고)
// 지금은 localStorage를 쓰지만, 나중에 Turso로 바꿀 때 이 파일 안쪽만 고치면 된다.
// localStorage는 동기식이지만, Turso는 항상 비동기이므로 모든 함수를 async로 만든다.

export type Todo = {
  id: string; // 문자열 UUID (Turso/SQLite에서도 그대로 사용 가능)
  title: string;
  completed: boolean;
  createdAt: string; // ISO 시각 문자열
  categoryId: string | null; // 카테고리 id. null이면 미분류 (docs/adr/0002 참고)
};

// 카테고리는 Todo와 별도 목록으로 저장한다. (docs/adr/0002 참고)
export type Category = {
  id: string; // 문자열 UUID
  name: string;
};

const STORAGE_KEY = "my-todo:todos";
const CATEGORY_STORAGE_KEY = "my-todo:categories";

// 저장된 전체 목록을 읽는다. 데이터가 없거나 깨져 있으면 빈 목록을 돌려준다.
function readAll(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 카테고리 기능 이전에 저장된 Todo에는 categoryId가 없으므로 null(미분류)로 취급한다
    return (parsed as Todo[]).map((t) => ({ ...t, categoryId: t.categoryId ?? null }));
  } catch {
    return [];
  }
}

function writeAll(todos: Todo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function readCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Category[]) : [];
  } catch {
    return [];
  }
}

function writeCategories(categories: Category[]): void {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

// 목록 조회 (오래된 것부터). 존재하지 않는 카테고리를 가리키는 Todo는 미분류로 돌려준다.
export async function listTodos(): Promise<Todo[]> {
  const categoryIds = new Set(readCategories().map((c) => c.id));
  return readAll()
    .map((t) => ({
      ...t,
      categoryId: t.categoryId !== null && categoryIds.has(t.categoryId) ? t.categoryId : null,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// 할 일 추가. categoryId를 주지 않거나 존재하지 않는 카테고리면 미분류로 저장한다.
export async function addTodo(
  title: string,
  categoryId: string | null = null,
): Promise<Todo> {
  const exists = categoryId !== null && readCategories().some((c) => c.id === categoryId);
  const todo: Todo = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
    categoryId: exists ? categoryId : null,
  };
  writeAll([...readAll(), todo]);
  return todo;
}

// 제목 규칙(추가할 때와 수정할 때 공통): 앞뒤 공백을 제거하고, 비어 있으면 null(거부)
export function normalizeTitle(title: string): string | null {
  const trimmed = title.trim();
  return trimmed === "" ? null : trimmed;
}

// 제목 수정. 빈 제목이거나 없는 id이면 아무것도 바꾸지 않는다.
// id, 완료 여부, 생성 시각은 그대로이고 목록 순서(createdAt 기준)도 변하지 않는다.
export async function updateTodoTitle(id: string, title: string): Promise<void> {
  const normalized = normalizeTitle(title);
  if (normalized === null) return;
  writeAll(
    readAll().map((t) => (t.id === id ? { ...t, title: normalized } : t)),
  );
}

// 카테고리 변경. categoryId가 null이거나 존재하지 않는 카테고리면 미분류로 바꾼다.
// 제목, 완료 여부, 생성 시각, 목록 순서는 그대로이고, 없는 Todo id는 무시한다.
export async function updateTodoCategory(
  id: string,
  categoryId: string | null,
): Promise<void> {
  const exists = categoryId !== null && readCategories().some((c) => c.id === categoryId);
  writeAll(
    readAll().map((t) =>
      t.id === id ? { ...t, categoryId: exists ? categoryId : null } : t,
    ),
  );
}

// 완료 체크 토글 (다시 누르면 되돌아간다)
export async function toggleTodo(id: string): Promise<void> {
  writeAll(
    readAll().map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
  );
}

// 영구 삭제
export async function deleteTodo(id: string): Promise<void> {
  writeAll(readAll().filter((t) => t.id !== id));
}

// 완료된 항목 모두 영구 삭제
export async function deleteCompletedTodos(): Promise<void> {
  writeAll(readAll().filter((t) => !t.completed));
}

// ---- 카테고리 ----

export type AddCategoryResult =
  | { ok: true; category: Category }
  | { ok: false; reason: "empty" | "duplicate" };

// 카테고리 목록 조회 (만든 순서)
export async function listCategories(): Promise<Category[]> {
  return readCategories();
}

// 카테고리 추가. 이름은 앞뒤 공백을 제거하고, 빈 이름과 이미 있는 이름(대소문자 구분 없음)은 거부한다.
export async function addCategory(name: string): Promise<AddCategoryResult> {
  const normalized = normalizeTitle(name);
  if (normalized === null) return { ok: false, reason: "empty" };
  const categories = readCategories();
  const key = normalized.toLowerCase();
  if (categories.some((c) => c.name.toLowerCase() === key)) {
    return { ok: false, reason: "duplicate" };
  }
  const category: Category = { id: crypto.randomUUID(), name: normalized };
  writeCategories([...categories, category]);
  return { ok: true, category };
}

// 카테고리 삭제. 그 카테고리의 Todo는 삭제하지 않고 미분류로 되돌린다.
// (Turso에서는 외래 키의 ON DELETE SET NULL에 해당한다)
export async function deleteCategory(id: string): Promise<void> {
  writeCategories(readCategories().filter((c) => c.id !== id));
  writeAll(readAll().map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)));
}
