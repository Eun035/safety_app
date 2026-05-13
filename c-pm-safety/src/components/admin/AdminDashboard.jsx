import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Activity, Award, AlertCircle, 
  TrendingUp, Map as MapIcon, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Search, 
  ShieldCheck, Clock, Download, Sparkles,
  MapPin, Info, BrainCircuit, ShieldAlert,
  Route, Waves, Zap, Landmark, Trees, 
  Navigation2, CheckCircle2, HeartPulse,
  Footprints, Sliders
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const AdminDashboard = ({ onClose }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRides: 0,
    totalPoints: 0,
    totalHazards: 0,
    pedestrianReports: 0,
    avgSafetyScore: 0,
    trends: {
      users: 0,
      rides: 0,
      hazards: 0,
      stress: 0
    }
  });
  const [recentRides, setRecentRides] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const [analysisMode, setAnalysisMode] = useState('NORMAL'); // 'NORMAL' | 'SAFETY' | 'VIBE' | 'STRESS'

  // 🚀 보행자 스트레스 맵 분석 데이터 (고도화 예정)
  const stressData = useMemo(() => {
    return [
      { id: 's1', lat: 36.833, lng: 127.179, level: 85, name: "천안 단국대 정문 보도", reason: "보도 폭 대비 PM 통행량 과다 및 보도 중앙 방치 사례 빈번" },
      { id: 's2', lat: 36.818, lng: 127.156, level: 94, name: "천안 종합터미널 앞", reason: "보행자 유동인구 극대 구역 내 PM 고속 주행 로그 다수 감지" },
      { id: 's3', lat: 36.811, lng: 127.108, level: 78, name: "신불당 상업지구 보행자 전용도로", reason: "PM 진입 금지 구역 내 무단 주행으로 인한 보행자 민원 집중" }
    ];
  }, []);

  const recommendations = useMemo(() => {
    return {
      optimization: [
        { id: 1, lat: 36.839, lng: 127.182, name: "대학로 메인 스트리트", score: 98, reason: "이용률 상위 3% 구역" }
      ],
      safety: [
        { id: 101, lat: 36.835, lng: 127.142, name: "두정동 사고 다발 사거리", reduction: "45%", reason: "급정거 로그 집중 구역" }
      ],
      vibeProposals: [
        { 
          id: 'v1', type: 'SAFETY', name: '안전 최우선', color: '#10b981', icon: ShieldCheck, desc: '사고 위험 지점 100% 우회 경로',
          path: [
            { lat: 36.833, lng: 127.179 },
            { lat: 36.835, lng: 127.185 },
            { lat: 36.839, lng: 127.182 }
          ]
        },
        { 
          id: 'v2', type: 'SUNSET', name: '노을 맛집', color: '#fb923c', icon: Waves, desc: '조망권 및 일몰 시간 데이터 반영',
          path: [
            { lat: 36.818, lng: 127.156 },
            { lat: 36.815, lng: 127.150 },
            { lat: 36.811, lng: 127.148 }
          ]
        }
      ]
    };
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: rideCount } = await supabase.from('rides').select('*', { count: 'exact', head: true });
        const { data: hazardsData } = await supabase.from('hazards').select('*');
        
        const pedestrianCount = hazardsData?.filter(h => h.type === 'PEDESTRIAN' || h.type === 'PARKING').length || 0;

        const { data: profileData } = await supabase.from('profiles').select('points, safety_score');
        const pointsTotal = profileData?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;
        const avgScore = profileData?.length > 0 
          ? profileData.reduce((acc, curr) => acc + (curr.safety_score || 0), 0) / profileData.length 
          : 0;

        setStats({
          totalUsers: userCount || 0,
          totalRides: rideCount || 0,
          totalPoints: pointsTotal,
          totalHazards: hazardsData?.length || 0,
          pedestrianReports: pedestrianCount,
          avgSafetyScore: Math.round(avgScore),
          trends: {
            users: 12,
            rides: 24,
            hazards: -5,
            stress: -2
          }
        });

        const { data: rides } = await supabase.from('rides').select('*, profiles(nickname)').order('start_time', { ascending: false }).limit(10);
        setRecentRides(rides || []);
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
              <span className="text-xs font-black uppercase tracking-[0.2em]">B2G Strategy Hub</span>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter">Pedestrian Safety Hub</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setAnalysisMode('SAFETY'); setIsMapOpen(true); }}
              className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 px-5 py-3 rounded-2xl border border-rose-500/30 flex items-center gap-2 transition-all shadow-neon-rose"
            >
              <Zap size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">AI Station Recommend</span>
            </button>
            <button 
              onClick={() => { setAnalysisMode('STRESS'); setIsMapOpen(true); }}
              className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 px-5 py-3 rounded-2xl border border-orange-500/30 flex items-center gap-2 transition-all shadow-neon-orange"
            >
              <HeartPulse size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Pedestrian Stress Map</span>
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
          <StatCard icon={Users} label="Total Riders" value={stats.totalUsers} trend={stats.trends.users} color="blue" />
          <StatCard icon={Footprints} label="Pedestrian Reports" value={stats.pedestrianReports} trend={stats.trends.stress} color="orange" />
          <StatCard icon={ShieldAlert} label="Safety Incidents" value={stats.totalHazards} trend={stats.trends.hazards} color="rose" />
          <StatCard icon={HeartPulse} label="Avg Safety Score" value={`${stats.avgSafetyScore}%`} trend={2} color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black italic">Pedestrian Safety Insights</h2>
              <button className="text-xs font-bold text-cyber-cyan uppercase tracking-widest">Live Safety Feed</button>
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
                    {ride.is_safe_ride ? 'LOW IMPACT' : 'HIGH STRESS'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-orange-600/20 to-amber-600/20 backdrop-blur-xl border border-orange-500/20 rounded-[2.5rem] p-8 shadow-neon-orange group">
               <div className="flex items-center gap-3 mb-6">
                  <HeartPulse className="text-orange-400" size={24} />
                  <h2 className="text-xl font-black italic">Stress Hotspots</h2>
               </div>
               <div className="space-y-4">
                 {stressData.map(item => (
                   <div key={item.id} className="bg-black/40 p-4 rounded-2xl border border-white/5">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-black text-orange-400 uppercase">Index: {item.level}</span>
                        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                           <div className="h-full bg-orange-500" style={{ width: `${item.level}%` }}></div>
                        </div>
                      </div>
                      <p className="text-xs font-black text-white">{item.name}</p>
                      <p className="text-[9px] text-gray-400 mt-1 leading-tight">{item.reason}</p>
                   </div>
                 ))}
               </div>
               <button onClick={() => { setAnalysisMode('STRESS'); setIsMapOpen(true); }} className="w-full mt-6 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Launch Stress Map</button>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8">
              <div className="flex items-center gap-2 mb-6">
                 <Sliders size={18} className="text-cyber-cyan" />
                 <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Policy Controls</h2>
              </div>
              <div className="space-y-3">
                 <button className="w-full p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] font-bold text-left flex justify-between items-center">
                    <span>Set Speed Limit (10km/h)</span>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                 </button>
                 <button className="w-full p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] font-bold text-left">
                    Define Geo-No-Ride Zones
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🗺️ Map Overlay (Modified for Stress Map) */}
      {isMapOpen && (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col animate-in fade-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-gray-900/90 backdrop-blur-md">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-black italic">
                {analysisMode === 'STRESS' ? "Pedestrian Stress Visualization" : "Management Strategy Center"}
              </h2>
            </div>
            <button onClick={() => { setIsMapOpen(false); setAnalysisMode('NORMAL'); }} className="text-gray-400 hover:text-white font-black text-sm uppercase tracking-widest">Close Center</button>
          </div>

          <div className="flex-1 relative bg-gray-900 flex overflow-hidden">
            {/* Sidebar for Stress Map info */}
            <div className="w-80 h-full bg-gray-900 border-r border-white/10 p-6 overflow-y-auto z-10">
              {analysisMode === 'STRESS' && (
                <div className="space-y-6">
                  <div className="p-4 bg-orange-600/10 border border-orange-500/30 rounded-2xl">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Analysis Target</p>
                    <p className="text-sm font-bold text-white">보행자-PM 상충 데이터 기반 보행 스트레스 지도</p>
                  </div>
                  {stressData.map(item => (
                    <div key={item.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-orange-500">
                      <p className="text-sm font-black text-white mb-2">{item.name}</p>
                      <div className="flex items-center gap-2 text-orange-400 mb-3">
                        <HeartPulse size={14} />
                        <span className="text-[10px] font-bold">Stress Index: {item.level} (CRITICAL)</span>
                      </div>
                      <button className="w-full py-2 bg-orange-500 text-white text-[10px] font-black rounded-lg uppercase">Design Slow Zone</button>
                    </div>
                  ))}
                </div>
              )}

              {analysisMode === 'SAFETY' && (
                <div className="space-y-6">
                  <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-2xl">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">AI Recommendation</p>
                    <p className="text-sm font-bold text-white">사고 저감율 기반 최적 헬멧 스테이션 설치 지점</p>
                  </div>
                  {recommendations.optimization.concat(recommendations.safety).map(item => (
                    <div key={item.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-red-500">
                      <p className="text-sm font-black text-white mb-2">{item.name}</p>
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <Award size={14} />
                        <span className="text-[10px] font-bold">예상 사고 저감율: {item.reduction || '35%'}</span>
                      </div>
                      <p className="text-[9px] text-gray-400 leading-tight">{item.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysisMode === 'VIBE' && (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-600/10 border border-emerald-500/30 rounded-2xl">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Vibe Proposal</p>
                    <p className="text-sm font-bold text-white">사용자 주행 패턴 기반 목적별 안전 경로 설계</p>
                  </div>
                  {recommendations.vibeProposals.map(item => (
                    <div key={item.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4" style={{ borderLeftColor: item.color }}>
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon size={16} style={{ color: item.color }} />
                        <p className="text-sm font-black text-white">{item.name}</p>
                      </div>
                      <p className="text-[9px] text-gray-400 leading-tight mb-3">{item.desc}</p>
                      <button className="w-full py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg uppercase">Apply to App</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <div id="admin-strategy-map" className="w-full h-full"></div>
              
              <div className="absolute bottom-6 left-6 z-10 flex gap-2">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black text-white flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    analysisMode === 'STRESS' ? 'bg-orange-500 shadow-neon-orange' :
                    analysisMode === 'SAFETY' ? 'bg-red-500 shadow-neon-red' :
                    'bg-emerald-500 shadow-neon-green'
                  }`}></div>
                  {analysisMode === 'STRESS' ? 'STRESS HEATMAP ACTIVE' : 
                   analysisMode === 'SAFETY' ? 'AI RECOMMENDATION ACTIVE' : 'VIBE PROPOSAL ACTIVE'}
                </div>
              </div>
            </div>
          </div>
          
          <AdminMapInitializer 
            hazards={hazards} 
            analysisMode={analysisMode}
            stressData={stressData}
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

const AdminMapInitializer = ({ hazards, analysisMode, stressData, recommendations }) => {
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) return;
    const container = document.getElementById('admin-strategy-map');
    if (!container) return;

    const options = { center: new window.kakao.maps.LatLng(36.833, 127.179), level: 5 };
    const map = new window.kakao.maps.Map(container, options);

    if (analysisMode === 'STRESS') {
      // 🌋 보행자 스트레스 히트맵 (시뮬레이션: 원형 오버레이)
      stressData.forEach(item => {
        const center = new window.kakao.maps.LatLng(item.lat, item.lng);
        
        // 스트레스 강도에 따른 반경 및 색상 조절
        const circle = new window.kakao.maps.Circle({
          center: center,
          radius: item.level * 1.5,
          strokeWeight: 2,
          strokeColor: '#f97316',
          strokeOpacity: 0.8,
          strokeStyle: 'dashed',
          fillColor: '#f97316',
          fillOpacity: 0.4
        });
        circle.setMap(map);

        const content = `
          <div style="padding: 8px 12px; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); border-radius: 12px; color: #f97316; font-size: 10px; font-weight: 900; border: 1px solid #f97316; white-space: nowrap;">
            STRESS LV.${item.level}
          </div>
        `;
        new window.kakao.maps.CustomOverlay({ position: center, content: content, yAnchor: 2.5 }).setMap(map);
      });
    }

    // AI 스테이션 추천 모드 (빨간색)
    if (analysisMode === 'SAFETY') {
      recommendations.optimization.concat(recommendations.safety).forEach(item => {
        const pos = new window.kakao.maps.LatLng(item.lat, item.lng);
        
        // 더 화려하고 눈에 띄는 빨간색 효과 (이중 원)
        new window.kakao.maps.Circle({
          center: pos,
          radius: 150,
          strokeWeight: 4,
          strokeColor: '#ff0000',
          strokeOpacity: 0.8,
          fillColor: '#ff0000',
          fillOpacity: 0.2
        }).setMap(map);

        new window.kakao.maps.Circle({
          center: pos,
          radius: 50,
          strokeWeight: 0,
          fillColor: '#ff0000',
          fillOpacity: 0.8
        }).setMap(map);

        const content = `
          <div style="padding: 10px 16px; background: #ff0000; border-radius: 20px; color: white; font-size: 11px; font-weight: 900; border: 3px solid white; box-shadow: 0 0 20px rgba(255,0,0,0.5); white-space: nowrap;">
            🎯 STATION RECOM: ${item.name}
          </div>
        `;
        new window.kakao.maps.CustomOverlay({ position: pos, content: content, yAnchor: 2.2 }).setMap(map);
      });
    }

    // Vibe Designer 추천 경로 모드 (초록색)
    if (analysisMode === 'VIBE') {
      recommendations.vibeProposals.forEach(route => {
        if (!route.path) return;
        
        const pathCoords = route.path.map(p => new window.kakao.maps.LatLng(p.lat, p.lng));
        
        new window.kakao.maps.Polyline({
          path: pathCoords,
          strokeWeight: 8,
          strokeColor: route.color,
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        }).setMap(map);

        // 경로 시작점에 아이콘 표시
        const startPos = pathCoords[0];
        const content = `
          <div style="padding: 8px 12px; background: #111; border-radius: 12px; color: ${route.color}; font-size: 10px; font-weight: 900; border: 2px solid ${route.color}; box-shadow: 0 0 15px ${route.color}50; white-space: nowrap;">
            🌿 ${route.name} Route Start
          </div>
        `;
        new window.kakao.maps.CustomOverlay({ position: startPos, content: content, yAnchor: 2.5 }).setMap(map);
      });
    }

    // 🛡️ 기본 위험 구역 상시 노출
    hazards.forEach(hazard => {
      const isCritical = hazard.type === 'SLOPE' || hazard.type === 'ACCIDENT';
      const circleColor = isCritical ? '#f43f5e' : '#f59e0b';
      
      new window.kakao.maps.Circle({
        center: new window.kakao.maps.LatLng(hazard.lat, hazard.lng),
        radius: isCritical ? 50 : 30,
        strokeWeight: 1,
        strokeColor: circleColor,
        strokeOpacity: 0.8,
        fillColor: circleColor,
        fillOpacity: 0.2
      }).setMap(map);
    });

  }, [hazards, analysisMode, stressData, recommendations]);

  return null;
};

export default AdminDashboard;
