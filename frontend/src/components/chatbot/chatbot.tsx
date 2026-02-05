import React, { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Loader2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Message {
  id: number
  text: string
  sender: 'user' | 'bot'
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hi! I'm your AI investment assistant. Ask me anything about your portfolio or stocks.", sender: 'bot' }
  ])
  
  // Auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  useEffect(scrollToBottom, [messages, isOpen])

  const handleSend = async () => {
    if (!input.trim()) return

    // 1. Add User Message
    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    const BASE_URL = "https://investment-backend-54qm.onrender.com"

    try {
      const token = localStorage.getItem("token")

      if(!token)
      {
        throw new Error("You are not logged in.");
      }
      // HIT YOUR BACKEND HERE
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" ,
                   "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: input })
      })

      if(!res.ok) {
        throw new Error("Failed to fetch response")
      }
      const data = await res.json()
      const botText = data.response 

      const botMsg: Message = { id: Date.now() + 1, text: botText, sender: 'bot' }
      setMessages(prev => [...prev, botMsg])

    } catch (error) {
      const errorMsg: Message = { id: Date.now() + 1, text: "Sorry, I couldn't reach the server.", sender: 'bot' }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend()
  }

  // --- RENDER ---

  // 1. The Floating Icon (Visible when chat is closed or minimized)
  if (!isOpen || isMinimized) {
    return (
      <Button 
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 text-white z-50 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
    )
  }

  // 2. The Chat Window
  return (
    <Card className="fixed bottom-6 right-6 w-80 md:w-96 shadow-2xl z-50 border-blue-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <CardHeader className="p-4 bg-blue-600 text-white flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          AI Assistant
        </CardTitle>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-blue-500 rounded"><Minimize2 className="h-4 w-4" /></button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-blue-500 rounded"><X className="h-4 w-4" /></button>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="p-4 h-80 overflow-y-auto bg-gray-50 flex flex-col gap-3">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              msg.sender === 'user' 
                ? "bg-blue-600 text-white self-end rounded-br-none" 
                : "bg-white border border-gray-200 text-gray-800 self-start rounded-bl-none shadow-sm"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="bg-white border border-gray-200 text-gray-800 self-start rounded-2xl rounded-bl-none px-3 py-2 shadow-sm flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            <span className="text-xs text-gray-400">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={handleKeyPress}
          placeholder="Ask about stocks..." 
          className="flex-1 focus-visible:ring-blue-600"
        />
        <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}