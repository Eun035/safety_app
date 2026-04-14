import React, { useState } from 'react';
import { Star, MessageSquareText, ThumbsUp, Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const FeedbackReport = ({ isOpen, onClose, onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [selectedTags, setSelectedTags] = useState([]);
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const TAGS = [
        "도로 파손 발견",
        "불법 주차된 차량",
        "자전거 도로 끊김",
        "PM 기기 고장",
        "기타 불편사항"
    ];

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmit = async () => {
        if (!rating) return;

        try {
            // Phase 19: Insert feedback into Supabase
            const { error } = await supabase
                .from('feedbacks')
                .insert([{
                    rating: rating,
                    tags: selectedTags,
                    comments: text
                }]);

            if (error) throw error;

            if (onSubmit) {
                onSubmit({ rating, tags: selectedTags, text });
            }
        } catch (error) {
            console.error("Error submitting feedback:", error);
            alert("피드백 전송에 실패했습니다. (Supabase 연결 확인 필요)");
            if (onSubmit) {
                // DB 에러가 나도 앱 진행은 막지 않도록 콜백은 실행
                onSubmit({ rating, tags: selectedTags, text });
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-end justify-center">
            <div className="bg-[#111] max-w-sm w-full rounded-t-3xl shadow-2xl p-6 border-t border-white/10 animate-in slide-in-from-bottom duration-300">
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6" onClick={onClose}></div>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">RIDE FEEDBACK</h2>
                    <p className="text-sm text-gray-400 font-medium">안전한 주행 환경을 위해<br />오늘의 경험을 들려주세요.</p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-8">
                    {[...Array(5)].map((star, i) => {
                        const ratingValue = i + 1;
                        return (
                            <button
                                key={i}
                                className="transition-transform hover:scale-110"
                                onClick={() => setRating(ratingValue)}
                                onMouseEnter={() => setHover(ratingValue)}
                                onMouseLeave={() => setHover(0)}
                            >
                                <Star
                                    size={40}
                                    className={`transition-colors duration-200 ${(hover || rating) >= ratingValue ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-gray-600"}`}
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Quick Tags */}
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Report Issues</p>
                    <div className="flex flex-wrap gap-2">
                        {TAGS.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedTags.includes(tag) ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Textarea */}
                <div className="mb-8 relative">
                    <MessageSquareText size={16} className="absolute top-4 left-4 text-gray-500" />
                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-24 p-4 pl-11 text-sm text-white placeholder:text-gray-600 outline-none focus:border-cyber-cyan transition-colors resize-none"
                        placeholder="추가적인 의견을 자유롭게 남겨주세요."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    ></textarea>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={rating === 0}
                    className={`w-full py-4 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${rating > 0 ? 'bg-cyber-cyan text-black hover:bg-teal-400 shadow-neon-cyan' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    <Send size={18} className={rating > 0 ? "fill-black" : ""} /> 제출하기
                </button>
                <button onClick={onClose} className="w-full mt-4 py-2 text-sm font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">
                    건너뛰기
                </button>
            </div>
        </div>
    );
};

export default FeedbackReport;
