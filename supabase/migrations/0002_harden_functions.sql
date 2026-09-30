-- Paysapro AI — migration 0002 : durcissement des fonctions.
--
-- Supabase accorde par défaut l'exécution des fonctions du schéma public au rôle « anon ».
-- Constaté après la migration 0001 : un visiteur non connecté pouvait appeler create_company()
-- (rejeté par la fonction : « not_authenticated ») et is_member() (réponse : false).
-- Sans conséquence, mais ces fonctions n'ont aucune raison d'être appelables sans session.
-- Non destructive.

revoke execute on function public.create_company(text, jsonb) from anon;
revoke execute on function public.is_member(uuid) from anon;
revoke execute on function public.has_role(uuid, text[]) from anon;
revoke execute on function public.storage_company(text) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.forbid_company_change() from anon, authenticated;

-- Les fonctions créées plus tard ne seront plus ouvertes par défaut aux visiteurs.
alter default privileges in schema public revoke execute on functions from anon;
