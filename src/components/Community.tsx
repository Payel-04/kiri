import { useEffect, useState } from 'react';
import { ArrowUpRight, Heart, MessageCircle, Send, UsersRound } from 'lucide-react';
import { supabase, type CommunityPost } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import SectionHeading from '@/components/SectionHeading';

type CommunityProps = { onAuthClick: () => void };

const fallbackPosts: CommunityPost[] = [{ id: '1', user_id: '', author_name: 'Maya R.', message: 'The first time I used SignSpeak with my hearing coworkers, we all got emotional. This is the future.', created_at: new Date(Date.now() - 1000 * 60 * 34).toISOString() }, { id: '2', user_id: '', author_name: 'Jordan K.', message: 'Learning one new sign every day. Small steps, bigger conversations.', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() }];

function formatTimeAgo(isoString: string): string {
  try {
    const diffMin = Math.round((new Date(isoString).getTime() - Date.now()) / 60000);
    if (isNaN(diffMin)) return 'Recently';
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffMin, 'minute');
  } catch {
    return 'Recently';
  }
}

export default function Community({ onAuthClick }: CommunityProps) {
  const [posts, setPosts] = useState<CommunityPost[]>(fallbackPosts);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data && data.length) setPosts(data as CommunityPost[]);
      });
  }, []);

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const post = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    const item = {
      user_id: user.id,
      author_name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Member',
      message: message.trim(),
    };
    const { data } = await supabase.from('community_posts').insert(item).select().maybeSingle();
    if (data) setPosts((prev) => [data as CommunityPost, ...prev]);
    setMessage('');
    setSending(false);
  };

  return (
    <section id="community" className="bg-brand-50/50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              eyebrow="Join us"
              title="A community that speaks with one voice"
              description="Tools matter. But people matter more. Meet the learners, teachers, families, and friends making communication more open every day."
            />
            <div className="mt-8 flex items-center justify-center gap-3 text-center sm:justify-start">
              <div className="flex -space-x-2">
                {['MR', 'JK', 'AL', 'TS'].map((initials, i) => (
                  <span
                    key={initials}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-50 text-[10px] font-bold text-white ${
                      ['bg-brand-500', 'bg-teal-500', 'bg-accent-500', 'bg-slate-500'][i]
                    }`}
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <p className="text-xs font-medium text-slate-500">
                <span className="font-bold text-slate-800">2,400+</span> people learning together
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {posts.map((item) => {
              const isLiked = likedPosts[item.id];
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {item.author_name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{item.author_name}</h3>
                        <p className="text-[11px] text-slate-400">{formatTimeAgo(item.created_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLike(item.id)}
                      className={`transition ${isLiked ? 'text-red-500' : 'text-slate-300 hover:text-red-400'}`}
                      aria-label="Like post"
                    >
                      <Heart size={17} className={isLiked ? 'fill-red-500' : ''} />
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{item.message}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                      <MessageCircle size={14} /> Reply
                    </span>
                    <button
                      onClick={() => toggleLike(item.id)}
                      className={`flex items-center gap-1.5 ${isLiked ? 'text-red-500 font-semibold' : 'hover:text-slate-600'}`}
                    >
                      <Heart size={14} className={isLiked ? 'fill-red-500' : ''} /> {isLiked ? 'Liked' : 'Like'}
                    </button>
                  </div>
                </article>
              );
            })}
            <div className="rounded-2xl border border-dashed border-brand-300 bg-white/60 p-4">
              {user ? (
                <div className="flex gap-3">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void post();
                    }}
                    placeholder="Share something with the community..."
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={() => void post()}
                    disabled={!message.trim() || sending}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
                    aria-label="Post message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onAuthClick}
                  className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-brand-700"
                >
                  <UsersRound size={17} /> Sign in to share your story <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
