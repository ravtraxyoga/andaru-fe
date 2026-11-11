import type { Level } from '../types';

const TIER_COLOR: Record<number, string> = { 1: '#B9773F', 2: '#A9B4C8', 3: '#FFC24B', 4: '#5CD6C8', 5: '#7FA8FF', 6: '#FF6B9A' };

export function LevelCard({ level, streak, promo }: { level: Level; streak: number; promo?: { sessions_done: number; avg_recent: number | null } }) {
  const pct = Math.round((level.xp_in_division / Math.max(1, level.division_size)) * 100);
  return (
    <div className="level-card">
      <div className="row between">
        <div className="row" style={{ gap: 10 }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill={TIER_COLOR[level.tier]} aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" /></svg>
          <div>
            <div className="strong" style={{ fontSize: 18 }}>{level.label}</div>
            <div className="tiny" style={{ color: '#C9D4F5' }}>{level.xp.toLocaleString('id-ID')} XP</div>
          </div>
        </div>
        <span className="badge dark">{streak} hari beruntun</span>
      </div>
      {level.next_label && (
        <>
          <div className="row between tiny" style={{ color: '#C9D4F5' }}>
            <span>Menuju {level.next_label}</span>
            <span>{level.xp_in_division} / {level.division_size}</span>
          </div>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        </>
      )}
      {level.promotion && promo && (
        <div className="tiny" style={{ color: '#FFE9A8', lineHeight: 1.5 }}>
          XP sudah cukup untuk {level.promotion.to}. Syarat promosi: {level.promotion.min_sessions} sesi tuntas
          (sekarang {promo.sessions_done}) dan rata-rata skor 10 sesi terakhir ≥ {level.promotion.min_avg_score}
          (sekarang {promo.avg_recent ?? 0}).
        </div>
      )}
    </div>
  );
}
