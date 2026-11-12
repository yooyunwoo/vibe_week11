// 화면에 보여줄 Todo를 고르는 계산. 저장소와 화면 어디에도 의존하지 않는 순수 함수다.
// 나중에 필터(상태/카테고리)를 추가할 때 이 파일에서 확장한다.

import type { Todo } from "./todo-storage";

// 필터: 화면 상태일 뿐이며 저장하지 않는다. 앱을 열면 항상 "all"로 시작한다.
export type StatusFilter = "all" | "active" | "completed";

export const DEFAULT_STATUS_FILTER: StatusFilter = "all";

// 카테고리 필터: 전체 / 미분류 / 특정 카테고리(그 카테고리의 id). 이것도 저장하지 않으며
// 앱을 열면 "전체"로 시작한다. 상태 필터와 함께(AND) 적용된다.
export type CategoryFilter = string;

export const ALL_CATEGORIES: CategoryFilter = "all";
export const UNCATEGORIZED: CategoryFilter = "uncategorized";

// 화면에 보여줄 Todo 목록 (순서는 그대로 유지한다). 상태 필터와 카테고리 필터를 함께 적용한다.
export function getVisibleTodos(
  todos: Todo[],
  statusFilter: StatusFilter = DEFAULT_STATUS_FILTER,
  categoryFilter: CategoryFilter = ALL_CATEGORIES,
): Todo[] {
  return todos.filter((t) => {
    if (statusFilter === "active" && t.completed) return false;
    if (statusFilter === "completed" && !t.completed) return false;
    if (categoryFilter === ALL_CATEGORIES) return true;
    if (categoryFilter === UNCATEGORIZED) return t.categoryId === null;
    return t.categoryId === categoryFilter;
  });
}

// 남은 할 일 개수: 완료되지 않은 Todo의 수 (전체 Todo 기준, 저장하지 않고 계산)
export function countRemaining(todos: Todo[]): number {
  return todos.filter((t) => !t.completed).length;
}

// 빈 목록 안내 문구를 보여줄지 판단: 저장된 Todo가 하나도 없을 때만 보여준다.
export function shouldShowEmptyMessage(todos: Todo[]): boolean {
  return todos.length === 0;
}

// 목록이 비어 보일 때 보여줄 안내 문구. 보여줄 안내가 없으면 null.
// - 저장된 Todo가 아예 없으면 추가를 권하는 문구
// - Todo는 있지만 선택한 필터에 맞는 것이 없으면 필터별 문구
export function getEmptyMessage(
  todos: Todo[],
  statusFilter: StatusFilter,
  categoryFilter: CategoryFilter = ALL_CATEGORIES,
): string | null {
  if (shouldShowEmptyMessage(todos)) {
    return "할 일이 없어요. 하나 추가해 보세요!";
  }
  if (getVisibleTodos(todos, statusFilter, categoryFilter).length > 0) return null;
  // 상태 필터가 걸려 있으면 상태 문구를, 아니면 카테고리 문구를 보여준다
  if (statusFilter === "active") return "남은 할 일이 없어요!";
  if (statusFilter === "completed") return "완료한 할 일이 없어요";
  if (categoryFilter === UNCATEGORIZED) return "미분류 할 일이 없어요";
  if (categoryFilter !== ALL_CATEGORIES) return "이 카테고리에는 할 일이 없어요";
  return null;
}
