import type { SignUpInput, User } from "../types/auth";

const USERS_KEY = "geuphaeyo-users";
const SESSION_KEY = "geuphaeyo-session";
type StoredUser = User & { password: string };

function readUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[]; } catch { return []; }
}

export function getCurrentUser(): User | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as User | null; } catch { return null; }
}

export function signUp(input: SignUpInput): User {
  const users = readUsers();
  if (users.some((user) => user.email === input.email)) throw new Error("이미 가입된 이메일입니다.");
  const user: StoredUser = { id: crypto.randomUUID(), ...input };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  return user;
}

export function signIn(email: string, password: string): User {
  const user = readUsers().find((item) => item.email === email && item.password === password);
  if (!user) throw new Error("이메일 또는 비밀번호를 확인해주세요.");
  const session: User = { id: user.id, email: user.email, nickname: user.nickname };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOut() { localStorage.removeItem(SESSION_KEY); }
