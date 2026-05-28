import { FileText, UploadCloud } from "lucide-react";
import { useRef } from "react";

const roles = ["AI Engineer", "Full Stack Developer", "Data Scientist", "Cloud Engineer", "Cybersecurity Analyst", "Backend Developer", "Frontend Developer"];

export default function ResumeUpload({ targetRole, setTargetRole, isUploading, onUpload, insights }) {
  const fileRef = useRef(null);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
        className="glass-card flex min-h-[360px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 p-8 text-center transition hover:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60"
      >
        <input ref={fileRef} type="file" accept=".pdf" onChange={onUpload} className="hidden" />
        <UploadCloud className={`mb-4 h-14 w-14 ${isUploading ? "animate-pulse text-emerald-300" : "text-indigo-300"}`} />
        <h3 className="text-lg font-bold text-white">{isUploading ? "Analyzing resume..." : "Upload Resume PDF"}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          Extract skills, compare them with the selected role, and generate a grounded learning plan.
        </p>
        <div className="mt-5">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-indigo-300">Target role</label>
          <select
            value={targetRole}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setTargetRole(event.target.value)}
            className="rounded-xl border border-brand-border bg-[#111116] px-4 py-2 text-sm text-white outline-none focus:border-indigo-400"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </button>

      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Resume Insights</h3>
            <p className="text-xs text-slate-400">Generated after upload</p>
          </div>
        </div>
        <div className="mt-5 space-y-4 text-sm text-slate-300">
          <Insight label="Summary" value={insights?.summary || "Upload a resume to calculate role alignment."} />
          <Insight label="Estimated learning duration" value={insights?.estimated_learning_duration || "Pending"} />
          <Insight label="Next best action" value={insights?.next_best_action || "Select a target role and upload your PDF."} />
        </div>
      </div>
    </div>
  );
}

function Insight({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}
