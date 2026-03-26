import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Loader2, RotateCw, CheckCircle2, XCircle, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function Flashcards({ materialId }) {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFlashcards = async () => {
      if (!materialId) return;
      const materialRef = doc(db, 'materials', materialId);
      const materialSnap = await getDoc(materialRef);
      if (materialSnap.exists()) {
        const data = materialSnap.data();
        if (data.flashcards) {
          setFlashcards(data.flashcards);
        }
      }
    };
    fetchFlashcards();
  }, [materialId]);

  const generateFlashcards = async () => {
    if (!materialId) return;
    setIsLoading(true);
    try {
      const materialRef = doc(db, 'materials', materialId);
      const materialSnap = await getDoc(materialRef);
      if (!materialSnap.exists()) throw new Error("Material not found");

      const { extractedText } = materialSnap.data();

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 10 flashcards for active recall based on this text: ${extractedText.substring(0, 8000)}. 
        Each flashcard should have a 'front' (question/concept) and 'back' (answer/explanation).
        Return as a JSON array of objects.`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              },
              required: ["front", "back"]
            }
          }
        }
      });

      const newCards = JSON.parse(response.text || "[]").map((card, index) => ({
        ...card,
        id: Math.random().toString(36).substr(2, 9),
        mastered: false
      }));

      await updateDoc(materialRef, {
        flashcards: newCards
      });

      setFlashcards(newCards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error("Flashcard generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMastered = async (index) => {
    if (!materialId) return;
    const updatedCards = [...flashcards];
    updatedCards[index].mastered = !updatedCards[index].mastered;
    setFlashcards(updatedCards);

    const materialRef = doc(db, 'materials', materialId);
    await updateDoc(materialRef, {
      flashcards: updatedCards
    });
  };

  if (flashcards.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
          <Layers size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Flashcards Yet</h2>
        <p className="text-slate-500 mb-8 max-w-md">Generate AI-powered flashcards to test your knowledge and improve retention.</p>
        <button
          onClick={generateFlashcards}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <Sparkles size={20} />
          Generate Flashcards
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">AI is crafting your flashcards...</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Flashcards</h2>
          <p className="text-slate-500">Master {flashcards.length} key concepts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-400">{currentIndex + 1} / {flashcards.length}</span>
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative h-96 perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex + (isFlipped ? '-back' : '-front')}
            initial={{ rotateY: isFlipped ? -180 : 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 180 : -180, opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-full cursor-pointer"
          >
            <div className={`w-full h-full bg-white rounded-3xl shadow-xl border-2 ${currentCard.mastered ? 'border-green-200' : 'border-slate-100'} p-12 flex flex-col items-center justify-center text-center relative overflow-hidden`}>
              {currentCard.mastered && (
                <div className="absolute top-4 right-4 text-green-500 flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={16} />
                  Mastered
                </div>
              )}
              
              <div className="text-slate-400 mb-4 uppercase text-xs font-bold tracking-widest">
                {isFlipped ? 'Answer' : 'Question'}
              </div>
              
              <h3 className={`text-2xl font-medium text-slate-800 leading-relaxed ${isFlipped ? 'text-indigo-600' : ''}`}>
                {isFlipped ? currentCard.back : currentCard.front}
              </h3>

              <div className="absolute bottom-8 text-slate-300 flex items-center gap-2 text-sm">
                <RotateCw size={16} />
                Click to flip
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-12">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex(prev => Math.max(0, prev - 1));
            }}
            disabled={currentIndex === 0}
            className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex(prev => Math.min(flashcards.length - 1, prev + 1));
            }}
            disabled={currentIndex === flashcards.length - 1}
            className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <button
          onClick={() => toggleMastered(currentIndex)}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all ${
            currentCard.mastered 
              ? 'bg-slate-100 text-slate-500' 
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          {currentCard.mastered ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
          {currentCard.mastered ? 'Mark as Unlearned' : 'Mark as Mastered'}
        </button>
      </div>

      <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-indigo-600" size={20} />
          <h4 className="font-bold text-indigo-900">Study Tip</h4>
        </div>
        <p className="text-indigo-700 text-sm">
          Active recall is the most effective way to learn. Try to answer the question out loud before flipping the card!
        </p>
      </div>
    </div>
  );
}
