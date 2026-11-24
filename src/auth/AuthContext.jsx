import {createContext, useContext, useEffect, useState} from "react";
import {HOOK_DETECTION_API} from "../config/cameras";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Development-only escape hatch for running the UI without the detector service.
// Set VITE_MOCK_AUTH=false to force the real authentication API in a dev build.
const MOCK_AUTH = import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH !== "false";
const MOCK_USER = {license_id: "NMDC_Admin", role: "admin", display_name: "Demo administrator"};

export async function authRequest(path, body) {
  if (MOCK_AUTH) {
    if (path === "session") {
      const loggedIn = window.localStorage.getItem("nmdc-mock-auth") === "true";
      return {user: loggedIn ? MOCK_USER : null, setup_required: false};
    }
    if (path === "login" || path === "setup") {
      if (body?.license_id !== "NMDC_Admin" || body?.password !== "admin_nmdc") {
        throw new Error("Mock login: use NMDC_Admin / admin_nmdc.");
      }
      window.localStorage.setItem("nmdc-mock-auth", "true");
      return {user: MOCK_USER};
    }
    if (path === "logout") {
      window.localStorage.removeItem("nmdc-mock-auth");
      return {};
    }
    if (path === "accounts") return {user: MOCK_USER};
  }
  const response = await fetch(`${HOOK_DETECTION_API}/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    headers: body === undefined ? {} : {"Content-Type": "application/json"},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed. Please try again.");
  return result;
}

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [aiToken, setAiToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const result = await authRequest("session");
      setUser(result.user);
      if (!result.user) setAiToken(null);
      setSetupRequired(result.setup_required);
      setError("");
    } catch {
      setUser(null);
      setAiToken(null);
      setError("Cannot reach the login service. Check that the detector is running.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60000);
    const expired = () => {
      if (!MOCK_AUTH) { setUser(null); setAiToken(null); }
    };
    window.addEventListener("session-expired", expired);
    return () => { clearInterval(timer); window.removeEventListener("session-expired", expired); };
  }, []);
  async function login(licenseId, password) {
    const result = await authRequest(setupRequired ? "setup" : "login", {license_id: licenseId, password});
    setAiToken(null);
    setUser(result.user);
    setSetupRequired(false);
    setError("");
  }
  async function logout() {
    await authRequest("logout", {});
    setUser(null);
    setAiToken(null);
  }
  return <AuthContext.Provider value={{user, aiToken, setAiToken, loading, setupRequired, error, login, logout, refresh}}>{children}</AuthContext.Provider>;
}
