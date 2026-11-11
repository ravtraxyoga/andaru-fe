export type Promotion = { to: string; min_sessions: number; min_avg_score: number };
export type Level = {
  tier: number;
  tier_name: string;
  stars: number;
  label: string;
  xp: number;
  xp_in_division: number;
  division_size: number;
  next_label: string | null;
  promotion: Promotion | null;
};

export type SessionStatus = 'scheduled' | 'in_progress' | 'submitted' | 'expired' | 'missed' | 'aborted';

export type ChildCard = {
  id: number;
  name: string;
  grade: number;
  xp: number;
  tier: number;
  streak_days: number;
  max_sessions_per_day: number;
  min_gap_minutes: number;
  paired: boolean;
  device_owner: boolean;
  level: Level;
  last_score: number | null;
  next_session: { id: number; subject: string; scheduled_for: string; question_count: number; status: SessionStatus } | null;
};

export type SessionRow = {
  id: number;
  subject: string;
  scheduled_for: string;
  question_count: number;
  duration_sec?: number;
  status: SessionStatus;
  score?: number | null;
  correct_count?: number | null;
  xp_awarded?: number;
  focus_breaks?: number;
  focus_mode?: boolean;
  schedule_id?: number | null;
};

export type Summary = {
  child: { id: number; name: string; grade: number; xp: number; tier: number; streak_days: number; paired: boolean };
  level: Level;
  sessions_this_week: number;
  avg_score_30d: number | null;
  missed_30d: number;
  next_sessions: SessionRow[];
  recent: SessionRow[];
  weak_topics: { topic: string; subject: string; answered: number; correct: number; ratio: number }[];
  badges: string[];
  promo: { sessions_done: number; avg_recent: number | null };
};

export type Subject = { id: number; code: string; name: string; topics: { id: number; name: string }[] };

export type Schedule = {
  id: number;
  child_id: number;
  subject_id: number;
  subject: string;
  days_mask: number;
  start_time: string;
  tz: string;
  question_count: number;
  duration_min: number;
  focus_mode: boolean;
  active: boolean;
};

export type Report = {
  id: number;
  child: { id: number; name: string };
  subject: string;
  scheduled_for: string;
  status: SessionStatus;
  started_at: string | null;
  ends_at: string | null;
  submitted_at: string | null;
  duration_sec: number;
  question_count: number;
  correct_count: number | null;
  score: number | null;
  xp_awarded: number;
  focus_mode: boolean;
  focus_breaks: number;
  answered: number;
  events: { type: string; at: string; meta: Record<string, unknown> | null }[];
  topics: { topic: string; total: number; correct: number }[];
};

export type ReviewItem = {
  position: number;
  stem: string;
  topic: string;
  image_url: string | null;
  options: string[];
  chosen: string | null;
  correct: string;
  is_correct: boolean | null;
  explanation: string | null;
  time_ms: number | null;
};
