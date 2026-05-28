import { ExternalLink, Milestone } from "lucide-react";

export default function Roadmap({ steps, onUpdateProgress }) {
  const fallback = [
    { skill: "core foundations", course: null, difficulty: "Beginner" },
    { skill: "portfolio project", course: null, difficulty: "Intermediate" },
    { skill: "deployment and interview prep", course: null, difficulty: "Advanced" },
  ];
  const items = steps?.length ? steps : fallback;

  return (
    <div className="glass-card rounded-3xl p-5">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
        <Milestone className="h-5 w-5 text-indigo-300" />
        Personalized Career Roadmap
      </h2>
      <div className="relative ml-4 space-y-7 border-l border-white/10 pl-7">
        {items.map((step, index) => (
          <div key={`${step.skill}-${index}`} className="relative">
            <div className="absolute -left-[41px] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {index + 1}
            </div>
            <h3 className="text-sm font-bold capitalize text-white">{step.skill}</h3>
            <p className="mt-1 text-xs text-slate-400">
              Stage: {index === 0 ? "Beginner" : index === 1 ? "Intermediate" : "Advanced"} · Estimated milestone {index + 2} weeks
            </p>
            {step.course?.title ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-[#111116] p-4">
                <p className="text-xs font-bold text-emerald-300">{step.course.title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{step.course.provider}</p>
                <a href={step.course.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                  Enroll <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Build a practical project and document outcomes for your portfolio.</p>
            )}
            <div className="mt-3">
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${step.progress || 0}%` }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {[25, 50, 75, 100].map((value) => (
                  <button
                    key={value}
                    onClick={() => onUpdateProgress?.(step.skill, value, index === 0 ? "Beginner" : index === 1 ? "Intermediate" : "Advanced")}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
