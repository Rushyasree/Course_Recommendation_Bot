import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Line, Radar } from "react-chartjs-2";
import { TrendingUp } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#cbd5e1", boxWidth: 10 } },
  },
  scales: {
    r: {
      angleLines: { color: "rgba(255,255,255,0.08)" },
      grid: { color: "rgba(255,255,255,0.08)" },
      pointLabels: { color: "#a5b4fc", font: { size: 11, weight: "bold" } },
      ticks: { display: false, maxTicksLimit: 5 },
      suggestedMin: 0,
      suggestedMax: 100,
    },
    x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
    y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.06)" }, suggestedMin: 0 },
  },
};

export default function AnalyticsChart({ stats }) {
  const radar = stats.radar_coordinates || {};
  const trend = stats.skill_trend || [];
  const completed = stats.completed_courses || [];

  const radarData = {
    labels: ["Programming", "Data Science", "Cloud", "Security"],
    datasets: [
      {
        label: "Skill strength",
        data: [radar.programming || 0, radar.data_science || 0, radar.cloud || 0, radar.cybersecurity || 0],
        fill: true,
        backgroundColor: "rgba(99, 102, 241, 0.22)",
        borderColor: "rgba(129, 140, 248, 0.95)",
        pointBackgroundColor: "#34d399",
      },
    ],
  };

  const lineData = {
    labels: trend.map((item) => item.label),
    datasets: [
      {
        label: "Readiness trend",
        data: trend.map((item) => item.score),
        borderColor: "#34d399",
        backgroundColor: "rgba(52, 211, 153, 0.15)",
        tension: 0.45,
        fill: true,
      },
    ],
  };

  const barData = {
    labels: completed.map((item) => item.label),
    datasets: [
      {
        label: "Course status",
        data: completed.map((item) => item.count),
        backgroundColor: ["rgba(52, 211, 153, 0.75)", "rgba(248, 113, 113, 0.7)"],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Career readiness" value={`${stats.career_readiness_score ?? stats.completion_rate ?? 0}%`} />
        <Metric title="Roadmap complete" value={`${stats.roadmap_completion ?? 0}%`} />
        <Metric title="Personalization signals" value={stats.personalization?.signal_count || 0} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Competency Radar">
          <Radar data={radarData} options={chartOptions} />
        </ChartCard>
        <ChartCard title="Skill Acquisition Trend">
          <Line data={lineData} options={chartOptions} />
        </ChartCard>
      </div>
      <ChartCard title="Completed vs Pending Skills">
        <Bar data={barData} options={chartOptions} />
      </ChartCard>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <TrendingUp className="h-4 w-4 text-emerald-300" />
        {title}
      </div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="mb-4 text-sm font-bold text-white">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}
