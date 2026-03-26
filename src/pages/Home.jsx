import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileUp, CheckCircle2, Loader2, Info, LayoutDashboard, MessageSquare, GraduationCap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../App';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { auth } from '../firebase';

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
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

// Set worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function Home({ onUploadSuccess }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const extractTextFromPdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const pageTexts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
      pageTexts.push(pageText);
    }

    return {
      fullText,
      pageCount: pdf.numPages,
      chunks: fullText.match(/[\s\S]{1,2000}/g) || []
    };
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      // Process PDF in the frontend to avoid cookie check issues with backend API
      const { fullText, pageCount, chunks } = await extractTextFromPdf(file);
      
      // Extract topics using Gemini in the frontend
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract 3-5 main educational topics from this text. Return as a JSON array of strings: ${fullText.substring(0, 10000)}`,
        config: { responseMimeType: "application/json" }
      });

      let topics = ["General Overview"];
      try {
        topics = JSON.parse(aiResponse.text || "[]");
      } catch (e) {
        console.error("Failed to parse topics", e);
      }

      // Save material to Firestore
      let materialRef;
      try {
        materialRef = await addDoc(collection(db, 'materials'), {
          title: file.name,
          extractedText: fullText,
          chunks: chunks,
          topics: topics,
          creatorId: user.uid,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'materials');
      }

      onUploadSuccess({ 
        fullText, 
        pageCount, 
        chunks, 
        topics, 
        materialId: materialRef.id 
      });
    } catch (err) {
      console.error("Upload/AI error:", err);
      setError(err.message || 'Failed to process PDF. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-2xl font-bold mb-2">Welcome to AI Learning Platform</h3>
        <p className="text-slate-500 mb-8">Upload your study material in PDF format to start your AI-powered learning journey.</p>

        <div 
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            file ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <input 
            type="file" 
            id="pdf-upload" 
            className="hidden" 
            accept=".pdf"
            onChange={handleFileChange}
          />
          <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <FileUp size={32} />
            </div>
            <p className="text-lg font-semibold mb-1">
              {file ? file.name : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-slate-400">PDF files only (max 10MB)</p>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
            <Info size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          disabled={!file || isUploading}
          onClick={handleUpload}
          className="mt-8 w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3"
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin" />
              Processing PDF...
            </>
          ) : (
            <>
              <CheckCircle2 size={24} />
              Analyze Study Material
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Interactive Chat', desc: 'Ask questions about your PDF and get instant answers.', icon: MessageSquare },
          { title: 'Smart Quizzes', desc: 'AI generates quizzes based on your content to test your knowledge.', icon: GraduationCap },
          { title: 'Progress Tracking', desc: 'Monitor your learning performance with detailed analytics.', icon: LayoutDashboard },
        ].map((feature, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4">
              <feature.icon size={24} />
            </div>
            <h4 className="font-bold mb-2">{feature.title}</h4>
            <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
