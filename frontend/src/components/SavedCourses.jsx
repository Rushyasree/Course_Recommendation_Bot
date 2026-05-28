import CourseGrid from "./CourseGrid";

export default function SavedCourses({ savedCourses, onSaveCourse, onFeedback }) {
  const courses = (savedCourses || []).map((item) => item.course).filter(Boolean);

  if (!courses.length) {
    return (
      <div className="glass-card flex min-h-[280px] flex-col items-center justify-center rounded-3xl p-8 text-center">
        <h3 className="text-lg font-bold text-white">No saved courses yet</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-400">Save recommendations to build a focused learning queue.</p>
      </div>
    );
  }

  return <CourseGrid courses={courses} onSaveCourse={onSaveCourse} onFeedback={onFeedback} />;
}
