# 카테고리는 Todo와 별도 목록으로 저장한다

카테고리는 `id`(문자열 UUID)와 `name`을 가진 별도 목록(localStorage 키 `my-todo:categories`)으로 저장하고, Todo는 `categoryId`(문자열 UUID 또는 null)로 가리킨다. 카테고리 이름을 Todo마다 복사하면 이름 중복 검사와 삭제 처리가 어렵고, 나중에 Turso에서 `categories` 테이블과 외래 키로 옮기기도 어렵기 때문이다. 카테고리 기능 이전에 저장된 Todo에는 `categoryId`가 없으므로 읽을 때 없으면 null(미분류)로 취급하고, 별도의 데이터 이전은 하지 않는다.

## Considered Options

- Todo마다 카테고리 이름 문자열을 저장: 단순하지만 이름 중복·삭제 처리가 어렵고 Turso에서 정규화된 테이블로 옮기기 어려워 채택하지 않았다.

## Consequences

- 카테고리를 삭제하면 해당 Todo의 `categoryId`를 null로 되돌려야 한다(Todo는 삭제하지 않는다). Turso에서는 외래 키의 `ON DELETE SET NULL`에 해당한다.
- ADR-0001을 따라 모든 카테고리 저장 함수는 async이고 `todo-storage` 모듈 안에만 둔다.
