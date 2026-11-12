// 저장 모듈의 바깥에서 보이는 동작만 확인한다. (함수를 호출하고 listTodos 결과를 본다)
import { describe, expect, it } from "vitest";
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
} from "./todo-storage";

describe("todo-storage", () => {
  it("저장된 데이터가 없으면 빈 목록을 돌려준다", async () => {
    expect(await listTodos()).toEqual([]);
  });

  it("깨진 저장 데이터가 있어도 빈 목록으로 시작한다", async () => {
    localStorage.setItem("my-todo:todos", "{깨진 json");
    expect(await listTodos()).toEqual([]);
  });

  it("배열이 아닌 저장 데이터도 빈 목록으로 취급한다", async () => {
    localStorage.setItem("my-todo:todos", JSON.stringify({ a: 1 }));
    expect(await listTodos()).toEqual([]);
  });

  it("할 일을 추가하면 미완료 상태로 목록에 나타난다", async () => {
    const todo = await addTodo("우유 사기");
    expect(todo).toMatchObject({ title: "우유 사기", completed: false });
    expect(typeof todo.id).toBe("string");
    expect(await listTodos()).toEqual([todo]);
  });

  it("목록은 오래된 것부터 정렬된다", async () => {
    const first = await addTodo("첫째");
    await new Promise((r) => setTimeout(r, 5));
    const second = await addTodo("둘째");
    expect((await listTodos()).map((t) => t.id)).toEqual([first.id, second.id]);
  });

  it("완료 체크를 토글하면 완료되고, 다시 토글하면 되돌아간다", async () => {
    const todo = await addTodo("운동");
    await toggleTodo(todo.id);
    expect((await listTodos())[0].completed).toBe(true);
    await toggleTodo(todo.id);
    expect((await listTodos())[0].completed).toBe(false);
  });

  it("토글해도 제목과 생성 시각은 그대로다", async () => {
    const todo = await addTodo("운동");
    await toggleTodo(todo.id);
    const [saved] = await listTodos();
    expect(saved.title).toBe(todo.title);
    expect(saved.createdAt).toBe(todo.createdAt);
  });

  it("삭제하면 그 할 일만 영구히 사라진다", async () => {
    const a = await addTodo("A");
    const b = await addTodo("B");
    await deleteTodo(a.id);
    expect((await listTodos()).map((t) => t.id)).toEqual([b.id]);
  });

  it("없는 id를 토글하거나 삭제해도 오류 없이 아무것도 바뀌지 않는다", async () => {
    const a = await addTodo("A");
    await toggleTodo("없는-id");
    await deleteTodo("없는-id");
    expect(await listTodos()).toEqual([a]);
  });

  it("완료된 항목 모두 삭제는 완료된 것만 지운다", async () => {
    const a = await addTodo("A");
    const b = await addTodo("B");
    const c = await addTodo("C");
    await toggleTodo(a.id);
    await toggleTodo(c.id);
    await deleteCompletedTodos();
    expect((await listTodos()).map((t) => t.id)).toEqual([b.id]);
  });

  it("완료된 항목이 없으면 완료된 항목 모두 삭제는 아무것도 바꾸지 않는다", async () => {
    const a = await addTodo("A");
    await deleteCompletedTodos();
    expect(await listTodos()).toEqual([a]);
  });

  it("새로고침처럼 같은 저장소를 다시 읽어도 데이터가 남아 있다", async () => {
    await addTodo("남아 있어야 함");
    const raw = localStorage.getItem("my-todo:todos");
    expect(raw).not.toBeNull();
    expect((await listTodos())[0].title).toBe("남아 있어야 함");
  });

  describe("제목 수정", () => {
    it("제목만 바꾸고 id, 완료 여부, 생성 시각은 그대로 둔다", async () => {
      const todo = await addTodo("오타");
      await toggleTodo(todo.id);
      await updateTodoTitle(todo.id, "고친 제목");
      const [saved] = await listTodos();
      expect(saved).toEqual({ ...todo, title: "고친 제목", completed: true });
    });

    it("수정해도 목록 순서가 바뀌지 않는다", async () => {
      const a = await addTodo("A");
      await new Promise((r) => setTimeout(r, 5));
      const b = await addTodo("B");
      await new Promise((r) => setTimeout(r, 5));
      const c = await addTodo("C");
      await updateTodoTitle(a.id, "A 수정");
      expect((await listTodos()).map((t) => t.id)).toEqual([a.id, b.id, c.id]);
    });

    it("앞뒤 공백은 제거되어 저장된다", async () => {
      const todo = await addTodo("원래");
      await updateTodoTitle(todo.id, "   새 제목  ");
      expect((await listTodos())[0].title).toBe("새 제목");
    });

    it("공백만 있거나 빈 제목은 거부되고 원래 제목이 유지된다", async () => {
      const todo = await addTodo("원래");
      await updateTodoTitle(todo.id, "");
      await updateTodoTitle(todo.id, "    ");
      expect((await listTodos())[0].title).toBe("원래");
    });

    it("없는 id를 수정해도 오류 없이 무시된다", async () => {
      const todo = await addTodo("원래");
      await updateTodoTitle("없는-id", "바뀌면 안 됨");
      expect(await listTodos()).toEqual([todo]);
    });

    it("수정한 제목이 저장소에 남아 있다(새로고침 후에도 유지)", async () => {
      const todo = await addTodo("원래");
      await updateTodoTitle(todo.id, "수정됨");
      const raw = JSON.parse(localStorage.getItem("my-todo:todos") ?? "[]");
      expect(raw[0].title).toBe("수정됨");
    });
  });

  describe("normalizeTitle", () => {
    it("공백을 제거하고, 비어 있으면 null을 돌려준다", () => {
      expect(normalizeTitle("  가나다 ")).toBe("가나다");
      expect(normalizeTitle("   ")).toBeNull();
      expect(normalizeTitle("")).toBeNull();
    });
  });

  describe("카테고리", () => {
    it("처음에는 카테고리가 없다", async () => {
      expect(await listCategories()).toEqual([]);
    });

    it("카테고리를 만들면 목록에 만든 순서대로 나타난다", async () => {
      const a = await addCategory("업무");
      const b = await addCategory("공부");
      expect(a.ok && b.ok).toBe(true);
      expect((await listCategories()).map((c) => c.name)).toEqual(["업무", "공부"]);
    });

    it("이름의 앞뒤 공백은 제거된다", async () => {
      await addCategory("  업무  ");
      expect((await listCategories())[0].name).toBe("업무");
    });

    it("빈 이름은 거부된다", async () => {
      expect(await addCategory("")).toEqual({ ok: false, reason: "empty" });
      expect(await addCategory("   ")).toEqual({ ok: false, reason: "empty" });
      expect(await listCategories()).toEqual([]);
    });

    it("이미 있는 이름은 대소문자 구분 없이 거부된다", async () => {
      await addCategory("Work");
      expect(await addCategory("work")).toEqual({ ok: false, reason: "duplicate" });
      expect(await addCategory(" WORK ")).toEqual({ ok: false, reason: "duplicate" });
      expect(await listCategories()).toHaveLength(1);
    });

    it("카테고리는 새로고침 후에도 남아 있다", async () => {
      await addCategory("업무");
      const raw = JSON.parse(localStorage.getItem("my-todo:categories") ?? "[]");
      expect(raw[0].name).toBe("업무");
    });

    it("깨진 카테고리 저장 데이터는 빈 목록으로 취급한다", async () => {
      localStorage.setItem("my-todo:categories", "{깨짐");
      expect(await listCategories()).toEqual([]);
    });

    it("할 일을 추가할 때 카테고리를 고르면 그 카테고리로 저장된다", async () => {
      const r = await addCategory("업무");
      if (!r.ok) throw new Error("카테고리 생성 실패");
      const todo = await addTodo("보고서", r.category.id);
      expect(todo.categoryId).toBe(r.category.id);
      expect((await listTodos())[0].categoryId).toBe(r.category.id);
    });

    it("카테고리를 고르지 않으면 미분류(null)다", async () => {
      expect((await addTodo("그냥 할 일")).categoryId).toBeNull();
    });

    it("존재하지 않는 카테고리를 주고 추가하면 미분류로 저장된다", async () => {
      expect((await addTodo("할 일", "없는-카테고리")).categoryId).toBeNull();
    });

    it("카테고리를 삭제해도 그 할 일은 남고 미분류가 된다", async () => {
      const r = await addCategory("업무");
      const other = await addCategory("공부");
      if (!r.ok || !other.ok) throw new Error("카테고리 생성 실패");
      const a = await addTodo("A", r.category.id);
      const b = await addTodo("B", other.category.id);
      await deleteCategory(r.category.id);
      const todos = await listTodos();
      expect(todos.map((t) => t.title)).toEqual(["A", "B"]);
      expect(todos.find((t) => t.id === a.id)?.categoryId).toBeNull();
      expect(todos.find((t) => t.id === b.id)?.categoryId).toBe(other.category.id);
      expect((await listCategories()).map((c) => c.name)).toEqual(["공부"]);
    });

    it("없는 카테고리를 삭제해도 오류 없이 무시된다", async () => {
      await addCategory("업무");
      await deleteCategory("없는-id");
      expect(await listCategories()).toHaveLength(1);
    });

    it("카테고리 기능 이전에 저장된 할 일(categoryId 없음)은 미분류로 읽힌다", async () => {
      localStorage.setItem(
        "my-todo:todos",
        JSON.stringify([
          { id: "old", title: "옛날 할 일", completed: false, createdAt: "2025-01-01T00:00:00.000Z" },
        ]),
      );
      const [todo] = await listTodos();
      expect(todo.title).toBe("옛날 할 일");
      expect(todo.categoryId).toBeNull();
    });

    it("존재하지 않는 카테고리를 가리키는 할 일은 오류 없이 미분류로 읽힌다", async () => {
      localStorage.setItem(
        "my-todo:todos",
        JSON.stringify([
          {
            id: "x",
            title: "고아",
            completed: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            categoryId: "사라진-카테고리",
          },
        ]),
      );
      expect((await listTodos())[0].categoryId).toBeNull();
    });
  });

  describe("카테고리 변경", () => {
    async function makeCategory(name: string) {
      const r = await addCategory(name);
      if (!r.ok) throw new Error("카테고리 생성 실패");
      return r.category;
    }

    it("할 일의 카테고리를 다른 카테고리로 바꾼다", async () => {
      const work = await makeCategory("업무");
      const study = await makeCategory("공부");
      const todo = await addTodo("보고서", work.id);
      await updateTodoCategory(todo.id, study.id);
      expect((await listTodos())[0].categoryId).toBe(study.id);
    });

    it("미분류에서 카테고리로, 카테고리에서 미분류로 바꿀 수 있다", async () => {
      const work = await makeCategory("업무");
      const todo = await addTodo("보고서");
      await updateTodoCategory(todo.id, work.id);
      expect((await listTodos())[0].categoryId).toBe(work.id);
      await updateTodoCategory(todo.id, null);
      expect((await listTodos())[0].categoryId).toBeNull();
    });

    it("카테고리를 바꿔도 제목, 완료 여부, 생성 시각이 그대로다", async () => {
      const work = await makeCategory("업무");
      const todo = await addTodo("보고서");
      await toggleTodo(todo.id);
      await updateTodoCategory(todo.id, work.id);
      expect((await listTodos())[0]).toEqual({
        ...todo,
        completed: true,
        categoryId: work.id,
      });
    });

    it("카테고리를 바꿔도 목록 순서가 바뀌지 않는다", async () => {
      const work = await makeCategory("업무");
      const a = await addTodo("A");
      await new Promise((r) => setTimeout(r, 5));
      const b = await addTodo("B");
      await new Promise((r) => setTimeout(r, 5));
      const c = await addTodo("C");
      await updateTodoCategory(a.id, work.id);
      expect((await listTodos()).map((t) => t.id)).toEqual([a.id, b.id, c.id]);
    });

    it("존재하지 않는 카테고리로 바꾸면 미분류가 된다", async () => {
      const work = await makeCategory("업무");
      const todo = await addTodo("보고서", work.id);
      await updateTodoCategory(todo.id, "없는-카테고리");
      expect((await listTodos())[0].categoryId).toBeNull();
    });

    it("없는 할 일 id는 오류 없이 무시된다", async () => {
      const work = await makeCategory("업무");
      const todo = await addTodo("보고서");
      await updateTodoCategory("없는-id", work.id);
      expect(await listTodos()).toEqual([todo]);
    });

    it("바꾼 카테고리가 저장소에 남아 있다(새로고침 후에도 유지)", async () => {
      const work = await makeCategory("업무");
      const todo = await addTodo("보고서");
      await updateTodoCategory(todo.id, work.id);
      const raw = JSON.parse(localStorage.getItem("my-todo:todos") ?? "[]");
      expect(raw[0].categoryId).toBe(work.id);
    });
  });
});
