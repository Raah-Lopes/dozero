-- ==========================================================================
-- DOZERO B.1 -- RLS Security Audit & Hardening
-- Applied: 2026-08-27
-- Fixes:
--   1. scenes: SELECT true (everyone reads all scenes) -> campaign-scoped
--   2. scenes: INSERT without ownership -> requires GM + owner_id
--   3. scenes: DELETE/UPDATE with IS NULL escape -> removed
--   4. scenes: UPDATE missing WITH CHECK -> added
--   5. profiles: SELECT for anon -> restricted to authenticated only
--   6. profiles: UPDATE missing WITH CHECK -> added
--   7. chat_messages: INSERT without campaign membership -> added can_view_campaign
--   8. campaigns: UPDATE missing WITH CHECK -> added
--   9. characters: UPDATE missing WITH CHECK -> added
--  10. is_campaign_manager: moved from public to private schema (no REST exposure)
--  11. handle_new_user: added SET search_path TO '''', revoked EXECUTE from public
--  12. rls_auto_enable: revoked EXECUTE from public
--  13. scenes: added index on campaign_id for RLS perf
-- ==========================================================================

CREATE OR REPLACE FUNCTION private.is_campaign_manager(target_campaign_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.campaigns WHERE id = target_campaign_id AND owner_id = (SELECT auth.uid()))
      OR EXISTS (SELECT 1 FROM public.players WHERE campaign_id = target_campaign_id AND user_id = (SELECT auth.uid()) AND role = 'gm');
$$;

DROP POLICY IF EXISTS "scenes_select" ON public.scenes;
DROP POLICY IF EXISTS "scenes_insert" ON public.scenes;
DROP POLICY IF EXISTS "scenes_delete" ON public.scenes;
DROP POLICY IF EXISTS "scenes_update" ON public.scenes;
CREATE POLICY "scenes_select" ON public.scenes FOR SELECT TO authenticated USING (private.can_view_campaign(campaign_id));
CREATE POLICY "scenes_insert" ON public.scenes FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id AND private.is_campaign_manager(campaign_id));
CREATE POLICY "scenes_update" ON public.scenes FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id OR private.is_campaign_manager(campaign_id)) WITH CHECK ((SELECT auth.uid()) = owner_id OR private.is_campaign_manager(campaign_id));
CREATE POLICY "scenes_delete" ON public.scenes FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id OR private.is_campaign_manager(campaign_id));
CREATE INDEX IF NOT EXISTS idx_scenes_campaign_id ON public.scenes(campaign_id);

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND private.can_view_campaign(campaign_id));

DROP POLICY IF EXISTS "campaigns_update" ON public.campaigns;
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id OR private.is_campaign_manager(id)) WITH CHECK ((SELECT auth.uid()) = owner_id OR private.is_campaign_manager(id));

DROP POLICY IF EXISTS "characters_update" ON public.characters;
CREATE POLICY "characters_update" ON public.characters FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "lineage_atlases_delete_campaign_managers" ON public.lineage_atlases;
DROP POLICY IF EXISTS "lineage_atlases_insert_campaign_managers" ON public.lineage_atlases;
DROP POLICY IF EXISTS "lineage_atlases_update_campaign_managers" ON public.lineage_atlases;
CREATE POLICY "lineage_atlases_delete_campaign_managers" ON public.lineage_atlases FOR DELETE TO authenticated USING (private.is_campaign_manager(campaign_id));
CREATE POLICY "lineage_atlases_insert_campaign_managers" ON public.lineage_atlases FOR INSERT TO authenticated WITH CHECK (private.is_campaign_manager(campaign_id) AND updated_by = (SELECT auth.uid()));
CREATE POLICY "lineage_atlases_update_campaign_managers" ON public.lineage_atlases FOR UPDATE TO authenticated USING (private.is_campaign_manager(campaign_id)) WITH CHECK (private.is_campaign_manager(campaign_id) AND updated_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "players_delete" ON public.players;
DROP POLICY IF EXISTS "players_insert" ON public.players;
DROP POLICY IF EXISTS "players_update" ON public.players;
CREATE POLICY "players_delete" ON public.players FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()) OR private.is_campaign_manager(campaign_id));
CREATE POLICY "players_insert" ON public.players FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id AND (role = ANY (ARRAY['player'::text, 'spectator'::text]) OR private.is_campaign_manager(campaign_id)));
CREATE POLICY "players_update" ON public.players FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR private.is_campaign_manager(campaign_id)) WITH CHECK (((SELECT auth.uid()) = user_id AND (role = ANY (ARRAY['player'::text, 'spectator'::text]) OR private.is_campaign_manager(campaign_id))) OR private.is_campaign_manager(campaign_id));

DROP FUNCTION IF EXISTS public.is_campaign_manager(text);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>''username'', split_part(new.email, ''@'', 1)), new.raw_user_meta_data->>''full_name'', new.raw_user_meta_data->>''avatar_url'')
  on conflict (id) do update set avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url), full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;
