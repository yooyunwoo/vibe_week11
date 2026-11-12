// 데이터베이스 표를 만드는 명령: npm run db:setup
// 이미 표가 있으면 아무것도 바꾸지 않는다.
// 접속 주소를 정하지 않으면 로컬 파일(data/todo.db)에 만든다.

import { getDb } from "../app/lib/server/db.ts";

const url = process.env.TURSO_DATABASE_URL || "file:data/todo.db";
// 비밀 키는 출력하지 않는다. 접속 주소만 알려 준다.
console.log(`데이터베이스 준비 중: ${url}`);

const db = await getDb(); // 연결하면서 표도 만든다
const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('todos', 'categories') ORDER BY name",
);
console.log(`준비 완료. 표: ${tables.rows.map((r) => r.name).join(", ")}`);
db.close();
