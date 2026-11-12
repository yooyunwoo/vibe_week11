"use server";

// 서버 함수(Server Action). 브라우저 화면이 저장소를 쓰는 유일한 통로다. (docs/adr/0003 참고)
// 데이터베이스 접속은 여기서 불러오는 서버 전용 저장 모듈 안에서만 일어난다.
//
// - 서버 함수는 화면을 거치지 않은 직접 요청으로도 호출될 수 있으므로, 받은 값을 믿지 않고 먼저 검사한다.
// - 클라이언트는 서버 함수를 한 번에 하나씩 순서대로 보낸다. 그래서 변경 함수는 변경 뒤의 최신 목록을
//   그대로 돌려줘서, 화면이 따로 다시 불러오지 않아도 되게 한다.
// - "use server" 파일은 async 함수만 내보낼 수 있다.

import type { AddCategoryResult, Snapshot } from "./lib/todo-model";
import * as store from "./lib/server/todo-store";

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${name}은(는) 문자열이어야 해요`);
}

function assertIdOrNull(value: unknown, name: string): asserts value is string | null {
  if (value !== null) assertString(value, name);
}

// 지금 저장된 전체 목록 (Todo와 카테고리)
async function snapshot(): Promise<Snapshot> {
  const [todos, categories] = await Promise.all([
    store.listTodos(),
    store.listCategories(),
  ]);
  return { todos, categories };
}

export async function loadSnapshot(): Promise<Snapshot> {
  return snapshot();
}

export async function addTodoAction(
  title: string,
  categoryId: string | null,
): Promise<Snapshot> {
  assertString(title, "title");
  assertIdOrNull(categoryId, "categoryId");
  await store.addTodo(title, categoryId);
  return snapshot();
}

export async function toggleTodoAction(id: string): Promise<Snapshot> {
  assertString(id, "id");
  await store.toggleTodo(id);
  return snapshot();
}

export async function deleteTodoAction(id: string): Promise<Snapshot> {
  assertString(id, "id");
  await store.deleteTodo(id);
  return snapshot();
}

// 제목과 카테고리를 한 번에 저장한다(수정 상태에서 한꺼번에 저장하기 때문)
export async function updateTodoAction(
  id: string,
  title: string,
  categoryId: string | null,
): Promise<Snapshot> {
  assertString(id, "id");
  assertString(title, "title");
  assertIdOrNull(categoryId, "categoryId");
  await store.updateTodoTitle(id, title);
  await store.updateTodoCategory(id, categoryId);
  return snapshot();
}

export async function deleteCompletedAction(): Promise<Snapshot> {
  await store.deleteCompletedTodos();
  return snapshot();
}

// 카테고리 추가: 빈 이름/중복 이름은 오류가 아니라 거부 결과로 돌려준다
export async function addCategoryAction(
  name: string,
): Promise<{ result: AddCategoryResult; snapshot: Snapshot }> {
  assertString(name, "name");
  const result = await store.addCategory(name);
  return { result, snapshot: await snapshot() };
}

export async function deleteCategoryAction(id: string): Promise<Snapshot> {
  assertString(id, "id");
  await store.deleteCategory(id);
  return snapshot();
}
