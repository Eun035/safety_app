import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Activity, Award, AlertCircle, 
  TrendingUp, Map as MapIcon, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Search, 
  ShieldCheck, Clock, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const AdminDashboard = ({ onClose }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRides: 0,
    totalPoints: 0,
    totalHazards: 0,
    avgSafetyScore: 0
  });
  const [recentRides, setRecentRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Summary Stats
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: rideCount } = await supabase.from('rides').select('*', { count: 'exact', head: true });
        const { count: hazardCount } = await supabase.from('hazards').select('*', { count: 'exact', head: true });
        
        const { data: profileData } = await supabase.from('profiles').select('points, safety_score');
        const pointsTotal = profileData?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;
        const avgScore = profileData?.length > 0 
          ? profileData.reduce((acc, curr) => acc + (curr.safety_score || 0), 0) / profileData.length 
          : 0;

        setStats({
          totalUsers: userCount || 0,
          totalRides: rideCount || 0,
          totalPoints: pointsTotal,
          totalHazards: hazardCount || 0,
          avgSafetyScore: Math.round(avgScore)
        });

        // 2. Fetch Recent Rides with nicknames
        const { data: rides } = await supabase
          .from('rides')
          .select(`
            id,
            distance,
            start_time,
            is_safe_ride,
            profiles (nickname)
          `)
          .order('start_time', { ascending: false })
          .limit(6);
        
        setRecentRides(rides || []);

      } catch (error) {
        console.error('[C-Safe Admin] Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const StatCard = ({ icon: Icon, label, value, trend, color }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-xl border border-white/5 p-5 rounded-3xl"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-400`}>
          <Icon size={20} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      </div>
      <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-black text-white italic">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-black text-white overflow-y-auto font-pretendard">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <div className="fixed top-0 left-0 w-full h-screen bg-gradient-to-b from-blue-900/10 via-black to-black pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-2 text-cyber-cyan mb-1">
              <ShieldCheck size={18} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">B2G Management Console</span>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter">C-Safe Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 transition-colors">
              <Download size={20} className="text-gray-400" />
            </button>
            <button 
              onClick={onClose}
              className="bg-cyber-cyan text-black px-6 py-3 rounded-2xl font-black shadow-neon-cyan active:scale-95 transition-all"
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard icon={Users} label="Total Riders" value={stats.totalUsers} trend={12} color="blue" />
          <StatCard icon={Activity} label="Total Rides" value={stats.totalRides} trend={24} color="purple" />
          <StatCard icon={Award} label="Points Issued" value={stats.totalPoints} trend={8} color="amber" />
          <StatCard icon={ShieldCheck} label="Avg Safety Score" value={`${stats.avgSafetyScore}%`} trend={2} color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Rides Table */}
          <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black italic">Recent Safety Logs</h2>
              <button className="text-xs font-bold text-cyber-cyan flex items-center gap-1 group">
                View All <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="space-y-4">
              {recentRides.map((ride, idx) => (
                <div key={ride.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${ride.is_safe_ride ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      <Activity size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{ride.profiles?.nickname || 'Anonymous'}</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {new Date(ride.start_time).toLocaleString()} • {ride.distance}km
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                      ride.is_safe_ride 
                        ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' 
                        : 'border-rose-500/20 text-rose-400 bg-rose-500/5'
                    }`}>
                      {ride.is_safe_ride ? 'CLEAN' : 'SUDDEN STOP'}
                    </span>
                  </div>
                </div>
              ))}
              {recentRides.length === 0 && !isLoading && (
                <div className="text-center py-10 text-gray-500 text-sm italic">No ride logs found.</div>
              )}
            </div>
          </div>

          {/* Right Column: Hazards & Quick Actions */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-cyber-cyan/20 to-purple-500/20 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="text-cyber-cyan" size={24} />
                <h2 className="text-xl font-black italic">Safety Hazards</h2>
              </div>
              <div className="text-5xl font-black text-white italic tracking-tighter mb-2">
                {stats.totalHazards}
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Current active reports</p>
              <button className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Map Analysis
              </button>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">B2G Settings</h2>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 text-xs font-bold border border-white/5 hover:bg-white/10 transition-colors">
                  <span>Point Issuance Policy</span>
                  <ChevronRight size={14} />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 text-xs font-bold border border-white/5 hover:bg-white/10 transition-colors">
                  <span>Geofencing Zones</span>
                  <ChevronRight size={14} />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 text-xs font-bold border border-white/5 hover:bg-white/10 transition-colors">
                  <span>Data Export (CSV)</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
