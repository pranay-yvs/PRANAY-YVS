import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock, 
  Award,
  Calendar,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../App';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'quizAttempts'),
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'quizAttempts');
        }
        const attempts = querySnapshot.docs.map(doc => doc.data());
        
        const totalQuizzes = attempts.length;
        const avgScore = totalQuizzes > 0 
          ? attempts.reduce((acc, curr) => acc + curr.percentage, 0) / totalQuizzes 
          : 0;
        
        let performance = "Low";
        if (avgScore > 80) performance = "High";
        else if (avgScore > 50) performance = "Medium";

        setData({
          totalQuizzes,
          avgScore: Math.round(avgScore),
          performance,
          recentAttempts: attempts.slice(0, 5),
          allAttempts: [...attempts].reverse() // For chart
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  const chartData = {
    labels: data?.allAttempts.map((_, i) => `Quiz ${i + 1}`) || [],
    datasets: [
      {
        label: 'Score %',
        data: data?.allAttempts.map(a => a.percentage) || [],
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      }
    },
    scales: {
      y: { min: 0, max: 100, grid: { display: false } },
      x: { grid: { display: false } }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Quizzes', value: data?.totalQuizzes, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Average Score', value: `${data?.avgScore}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Performance', value: data?.performance, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Learning Streak', value: '3 Days', icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold">Learning Progress</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Last 30 Days</span>
            </div>
          </div>
          <div className="h-64">
            {data?.allAttempts.length ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                No quiz data yet. Start learning to see your progress!
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Recent Quizzes</h3>
          <div className="space-y-4">
            {data?.recentAttempts.length ? data.recentAttempts.map((attempt, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  attempt.percentage >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <Trophy size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{attempt.topic}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(attempt.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{attempt.score}/{attempt.total}</p>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock size={24} />
                </div>
                <p className="text-sm text-slate-500">No recent activity</p>
              </div>
            )}
          </div>
          {data?.allAttempts.length ? (
            <button className="w-full mt-6 py-3 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              View All History
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
