# my-todo

혼자 쓰는 할 일 목록 웹앱. 할 일을 추가하고, 완료 표시하고, 삭제하고, 남은 개수를 본다.

## Language

**Todo (할 일)**:
사용자가 해야 할 일 하나. 제목, 완료 여부, 생성 시각을 가진다.
_Avoid_: Task, Item, 항목

**Todo 목록**:
저장된 모든 Todo의 단일 평면 모음. 여러 목록으로 나뉘지 않으며, 분류는 카테고리로 한다.
_Avoid_: List(별개 엔티티로서), Project

**완료 (Completed)**:
Todo가 끝났다고 표시된 상태. 체크를 다시 눌러 되돌릴 수 있다.
_Avoid_: Done, Checked

**삭제 (Delete)**:
Todo를 영구히 지우는 것. 휴지통이나 되돌리기는 없다.
_Avoid_: Archive, Soft delete

**남은 할 일 개수 (Remaining count)**:
완료되지 않은 Todo의 수. 화면에서 계산하며 따로 저장하지 않는다.
_Avoid_: Total, 전체 개수

**필터 (Filter)**:
Todo 목록 중 전체 / 남은 것 / 완료 가운데 무엇을 보여줄지 고르는 화면 상태. 저장하지 않으며 앱을 열면 "전체"로 시작한다.
_Avoid_: 정렬, 검색

**카테고리 (Category)**:
사용자가 직접 만든, 이름 붙은 Todo 분류(예: 업무, 공부). Todo는 카테고리를 최대 하나만 가진다.
_Avoid_: 태그(여러 개를 붙이는 방식), 폴더, 목록

**미분류 (Uncategorized)**:
카테고리가 없는 Todo의 상태. 카테고리를 삭제하면 그 Todo는 미분류가 된다.
_Avoid_: 기타, 없음

**카테고리 필터 (Category filter)**:
Todo 목록에서 전체 / 미분류 / 특정 카테고리 중 무엇을 보여줄지 고르는 화면 상태. 필터와 함께 적용되며 저장하지 않는다.
_Avoid_: 폴더 이동
