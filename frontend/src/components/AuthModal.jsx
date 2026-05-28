import { AlertCircle, Key, X } from "lucide-react";

export default function AuthModal({
  show,
  authMode,
  setAuthMode,
  username,
  setUsername,
  password,
  setPassword,
  name,
  setName,
  authError,
  onClose,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-panel relative w-full max-w-md rounded-3xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Key className="h-5 w-5 text-indigo-300" />
          {authMode === "login" ? "Sign in" : "Create account"}
        </h3>
        <p className="mt-1 text-xs text-slate-400">Sync bookmarks, analytics, and roadmap progress.</p>
        {authError && (
          <div className="mt-4 flex gap-2 rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-3 text-xs text-indigo-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {authError}
          </div>
        )}
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {authMode === "register" && <Field label="Name" value={name} onChange={setName} placeholder="Your name" />}
          <Field label="Username" value={username} onChange={setUsername} placeholder="username" />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="password" />
          <button className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {authMode === "login" ? "Login" : "Register"}
          </button>
        </form>
        <div className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-slate-400">
          {authMode === "login" ? "New here? " : "Already registered? "}
          <button className="font-bold text-indigo-300 hover:underline" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
            {authMode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-brand-border bg-[#111116] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
      />
    </label>
  );
}
