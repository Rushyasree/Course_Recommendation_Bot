import { useEffect, useMemo, useState } from "react";
import AuthModal from "./components/AuthModal";
import ChatPanel from "./components/ChatPanel";
import Dashboard from "./components/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import ResumeUpload from "./components/ResumeUpload";
import Roadmap from "./components/Roadmap";
import SavedCourses from "./components/SavedCourses";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import { endpoints, setAuthToken } from "./services/api";

const DEFAULT_COURSES = [
  {
    id: 1,
    title: "Python for Everybody",
    provider: "Coursera",
    category: "Programming",
    level: "Beginner",
    link: "https://www.coursera.org/specializations/python",
    match_score: 0.86,
    why_recommended: "A strong foundation for programming, automation, and later AI/ML learning.",
  },
  {
    id: 2,
    title: "Machine Learning by Andrew Ng",
    provider: "Coursera",
    category: "Artificial Intelligence",
    level: "Intermediate",
    link: "https://www.coursera.org/learn/machine-learning",
    match_score: 0.82,
    why_recommended: "Builds core ML intuition needed for AI career paths and portfolio projects.",
  },
  {
    id: 3,
    title: "Full Stack Open",
    provider: "University of Helsinki",
    category: "Web Development",
    level: "Intermediate",
    link: "https://fullstackopen.com/en/",
    match_score: 0.79,
    why_recommended: "Covers React, APIs, databases, and full-stack engineering practices.",
  },
];

const DEFAULT_STATS = {
  target_role: "Backend Developer",
  completion_rate: 35,
  career_readiness_score: 35,
  roadmap_completion: 25,
  matched_skills: ["python", "sql", "git"],
  missing_skills: ["node.js", "mongodb", "docker", "devops"],
  radar_coordinates: {
    programming: 80,
    data_science: 50,
    cloud: 40,
    cybersecurity: 30,
  },
  skill_trend: [
    { label: "Week 1", score: 20 },
    { label: "Week 2", score: 28 },
    { label: "Week 3", score: 32 },
    { label: "Now", score: 35 },
  ],
  completed_courses: [
    { label: "Core", count: 3 },
    { label: "Pending", count: 4 },
  ],
};

function App() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! I am your AI Career Guide. What is your name?", stage: "ask_name" },
  ]);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("courses");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [modelUsed, setModelUsed] = useState(null);
  const [toast, setToast] = useState(null);

  const [token, setToken] = useState(() => localStorage.getItem("course_bot_token"));
  const [userName, setUserName] = useState("Guest");
  const [targetRole, setTargetRole] = useState("Backend Developer");
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [courses, setCourses] = useState(DEFAULT_COURSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedCourses, setSavedCourses] = useState([]);
  const [roadmapSteps, setRoadmapSteps] = useState([]);
  const [resumeInsights, setResumeInsights] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [userId] = useState(() => {
    const existing = localStorage.getItem("course_bot_userId");
    if (existing) return existing;
    const next = `anon-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("course_bot_userId", next);
    return next;
  });

  const completionRate = useMemo(() => stats.completion_rate || stats.career_readiness_score || 0, [stats]);

  useEffect(() => {
    setAuthToken(token);
    if (token) localStorage.setItem("course_bot_token", token);
    else localStorage.removeItem("course_bot_token");
  }, [token]);

  useEffect(() => {
    syncWorkspace();
  }, [token, userId]);

  async function syncWorkspace() {
    await Promise.allSettled([syncDashboard(), syncSaved(), syncRoadmap(), syncProfile()]);
  }

  async function syncDashboard() {
    try {
      const response = await endpoints.dashboard(userId, token);
      setStats({ ...DEFAULT_STATS, ...response.data });
      setTargetRole(response.data.target_role || targetRole);
    } catch {
      setStats((current) => ({ ...DEFAULT_STATS, ...current }));
    }
  }

  async function syncSaved() {
    try {
      const response = await endpoints.savedCourses(userId, token);
      setSavedCourses(response.data || []);
    } catch {
      setSavedCourses([]);
    }
  }

  async function syncRoadmap() {
    try {
      const response = await endpoints.roadmap(userId, token);
      setRoadmapSteps(response.data.steps || []);
    } catch {
      setRoadmapSteps([]);
    }
  }

  async function syncProfile() {
    if (!token) return;
    try {
      const response = await endpoints.profile();
      setUserName(response.data.name || response.data.username || "Learner");
    } catch {
      setUserName("Learner");
    }
  }

  async function sendMessage(customMessage) {
    const text = (customMessage || input).trim();
    if (!text || isLoading) return;

    const nextMessages = [...messages, { sender: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setLoadingCourses(true);

    try {
      const response = await endpoints.chat({
        message: text,
        user_id: token ? undefined : userId,
      });
      const data = response.data;
      setMessages([...nextMessages, { sender: "bot", text: data.reply, stage: data.stage }]);
      setModelUsed(data.model);
      if (data.courses?.length) setCourses(data.courses);
      if (data.model && !["openai", "default"].includes(data.model)) {
        setToast({ type: "info", message: `Using ${data.model} fallback for this response.` });
      }
      if (messages.length === 1) setUserName(text);
      await syncDashboard();
    } catch {
      setMessages([
        ...nextMessages,
        { sender: "bot", text: "I could not reach the recommendation service. Please confirm the backend is running and try again." },
      ]);
      setToast({ type: "error", message: "Recommendation service unavailable." });
    } finally {
      setIsLoading(false);
      setLoadingCourses(false);
    }
  }

  async function saveCourse(courseId) {
    try {
      await endpoints.saveCourse({ course_id: courseId, user_id: token ? undefined : userId });
      await syncSaved();
      setToast({ type: "success", message: "Course saved to your learning queue." });
    } catch {
      setToast({ type: "error", message: "Could not save this course." });
    }
  }

  async function submitFeedback(courseId, rating, feedback) {
    try {
      await endpoints.feedback({ course_id: courseId, rating, feedback, user_id: token ? undefined : userId });
      setToast({ type: "success", message: "Feedback recorded. Future recommendations can learn from this signal." });
    } catch {
      setToast({ type: "error", message: "Could not record feedback." });
    }
  }

  async function searchCourses() {
    setLoadingCourses(true);
    try {
      const response = await endpoints.courses({ q: searchQuery, limit: 24 });
      setCourses(response.data?.length ? response.data : DEFAULT_COURSES);
      setToast({ type: "info", message: response.data?.length ? "Catalog results updated." : "No catalog matches found; showing defaults." });
    } catch {
      setToast({ type: "error", message: "Could not search the course catalog." });
    } finally {
      setLoadingCourses(false);
    }
  }

  async function updateRoadmapProgress(skill, progress, stage) {
    try {
      await endpoints.updateRoadmapProgress({ skill, progress, stage, user_id: token ? undefined : userId });
      setRoadmapSteps((current) => current.map((step) => (step.skill === skill ? { ...step, progress, estimated_stage: stage } : step)));
      setToast({ type: "success", message: `${skill} progress updated to ${progress}%.` });
      await syncDashboard();
    } catch {
      setToast({ type: "error", message: "Could not update roadmap progress. Sign in or keep your session active." });
    }
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setToast({ type: "warning", message: "Please upload a PDF resume." });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_role", targetRole);
    if (!token) formData.append("user_id", userId);

    setIsUploading(true);
    try {
      const response = await endpoints.uploadResume(formData);
      const { analysis, recommended_courses: recommendedCourses, career_insights: insights } = response.data;
      setStats({ ...DEFAULT_STATS, ...analysis, career_readiness_score: analysis.completion_rate });
      setTargetRole(analysis.target_role);
      setResumeInsights(insights);
      if (recommendedCourses?.length) setCourses(recommendedCourses);
      setActiveTab("courses");
      setToast({ type: "success", message: "Resume analyzed and recommendations updated." });
      setMessages((current) => [
        ...current,
        {
          sender: "bot",
          text: `Resume analysis complete for **${analysis.target_role}**.\n\nMatch rate: **${analysis.completion_rate}%**\n\nMissing skills: ${analysis.missing_skills.join(", ") || "none"}.`,
        },
      ]);
      await Promise.allSettled([syncDashboard(), syncRoadmap()]);
    } catch {
      setToast({ type: "error", message: "Resume parsing failed. Try a text-based PDF under 4MB." });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError("");
    try {
      if (authMode === "register") {
        await endpoints.register({ username: usernameInput, password: passwordInput, name: nameInput });
        setAuthMode("login");
        setAuthError("Registration successful. Please sign in.");
      } else {
        const response = await endpoints.login({ username: usernameInput, password: passwordInput });
        setToken(response.data.token);
        setUserName(response.data.user.name || response.data.user.username);
        setShowAuthModal(false);
        setUsernameInput("");
        setPasswordInput("");
        setNameInput("");
      }
    } catch (error) {
      setAuthError(error.response?.data?.message || "Authentication failed.");
    }
  }

  function logout() {
    setToken(null);
    setUserName("Guest");
    setSavedCourses([]);
    setMessages([{ sender: "bot", text: "You have been logged out. What would you like to learn next?", stage: "ask_interest" }]);
    setToast({ type: "info", message: "Signed out successfully." });
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <Navbar userName={userName} token={token} onLoginClick={() => setShowAuthModal(true)} onLogout={logout} />

      <main className="mx-auto grid max-w-[1600px] gap-5 p-4 md:p-6 lg:grid-cols-[88px_0.95fr_1.35fr] xl:grid-cols-[220px_0.95fr_1.35fr]">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} completionRate={completionRate} />

        <ErrorBoundary>
          <ChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onSend={sendMessage}
            modelUsed={modelUsed}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <section className="min-h-[620px] rounded-3xl">
            <Dashboard
              activeTab={activeTab}
              stats={stats}
              courses={courses}
              loadingCourses={loadingCourses}
              onSaveCourse={saveCourse}
              onFeedback={submitFeedback}
              onSearchCourses={searchCourses}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            >
              {activeTab === "resume" && (
                <ResumeUpload
                  targetRole={targetRole}
                  setTargetRole={setTargetRole}
                  isUploading={isUploading}
                  onUpload={uploadResume}
                  insights={resumeInsights}
                />
              )}
              {activeTab === "roadmap" && <Roadmap steps={roadmapSteps} onUpdateProgress={updateRoadmapProgress} />}
              {activeTab === "saved" && <SavedCourses savedCourses={savedCourses} onSaveCourse={saveCourse} onFeedback={submitFeedback} />}
            </Dashboard>
          </section>
        </ErrorBoundary>
      </main>

      <AuthModal
        show={showAuthModal}
        authMode={authMode}
        setAuthMode={setAuthMode}
        username={usernameInput}
        setUsername={setUsernameInput}
        password={passwordInput}
        setPassword={setPasswordInput}
        name={nameInput}
        setName={setNameInput}
        authError={authError}
        onClose={() => setShowAuthModal(false)}
        onSubmit={submitAuth}
      />

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default App;
