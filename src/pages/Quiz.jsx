import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Loader2, CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { getGeminiAI } from '../lib/gemini';
import { useAuth } from '../App';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { auth as firebaseAuth } from '../firebase';

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous,
      tenantId: firebaseAuth.currentUser?.tenantId,
      providerInfo: firebaseAuth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Quiz({ topics, materialId }) {
  const { user } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  const startQuiz = async (topic) => {
    if (!materialId) return;
    setSelectedTopic(topic);
    setIsLoading(true);
    try {
      // Fetch context from Firestore
      let materialSnap;
      try {
        const materialRef = doc(db, 'materials', materialId);
        materialSnap = await getDoc(materialRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `materials/${materialId}`);
      }
      
      if (!materialSnap.exists()) {
        throw new Error("Material not found");
      }

      const { extractedText } = materialSnap.data();

      // Call Gemini in the frontend
      const ai = getGeminiAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a 5-question MCQ quiz about "${topic}" based on this text: ${extractedText.substring(0, 8000)}. 
        Return as a JSON array of objects with: question, options (array of 4), correctAnswer (index 0-3), explanation.`,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || "[]");
      setQuiz(data);
      setCurrentStep(0);
      setAnswers([]);
      setIsFinished(false);
    } catch (err) {
      console.error("Quiz generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (index) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = index;
    setAnswers(newAnswers);
  };

  const nextStep = () => {
    if (quiz && currentStep < quiz.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!quiz || !user || !materialId) return;
    const score = answers.reduce((acc, curr, i) => {
      return acc + (curr === quiz[i].correctAnswer ? 1 : 0);
    }, 0);

    setIsFinished(true);

    try {
      await addDoc(collection(db, 'quizAttempts'), {
        userId: user.uid,
        materialId: materialId,
        topic: selectedTopic,
        score,
        total: quiz.length,
        percentage: (score / quiz.length) * 100,
        date: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'quizAttempts');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-lg font-medium text-slate-600">Generating your personalized quiz...</p>
      </div>
    );
  }

  if (!selectedTopic) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-2xl font-bold mb-2">Ready to test your knowledge?</h3>
          <p className="text-slate-500 mb-8">Select a topic from your PDF to generate a custom quiz.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {topics.map((topic, i) => (
              <button
                key={i}
                onClick={() => startQuiz(topic)}
                className="p-6 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
              >
                <h4 className="font-bold text-slate-800 group-hover:text-indigo-700">{topic}</h4>
                <div className="flex items-center gap-2 mt-2 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold uppercase tracking-wider">Start Quiz</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (isFinished) {
    const score = answers.reduce((acc, curr, i) => acc + (curr === quiz[i].correctAnswer ? 1 : 0), 0);
    const percentage = (score / quiz.length) * 100;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl text-center">
          <div className="mb-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
              percentage >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <span className="text-3xl font-bold">{percentage}%</span>
            </div>
            <h3 className="text-3xl font-bold mb-2">Quiz Completed!</h3>
            <p className="text-slate-500">You scored {score} out of {quiz.length} on {selectedTopic}</p>
          </div>

          <div className="space-y-4 text-left mb-10">
            {quiz.map((q, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${
                answers[i] === q.correctAnswer ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
                <div className="flex items-start gap-3">
                  {answers[i] === q.correctAnswer ? (
                    <CheckCircle2 className="text-emerald-500 mt-1 flex-shrink-0" size={18} />
                  ) : (
                    <XCircle className="text-red-500 mt-1 flex-shrink-0" size={18} />
                  )}
                  <div>
                    <p className="font-bold text-slate-800 mb-1">{q.question}</p>
                    <p className="text-sm text-slate-600 italic">{q.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setSelectedTopic(null)}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all"
            >
              Back to Topics
            </button>
            <button 
              onClick={() => startQuiz(selectedTopic)}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentQ = quiz[currentStep];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-1">Question {currentStep + 1} of {quiz.length}</p>
          <h3 className="text-2xl font-bold text-slate-800">{selectedTopic}</h3>
        </div>
        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500" 
            style={{ width: `${((currentStep + 1) / quiz.length) * 100}%` }}
          />
        </div>
      </div>

      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg"
      >
        <p className="text-xl font-medium text-slate-800 mb-8">{currentQ.question}</p>
        
        <div className="space-y-4">
          {currentQ.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex items-center justify-between group ${
                answers[currentStep] === i 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <span className="font-medium">{option}</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                answers[currentStep] === i ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-slate-400'
              }`}>
                {answers[currentStep] === i && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          ))}
        </div>

        <button
          disabled={answers[currentStep] === undefined}
          onClick={nextStep}
          className="mt-10 w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
        >
          {currentStep === quiz.length - 1 ? 'Finish Quiz' : 'Next Question'}
          <ArrowRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}
