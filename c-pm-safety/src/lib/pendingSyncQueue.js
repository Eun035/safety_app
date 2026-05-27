// ============================================================
// C-SAFE Pending Sync Queue (P0-3)
// ----------------------------------------------------------------
// 책임:
//   Supabase insert가 (게스트 모드 / 네트워크 오류 / 권한 오류 등으로) 실패한
//   row를 localStorage 큐에 임시 적재했다가, 정상 사용자가 온라인 상태일 때
//   일괄 flush해 데이터 손실을 막는다.
//
// 단순화 원칙:
//   - 테이블당 큐 1개 (rides / ride_paths / near_miss_events / zone_events)
//   - row 단위 enqueue
//   - flush 시 user_id가 게스트가 아니고, navigator.onLine === true일 때만 시도
//   - flush 성공 row만 큐에서 제거, 실패는 그대로 남김 (다음 기회에 재시도)
//   - 큐는 테이블당 최대 200건 (FIFO 슬라이스로 폭증 방지)
// ============================================================

import { supabase } from './supabaseClient';

const QUEUE_KEY = 'csafe_pending_sync';
const MAX_PER_TABLE = 200;

const SUPPORTED_TABLES = ['rides', 'ride_paths', 'near_miss_events', 'zone_events'];

function readQueue() {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch {
        return {};
    }
}

function writeQueue(queue) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
        console.warn('[C-Safe][sync] queue write failed:', err);
    }
}

/**
 * enqueue — 단일 row 또는 row 배열을 테이블별 큐 끝에 적재.
 * @param {string} table - 'rides' | 'ride_paths' | 'near_miss_events' | 'zone_events'
 * @param {object|object[]} payload
 */
export function enqueue(table, payload) {
    if (!SUPPORTED_TABLES.includes(table)) {
        console.warn(`[C-Safe][sync] enqueue: unsupported table "${table}"`);
        return;
    }
    const rows = Array.isArray(payload) ? payload : [payload];
    if (rows.length === 0) return;

    const queue = readQueue();
    const list = Array.isArray(queue[table]) ? queue[table] : [];
    const enriched = rows.map(row => ({
        row,
        queuedAt: new Date().toISOString()
    }));
    queue[table] = [...list, ...enriched].slice(-MAX_PER_TABLE); // FIFO 슬라이스
    writeQueue(queue);
}

/**
 * peek — 현재 큐 상태 확인용 (디버그/UI 노출)
 */
export function peek() {
    const queue = readQueue();
    return Object.fromEntries(
        SUPPORTED_TABLES.map(t => [t, (queue[t] || []).length])
    );
}

/**
 * flush — 큐에 쌓인 모든 row를 순서대로 Supabase에 insert 시도.
 *   - 성공 row는 큐에서 제거
 *   - 실패 row는 그대로 유지 (다음 호출에서 재시도)
 *   - 호출 조건 가드: navigator.onLine && userId 유효 && 게스트 아님
 *
 * @param {string} userId - 현재 로그인 사용자 id (게스트 _접두사면 스킵)
 * @returns {Promise<{flushed: number, remaining: number}>}
 */
export async function flush(userId) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { flushed: 0, remaining: totalPending() };
    }
    if (!userId || String(userId).startsWith('guest_')) {
        return { flushed: 0, remaining: totalPending() };
    }

    let flushed = 0;
    const queue = readQueue();

    for (const table of SUPPORTED_TABLES) {
        const list = Array.isArray(queue[table]) ? queue[table] : [];
        if (list.length === 0) continue;

        const stillPending = [];
        for (const entry of list) {
            try {
                const { error } = await supabase.from(table).insert([entry.row]);
                if (error) {
                    stillPending.push(entry);
                } else {
                    flushed += 1;
                }
            } catch {
                stillPending.push(entry);
            }
        }
        queue[table] = stillPending;
    }

    writeQueue(queue);
    return { flushed, remaining: totalPending(queue) };
}

function totalPending(queueArg) {
    const queue = queueArg || readQueue();
    return SUPPORTED_TABLES.reduce(
        (sum, t) => sum + (Array.isArray(queue[t]) ? queue[t].length : 0),
        0
    );
}

/**
 * clear — 디버그/관리용 강제 비우기
 */
export function clear() {
    try { localStorage.removeItem(QUEUE_KEY); } catch { /* no-op */ }
}
