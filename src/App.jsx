import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileUp, 
  MessageSquare, 
  GraduationCap,
  ChevronRight,
  Menu,
  X,
  Layers,
  Network,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Quiz from './pages/Quiz';
import Flashcards from './pages/Flashcards';
import MindMap from './pages/MindMap';

// Auth Context
const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasPdf, setHasPdf] = useState(false);
  const [topics, setTopics] = useState([]);
  const [materialId, setMaterialId] = useState(null);

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // Update profile with display name
        await updateProfile(newUser, { displayName });

        // Sync to Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
          uid: newUser.uid,
          email: newUser.email,
          displayName: displayName,
          photoURL: `https://picsum.photos/seed/${newUser.uid}/100/100`,
          role: 'student',
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setAuthError(error.message || "Authentication failed");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setActiveTab('home');
      setHasPdf(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    { id: 'home', label: 'Upload & Info', icon: FileUp },
    { id: 'study', label: 'Study & Chat', icon: MessageSquare, disabled: !hasPdf },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, disabled: !hasPdf },
    { id: 'mindmap', label: 'Mind Map', icon: Network, disabled: !hasPdf },
    { id: 'quiz', label: 'Quizzes', icon: GraduationCap, disabled: !hasPdf },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Initializing AI Learn...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-indigo-100 p-10 border border-slate-100"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-200">
            <BookOpen size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">AI Learn</h1>
          <p className="text-slate-500 text-center mb-8">
            {isSignUp ? 'Create your account to start learning' : 'Sign in to continue your learning journey'}
          </p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <p className="text-red-500 text-xs mt-2">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-6"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Mobile Sidebar Toggle */}
        <button 
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          className="bg-white border-r border-slate-200 overflow-hidden flex-shrink-0 z-40 flex flex-col"
        >
          <div className="p-6 flex items-center gap-3 border-bottom border-slate-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">AI Learn</h1>
          </div>

          <nav className="mt-6 px-3 space-y-1 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {activeTab === item.id && (
                  <motion.div layoutId="active" className="ml-auto">
                    <ChevronRight size={16} />
                  </motion.div>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800 capitalize">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.displayName || user.email}</p>
                <p className="text-xs text-slate-500 capitalize">{user.email === 'yvspranay@gmail.com' ? 'Admin' : 'Student'} Account</p>
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm overflow-hidden">
                <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="User" referrerPolicy="no-referrer" />
              </div>
            </div>
          </header>

          <div className="p-8 max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <Home onUploadSuccess={(data) => {
                  setHasPdf(true);
                  setTopics(data.topics);
                  setMaterialId(data.materialId);
                  setActiveTab('study');
                }} />
              )}
              {activeTab === 'study' && (
                <Study topics={topics} materialId={materialId} />
              )}
              {activeTab === 'quiz' && (
                <Quiz topics={topics} materialId={materialId} />
              )}
              {activeTab === 'flashcards' && (
                <Flashcards materialId={materialId} />
              )}
              {activeTab === 'mindmap' && (
                <MindMap materialId={materialId} />
              )}
              {activeTab === 'dashboard' && (
                <Dashboard />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
