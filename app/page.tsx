"use client";

// 화면 파일. 저장은 직접 하지 않고 lib/todo-storage.ts의 함수만 호출한다.

import { useEffect, useRef, useState } from "react";
import {
  addCategory,
  addTodo,
  deleteCategory,
  deleteCompletedTodos,
  deleteTodo,
  listCategories,
  listTodos,
  normalizeTitle,
  toggleTodo,
  updateTodoCategory,
  updateTodoTitle,
  type Category,
  type Todo,
} from "./lib/todo-storage";
import {
  ALL_CATEGORIES,
  countRemaining,
  DEFAULT_STATUS_FILTER,
  getEmptyMessage,
  getVisibleTodos,
  UNCATEGORIZED,
  type CategoryFilter,
  type StatusFilter,
} from "./lib/todo-view";

// 필터 버튼 목록 (화면 상태일 뿐이라 저장하지 않는다)
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "남은 것" },
  { value: "completed", label: "완료" },
];

// 입력창 공통 모양
const inputClass =
  "min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-soft focus-visible:border-accent";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  // 카테고리 목록과, 추가할 때 고른 카테고리("" 는 미분류), 새 카테고리 이름 입력
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTodoCategoryId, setNewTodoCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  // 저장소에서 처음 불러오기 전에는 안내 문구가 깜빡이지 않도록 구분한다
  const [loaded, setLoaded] = useState(false);
  // 선택한 필터들. 둘 다 앱을 열 때마다 "전체"로 시작하고 저장하지 않는다.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    DEFAULT_STATUS_FILTER,
  );
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>(ALL_CATEGORIES);

  // 제목 수정 상태: 한 번에 하나의 Todo만 수정한다.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  // 수정 중인 Todo의 카테고리 선택값 ("" 은 미분류)
  const [editingCategoryId, setEditingCategoryId] = useState("");
  // Enter/Esc/바깥 클릭이 겹쳐도 저장이 두 번 일어나지 않게 막는 표시
  const editingRef = useRef<string | null>(null);

  // 저장소에서 목록을 다시 불러와 화면에 반영
  async function refresh() {
    setTodos(await listTodos());
    setCategories(await listCategories());
  }

  // 처음 화면이 뜰 때 한 번 불러온다
  useEffect(() => {
    Promise.all([listTodos(), listCategories()]).then(([list, cats]) => {
      setTodos(list);
      setCategories(cats);
      setLoaded(true);
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeTitle(title);
    if (normalized === null) return;
    await addTodo(normalized, newTodoCategoryId || null);
    setTitle("");
    await refresh();
  }

  async function handleToggle(id: string) {
    await toggleTodo(id);
    await refresh();
  }

  async function handleDelete(id: string) {
    await deleteTodo(id);
    await refresh();
  }

  // 카테고리 추가: 빈 이름/중복 이름은 저장소가 거부하고, 이유를 화면에 알려준다
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const result = await addCategory(categoryName);
    if (!result.ok) {
      setCategoryError(
        result.reason === "empty"
          ? "카테고리 이름을 입력하세요"
          : "이미 있는 카테고리예요",
      );
      return;
    }
    setCategoryError("");
    setCategoryName("");
    await refresh();
  }

  // 카테고리 삭제: 그 안의 할 일은 지워지지 않고 미분류가 된다
  async function handleDeleteCategory(category: Category) {
    if (
      !window.confirm(
        `"${category.name}" 카테고리를 삭제할까요?\n그 안의 할 일은 삭제되지 않고 미분류가 됩니다.`,
      )
    )
      return;
    await deleteCategory(category.id);
    // 삭제한 카테고리가 추가용 드롭다운에 선택되어 있었다면 미분류로 되돌린다
    if (newTodoCategoryId === category.id) setNewTodoCategoryId("");
    // 보고 있던 카테고리를 삭제했다면 필터를 "전체"로 되돌린다
    if (categoryFilter === category.id) setCategoryFilter(ALL_CATEGORIES);
    await refresh();
  }

  // 더블클릭하거나 ✏️ 버튼을 누르면 수정을 시작한다
  function startEditing(todo: Todo) {
    editingRef.current = todo.id;
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    setEditingCategoryId(todo.categoryId ?? "");
  }

  // 수정 끝내기: save가 true면 저장(빈 제목이면 저장소가 거부해 원래 제목 유지), false면 취소
  async function finishEditing(id: string, save: boolean) {
    if (editingRef.current !== id) return;
    editingRef.current = null;
    setEditingId(null);
    if (save) {
      await updateTodoTitle(id, editingTitle);
      await updateTodoCategory(id, editingCategoryId || null);
      await refresh();
    }
  }

  // 완료된 항목 모두 삭제 (되돌릴 수 없으므로 한 번 확인한다)
  async function handleDeleteCompleted() {
    if (!window.confirm("완료된 항목을 모두 삭제할까요?")) return;
    await deleteCompletedTodos();
    await refresh();
  }

  // 남은 할 일 개수: 전체 Todo 중 완료되지 않은 것만 센다 (필터와 상관없이, 저장하지 않고 계산)
  const remaining = countRemaining(todos);
  const completedCount = todos.length - remaining;
  // 화면에 보여줄 Todo (상태 필터와 카테고리 필터를 함께 적용)
  const visibleTodos = getVisibleTodos(todos, statusFilter, categoryFilter);
  // 카테고리 id -> 이름 (Todo 옆 라벨에 사용)
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const emptyMessage = loaded
    ? getEmptyMessage(todos, statusFilter, categoryFilter)
    : null;
  // 카테고리 필터 버튼 목록: 전체 / 미분류 / 각 카테고리
  const categoryFilters: { value: CategoryFilter; label: string }[] = [
    { value: ALL_CATEGORIES, label: "전체" },
    { value: UNCATEGORIZED, label: "미분류" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  // 머리말 한 줄 요약 (카운트는 전체 Todo 기준)
  const summary = !loaded
    ? " "
    : todos.length === 0
      ? "할 일을 추가해 보세요"
      : remaining === 0
        ? "모두 끝냈어요"
        : `${remaining}개 남았어요`;
  // 진행 막대: 전체 중 완료한 비율
  const progress =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-20 pt-14">
      {/* 머리말 */}
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">오늘의 할 일</h1>
        <p className="mt-1 text-soft" aria-live="polite">
          {summary}
        </p>
        <div
          className="mt-4 h-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="완료 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* 할 일 추가: 입력창, 카테고리, 버튼을 한 줄로 */}
      <form
        onSubmit={handleAdd}
        className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 focus-within:border-accent"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          aria-label="할 일"
          className="min-w-40 flex-1 bg-transparent px-2 py-2 outline-none placeholder:text-soft"
        />
        <select
          value={newTodoCategoryId}
          onChange={(e) => setNewTodoCategoryId(e.target.value)}
          aria-label="카테고리"
          className="rounded-lg bg-page px-2 py-2 text-sm text-soft"
        >
          <option value="">미분류</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:opacity-90"
        >
          추가
        </button>
      </form>

      {/* 필터: 왼쪽은 상태 탭, 오른쪽은 카테고리 */}
      <div className="mb-1 flex items-end justify-between gap-3 border-b border-line">
        <div className="flex gap-5" role="group" aria-label="상태 필터">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={`-mb-px border-b-2 pb-2.5 font-medium ${
                statusFilter === f.value
                  ? "border-accent text-ink"
                  : "border-transparent text-soft hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="카테고리 필터"
          className="mb-2 rounded-lg bg-transparent py-1 pl-2 text-sm text-soft"
        >
          {categoryFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.value === ALL_CATEGORIES ? "모든 카테고리" : f.label}
            </option>
          ))}
        </select>
      </div>

      {/* 빈 목록 안내 */}
      {emptyMessage && (
        <p className="py-12 text-center text-soft">{emptyMessage}</p>
      )}

      {/* 할 일 목록: 카드 대신 가는 구분선으로 나눈다 */}
      <ul>
        {visibleTodos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-start gap-3 border-b border-line py-3.5"
          >
            <input
              type="checkbox"
              className="check mt-0.5"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id)}
              aria-label={`${todo.title} 완료 표시`}
            />
            {editingId === todo.id ? (
              // 제목 입력창과 카테고리 드롭다운을 한 묶음으로 본다.
              // 포커스가 이 묶음 밖으로 나갈 때(바깥 클릭)만 저장하므로,
              // 입력창에서 드롭다운으로 옮겨 가도 수정 상태가 끝나지 않는다.
              <div
                className="flex min-w-0 flex-1 flex-col gap-2"
                onKeyDown={(e) => {
                  if (e.key === "Escape") finishEditing(todo.id, false);
                  if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                    finishEditing(todo.id, true);
                  }
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    finishEditing(todo.id, true);
                  }
                }}
              >
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  aria-label="할 일 제목 수정"
                  className={inputClass}
                />
                <select
                  value={editingCategoryId}
                  onChange={(e) => setEditingCategoryId(e.target.value)}
                  aria-label="카테고리"
                  className={`${inputClass} text-sm`}
                >
                  <option value="">미분류</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-soft">
                  Enter로 저장, Esc로 취소해요. 바깥을 누르면 저장돼요.
                </p>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <span
                    onDoubleClick={() => startEditing(todo)}
                    className={`block break-words leading-snug ${
                      todo.completed ? "text-soft line-through" : ""
                    }`}
                  >
                    {todo.title}
                  </span>
                  {todo.categoryId && categoryNames.has(todo.categoryId) && (
                    <span className="mt-1.5 inline-block rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                      {categoryNames.get(todo.categoryId)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startEditing(todo)}
                  aria-label={`${todo.title} 수정`}
                  className="rounded-md px-1.5 py-0.5 text-sm text-soft hover:text-ink"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(todo.id)}
                  aria-label={`${todo.title} 삭제`}
                  className="rounded-md px-1.5 py-0.5 text-sm text-soft hover:text-danger"
                >
                  삭제
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* 아래쪽: 정리 도구 */}
      <div className="mt-6 flex items-start justify-between gap-4">
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer select-none text-sm text-soft hover:text-ink">
            카테고리 관리
          </summary>
          <form onSubmit={handleAddCategory} className="mt-3 flex gap-2">
            <input
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setCategoryError("");
              }}
              placeholder="새 카테고리 이름"
              aria-label="새 카테고리 이름"
              className={`${inputClass} flex-1 text-sm`}
            />
            <button
              type="submit"
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-accent"
            >
              만들기
            </button>
          </form>
          {categoryError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {categoryError}
            </p>
          )}
          {categories.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-1 rounded-md bg-accent-soft py-0.5 pl-2 pr-1 text-sm text-accent"
                >
                  {c.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c)}
                    aria-label={`${c.name} 카테고리 삭제`}
                    className="grid h-5 w-5 place-content-center rounded hover:bg-accent/15"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </details>
        <button
          type="button"
          onClick={handleDeleteCompleted}
          disabled={completedCount === 0}
          className="flex-none text-sm text-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-soft"
        >
          완료한 일 지우기
        </button>
      </div>
    </main>
  );
}
