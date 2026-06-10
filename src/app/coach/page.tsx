"use client";

import { FormEvent, useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { askCoach, SUGGESTED_QUESTIONS } from "@/lib/engine/coach";
import { Button, Card } from "@/components/ui";
import { Bot, Send, User } from "lucide-react";

interface Message {
  role: "user" | "coach";
  text: string;
  bullets?: string[];
}

export default function CoachPage() {
  const { profile, assets, liabilities } = usePlanner();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "coach",
      text: "Hi! I'm your retirement coach. Every answer I give is computed live from your actual plan — ask me anything, or try one of the suggestions below.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);


  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    const reply = askCoach(q, { profile, assets, liabilities });
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      { role: "coach", text: reply.answer, bullets: reply.bullets },
    ]);
    setInput("");
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Retirement Coach</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Answers are calculated from your own numbers using the same engines as the dashboards — no generic advice.
        </p>
      </div>

      <Card>
        <div className="flex max-h-[28rem] flex-col gap-4 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm dark:bg-slate-800"
                }
              >
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold opacity-70">
                  {m.role === "user" ? <User size={12} /> : <Bot size={12} />}
                  {m.role === "user" ? "You" : "Coach"}
                </div>
                <p>{m.text}</p>
                {m.bullets && m.bullets.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {m.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Can I retire at 52?"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            aria-label="Ask the coach a question"
          />
          <Button type="submit">
            <span className="flex items-center gap-1.5">
              <Send size={14} /> Ask
            </span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
