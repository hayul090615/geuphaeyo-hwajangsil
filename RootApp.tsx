import { useState } from "react";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import { getCurrentUser } from "./services/authService";
import type { User } from "./types/auth";

export default function RootApp() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  if (!user) return <Auth mode={authMode} onModeChange={setAuthMode} onSuccess={setUser} />;
  return <Home />;
}
