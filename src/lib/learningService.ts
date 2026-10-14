import { supabase, type LearningProgress } from '@/lib/supabase';

const LOCAL_STORAGE_KEY = 'kiri_learning_progress_v2';
const LOCAL_QUIZ_STATS_KEY = 'kiri_quiz_stats_v2';

export interface LessonProgressItem {
  lessonId: string;
  completed: boolean;
  score: number;
  updatedAt: string;
}

export interface UserLearningStats {
  completedCount: number;
  totalLessons: number;
  completionRate: number;
  totalScore: number;
  quizAccuracy: number;
  lastPracticed: string | null;
  streakDays: number;
  levelTitle: string;
}

export async function fetchUserProgress(
  userId?: string
): Promise<Record<string, LessonProgressItem>> {
  const localMap: Record<string, LessonProgressItem> = {};

  // Load from local storage first
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, LessonProgressItem>;
      Object.assign(localMap, parsed);
    }
  } catch {
    // ignore parse error
  }

  // If user is authenticated, sync with Supabase learning_progress table
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        for (const row of data as LearningProgress[]) {
          localMap[row.lesson_id] = {
            lessonId: row.lesson_id,
            completed: Boolean(row.completed),
            score: Number(row.score || 0),
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        }
        // Cache synced state to local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localMap));
      }
    } catch (err) {
      console.warn('Could not sync learning progress from Supabase:', err);
    }
  }

  return localMap;
}

export async function saveLessonProgress(
  lessonId: string,
  completed: boolean,
  score: number,
  userId?: string
): Promise<void> {
  const now = new Date().toISOString();
  const entry: LessonProgressItem = {
    lessonId,
    completed,
    score,
    updatedAt: now,
  };

  // 1. Save locally immediately
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const map: Record<string, LessonProgressItem> = raw ? JSON.parse(raw) : {};
    // Only update score if higher or marking complete
    const prevScore = map[lessonId]?.score ?? 0;
    map[lessonId] = {
      ...entry,
      score: Math.max(prevScore, score),
      completed: completed || (map[lessonId]?.completed ?? false),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to save progress to localStorage:', err);
  }

  // 2. If user is signed in, upsert to Supabase
  if (userId) {
    try {
      await supabase.from('learning_progress').upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          completed,
          score,
          updated_at: now,
        },
        { onConflict: 'user_id,lesson_id' }
      );
    } catch (err) {
      console.warn('Failed to sync progress to Supabase:', err);
    }
  }
}

export function computeLearningStats(
  progressMap: Record<string, LessonProgressItem>,
  totalLessons: number
): UserLearningStats {
  const items = Object.values(progressMap);
  const completedCount = items.filter((i) => i.completed).length;
  const totalScore = items.reduce((acc, curr) => acc + (curr.score || 0), 0);

  let lastDate: Date | null = null;
  for (const item of items) {
    if (item.updatedAt) {
      const d = new Date(item.updatedAt);
      if (!lastDate || d > lastDate) {
        lastDate = d;
      }
    }
  }

  // Quiz stats from local storage
  let quizAccuracy = 85;
  try {
    const rawQuiz = localStorage.getItem(LOCAL_QUIZ_STATS_KEY);
    if (rawQuiz) {
      const q = JSON.parse(rawQuiz);
      if (q.totalAnswered > 0) {
        quizAccuracy = Math.round((q.correctAnswers / q.totalAnswered) * 100);
      }
    }
  } catch {
    // fallback
  }

  const completionRate = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  let levelTitle = 'ISL Beginner';
  if (completionRate >= 90) {
    levelTitle = 'ISL Master 🏆';
  } else if (completionRate >= 60) {
    levelTitle = 'ISL Advanced ⭐';
  } else if (completionRate >= 30) {
    levelTitle = 'ISL Intermediate 🌟';
  }

  return {
    completedCount,
    totalLessons,
    completionRate,
    totalScore,
    quizAccuracy,
    lastPracticed: lastDate ? lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
    streakDays: completedCount > 0 ? Math.min(Math.ceil(completedCount / 2), 7) : 0,
    levelTitle,
  };
}

export function recordQuizAttempt(correct: boolean): void {
  try {
    const raw = localStorage.getItem(LOCAL_QUIZ_STATS_KEY);
    const curr = raw ? JSON.parse(raw) : { totalAnswered: 0, correctAnswers: 0 };
    curr.totalAnswered = (curr.totalAnswered || 0) + 1;
    if (correct) {
      curr.correctAnswers = (curr.correctAnswers || 0) + 1;
    }
    localStorage.setItem(LOCAL_QUIZ_STATS_KEY, JSON.stringify(curr));
  } catch {
    // ignore
  }
}
