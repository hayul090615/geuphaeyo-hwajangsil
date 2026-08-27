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

type GoogleIdTokenPayload = {
  sub?: string;
  email?: string;
  name?: string;
  aud?: string;
  exp?: number;
  iss?: string;
  email_verified?: boolean;
};

function decodeGoogleIdToken(credential: string): GoogleIdTokenPayload {
  const payload = credential.split(".")[1];
  if (!payload) throw new Error("Google 로그인 응답이 올바르지 않습니다.");

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = decodeURIComponent(
      Array.from(atob(normalized), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
    );
    return JSON.parse(decoded) as GoogleIdTokenPayload;
  } catch {
    throw new Error("Google 계정 정보를 확인하지 못했습니다.");
  }
}

export function signInWithGoogleCredential(credential: string): User {
  const payload = decodeGoogleIdToken(credential);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  const hasValidIssuer = payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com";
  if (!payload.sub || !payload.email || payload.email_verified !== true || payload.aud !== clientId || !hasValidIssuer) {
    throw new Error("Google 로그인 정보를 확인하지 못했습니다.");
  }
  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    throw new Error("Google 로그인 시간이 만료되었습니다. 다시 시도해주세요.");
  }

  const session: User = {
    id: `google:${payload.sub}`,
    email: payload.email,
    nickname: payload.name?.trim() || payload.email.split("@")[0],
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOut() { localStorage.removeItem(SESSION_KEY); }
