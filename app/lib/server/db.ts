// 데이터베이스 연결. 서버에서만 쓴다. (docs/adr/0001 참고, 브라우저 코드에서 가져오지 않는다)
// 접속 주소는 환경 변수에서만 받는다. 없으면 이 프로젝트 안의 로컬 파일 데이터베이스를 쓴다.
// 같은 라이브러리로 로컬 파일과 Turso 원격 데이터베이스를 모두 열 수 있다.

import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_URL = "file:data/todo.db";

// 로컬 파일 데이터베이스는 폴더가 없으면 열 수 없으므로 먼저 만들어 둔다
function ensureLocalFolder(url: string): void {
  if (!url.startsWith("file:") || url.includes(":memory:")) return;
  mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
}

// 표 만들기. 이미 있으면 아무것도 바꾸지 않는다. (ADR-0002의 구조)
// - 카테고리를 지우면 그 Todo의 category_id가 자동으로 비워진다(미분류)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS categories (
     id   TEXT PRIMARY KEY,
     name TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS todos (
     id          TEXT PRIMARY KEY,
     title       TEXT NOT NULL,
     completed   INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL,
     category_id TEXT REFERENCES categories(id) ON DELETE SET NULL
   )`,
];

export async function ensureSchema(client: Client): Promise<void> {
  // SQLite는 외래 키 검사가 기본으로 꺼져 있어서 연결마다 켠다
  await client.execute("PRAGMA foreign_keys = ON");
  await client.batch(SCHEMA, "write");
}

let current: Client | null = null;
let ready: Promise<void> | null = null;

// 현재 연결을 돌려준다. 처음 부를 때 연결을 만들고 표도 준비한다.
export async function getDb(): Promise<Client> {
  if (!current) {
    const url = process.env.TURSO_DATABASE_URL || DEFAULT_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
    ensureLocalFolder(url);
    current = createClient({ url, authToken });
    ready = ensureSchema(current);
  }
  await ready;
  return current;
}

// 테스트에서 빈 데이터베이스로 갈아 끼울 때 쓴다
export async function useDb(client: Client): Promise<void> {
  current = client;
  ready = ensureSchema(client);
  await ready;
}
