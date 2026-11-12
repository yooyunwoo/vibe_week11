// 데이터베이스 저장 모듈의 바깥에서 보이는 동작만 확인한다. (함수를 호출하고 조회 결과를 본다)
// 인터넷 없이 로컬(메모리) 데이터베이스를 쓰고, 각 테스트는 빈 데이터베이스로 시작한다.
import { createClient } from "@libsql/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ensureSchema, getDb, useDb } from "./db";
import {
  addCategory,
  addTodo,
  deleteCategory,
  deleteCompletedTodos,
  deleteTodo,
  listCategories,
  listTodos,
  toggleTodo,
  updateTodoCategory,
  updateTodoTitle,
} from "./todo-store";

beforeEach(async () => {
  await useDb(createClient({ url: ":memory:" }));
});

async function makeCategory(name: string) {
  const r = await addCategory(name);
  if (!r.ok) throw new Error("카테고리 생성 실패");
  return r.category;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("todo-store: 할 일", () => {
  it("저장된 데이터가 없으면 빈 목록을 돌려준다", async () => {
    expect(await listTodos()).toEqual([]);
  });

  it("할 일을 추가하면 미완료 상태로 목록에 나타난다", async () => {
    const todo = await addTodo("우유 사기");
    expect(todo).toMatchObject({
      title: "우유 사기",
      completed: false,
      categoryId: null,
    });
    expect(typeof todo.id).toBe("string");
    expect(await listTodos()).toEqual([todo]);
  });

  it("목록은 오래된 것부터 정렬된다", async () => {
    const first = await addTodo("첫째");
    await wait(5);
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
});

describe("todo-store: 제목 수정", () => {
  it("제목만 바꾸고 id, 완료 여부, 생성 시각은 그대로 둔다", async () => {
    const todo = await addTodo("오타");
    await toggleTodo(todo.id);
    await updateTodoTitle(todo.id, "고친 제목");
    const [saved] = await listTodos();
    expect(saved).toEqual({ ...todo, title: "고친 제목", completed: true });
  });

  it("수정해도 목록 순서가 바뀌지 않는다", async () => {
    const a = await addTodo("A");
    await wait(5);
    const b = await addTodo("B");
    await wait(5);
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
});

describe("todo-store: 카테고리", () => {
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

  it("할 일을 추가할 때 카테고리를 고르면 그 카테고리로 저장된다", async () => {
    const work = await makeCategory("업무");
    const todo = await addTodo("보고서", work.id);
    expect(todo.categoryId).toBe(work.id);
    expect((await listTodos())[0].categoryId).toBe(work.id);
  });

  it("카테고리를 고르지 않으면 미분류(null)다", async () => {
    expect((await addTodo("그냥 할 일")).categoryId).toBeNull();
  });

  it("존재하지 않는 카테고리를 주고 추가하면 미분류로 저장된다", async () => {
    const todo = await addTodo("할 일", "없는-카테고리");
    expect(todo.categoryId).toBeNull();
    expect((await listTodos())[0].categoryId).toBeNull();
  });

  it("카테고리를 삭제해도 그 할 일은 남고 미분류가 된다", async () => {
    const work = await makeCategory("업무");
    const study = await makeCategory("공부");
    const a = await addTodo("A", work.id);
    const b = await addTodo("B", study.id);
    await deleteCategory(work.id);
    const todos = await listTodos();
    expect(todos.map((t) => t.title)).toEqual(["A", "B"]);
    expect(todos.find((t) => t.id === a.id)?.categoryId).toBeNull();
    expect(todos.find((t) => t.id === b.id)?.categoryId).toBe(study.id);
    expect((await listCategories()).map((c) => c.name)).toEqual(["공부"]);
  });

  it("없는 카테고리를 삭제해도 오류 없이 무시된다", async () => {
    await addCategory("업무");
    await deleteCategory("없는-id");
    expect(await listCategories()).toHaveLength(1);
  });

  it("데이터베이스 수준에서도 카테고리 행을 지우면 Todo의 카테고리가 비워진다(외래 키)", async () => {
    const work = await makeCategory("업무");
    const todo = await addTodo("보고서", work.id);
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [work.id] });
    expect((await listTodos()).find((t) => t.id === todo.id)?.categoryId).toBeNull();
  });
});

describe("todo-store: 카테고리 변경", () => {
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
    await wait(5);
    const b = await addTodo("B");
    await wait(5);
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
});

describe("todo-store: 저장 유지와 표 만들기", () => {
  it("연결을 닫고 다시 열어도(새로고침처럼) 데이터가 남아 있다", async () => {
    const dir = mkdtempSync(join(tmpdir(), "todo-db-"));
    const url = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;
    const first = createClient({ url });
    const second = createClient({ url });
    try {
      await useDb(first);
      const work = await makeCategory("업무");
      const todo = await addTodo("남아 있어야 함", work.id);
      first.close();

      await useDb(second);
      expect(await listTodos()).toEqual([todo]);
      expect((await listCategories()).map((c) => c.name)).toEqual(["업무"]);
    } finally {
      // Windows에서는 파일을 열고 있으면 지울 수 없으므로 연결을 먼저 닫는다
      first.close();
      second.close();
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Windows는 닫은 직후에도 파일이 잠겨 있을 수 있다. 운영체제 임시 폴더라 남겨 둬도 된다.
      }
    }
  });

  it("표 만들기를 여러 번 해도 기존 데이터를 건드리지 않는다", async () => {
    const todo = await addTodo("그대로");
    const db = await getDb();
    await ensureSchema(db);
    await ensureSchema(db);
    expect(await listTodos()).toEqual([todo]);
  });
});
