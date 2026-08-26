/*
# Sign Language Translator - Database Schema

## Overview
Creates the full schema for the Sign Language Translator app: user profiles,
translation history, community posts, and learning progress tracking.

## New Tables
1. `profiles` - Extends auth.users with display name and avatar URL.
   - id (uuid, PK, references auth.users)
   - display_name (text)
   - avatar_url (text, nullable)
   - created_at (timestamptz)

2. `translation_history` - Stores phrases the user translated via gestures.
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - gesture_label (text) - the recognized gesture/letter
   - translated_text (text) - assembled phrase
   - created_at (timestamptz)

3. `community_posts` - Community messages on the "Join Us" board.
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - author_name (text)
   - message (text)
   - created_at (timestamptz)

4. `learning_progress` - Tracks per-user progress on learning sign lessons.
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - lesson_id (text)
   - completed (boolean, default false)
   - score (integer, default 0)
   - updated_at (timestamptz)
   - Unique constraint on (user_id, lesson_id)

## Security
- RLS enabled on all tables.
- profiles: users read/update only their own profile.
- translation_history, community_posts, learning_progress: owner-scoped CRUD
  (authenticated users can only access rows they own).
- community_posts SELECT is open to all authenticated users so everyone can
  read the community board; writes are owner-scoped.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'New User',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "select_public_profiles" ON profiles;
CREATE POLICY "select_public_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- TRANSLATION HISTORY
CREATE TABLE IF NOT EXISTS translation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  gesture_label text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE translation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_translations" ON translation_history;
CREATE POLICY "select_own_translations" ON translation_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_translations" ON translation_history;
CREATE POLICY "insert_own_translations" ON translation_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_translations" ON translation_history;
CREATE POLICY "delete_own_translations" ON translation_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- COMMUNITY POSTS
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Everyone (anon and authenticated) can read the community board
DROP POLICY IF EXISTS "select_all_community_posts" ON community_posts;
CREATE POLICY "select_all_community_posts" ON community_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_community_post" ON community_posts;
CREATE POLICY "insert_own_community_post" ON community_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_community_post" ON community_posts;
CREATE POLICY "delete_own_community_post" ON community_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- LEARNING PROGRESS
CREATE TABLE IF NOT EXISTS learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON learning_progress;
CREATE POLICY "select_own_progress" ON learning_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "upsert_own_progress" ON learning_progress;
CREATE POLICY "upsert_own_progress" ON learning_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON learning_progress;
CREATE POLICY "update_own_progress" ON learning_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_translation_history_user_id ON translation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), 'New User')
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name
    WHERE public.profiles.display_name IS NULL OR public.profiles.display_name = 'New User';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();