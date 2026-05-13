import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Activity, Award, AlertCircle, 
  TrendingUp, Map as MapIcon, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Search, 
  ShieldCheck, Clock, Download, Sparkles,
  MapPin, Info, BrainCircuit, ShieldAlert,
  Route, Waves, Zap, Landmark, Trees, 
  Navigation2, CheckCircle2
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
  const [hazards, setHazards] = useState([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const [analysisMode, setAnalysisMode] = useState('NORMAL'); // 'NORMAL' | 'OPTIMIZER' | 'SAFETY' | 'VIBE'

  // 🚀 AI 분석 데이터 (확장된 추천안)
  const recommendations = useMemo(() => {
    return {
      optimization: [
        { id: 1, lat: 36.839, lng: 127.182, name: "대학로 메인 스트리트", score: 98, reason: "이용률 상위 3% 구역" },
        { id: 2, lat: 36.812, lng: 127.110, name: "신불당 상업지구", score: 92, reason: "공급 음영 구역" }
      ],
      safety: [
        { id: 101, lat: 36.835, lng: 127.142, name: "두정동 사고 다발 사거리", reduction: "45%", reason: "급정거 로그 집중 구역. 진입 전 헬멧 인증 필수 거점 제안." },
        { id: 102, lat: 36.841, lng: 127.121, name: "성성동 경사 구간 초입", reduction: "38%", reason: "슬로프 낙상 위험 지역. 안전모 미착용 시 대여 제한 구역 설정 권장." }
      ],
      vibeProposals: [
        { id: 'v1', type: 'SAFETY', name: '안전 최우선', color: '#10b981', icon: ShieldCheck, desc: '사고 위험 지점 100% 우회 경로' },
        { id: 'v2', type: 'BIKE', name: '자전거 도로 특화', color: '#3b82f6', icon: Navigation2, desc: '전용 도로 활용도 85% 이상' },
        { id: 'v3', type: 'FAST', name: '최단 거리 숏컷', color: '#f59e0b', icon: Zap, desc: '데이터 기반 신호 대기 최소화 동선' },
        { id: 'v4', type: 'REWARD', name: '리워드 맥시마이저', color: '#f43f5e', icon: Award, desc: '고배율 포인트 스테이션 경유 루트' },
        { id: 'v5', type: 'SUNSET', name: '노을 맛집', color: '#fb923c', icon: Waves, desc: '조망권 및 일몰 시간 데이터 반영' },
        { id: 'v6', type: 'FOREST', name: '가로수 힐링길', color: '#22c55e', icon: Trees, desc: '녹지 분포 및 공기질 우수 경로' },
        { id: 'v7', type: 'URBAN', name: '도심 시티투어', color: '#8b5cf6', icon: Landmark, desc: '주요 랜드마크 중심 관주 주행' }
      ]
    };
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
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

        const { data: rides } = await supabase.from('rides').select('*, profiles(nickname)').order('start_time', { ascending: false }).limit(6);
        setRecentRides(rides || []);

        const { data: hazardsData } = await supabase.from('hazards').select('*');
        setHazards(hazardsData || []);
      } catch (error) {
        console.error('[C-Safe Admin] Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const StatCard = ({ icon: Icon, label, value, trend, color }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/50 backdrop-blur-xl border border-white/5 p-5 rounded-3xl">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-400`}>
          <Icon size={20} />
        </div>
        <div className={`text-[10px] font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      </div>
      <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-black text-white italic">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-black text-white overflow-y-auto font-pretendard">
      <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-2 text-cyber-cyan mb-1">
              <ShieldCheck size={18} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">B2G AI Strategy Hub</span>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter">Management Console</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setAnalysisMode('SAFETY'); setIsMapOpen(true); }}
              className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 px-5 py-3 rounded-2xl border border-rose-500/30 flex items-center gap-2 transition-all"
            >
              <ShieldAlert size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Safety Analysis</span>
            </button>
            <button 
              onClick={() => { setAnalysisMode('VIBE'); setIsMapOpen(true); }}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-5 py-3 rounded-2xl border border-emerald-500/30 flex items-center gap-2 transition-all"
            >
              <Route size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Vibe Designer</span>
            </button>
            <button onClick={onClose} className="bg-cyber-cyan text-black px-6 py-3 rounded-2xl font-black shadow-neon-cyan">CLOSE</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard icon={Users} label="Total Riders" value={stats.totalUsers} trend={12} color="blue" />
          <StatCard icon={Activity} label="Safety Incidents" value={stats.totalHazards} trend={-5} color="rose" />
          <StatCard icon={Award} label="Reward Value" value={stats.totalPoints} trend={8} color="amber" />
          <StatCard icon={ShieldCheck} label="Stability Rating" value="94%" trend={2} color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black italic">Cumulative Traffic Analysis</h2>
              <button className="text-xs font-bold text-cyber-cyan uppercase tracking-widest">Real-time Feed</button>
            </div>
            
            <div className="space-y-4">
              {recentRides.map((ride) => (
                <div key={ride.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5 text-gray-400"><Activity size={18} /></div>
                    <div>
                      <p className="font-bold text-sm">{ride.profiles?.nickname || 'Rider'}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{ride.distance}km • {new Date(ride.start_time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className={`text-[10px] font-black px-3 py-1 rounded-full border ${ride.is_safe_ride ? 'border-emerald-500/20 text-emerald-400' : 'border-rose-500/20 text-rose-400'}`}>
                    {ride.is_safe_ride ? 'PROTECTED' : 'AT RISK'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-rose-600/20 to-purple-600/20 backdrop-blur-xl border border-rose-500/20 rounded-[2.5rem] p-8 shadow-neon-rose group">
               <div className="flex items-center gap-3 mb-6">
                  <ShieldAlert className="text-rose-400" size={24} />
                  <h2 className="text-xl font-black italic">Accident Reduction</h2>
               </div>
               <div className="space-y-4">
                 {recommendations.safety.map(rec => (
                   <div key={rec.id} className="bg-black/40 p-4 rounded-2xl border border-white/5">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-black text-rose-400 uppercase">Hazard Target</span>
                        <span className="text-[10px] font-bold text-rose-400">-{rec.reduction} Potential</span>
                      </div>
                      <p className="text-xs font-black text-white">{rec.name}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{rec.reason}</p>
                   </div>
                 ))}
               </div>
               <button onClick={() => { setAnalysisMode('SAFETY'); setIsMapOpen(true); }} className="w-full mt-6 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">View Safety Map</button>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8">
              <div className="flex items-center gap-2 mb-6">
                 <Route size={18} className="text-emerald-400" />
                 <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Vibe Proposer</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 {recommendations.vibeProposals.slice(0, 4).map(vibe => (
                   <div key={vibe.id} className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                      <vibe.icon size={16} className="mx-auto mb-2" style={{ color: vibe.color }} />
                      <p className="text-[10px] font-black text-white">{vibe.name}</p>
                   </div>
                 ))}
              </div>
              <button onClick={() => { setAnalysisMode('VIBE'); setIsMapOpen(true); }} className="w-full mt-4 text-[10px] font-bold text-cyber-cyan hover:underline uppercase tracking-widest">Design More Vibes</button>
            </div>
          </div>
        </div>
      </div>

      {/* 🗺️ Strategy Map Overlay (Expanded) */}
      {isMapOpen && (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col animate-in fade-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-gray-900/90 backdrop-blur-md">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-black italic">
                {analysisMode === 'SAFETY' ? "Safety-First Station recommendation" : 
                 analysisMode === 'VIBE' ? "Route Vibe Intelligence" : "Strategy Center"}
              </h2>
            </div>
            <button onClick={() => { setIsMapOpen(false); setAnalysisMode('NORMAL'); }} className="text-gray-400 hover:text-white font-black text-sm uppercase tracking-widest">Close Hub</button>
          </div>

          <div className="flex-1 relative bg-gray-900 flex overflow-hidden">
            {/* Left Sidebar: Contextual Info */}
            <div className="w-80 h-full bg-gray-900 border-r border-white/10 p-6 overflow-y-auto z-10">
              {analysisMode === 'SAFETY' && (
                <div className="space-y-6">
                  <div className="p-4 bg-rose-600/10 border border-rose-500/30 rounded-2xl">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Safety Goal</p>
                    <p className="text-sm font-bold text-white">사고 위험 구역 내 헬멧 착용률 100% 달성</p>
                  </div>
                  {recommendations.safety.map(rec => (
                    <div key={rec.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-sm font-black text-white mb-2">{rec.name}</p>
                      <div className="flex items-center gap-2 text-rose-400 mb-3">
                        <ShieldAlert size={14} />
                        <span className="text-[10px] font-bold">Predicted Impact: {rec.reduction} Reduction</span>
                      </div>
                      <button className="w-full py-2 bg-rose-500 text-white text-[10px] font-black rounded-lg">DEPLOY STATION</button>
                    </div>
                  ))}
                </div>
              )}

              {analysisMode === 'VIBE' && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Select Vibe to Preview</p>
                  {recommendations.vibeProposals.map(vibe => (
                    <div key={vibe.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                         <div className="p-2 rounded-lg" style={{ backgroundColor: `${vibe.color}20` }}>
                            <vibe.icon size={16} style={{ color: vibe.color }} />
                         </div>
                         <p className="text-sm font-black text-white">{vibe.name}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors">{vibe.desc}</p>
                    </div>
                  ))}
                  <button className="w-full mt-4 py-4 bg-cyber-cyan text-black font-black text-xs rounded-2xl shadow-neon-cyan">PUBLISH TO APP</button>
                </div>
              )}
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
              <div id="admin-strategy-map" className="w-full h-full"></div>
              
              <div className="absolute bottom-6 left-6 z-10 flex gap-2">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div> HIGH RISK
                </div>
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> SAFE FLOW
                </div>
              </div>
            </div>
          </div>
          
          <AdminMapInitializer 
            hazards={hazards} 
            analysisMode={analysisMode}
            recommendations={recommendations}
          />
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

const AdminMapInitializer = ({ hazards, analysisMode, recommendations }) => {
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) return;
    const container = document.getElementById('admin-strategy-map');
    if (!container) return;

    const options = { center: new window.kakao.maps.LatLng(36.833, 127.179), level: 5 };
    const map = new window.kakao.maps.Map(container, options);

    if (analysisMode === 'SAFETY') {
      // 🚨 사고 저감 스테이션 마커 (Rose Gold / Red)
      recommendations.safety.forEach(rec => {
        const content = `
          <div style="padding: 10px 15px; background: #f43f5e; border-radius: 15px; color: white; font-size: 11px; font-weight: 900; box-shadow: 0 0 20px rgba(244, 63, 94, 0.6); border: 2px solid white; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons" style="font-size: 16px;">security</span>
            SAFETY SPOT: ${rec.reduction} ⬇️
          </div>
        `;
        new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(rec.lat, rec.lng),
          content: content, yAnchor: 1.5
        }).setMap(map);
      });
    } else if (analysisMode === 'VIBE') {
      // 🛣️ VIBE 경로 제안 시각화 (예시로 마커 표시)
      recommendations.vibeProposals.forEach((vibe, idx) => {
        // 데모를 위해 고정 위치에 표시
        const pos = new window.kakao.maps.LatLng(36.833 + (idx * 0.005), 127.179 + (idx * 0.005));
        const content = `
          <div style="padding: 8px 12px; background: ${vibe.color}; border-radius: 12px; color: white; font-size: 10px; font-weight: 900; box-shadow: 0 0 15px ${vibe.color}66; border: 2px solid white; display: flex; align-items: center; gap: 6px;">
            ${vibe.name} ROUTE
          </div>
        `;
        new window.kakao.maps.CustomOverlay({ position: pos, content: content, yAnchor: 1.5 }).setMap(map);
      });
    }

    // 기본 위험 구역 표시
    hazards.forEach(hazard => {
      const circle = new window.kakao.maps.Circle({
        center: new window.kakao.maps.LatLng(hazard.lat, hazard.lng),
        radius: 50, strokeWeight: 1, strokeColor: '#f43f5e', strokeOpacity: 0.8, fillStyle: 'solid', fillColor: '#f43f5e', fillOpacity: 0.2
      });
      circle.setMap(map);
    });

  }, [hazards, analysisMode, recommendations]);

  return null;
};

export default AdminDashboard;
