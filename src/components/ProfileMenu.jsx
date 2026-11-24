import {useEffect, useRef, useState} from "react";
import {UserRound, LogOut, Plus, X} from "lucide-react";
import {authRequest, useAuth} from "../auth/AuthContext";

export default function ProfileMenu() {
  const {user, logout} = useAuth();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [licenseId, setLicenseId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const root = useRef(null);
  const dialog = useRef(null);
  useEffect(() => {
    const dismiss = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const key = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => {
    if (adding) dialog.current?.showModal();
    else dialog.current?.close();
  }, [adding]);
  async function create(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await authRequest("accounts", {license_id: licenseId.trim(), password, role});
      setMessage(`${role === "admin" ? "Admin" : "Viewer"} license ${licenseId.trim()} created.`);
      setLicenseId(""); setPassword("");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setError("");
    try { await logout(); }
    catch (failure) { setError(failure.message); }
  }
  if (!user) return null;
  return (
    <div className="profile" ref={root}>
      <button className="profile-trigger" aria-expanded={open} aria-controls="profile-menu" onClick={() => setOpen(!open)}>
        <UserRound size={18} />
        <span className="profile-role">{user.role === "admin" ? "Admin" : "Viewer"}</span>
      </button>
      {open && <div id="profile-menu" className="profile-menu">
        <strong>{user.license_id}</strong>
        <span className="profile-caption">{user.role === "admin" ? "Administrator · Full access" : "Viewer · Bay views only"}</span>
        {user.role === "admin" && <button onClick={() => { setAdding(true); setOpen(false); setMessage(""); setError(""); }}><Plus size={16} /> Create license login</button>}
        <button onClick={signOut}><LogOut size={16} /> Log out</button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>}
      {user.role === "admin" && <dialog ref={dialog} className="license-dialog" onCancel={() => setAdding(false)} onClose={() => { setAdding(false); setPassword(""); }}>
        <div className="license-dialog-heading"><h2>Create license login</h2><button aria-label="Close" onClick={() => setAdding(false)}><X size={20} /></button></div>
        <p>Assign Admin for full access or Viewer for bay monitoring only.</p>
        <form className="account-form" onSubmit={create}>
          <label>License ID<input autoComplete="off" required minLength={3} maxLength={64} pattern="[A-Za-z0-9_-]+" value={licenseId} onChange={(event) => setLicenseId(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="new-password" required minLength={10} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="viewer">Viewer — Bay views only</option><option value="admin">Admin — Full access</option></select></label>
          {message && <p className="form-success" role="status">{message}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-action" disabled={busy}>{busy ? "Creating…" : "Create login"}</button>
        </form>
      </dialog>}
    </div>
  );
}
