import { Bookmark, ExternalLink, Star, Target, ThumbsDown, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import Skeleton from "./Skeleton";

export default function CourseGrid({ courses, loading, onSaveCourse, onFeedback }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {courses.map((course, index) => (
        <motion.article
          key={`${course.id}-${course.title}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="glass-card group flex min-h-[238px] flex-col justify-between rounded-2xl p-5"
        >
          <div>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold leading-snug text-white">{course.title}</h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {course.provider} · {course.level}
                </p>
              </div>
              <button
                onClick={() => onSaveCourse(course.id)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-indigo-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label={`Save ${course.title}`}
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {course.why_recommended || "Recommended from the verified course catalog based on your current goal."}
            </p>
          </div>

          <div className="mt-4 border-t border-brand-border pt-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold text-indigo-200">
                {course.category || "Learning Path"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                <Target className="h-3 w-3" />
                {Math.round((course.match_score || 0.82) * 100)}% match
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href={course.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200"
              >
                Launch course <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="flex items-center gap-1" aria-label={`Rate ${course.title}`}>
                <button
                  onClick={() => onFeedback?.(course.id, 5, "helpful")}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  aria-label="Mark recommendation helpful"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onFeedback?.(course.id, 3, "saved for review")}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:border-indigo-400 hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-label="Mark recommendation as maybe"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onFeedback?.(course.id, 1, "not relevant")}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:border-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-300"
                  aria-label="Mark recommendation not relevant"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
