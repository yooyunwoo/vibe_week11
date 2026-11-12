// 데이터베이스 저장 모듈. 서버에서만 쓴다.
// 공개 함수의 이름, 인자, 반환 형태는 브라우저용 todo-storage.ts와 같다. (docs/adr/0001 참고)
// 제목/카테고리 이름 규칙(공백 제거, 빈 이름과 중복 이름 거부 등)은 여기에 둔다.
// 데이터베이스 제약은 안전망일 뿐 규칙의 출처가 아니다.

import { normalizeTitle } from "../todo-model";
import type { AddCategoryResult, Category, Todo } from "../todo-model";
import { getDb } from "./db";

type TodoRow = {
  id: string;
  title: string;
  completed: number;
  created_at: string;
  category_id: string | null;
};

function toTodo(row: TodoRow): Todo {
  return {
    id: String(row.id),
    title: String(row.title),
    completed: Number(row.completed) === 1,
    createdAt: String(row.created_at),
    categoryId: row.category_id === null ? null : String(row.category_id),
  };
}

// 목록 조회 (오래된 것부터, 같은 시각이면 만든 순서)
export async function listTodos(): Promise<Todo[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, title, completed, created_at, category_id FROM todos ORDER BY created_at ASC, rowid ASC",
  );
  return result.rows.map((r) => toTodo(r as unknown as TodoRow));
}

// 할 일 추가. categoryId를 주지 않거나 존재하지 않는 카테고리면 미분류로 저장한다.
export async function addTodo(
  title: string,
  categoryId: string | null = null,
): Promise<Todo> {
  const db = await getDb();
  let resolvedCategoryId: string | null = null;
  if (categoryId !== null) {
    const found = await db.execute({
      sql: "SELECT id FROM categories WHERE id = ?",
      args: [categoryId],
    });
    if (found.rows.length > 0) resolvedCategoryId = categoryId;
  }
  const todo: Todo = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
    categoryId: resolvedCategoryId,
  };
  await db.execute({
    sql: "INSERT INTO todos (id, title, completed, created_at, category_id) VALUES (?, ?, 0, ?, ?)",
    args: [todo.id, todo.title, todo.createdAt, todo.categoryId],
  });
  return todo;
}

// 제목 수정. 빈 제목이거나 없는 id이면 아무것도 바꾸지 않는다.
// id, 완료 여부, 생성 시각은 그대로이고 목록 순서도 변하지 않는다.
export async function updateTodoTitle(id: string, title: string): Promise<void> {
  const normalized = normalizeTitle(title);
  if (normalized === null) return;
  const db = await getDb();
  await db.execute({
    sql: "UPDATE todos SET title = ? WHERE id = ?",
    args: [normalized, id],
  });
}

// 카테고리 변경. categoryId가 null이거나 존재하지 않는 카테고리면 미분류로 바꾼다.
// 없는 Todo id는 무시한다.
export async function updateTodoCategory(
  id: string,
  categoryId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE todos SET category_id = (SELECT id FROM categories WHERE id = ?) WHERE id = ?",
    args: [categoryId, id],
  });
}

// 완료 체크 토글 (다시 누르면 되돌아간다)
export async function toggleTodo(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE todos SET completed = 1 - completed WHERE id = ?",
    args: [id],
  });
}

// 영구 삭제
export async function deleteTodo(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM todos WHERE id = ?", args: [id] });
}

// 완료된 항목 모두 영구 삭제
export async function deleteCompletedTodos(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM todos WHERE completed = 1");
}

// ---- 카테고리 ----

// 카테고리 목록 조회 (만든 순서)
export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, name FROM categories ORDER BY rowid ASC",
  );
  return result.rows.map((r) => ({ id: String(r.id), name: String(r.name) }));
}

// 카테고리 추가. 이름은 앞뒤 공백을 제거하고, 빈 이름과 이미 있는 이름(대소문자 구분 없음)은 거부한다.
export async function addCategory(name: string): Promise<AddCategoryResult> {
  const normalized = normalizeTitle(name);
  if (normalized === null) return { ok: false, reason: "empty" };
  const key = normalized.toLowerCase();
  const existing = await listCategories();
  if (existing.some((c) => c.name.toLowerCase() === key)) {
    return { ok: false, reason: "duplicate" };
  }
  const category: Category = { id: crypto.randomUUID(), name: normalized };
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO categories (id, name) VALUES (?, ?)",
    args: [category.id, category.name],
  });
  return { ok: true, category };
}

// 카테고리 삭제. 그 카테고리의 Todo는 삭제하지 않고 미분류로 되돌린다.
// 외래 키(ON DELETE SET NULL)가 해 주지만, 설정이 꺼진 환경에서도 안전하도록 명시적으로 한 번 더 하고
// 두 작업을 한 번에(전부 성공 또는 전부 실패) 실행한다.
export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.batch(
    [
      { sql: "UPDATE todos SET category_id = NULL WHERE category_id = ?", args: [id] },
      { sql: "DELETE FROM categories WHERE id = ?", args: [id] },
    ],
    "write",
  );
}
