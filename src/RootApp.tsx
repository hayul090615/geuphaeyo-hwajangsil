import { useState } from "react";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Service from "./pages/Service";
import { getCurrentUser, signOut } from "./services/authService";
import type { User } from "./types/auth";
import type { Toilet } from "./types/toilet";

type AppView = "map" | "auth" | "service";

export default function RootApp() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [view, setView] = useState<AppView>("map");
  const [mapTarget, setMapTarget] = useState<Toilet | null>(null);
  if (view === "auth") {
    return (
      <Auth
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          setView("service");
        }}
      />
    );
  }
  if (view === "service") {
    return (
      <Service
        onBack={() => setView("map")}
        onShowOnMap={(toilet) => {
          setMapTarget(toilet);
          setView("map");
        }}
        onLogout={() => { signOut(); setUser(null); setAuthMode("login"); setView("map"); }}
      />
    );
  }
  return <Home onServiceOpen={() => setView(user ? "service" : "auth")} mapTarget={mapTarget} />;
}
