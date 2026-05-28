import { Cpu, LogOut, User } from "lucide-react";

export default function Navbar({ userName, token, onLoginClick, onLogout }) {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-[#09090b]/80 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-2.5 shadow-lg shadow-indigo-500/20">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ElevateAI</h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              AI Career Guidance Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:block">
            Profile <span className="font-semibold text-indigo-300">{userName}</span>
          </div>
          {token ? (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <User className="h-4 w-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
