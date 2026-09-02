import { useCallback, useState, type FormEvent } from "react";
import GoogleSignInButton from "../components/GoogleSignInButton";
import type { User } from "../types/auth";
import { signIn, signInWithGoogleCredential, signUp } from "../services/authService";

type AuthProps = { mode: "login" | "signup"; onModeChange: (mode: "login" | "signup") => void; onSuccess: (user: User) => void };

export default function Auth({ mode, onModeChange, onSuccess }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError("");
    setIsGoogleSigningIn(true);
    try {
      onSuccess(await signInWithGoogleCredential(credential));
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "Google 로그인에 실패했습니다.");
    } finally {
      setIsGoogleSigningIn(false);
    }
  }, [onSuccess]);

  const handleGoogleError = useCallback((message: string) => setError(message), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!email.includes("@")) return setError("올바른 이메일을 입력해주세요.");
    if (password.length < 8) return setError("비밀번호는 8자 이상 입력해주세요.");
    try {
      const user = mode === "login" ? await signIn(email, password) : await signUp({ email, password, nickname: nickname.trim() });
      onSuccess(user);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "잠시 후 다시 시도해주세요."); }
  }

  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title">
    <a className="auth-brand" href="/" onClick={(event) => { event.preventDefault(); onModeChange("login"); }}>니똥칼라똥</a>
    <p className="auth-eyebrow">내 주변 화장실을 더 빠르게</p>
    <h1 id="auth-title">{mode === "login" ? "다시 만나서 반가워요" : "처음 오셨군요"}</h1>
    <p className="auth-description">{mode === "login" ? "로그인하고 가까운 화장실을 찾아보세요." : "간단한 정보만 입력하고 시작해보세요."}</p>
    <form className="auth-form" onSubmit={handleSubmit}>
      {mode === "signup" && <label>닉네임<input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="사용할 닉네임" required /></label>}
      <label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
      <label>비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" minLength={8} required /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit">{mode === "login" ? "로그인" : "회원가입"}</button>
    </form>
    <div className="auth-divider"><span>또는</span></div>
    <GoogleSignInButton onCredential={handleGoogleCredential} onError={handleGoogleError} />
    {isGoogleSigningIn && <p className="google-auth-status" role="status">Google 계정을 확인하는 중입니다...</p>}
    <p className="auth-switch">{mode === "login" ? "아직 계정이 없나요?" : "이미 계정이 있나요?"} <button type="button" onClick={() => { setError(""); onModeChange(mode === "login" ? "signup" : "login"); }}>{mode === "login" ? "회원가입" : "로그인"}</button></p>
    <p className="auth-note">Google 로그인 정보는 서버에서 검증한 뒤 안전하게 저장됩니다.</p>
  </section></main>;
}
