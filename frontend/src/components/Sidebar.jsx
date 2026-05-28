import { Award, Bookmark, Compass, FileText, LineChart, Sparkles } from "lucide-react";

const tabs = [
  { id: "courses", label: "Courses", icon: Sparkles },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "roadmap", label: "Roadmap", icon: Compass },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "saved", label: "Saved", icon: Bookmark },
];

export default function Sidebar({ activeTab, onTabChange, completionRate }) {
  return (
    <aside className="glass-panel rounded-2xl p-3 lg:sticky lg:top-24 lg:h-fit">
      <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
          <Award className="h-4 w-4" />
          Career readiness
        </div>
        <div className="mt-2 text-2xl font-bold text-white">{completionRate}%</div>
      </div>
      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
