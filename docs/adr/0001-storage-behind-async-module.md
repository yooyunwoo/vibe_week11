# 저장 코드는 하나의 비동기 모듈 뒤에 둔다

지금은 localStorage에 저장하지만 나중에 Turso(SQLite)로 바꿀 예정이다. 그래서 저장 코드는 `app/lib/todo-storage.ts` 한 파일에만 두고, 모든 함수(`listTodos`, `addTodo`, `toggleTodo`, `deleteTodo`)를 localStorage가 동기식이어도 **async**로 만든다. UI는 localStorage를 직접 만지지 않는다. Todo의 `id`는 자동 증가 숫자가 아니라 문자열 UUID로 하여 두 저장소에서 똑같이 동작하게 한다.

## Consequences

- Turso 인증 정보는 서버에만 있어야 하므로, 전환 시 저장 함수를 서버 라우트나 Server Action 뒤로 옮기고 UI에서는 그 호출로 바꿔야 한다. 현재의 Client Component(`"use client"`)에서 저장 모듈을 직접 부르는 구조는 임시다.
- 타입과 함수 시그니처에는 브라우저 전용 요소를 넣지 않는다.
