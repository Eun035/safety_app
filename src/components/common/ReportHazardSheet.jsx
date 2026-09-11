import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 위험 제보 시트 — 현재 GPS 위치 기준으로 위험 지점을 제보한다.
// 실제 저장은 부모가 넘긴 onReport(payload)가 report_hazard RPC를 호출한다.
// (서버에서 reporter_id=auth.uid() 비공개 기록 + 제보자별 24h 레이트 리밋.)
const HAZARD_TYPES = ['PARKING', 'PEDESTRIAN', 'SLOPE', 'ICE', 'WET', 'ACCIDENT'];

export default function ReportHazardSheet({ isOpen, onClose, lat, lng, onReport }) {
  const { t } = useTranslation();
  const [type, setType] = useState('PARKING');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const typeLabel = (ty) => t(`rpt_type_${ty.toLowerCase()}`);

  const handleSubmit = async () => {
    if (submitting) return;
    const finalTitle = title.trim() || typeLabel(type);
    if (lat == null || lng == null) return;
    setSubmitting(true);
    try {
      await onReport({
        title: finalTitle,
        lat,
        lng,
        type,
        desc: desc.trim() || null,
        safetyTip: null
      });
      // 성공/실패 토스트와 닫힘은 부모가 처리한다. 폼만 초기화.
      setTitle('');
      setDesc('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1500] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md bg-gray-900 border-t border-cyber-cyan/30 rounded-t-3xl p-6 pb-8 z-10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-400" />
                {t('rpt_heading')}
              </h2>
              <button onClick={onClose} className="text-gray-400 active:scale-90 transition-transform">
                <X size={22} />
              </button>
            </div>

            {/* 위치 (현재 GPS) */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
              <MapPin size={14} className="text-cyber-cyan" />
              {t('rpt_location_current')}
              {lat != null && lng != null && (
                <span className="ml-auto font-mono text-[10px] text-gray-500">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              )}
            </div>

            {/* 유형 선택 */}
            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              {t('rpt_type_label')}
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {HAZARD_TYPES.map((ty) => (
                <button
                  key={ty}
                  onClick={() => setType(ty)}
                  className={`h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                    type === ty
                      ? 'bg-cyber-cyan text-black border-cyber-cyan'
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  }`}
                >
                  {typeLabel(ty)}
                </button>
              ))}
            </div>

            {/* 제목 */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('rpt_title_placeholder')}
              maxLength={60}
              className="w-full h-12 rounded-xl bg-gray-800 border border-gray-700 px-4 text-sm text-white placeholder-gray-500 mb-3 focus:border-cyber-cyan outline-none"
            />

            {/* 설명 (선택) */}
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('rpt_desc_placeholder')}
              maxLength={200}
              rows={2}
              className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 mb-5 focus:border-cyber-cyan outline-none resize-none"
            />

            <button
              onClick={handleSubmit}
              disabled={submitting || lat == null || lng == null}
              className="w-full h-14 rounded-2xl bg-amber-500 text-black font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <AlertTriangle size={18} />
                  {t('rpt_submit')}
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
