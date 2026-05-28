import { Award, BrainCircuit, CheckCircle, Target } from "lucide-react";
import AnalyticsChart from "./AnalyticsChart";
import CourseGrid from "./CourseGrid";

export default function Dashboard({ activeTab, stats, courses, loadingCourses, onSaveCourse, onFeedback, onSearchCourses, searchQuery, setSearchQuery, children }) {
  if (activeTab === "analytics") {
    return <AnalyticsChart stats={stats} />;
  }

  if (activeTab !== "courses") {
    return children;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Award} label="Target role" value={stats.target_role || "Backend Developer"} />
        <SummaryCard icon={CheckCircle} label="Matched skills" value={(stats.matched_skills || []).length} />
        <SummaryCard icon={Target} label="Missing skills" value={(stats.missing_skills || []).length} />
      </div>
      <PersonalizationPanel profile={stats.personalization} />

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Recommended Learning Paths</h2>
            <p className="text-xs text-slate-400">Grounded in verified course data with match scores and rationale.</p>
          </div>
        </div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search catalog by skill, provider, or category"
            className="min-w-0 flex-1 rounded-2xl border border-brand-border bg-[#111116] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <button
            onClick={onSearchCourses}
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            Search
          </button>
        </div>
        <CourseGrid courses={courses} loading={loadingCourses} onSaveCourse={onSaveCourse} onFeedback={onFeedback} />
      </section>
    </div>
  );
}

function PersonalizationPanel({ profile }) {
  const top = profile?.top_interests || [];
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <BrainCircuit className="h-5 w-5 text-emerald-300" />
            Personalization Engine
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {profile?.next_action || "Save, rate, and complete roadmap steps to strengthen future recommendations."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="Signals" value={profile?.signal_count || 0} />
          <MiniMetric label="Saved" value={profile?.saved_count || 0} />
          <MiniMetric label="Rating" value={profile?.average_rating ?? "New"} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {top.length ? (
          top.map((item) => (
            <span key={item.tag} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              {item.tag} +{item.weight}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">No preference tags yet.</span>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-200">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}
