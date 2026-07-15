"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Bot, User } from "lucide-react"
import { useSession } from "@/context/session-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function ChatbotWidget() {
  const { token } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading || !token) return

    setError(null)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/chatbot`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            conversation_id: conversationId,
          }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const message = body.error?.message || body.detail || "Failed to get response"
        throw new Error(message)
      }

      const data: { reply: string; conversation_id?: string; escalate?: boolean } = await res.json()

      if (data.conversation_id) {
        setConversationId(data.conversation_id)
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-[var(--shadow-card)]" style={{ height: "min(480px, 60vh)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#2B7BC4]">
          <Bot className="size-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0D2137]">General Support</p>
          <p className="text-[10px] text-gray-400">Ask anything about your account or services</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#E8F4FD]">
              <Bot className="size-6 text-[#2B7BC4]" />
            </div>
            <p className="mt-4 text-sm font-medium text-[#0D2137]">How can we help?</p>
            <p className="mt-1 text-xs text-gray-400">
              Ask a question and our AI assistant will help you.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2.5",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E8F4FD]">
                <Bot className="size-3.5 text-[#2B7BC4]" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-xl px-4 py-2.5",
                msg.role === "user"
                  ? "bg-[#2B7BC4] text-white rounded-br-sm"
                  : "bg-gray-100 text-[#0D2137] rounded-bl-sm"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  msg.role === "user" ? "text-white/50" : "text-gray-400"
                )}
              >
                {msg.timestamp.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                <User className="size-3.5 text-gray-500" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E8F4FD]">
              <Bot className="size-3.5 text-[#2B7BC4]" />
            </div>
            <div className="rounded-xl bg-gray-100 px-4 py-3 rounded-bl-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-[#2B7BC4]" />
                <span className="text-xs text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#0D2137] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2B7BC4]/20 focus:border-[#2B7BC4] min-h-[40px] max-h-[120px]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
