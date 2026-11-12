// 저장소 종류와 상관없는 공통 모델. 브라우저와 서버 양쪽에서 가져다 쓴다.
// (브라우저 전용, 서버 전용 코드를 넣지 않는다 - docs/adr/0001 참고)

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

export type AddCategoryResult =
  | { ok: true; category: Category }
  | { ok: false; reason: "empty" | "duplicate" };

// 서버가 화면에 돌려주는 전체 목록
export type Snapshot = {
  todos: Todo[];
  categories: Category[];
};

// 제목 규칙(Todo 제목과 카테고리 이름 공통): 앞뒤 공백을 제거하고, 비어 있으면 null(거부)
export function normalizeTitle(title: string): string | null {
  const trimmed = title.trim();
  return trimmed === "" ? null : trimmed;
}
