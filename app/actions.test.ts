// 서버 함수의 바깥에서 보이는 동작만 확인한다: 무엇을 보내면 어떤 최신 목록이 돌아오는지.
// 인터넷 없이 로컬(메모리) 데이터베이스를 쓰고, 각 테스트는 빈 데이터베이스로 시작한다.
import { createClient } from "@libsql/client";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addCategoryAction,
  addTodoAction,
  deleteCategoryAction,
  deleteCompletedAction,
  deleteTodoAction,
  loadSnapshot,
  toggleTodoAction,
  updateTodoAction,
} from "./actions";
import { useDb } from "./lib/server/db";

beforeEach(async () => {
  await useDb(createClient({ url: ":memory:" }));
});

describe("서버 함수", () => {
  it("처음에는 빈 목록을 돌려준다", async () => {
    expect(await loadSnapshot()).toEqual({ todos: [], categories: [] });
  });

  it("변경 함수는 변경 뒤의 최신 목록을 돌려준다", async () => {
    const afterAdd = await addTodoAction("우유 사기", null);
    expect(afterAdd.todos.map((t) => t.title)).toEqual(["우유 사기"]);
    const id = afterAdd.todos[0].id;

    const afterToggle = await toggleTodoAction(id);
    expect(afterToggle.todos[0].completed).toBe(true);

    const afterDelete = await deleteTodoAction(id);
    expect(afterDelete.todos).toEqual([]);
  });

  it("완료한 일 지우기는 완료된 것만 지우고 남은 목록을 돌려준다", async () => {
    await addTodoAction("A", null);
    const { todos } = await addTodoAction("B", null);
    await toggleTodoAction(todos[0].id);
    const after = await deleteCompletedAction();
    expect(after.todos.map((t) => t.title)).toEqual(["B"]);
  });

  it("카테고리 추가는 성공하면 새 카테고리가 담긴 목록을 돌려준다", async () => {
    const { result, snapshot } = await addCategoryAction("  업무 ");
    expect(result.ok).toBe(true);
    expect(snapshot.categories.map((c) => c.name)).toEqual(["업무"]);
  });

  it("빈 이름과 중복 이름은 오류가 아니라 거부 결과로 돌려준다", async () => {
    await addCategoryAction("Work");
    expect((await addCategoryAction("   ")).result).toEqual({ ok: false, reason: "empty" });
    expect((await addCategoryAction("work")).result).toEqual({ ok: false, reason: "duplicate" });
    expect((await loadSnapshot()).categories).toHaveLength(1);
  });

  it("제목과 카테고리를 한 번에 수정한다", async () => {
    const { snapshot } = await addCategoryAction("업무");
    const work = snapshot.categories[0];
    const { todos } = await addTodoAction("오타", null);
    const after = await updateTodoAction(todos[0].id, "  고친 제목 ", work.id);
    expect(after.todos[0]).toMatchObject({ title: "고친 제목", categoryId: work.id });
  });

  it("빈 제목으로 수정하면 제목은 유지하고 카테고리만 바뀐다", async () => {
    const { snapshot } = await addCategoryAction("업무");
    const work = snapshot.categories[0];
    const { todos } = await addTodoAction("원래", null);
    const after = await updateTodoAction(todos[0].id, "   ", work.id);
    expect(after.todos[0]).toMatchObject({ title: "원래", categoryId: work.id });
  });

  it("카테고리를 지우면 그 할 일은 남고 미분류가 된다", async () => {
    const { snapshot } = await addCategoryAction("업무");
    const work = snapshot.categories[0];
    await addTodoAction("보고서", work.id);
    const after = await deleteCategoryAction(work.id);
    expect(after.categories).toEqual([]);
    expect(after.todos.map((t) => [t.title, t.categoryId])).toEqual([["보고서", null]]);
  });

  it("직접 보낸 잘못된 값(문자열이 아닌 값)은 저장하지 않고 거부한다", async () => {
    // 화면을 거치지 않은 요청을 흉내 낸다
    const bad = (value: unknown) => value as string;
    await expect(addTodoAction(bad(123), null)).rejects.toThrow();
    await expect(addTodoAction("제목", bad(5))).rejects.toThrow();
    await expect(toggleTodoAction(bad({}))).rejects.toThrow();
    await expect(deleteTodoAction(bad(undefined))).rejects.toThrow();
    await expect(updateTodoAction("id", bad(null), null)).rejects.toThrow();
    await expect(addCategoryAction(bad(1))).rejects.toThrow();
    await expect(deleteCategoryAction(bad([]))).rejects.toThrow();
    expect(await loadSnapshot()).toEqual({ todos: [], categories: [] });
  });
});
