import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ExternalLink, Send, Sparkles } from "lucide-react";

export default function ChatPanel({ messages, input, setInput, isLoading, onSend, modelUsed }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <section className="glass-panel flex min-h-[620px] flex-col overflow-hidden rounded-3xl shadow-2xl lg:h-[calc(100vh-128px)]">
      <div className="flex items-center justify-between border-b border-brand-border bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10">
            <Sparkles className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Career Counselor</h2>
            <p className="text-xs text-indigo-300">{modelUsed ? `Model: ${modelUsed}` : "Grounded recommendation assistant"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.sender}-${index}`} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.sender === "user"
                  ? "rounded-br-sm bg-indigo-600 text-white"
                  : "rounded-bl-sm border border-brand-border bg-[#15151a] text-slate-200"
              }`}
            >
              <ReactMarkdown
                components={{
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all font-semibold text-emerald-300 underline"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && <div className="w-fit rounded-2xl border border-brand-border bg-white/5 px-4 py-3 text-xs text-slate-300">Thinking through your best next move...</div>}
        <div ref={endRef} />
      </div>

      <div className="border-t border-brand-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {["Beginner", "Intermediate", "Advanced"].map((level) => (
            <button
              key={level}
              onClick={() => onSend(level)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-400 hover:text-white"
            >
              {level}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask for a roadmap, course, or skill gap..."
            className="min-w-0 flex-1 rounded-2xl border border-brand-border bg-[#111116] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <button
            disabled={isLoading}
            className="rounded-2xl bg-indigo-600 px-4 py-3 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </section>
  );
}
