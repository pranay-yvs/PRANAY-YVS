import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Loader2, Sparkles, RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const initialNodes = [];
const initialEdges = [];

export default function MindMap({ materialId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMindMap = async () => {
      if (!materialId) return;
      const materialRef = doc(db, 'materials', materialId);
      const materialSnap = await getDoc(materialRef);
      if (materialSnap.exists()) {
        const data = materialSnap.data();
        if (data.mindMap) {
          setNodes(data.mindMap.nodes || []);
          setEdges(data.mindMap.edges || []);
        }
      }
    };
    fetchMindMap();
  }, [materialId]);

  const generateMindMap = async () => {
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
        contents: `Generate a mind map structure (nodes and edges) based on this text: ${extractedText.substring(0, 8000)}. 
        The mind map should have a central root node and several branches representing key concepts and their sub-concepts.
        Return as a JSON object with 'nodes' and 'edges' arrays.
        Each node should have: id, label, type ('input', 'default', 'output'), position {x, y}.
        Each edge should have: id, source, target, label (optional).`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    type: { type: Type.STRING },
                    position: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER }
                      }
                    }
                  },
                  required: ["id", "label", "position"]
                }
              },
              edges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    label: { type: Type.STRING }
                  },
                  required: ["id", "source", "target"]
                }
              }
            },
            required: ["nodes", "edges"]
          }
        }
      });

      const data = JSON.parse(response.text || '{"nodes":[], "edges":[]}');
      
      const formattedNodes = data.nodes.map((n) => ({
        ...n,
        data: { label: n.label },
        style: {
          background: n.type === 'input' ? '#4f46e5' : '#fff',
          color: n.type === 'input' ? '#fff' : '#1e293b',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px',
          fontSize: '12px',
          fontWeight: '600',
          width: 150,
          textAlign: 'center'
        }
      }));

      const formattedEdges = data.edges.map((e) => ({
        ...e,
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94a3b8',
        },
      }));

      await updateDoc(materialRef, {
        mindMap: { nodes: formattedNodes, edges: formattedEdges }
      });

      setNodes(formattedNodes);
      setEdges(formattedEdges);
    } catch (err) {
      console.error("Mind Map generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (nodes.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
          <Network size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Visual Learning Map</h2>
        <p className="text-slate-500 mb-8 max-w-md">Create an interactive AI-generated mind map to visualize connections between key concepts in your material.</p>
        <button
          onClick={generateMindMap}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <Sparkles size={20} />
          Generate Mind Map
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Network size={18} className="text-indigo-600" />
            Interactive Map
          </h3>
          <p className="text-xs text-slate-500">Drag nodes to reorganize your thoughts</p>
        </div>
        <button
          onClick={generateMindMap}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Regenerate Map
        </button>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-2">
        <div className="bg-white/80 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-sm flex gap-1">
          <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            AI Generated
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="bg-slate-50/50"
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} className="bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden" />
        <MiniMap 
          nodeColor={(n) => n.type === 'input' ? '#4f46e5' : '#fff'}
          maskColor="rgba(241, 245, 249, 0.7)"
          className="bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden"
        />
      </ReactFlow>

      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
          <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-900 font-bold text-lg">AI is mapping the concepts...</p>
          <p className="text-slate-500 text-sm">This may take a few moments</p>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-200 shadow-lg flex items-center gap-6 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-600 rounded-full" />
            Main Concept
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white border border-slate-300 rounded-full" />
            Sub-topic
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-t-2 border-slate-400" />
            Connection
          </div>
        </div>
      </div>
    </div>
  );
}
