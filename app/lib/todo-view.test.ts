// 화면용 순수 함수는 입력과 출력만 확인한다.
import { describe, expect, it } from "vitest";
import type { Todo } from "./todo-storage";
import {
  ALL_CATEGORIES,
  countRemaining,
  getEmptyMessage,
  getVisibleTodos,
  shouldShowEmptyMessage,
  UNCATEGORIZED,
} from "./todo-view";

function todo(
  id: string,
  completed: boolean,
  categoryId: string | null = null,
): Todo {
  return {
    id,
    title: id,
    completed,
    createdAt: "2026-01-01T00:00:00.000Z",
    categoryId,
  };
}

describe("todo-view", () => {
  it("필터를 주지 않으면 전체를 같은 순서로 보여준다", () => {
    const todos = [todo("a", false), todo("b", true), todo("c", false)];
    expect(getVisibleTodos(todos)).toEqual(todos);
  });

  it("빈 목록은 빈 목록으로 보여준다", () => {
    expect(getVisibleTodos([])).toEqual([]);
  });

  it("남은 할 일 개수는 완료되지 않은 것만 센다", () => {
    expect(countRemaining([todo("a", false), todo("b", true), todo("c", false)])).toBe(2);
  });

  it("모두 완료되었거나 목록이 비면 남은 개수는 0이다", () => {
    expect(countRemaining([todo("a", true)])).toBe(0);
    expect(countRemaining([])).toBe(0);
  });

  it("할 일이 하나도 없을 때만 빈 목록 안내를 보여준다", () => {
    expect(shouldShowEmptyMessage([])).toBe(true);
    expect(shouldShowEmptyMessage([todo("a", false)])).toBe(false);
    // 완료된 것만 있어도 목록이 비어 있지 않으므로 안내는 보이지 않는다
    expect(shouldShowEmptyMessage([todo("a", true)])).toBe(false);
  });

  describe("상태 필터", () => {
    const todos = [todo("a", false), todo("b", true), todo("c", false), todo("d", true)];

    it("전체는 모든 할 일을 같은 순서로 보여준다", () => {
      expect(getVisibleTodos(todos, "all").map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
    });

    it("남은 것은 완료되지 않은 것만 순서대로 보여준다", () => {
      expect(getVisibleTodos(todos, "active").map((t) => t.id)).toEqual(["a", "c"]);
    });

    it("완료는 완료된 것만 순서대로 보여준다", () => {
      expect(getVisibleTodos(todos, "completed").map((t) => t.id)).toEqual(["b", "d"]);
    });

    it("필터를 바꿔도 남은 할 일 개수는 전체 기준이라 변하지 않는다", () => {
      expect(countRemaining(todos)).toBe(2);
      // 개수는 필터와 무관하게 전체 목록으로 계산한다
      expect(countRemaining(getVisibleTodos(todos, "completed"))).toBe(0);
    });
  });

  describe("빈 목록 안내 문구", () => {
    it("저장된 할 일이 없으면 어떤 필터에서든 추가를 권한다", () => {
      for (const f of ["all", "active", "completed"] as const) {
        expect(getEmptyMessage([], f)).toBe("할 일이 없어요. 하나 추가해 보세요!");
      }
    });

    it("남은 것 필터에 보여줄 게 없으면 남은 할 일이 없다고 알려준다", () => {
      expect(getEmptyMessage([todo("a", true)], "active")).toBe("남은 할 일이 없어요!");
    });

    it("완료 필터에 보여줄 게 없으면 완료한 할 일이 없다고 알려준다", () => {
      expect(getEmptyMessage([todo("a", false)], "completed")).toBe("완료한 할 일이 없어요");
    });

    it("보여줄 할 일이 있으면 안내가 없다", () => {
      expect(getEmptyMessage([todo("a", false)], "all")).toBeNull();
      expect(getEmptyMessage([todo("a", false)], "active")).toBeNull();
      expect(getEmptyMessage([todo("a", true)], "completed")).toBeNull();
    });
  });

  describe("카테고리 필터", () => {
    // 업무: a(남은), b(완료) / 공부: c(남은) / 미분류: d(완료), e(남은)
    const todos = [
      todo("a", false, "work"),
      todo("b", true, "work"),
      todo("c", false, "study"),
      todo("d", true),
      todo("e", false),
    ];
    const ids = (list: Todo[]) => list.map((t) => t.id);

    it("전체는 카테고리와 상관없이 모두 보여준다", () => {
      expect(ids(getVisibleTodos(todos, "all", ALL_CATEGORIES))).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("필터를 주지 않으면 카테고리 필터는 전체다", () => {
      expect(ids(getVisibleTodos(todos, "all"))).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("미분류는 카테고리가 없는 것만 보여준다", () => {
      expect(ids(getVisibleTodos(todos, "all", UNCATEGORIZED))).toEqual(["d", "e"]);
    });

    it("특정 카테고리는 그 카테고리의 것만 순서대로 보여준다", () => {
      expect(ids(getVisibleTodos(todos, "all", "work"))).toEqual(["a", "b"]);
      expect(ids(getVisibleTodos(todos, "all", "study"))).toEqual(["c"]);
    });

    it("상태 필터와 함께(AND) 적용된다", () => {
      expect(ids(getVisibleTodos(todos, "active", "work"))).toEqual(["a"]);
      expect(ids(getVisibleTodos(todos, "completed", "work"))).toEqual(["b"]);
      expect(ids(getVisibleTodos(todos, "active", UNCATEGORIZED))).toEqual(["e"]);
      expect(ids(getVisibleTodos(todos, "completed", "study"))).toEqual([]);
    });

    it("존재하지 않는 카테고리를 고르면 아무것도 보이지 않는다", () => {
      expect(getVisibleTodos(todos, "all", "없는-카테고리")).toEqual([]);
    });

    it("두 필터를 바꿔도 남은 할 일 개수는 전체 기준이다", () => {
      expect(countRemaining(todos)).toBe(3);
    });

    it("보여줄 게 없을 때 알맞은 빈 목록 안내를 준다", () => {
      expect(getEmptyMessage(todos, "all", "없는-카테고리")).toBe("이 카테고리에는 할 일이 없어요");
      expect(getEmptyMessage([todo("a", false, "work")], "all", UNCATEGORIZED)).toBe("미분류 할 일이 없어요");
      expect(getEmptyMessage(todos, "completed", "study")).toBe("완료한 할 일이 없어요");
      expect(getEmptyMessage([todo("a", true, "work")], "active", "work")).toBe("남은 할 일이 없어요!");
    });

    it("보여줄 게 있거나 할 일이 아예 없을 때의 안내는 기존과 같다", () => {
      expect(getEmptyMessage(todos, "all", "work")).toBeNull();
      expect(getEmptyMessage([], "all", "work")).toBe("할 일이 없어요. 하나 추가해 보세요!");
    });
  });
});
