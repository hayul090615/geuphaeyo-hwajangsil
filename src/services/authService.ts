import type { SignUpInput, User } from '../types/auth';

const USERS_KEY = 'geuphaeyo-users';
const SESSION_KEY = 'geuphaeyo-session';
type StoredUser = User & { password: string };

function readUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as StoredUser[]; } catch { return []; }
}

export function getCurrentUser(): User | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as User | null; } catch { return null; }
}

export function signUp(input: SignUpInput): User {
  const users = readUsers();
  if (users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) throw new Error('이미 가입된 이메일입니다.');
  if (users.some((user) => user.nickname.toLowerCase() === input.nickname.toLowerCase())) throw new Error('이미 사용 중인 닉네임입니다.');
  const user: StoredUser = { id: crypto.randomUUID(), ...input };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  return user;
}

export function signIn(nickname: string, password: string): User {
  const user = readUsers().find((item) => item.nickname.toLowerCase() === nickname.trim().toLowerCase() && item.password === password);
  if (!user) throw new Error('닉네임 또는 비밀번호를 확인해 주세요.');
  const session: User = { id: user.id, email: user.email, nickname: user.nickname };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function signInWithGoogle(credential: string): Promise<User> {
  const defaultApiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://geuphaeyo-hwajangsil-api.onrender.com';
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || defaultApiUrl).replace(/\/$/, '');
  const response = await fetch(`${apiBaseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const body = await response.json().catch(() => null) as (User & { message?: string }) | null;
  if (!response.ok || !body) throw new Error(body?.message || 'Google 로그인에 실패했습니다.');
  const user: User = { id: body.id, email: body.email, nickname: body.nickname };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function signOut() { sessionStorage.removeItem(SESSION_KEY); }
