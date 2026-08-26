import { useState } from "react";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import { signOut } from "./services/authService";
import type { User } from "./types/auth";

export default function RootApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  if (!user) return <Auth mode={authMode} onModeChange={setAuthMode} onSuccess={setUser} />;
  return <Home onLogout={() => { signOut(); setUser(null); setAuthMode("login"); }} />;
}
