import React, { useState, useEffect, useRef } from "react";
import Toast from "./components/Toast";
import axios from "axios";
import ReactMarkdown from "react-markdown";

import {
  Send,
  Cpu,
  BookOpen,
  LineChart,
  Compass,
  FileText,
  Sun,
  Moon,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  Bookmark,
  User,
  Key,
  LogOut,
  AlertCircle
} from "lucide-react";

// Fallback course data in case backend is loading/unseeded
const DEFAULT_COURSES = [
  {
    id: 1,
    title: "Python for Everybody",
    provider: "Coursera",
    category: "Programming",
    level: "Beginner",
    link: "https://www.coursera.org/specializations/python"
  },
  {
    id: 2,
    title: "Machine Learning by Andrew Ng",
    provider: "Coursera",
    category: "Artificial Intelligence",
    level: "Intermediate",
    link: "https://www.coursera.org/learn/machine-learning"
  },
  {
    id: 3,
    title: "Full Stack Open",
    provider: "University of Helsinki",
    category: "Web Development",
    level: "Intermediate",
    link: "https://fullstackopen.com/en/"
  }
];

function App() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! I'm your AI Career Guide & Course Recommender 🤖. What is your name?", stage: "ask_name" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState("ask_name");
  
  // Tabs: 'courses', 'analytics', 'roadmap', 'resume', 'saved'
  const [activeTab, setActiveTab] = useState("courses");
  
  // User profile dashboard states (live linked to SQLite)
  const [userName, setUserName] = useState("Guest");
  const [userInterest, setUserInterest] = useState("");
  const [recommendedCourses, setRecommendedCourses] = useState(DEFAULT_COURSES);
  const [savedCourses, setSavedCourses] = useState([]);
  
  // Metrics states populated by /stats/dashboard
  const [targetRole, setTargetRole] = useState("Backend Developer");
  const [completionRate, setCompletionRate] = useState(35);
  const [matchedSkills, setMatchedSkills] = useState(["python", "sql", "git"]);
  const [missingSkills, setMissingSkills] = useState(["node.js", "mongodb", "docker", "devops"]);
  const [radarCoords, setRadarCoords] = useState({
    programming: 80,
    data_science: 50,
    cloud: 40,
    cybersecurity: 30
  });
  const [roadmapTimeline, setRoadmapTimeline] = useState([]);

  // Auth Drawer States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'register'
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("course_bot_token"));
  const [authError, setAuthError] = useState("");

  // Resume PDF uploading states
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // AI Provider status states
  const [toast, setToast] = useState(null);
  const [modelUsed, setModelUsed] = useState(null);

  // Retrieve session-based anonymous ID
  const [userId] = useState(() => {
    let savedId = localStorage.getItem("course_bot_userId");
    if (!savedId) {
      savedId = Math.random().toString(36).substring(2, 9);
      localStorage.setItem("course_bot_userId", savedId);
    }
    return savedId;
  });

  const chatEndRef = useRef(null);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Read environment variables
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Setup Axios JWT Headers dynamically
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("course_bot_token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("course_bot_token");
    }
  }, [token]);

  // Fetch Live SQLite metrics on load & session update
  const syncDashboardMetrics = async () => {
    try {
      const endpoint = token ? `${API_URL}/stats/dashboard` : `${API_URL}/stats/dashboard?user_id=${userId}`;
      const response = await axios.get(endpoint);
      const data = response.data;
      
      setTargetRole(data.target_role);
      setCompletionRate(data.completion_rate);
      setMatchedSkills(data.matched_skills);
      setMissingSkills(data.missing_skills);
      setRadarCoords(data.radar_coordinates);
    } catch (err) {
      console.warn("Could not sync real database dashboard metrics:", err.message);
    }
  };

  // Sync Saved Bookmarks list
  const syncSavedRecommendations = async () => {
    if (!token && !userId) return;
    try {
      const endpoint = token ? `${API_URL}/courses/saved` : `${API_URL}/courses/saved?user_id=${userId}`;
      const response = await axios.get(endpoint);
      setSavedCourses(response.data);
    } catch (err) {
      console.warn("Could not sync saved recommendations:", err.message);
    }
  };

  // Fetch profile details for logged in users
  const syncUserProfile = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/auth/profile`);
      setUserName(response.data.name || response.data.username);
      if (response.data.interests) setUserInterest(response.data.interests);
    } catch (err) {
      console.error("Profile sync failed:", err.message);
    }
  };

  // Sync dynamic roadmap timeline based on skill gaps from database
  const syncRoadmapTimeline = async () => {
    try {
      const endpoint = token ? `${API_URL}/roadmap/timeline` : `${API_URL}/roadmap/timeline?user_id=${userId}`;
      const response = await axios.get(endpoint);
      setRoadmapTimeline(response.data.steps || []);
    } catch (err) {
      console.warn("Could not sync dynamic career roadmap timeline:", err.message);
    }
  };

  const handleChipClick = (level) => {
    sendMessage(level);
  };

  // Trigger metrics syncing on load
  useEffect(() => {
    syncDashboardMetrics();
    syncSavedRecommendations();
    syncUserProfile();
    syncRoadmapTimeline();
  }, [token, userId]);

  // Parse courses from bot's text response to dynamically populate dashboard cards
  const extractCoursesFromText = (text) => {
    const courses = [];
    const lines = text.split("\n");
    let currentCourse = null;

    lines.forEach((line) => {
      if (line.includes("🔹")) {
        const cleanedLine = line.replace("🔹", "").trim();
        const boldMatch = cleanedLine.match(/\*\*(.*?)\*\*\s*by\s*(.*?):/) || cleanedLine.match(/(.*?)\s*by\s*(.*?):/);
        
        if (boldMatch) {
          currentCourse = {
            id: Math.floor(Math.random() * 1000) + 10, // Ephemeral mapping ID
            title: boldMatch[1].replace(/\*\*/g, "").trim(),
            provider: boldMatch[2].trim(),
            link: "#",
            level: "Beginner",
            category: "Dynamic Match"
          };
          courses.push(currentCourse);
        }
      } else if (currentCourse && (line.includes("http://") || line.includes("https://"))) {
        const mdLinkMatch = line.match(/\[.*?\]\((https?:\/\/.*?)\)/) || line.match(/(https?:\/\/\S+)/);
        if (mdLinkMatch) {
          currentCourse.link = mdLinkMatch[1].replace(/\)$/, "");
          currentCourse = null;
        }
      }
    });

    return courses;
  };

  // Sanitize text to remove internal AI tags
  const sanitizeText = (text) => {
    if (!text) return '';
    return text.replace(/<\|[^|]*\|>/g, '').trim();
  };

  // Retry utility with exponential backoff
  const retryRequest = async (fn, maxRetries = 2, baseDelay = 500) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        const delay = baseDelay * Math.pow(2, attempt);
        setToast({ message: `Retrying request... (attempt ${attempt + 2})`, type: 'warning' });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const sendMessage = async (customMessage = null) => {
    const textToSend = sanitizeText(customMessage || input);
    if (!textToSend.trim() || isLoading) return;

    const updatedMessages = [...messages, { sender: "user", text: textToSend }];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setModelUsed(null);

    try {
      const response = await retryRequest(() =>
        axios.post(`${API_URL}/chat`, {
          message: textToSend,
          user_id: token ? undefined : userId
        })
      );

      const reply = sanitizeText(response.data.reply);
      const nextStage = response.data.stage;
      const model = response.data.model;

      setCurrentStage(nextStage);
      setModelUsed(model);

      if (currentStage === "ask_name") {
        setUserName(textToSend);
      } else if (currentStage === "ask_interest") {
        setUserInterest(textToSend);
      }

      const newCourses = extractCoursesFromText(reply);
      if (newCourses.length > 0) {
        setRecommendedCourses(newCourses);
      }

      // Show fallback notification if AI switched models
      if (response.data.model && response.data.model !== 'openai' && response.data.model !== 'system') {
        setToast({
          message: `Switched to ${model} model due to primary AI capacity limits.`,
          type: 'info'
        });
      }

      setMessages([...updatedMessages, { sender: "bot", text: reply, stage: nextStage }]);

      // Update charts
      syncDashboardMetrics();
    } catch (error) {
      console.error("Error communicating with AI Service:", error);
      setToast({
        message: 'All AI services are temporarily unavailable. Using local recommendations.',
        type: 'error'
      });
      setMessages([
        ...updatedMessages,
        {
          sender: "bot",
          text: "⚠️ **Connection Error**: I'm having trouble talking to my server. Make sure the backend is running at standard port `5000`!"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Saved Courses Bookmarking Action
  const handleSaveCourse = async (courseId) => {
    try {
      const endpoint = `${API_URL}/courses/save`;
      const payload = { course_id: courseId };
      if (!token) payload.user_id = userId;

      await axios.post(endpoint, payload);
      syncSavedRecommendations();
    } catch (err) {
      console.error("Failed to bookmark course:", err.response?.data?.message || err.message);
    }
  };

  // PDF File Upload Parsing Action
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert("Please upload a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_role", targetRole);
    if (!token) formData.append("user_id", userId);

    setIsUploading(true);
    try {
      const response = await axios.post(`${API_URL}/resume/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const analysis = response.data.analysis;
      const courses = response.data.recommended_courses;

      // Update stats and catalog instantly
      setTargetRole(analysis.target_role);
      setCompletionRate(analysis.completion_rate);
      setMatchedSkills(analysis.matched_skills);
      setMissingSkills(analysis.missing_skills);
      
      if (courses && courses.length > 0) {
        setRecommendedCourses(courses);
      }

      // Automatically sync radar coordinate metrics from backend
      syncDashboardMetrics();
      setActiveTab("courses");
      
      // Inject AI feedback into chat thread
      setMessages([
        ...messages,
        { 
          sender: "bot", 
          text: `📄 **Resume Analyzed Successfully!**\n\nI have parsed your skills against the **${analysis.target_role}** framework.\n\n* **Match Rate**: ${analysis.completion_rate}%\n* **Skills Found**: ${analysis.matched_skills.join(", ") || "None Identified"}\n* **Missing Skills**: ${analysis.missing_skills.join(", ") || "None! You are ready."}\n\nI have automatically populated your dashboard card feed with target upskilling courses to cover your skill gaps!`
        }
      ]);
    } catch (err) {
      console.error("Failed to upload and parse resume:", err);
      alert("Resume parsing failed. Make sure your backend server is active.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Authentication Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    try {
      if (authMode === "register") {
        await axios.post(`${API_URL}/auth/register`, {
          username: usernameInput,
          password: passwordInput,
          name: nameInput
        });
        setAuthMode("login");
        setNameInput("");
        setAuthError("Registration successful. Please log in!");
      } else {
        const response = await axios.post(`${API_URL}/auth/login`, {
          username: usernameInput,
          password: passwordInput
        });
        
        setToken(response.data.token);
        setUserName(response.data.user.name || response.data.user.username);
        setShowAuthModal(false);
        setUsernameInput("");
        setPasswordInput("");
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || "An authentication error occurred.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserName("Guest");
    setSavedCourses([]);
    setUserInterest("");
    localStorage.removeItem("course_bot_token");
    setMessages([
      { sender: "bot", text: "You have been logged out. I'm ready for another recommendation request! What is your name?", stage: "ask_name" }
    ]);
    setCurrentStage("ask_name");
  };

  // Calculate reactive SVG coordinates dynamically based on SQLite metrics
  const getRadarPoints = () => {
    const scale = 45; // Max radius length
    const cx = 50;
    const cy = 50;

    // Programming: Top axis (Angle: 270 deg)
    const progY = cy - (scale * (radarCoords.programming / 100));
    // Data Science: Right axis (Angle: 0 deg)
    const dsX = cx + (scale * (radarCoords.data_science / 100));
    // Cloud: Bottom axis (Angle: 90 deg)
    const cloudY = cy + (scale * (radarCoords.cloud / 100));
    // Cybersecurity: Left axis (Angle: 180 deg)
    const secX = cx - (scale * (radarCoords.cybersecurity / 100));

    return `${cx},${progY} ${dsX},${cy} ${cx},${cloudY} ${secX},${cy}`;
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans relative">
      
      {/* Top Navbar */}
      <header className="glass-panel border-b border-brand-border py-4 px-6 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-emerald-400 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ElevateAI
            </h1>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
              AI Career & Learning Platform
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 py-1.5 px-3.5 rounded-full text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Profile: <span className="font-semibold text-indigo-400">{userName}</span>
          </div>

          {token ? (
            <button
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs py-1.5 px-4 rounded-xl transition font-medium flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthError("");
                setShowAuthModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 px-4 rounded-xl transition font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/15"
            >
              <User className="w-3.5 h-3.5" /> Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Glassmorphic AI Chat Panel */}
        <section className="lg:col-span-5 flex flex-col rounded-3xl glass-panel relative overflow-hidden shadow-2xl min-h-[550px] lg:h-[calc(100vh-140px)]">
          <div className="p-4 border-b border-brand-border bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Career Counselor</h2>
                <p className="text-xs text-indigo-400">Powered by GPT-4o-Mini</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/10"
                      : "bg-[#16161a] text-slate-200 border border-brand-border rounded-bl-none shadow-inner"
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                      a: ({ node, ...props }) => (
                        <a
                          className="text-emerald-400 hover:text-emerald-300 font-semibold underline inline-flex items-center gap-1 cursor-pointer break-all"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        >
                          {props.children} <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      ),
                      strong: ({ node, ...props }) => <strong className="text-indigo-400 font-bold" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-slate-300" {...props} />,
                      li: ({ node, ...props }) => <li className="text-xs md:text-sm" {...props} />
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#16161a] border border-brand-border rounded-2xl rounded-bl-none px-4 py-3 shadow-inner flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce delay-100"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce delay-200"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce delay-300"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {currentStage === "ask_level" && !isLoading && (
            <div className="px-4 py-2 border-t border-brand-border/40 bg-white/2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Select Level:</span>
              {["Beginner", "Intermediate", "Advanced"].map((level) => (
                <button
                  key={level}
                  onClick={() => handleChipClick(level)}
                  className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs py-1 px-3.5 rounded-full font-medium transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  {level}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 border-t border-brand-border bg-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2.5"
            >
              <input
                type="text"
                placeholder={isLoading ? "AI is typing..." : "Send a message..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-[#121214] border border-brand-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-indigo-900 disabled:to-indigo-950 disabled:opacity-40 text-white p-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/15 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Platform Dashboard */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Learner Profile Summary Card */}
          <div className="glass-panel p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-xl"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-400 font-bold tracking-widest uppercase">Target Focus</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {completionRate}% Complete
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">Hello, {userName}!</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Target Role: <span className="text-indigo-400 font-bold">{targetRole}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3">
                <Award className="w-8 h-8 text-emerald-400" />
                <div>
                  <div className="text-xs text-slate-400">Verified Catalog Matches</div>
                  <div className="text-xl font-bold text-white">{recommendedCourses.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selector & Panel */}
          <div className="flex-1 flex flex-col rounded-3xl glass-panel p-4 md:p-6 shadow-xl relative min-h-[500px]">
            <div className="flex flex-wrap border-b border-brand-border/60 pb-3 gap-2">
              <button
                onClick={() => setActiveTab("courses")}
                className={`flex items-center gap-2 text-xs md:text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === "courses"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <BookOpen className="w-4 h-4" /> Suggestions
              </button>
              <button
                onClick={() => {
                  setActiveTab("analytics");
                  syncDashboardMetrics();
                }}
                className={`flex items-center gap-2 text-xs md:text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === "analytics"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <LineChart className="w-4 h-4" /> Skills Competency
              </button>
              <button
                onClick={() => {
                  setActiveTab("roadmap");
                  syncRoadmapTimeline();
                }}
                className={`flex items-center gap-2 text-xs md:text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === "roadmap"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Compass className="w-4 h-4" /> Roadmap
              </button>
              <button
                onClick={() => {
                  setActiveTab("saved");
                  syncSavedRecommendations();
                }}
                className={`flex items-center gap-2 text-xs md:text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === "saved"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Bookmark className="w-4 h-4" /> Saved ({savedCourses.length})
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={`flex items-center gap-2 text-xs md:text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === "resume"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <FileText className="w-4 h-4" /> Resume Upload
              </button>
            </div>

            <div className="flex-1 mt-6">
              {/* Tab: Courses Suggestions Grid */}
              {activeTab === "courses" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedCourses.map((c, index) => {
                    const isAlreadySaved = savedCourses.some((item) => item.course?.id === c.id);
                    return (
                      <div
                        key={index}
                        className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[180px] shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full filter blur-lg"></div>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              {c.level || "Any"}
                            </span>
                            <button
                              onClick={() => handleSaveCourse(c.id)}
                              className={`p-1.5 rounded-lg border transition ${
                                isAlreadySaved
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                              }`}
                              title={isAlreadySaved ? "Bookmarked!" : "Bookmark course"}
                            >
                              <Bookmark className="w-3.5 h-3.5" fill={isAlreadySaved ? "currentColor" : "none"} />
                            </button>
                          </div>
                          <h3 className="text-base font-bold text-white mt-2.5 line-clamp-2 leading-tight">
                            {c.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                            {c.category || "General"} &bull; {c.provider}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-brand-border/40 mt-auto flex items-center justify-between">
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1.5 transition-all"
                          >
                            Enroll Course <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: SVG Radar Skills Analytics */}
              {activeTab === "analytics" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-400" /> Skill Competency Index
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 leading-normal">
                      Master skills dynamically calculated based on your database resume profile. Complete matching upskilling courses to auto-elevate competency index sectors!
                    </p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                          <span>Verified Skills Matched</span>
                          <span className="text-emerald-400">{matchedSkills.length}</span>
                        </div>
                        <div className="bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completionRate}%` }}></div>
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Target skill gap requirements:</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {missingSkills.map((s) => (
                            <span key={s} className="bg-red-500/10 text-red-300 border border-red-500/20 text-[10px] px-2 py-0.5 rounded font-semibold uppercase">
                              {s}
                            </span>
                          ))}
                          {missingSkills.length === 0 && (
                            <span className="text-xs text-emerald-400 font-semibold">🎉 All required role competencies satisfied!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="relative w-56 h-56">
                      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                        <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                        <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                        
                        <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                        <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                        <text x="50" y="-1" textAnchor="middle" fill="#818cf8" fontSize="3" fontWeight="bold">PROGRAMMING ({radarCoords.programming}%)</text>
                        <text x="96" y="52" textAnchor="start" fill="#818cf8" fontSize="3" fontWeight="bold">DATA SCIENCE ({radarCoords.data_science}%)</text>
                        <text x="50" y="103" textAnchor="middle" fill="#818cf8" fontSize="3" fontWeight="bold">CLOUD ({radarCoords.cloud}%)</text>
                        <text x="4" y="52" textAnchor="end" fill="#818cf8" fontSize="3" fontWeight="bold">SECURITY ({radarCoords.cybersecurity}%)</text>

                        {/* REACTIVE RADAR POLYGON */}
                        <polygon
                          points={getRadarPoints()}
                          fill="rgba(99, 102, 241, 0.25)"
                          stroke="rgba(99, 102, 241, 0.8)"
                          strokeWidth="1.2"
                          className="transition-all duration-500"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Saved Course Collections */}
              {activeTab === "saved" && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedCourses.map((item, index) => {
                      const c = item.course;
                      if (!c) return null;
                      return (
                        <div
                          key={index}
                          className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[150px] shadow-sm"
                        >
                          <div>
                            <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">
                              {c.title}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                              {c.category} &bull; {c.provider}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-brand-border/40 mt-auto flex items-center justify-between">
                            <a
                              href={c.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1.5"
                            >
                              Launch Class <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <span className="text-[10px] text-slate-500">Bookmarked</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {savedCourses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <Bookmark className="w-8 h-8 mb-2" />
                      <p className="text-xs font-semibold">No saved courses yet.</p>
                      <p className="text-[10px] mt-0.5">Click the bookmark icon on course suggestions to save them here!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Roadmap */}
              {activeTab === "roadmap" && (
                <div className="space-y-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-400" /> Career Mastery Timeline
                  </h3>
                  <div className="relative border-l border-brand-border/60 pl-6 ml-4 space-y-8 py-2">
                    {roadmapTimeline.map((step, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[31px] top-0 bg-indigo-600 border border-brand-border text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg shadow-indigo-600/35">
                          {idx + 1}
                        </div>
                        <h4 className="text-sm font-bold text-white leading-tight">
                          Upgrade: <span className="text-indigo-400 capitalize">{step.skill}</span> Requirement
                        </h4>
                        {step.course && step.course.title ? (
                          <div className="mt-2 bg-[#121214] border border-brand-border rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Recommended Course:</div>
                            <div className="text-xs text-white font-bold">{step.course.title}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest">{step.course.provider} &bull; {step.course.level}</div>
                            {step.course.link && (
                              <a
                                href={step.course.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-emerald-400 hover:underline inline-flex items-center gap-1 mt-1 font-bold"
                              >
                                Enroll Now <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-1">
                            Focus on mastering {step.skill} concepts, algorithms, and practical projects.
                          </p>
                        )}
                      </div>
                    ))}
                    {roadmapTimeline.length === 0 && (
                      <>
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0 bg-indigo-600 border border-brand-border text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg shadow-indigo-600/35">
                            1
                          </div>
                          <h4 className="text-sm font-bold text-white leading-tight">Foundational Concepts</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Master basic syntax, variables, algorithms, and development toolchains.
                          </p>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0 bg-indigo-600 border border-brand-border text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg shadow-indigo-600/35">
                            2
                          </div>
                          <h4 className="text-sm font-bold text-white leading-tight">Intermediate Applied Projects</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Implement relational structures, build fully integrated services, and deploy functional REST APIs.
                          </p>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0 bg-[#1e1e24] border border-brand-border text-slate-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                            3
                          </div>
                          <h4 className="text-sm font-bold text-slate-400 leading-tight">Advanced System Engineering & AI</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Deploy distributed micro-environments, orchestrate containers, and integrate complex neural models.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Drag-and-Drop Resume PDF Scanner */}
              {activeTab === "resume" && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-brand-border/80 hover:border-indigo-500/60 rounded-3xl p-6 transition-all duration-300 cursor-pointer ${
                    isUploading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf"
                    className="hidden"
                  />
                  <FileText className={`w-12 h-12 mb-4 ${isUploading ? "animate-spin text-emerald-400" : "text-slate-500 animate-bounce"}`} />
                  
                  {isUploading ? (
                    <>
                      <h4 className="text-sm font-bold text-white mb-1">Parsing PDF Resume Data...</h4>
                      <p className="text-xs text-slate-400 text-center max-w-xs leading-normal">
                        Analyzing technical skills, identifying career gaps, and executing semantic catalog searches...
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-bold text-white mb-1">Click to Upload Resume PDF</h4>
                      <p className="text-xs text-slate-400 text-center max-w-xs mb-4 leading-normal">
                        Drag-and-drop your profile resume. The AI will parse missing skill indices and compile instant recommendations!
                      </p>
                      
                      <div className="mb-4">
                        <label className="text-[10px] text-indigo-400 font-bold uppercase block mb-1 text-center">Select Target Career Goal:</label>
                        <select
                          value={targetRole}
                          onChange={(e) => {
                            e.stopPropagation();
                            setTargetRole(e.target.value);
                          }}
                          className="bg-[#121214] text-xs text-white border border-brand-border rounded px-3 py-1.5 outline-none"
                        >
                          <option value="Frontend Developer">Frontend Developer</option>
                          <option value="Backend Developer">Backend Developer</option>
                          <option value="Data Scientist">Data Scientist</option>
                          <option value="DevOps Engineer">DevOps & Cloud Engineer</option>
                          <option value="Mobile Developer">Mobile App Developer</option>
                          <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
                          <option value="Blockchain Developer">Blockchain Developer</option>
                        </select>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition shadow-lg shadow-indigo-600/20"
                      >
                        Select File
                      </button>
                      <span className="text-[10px] text-slate-500 mt-2">Supports PDF up to 4MB</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Auth Modal overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-3xl w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              {authMode === "login" ? "Account Sign In" : "Register Credentials"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Unlock cloud profile storage, saved bookmarks, and custom timelines.
            </p>

            {authError && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-300 mb-4 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-[#121214] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                    placeholder="John Doe"
                  />
                </div>
              )}
              
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-[#121214] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                  placeholder="enter username"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#121214] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/15"
              >
                {authMode === "login" ? "Login" : "Register"}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-brand-border/40 text-center text-xs text-slate-400">
              {authMode === "login" ? (
                <>
                  First time upskilling?{" "}
                  <button onClick={() => setAuthMode("register")} className="text-indigo-400 font-bold hover:underline">
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button onClick={() => setAuthMode("login")} className="text-indigo-400 font-bold hover:underline">
                    Sign In
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <footer className="py-4 border-t border-brand-border bg-black/20 text-center text-xs text-slate-500 mt-auto">
        &copy; {new Date().getFullYear()} ElevateAI Platform. Engineered with modular REST APIs & Cosine RAG models.
      </footer>
    </div>
  );
}

export default App;
