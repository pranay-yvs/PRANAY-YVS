import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Study({ topics, materialId }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "I've analyzed your PDF! You can ask me anything about it or select a topic to dive deeper." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !materialId) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Fetch context from Firestore
      const materialRef = doc(db, 'materials', materialId);
      const materialSnap = await getDoc(materialRef);
      
      if (!materialSnap.exists()) {
        throw new Error("Material not found");
      }

      const { chunks } = materialSnap.data();
      const context = chunks ? chunks.slice(0, 5).join("\n") : "";

      // Call Gemini in the frontend
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context: ${context}\n\nQuestion: ${userMsg}\n\nAnswer the question based on the context provided.`,
      });

      setMessages(prev => [...prev, { role: 'bot', text: response.text || "I couldn't generate a response." }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]"
    >
      {/* Topics Sidebar */}
      <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={20} />
            Key Topics
          </h3>
          <div className="space-y-3">
            {topics.map((topic, i) => (
              <button 
                key={i}
                onClick={() => setInput(`Tell me more about ${topic}`)}
                className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
              >
                <p className="font-medium text-slate-700 group-hover:text-indigo-700">{topic}</p>
                <p className="text-xs text-slate-400 mt-1">Click to explore</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-indigo-900 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
          <h4 className="font-bold mb-2">Study Tip</h4>
          <p className="text-sm text-indigo-100 leading-relaxed">
            Try asking "Summarize the main points" or "What are the key definitions?" to get a quick overview of your material.
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                msg.role === 'bot' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {msg.role === 'bot' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'bot' 
                  ? 'bg-slate-50 text-slate-800 rounded-tl-none' 
                  : 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Loader2 className="animate-spin" size={20} />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none">
                <p className="text-sm text-slate-400 italic">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question about your study material..."
              className="w-full py-4 pl-6 pr-16 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-all shadow-md shadow-indigo-100"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
