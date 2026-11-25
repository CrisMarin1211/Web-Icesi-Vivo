CREATE TABLE public.campus_monuments (
 id text PRIMARY KEY,
 species text NOT NULL CHECK (species IN ('iguana','ardilla','pato','guatin')),
 label text NOT NULL,
 latitude double precision CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision CHECK (longitude BETWEEN -180 AND 180),
 CHECK ((latitude IS NULL) = (longitude IS NULL))
);
GRANT SELECT ON public.campus_monuments TO authenticated;
GRANT ALL ON public.campus_monuments TO service_role;
ALTER TABLE public.campus_monuments ENABLE ROW LEVEL SECURITY;
CREATE POLICY monument_read ON public.campus_monuments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TABLE public.monument_codes (
 monument_id text PRIMARY KEY REFERENCES public.campus_monuments(id),
 code text NOT NULL CHECK (length(code) BETWEEN 3 AND 32)
);
GRANT ALL ON public.monument_codes TO service_role;
ALTER TABLE public.monument_codes ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.monument_unlocks (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 monument_id text NOT NULL REFERENCES public.campus_monuments(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id, monument_id)
);
GRANT SELECT ON public.monument_unlocks TO authenticated;
GRANT ALL ON public.monument_unlocks TO service_role;
ALTER TABLE public.monument_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY unlock_own_read ON public.monument_unlocks FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.monument_questions (
 question_id text PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
 monument_id text NOT NULL REFERENCES public.campus_monuments(id)
);
GRANT SELECT ON public.monument_questions TO authenticated;
GRANT ALL ON public.monument_questions TO service_role;
ALTER TABLE public.monument_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY monument_question_read ON public.monument_questions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY monument_questions_require_unlock ON public.questions AS RESTRICTIVE FOR SELECT TO authenticated USING (
 NOT EXISTS (SELECT 1 FROM public.monument_questions mq WHERE mq.question_id=questions.id)
 OR EXISTS (SELECT 1 FROM public.monument_questions mq JOIN public.monument_unlocks u ON u.monument_id=mq.monument_id WHERE mq.question_id=questions.id AND u.user_id=auth.uid())
);
CREATE FUNCTION public.list_campus_monuments() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'species',m.species,'label',m.label,'latitude',m.latitude,'longitude',m.longitude,'code_ready',EXISTS(SELECT 1 FROM monument_codes c WHERE c.monument_id=m.id),'unlocked',EXISTS(SELECT 1 FROM monument_unlocks u WHERE u.monument_id=m.id AND u.user_id=auth.uid())) ORDER BY m.id),'[]'::jsonb)
 FROM campus_monuments m WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.list_campus_monuments() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_campus_monuments() TO authenticated;
CREATE FUNCTION public.unlock_monument(_monument_id text,_code text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
 IF length(_code) NOT BETWEEN 3 AND 32 OR _code !~ '^[A-Za-z0-9-]+$' THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM monument_codes WHERE monument_id=_monument_id AND upper(code)=upper(trim(_code))) THEN RETURN false; END IF;
 INSERT INTO monument_unlocks(user_id,monument_id) VALUES(auth.uid(),_monument_id) ON CONFLICT DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.unlock_monument(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unlock_monument(text,text) TO authenticated;
CREATE FUNCTION public.guard_monument_answer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM monument_questions WHERE question_id=NEW.question_id) AND NOT EXISTS(SELECT 1 FROM monument_questions mq JOIN monument_unlocks u ON u.monument_id=mq.monument_id WHERE mq.question_id=NEW.question_id AND u.user_id=auth.uid() AND NEW.user_id=auth.uid()) THEN
 RAISE EXCEPTION 'monument locked';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER monument_answer_access BEFORE INSERT ON public.answers FOR EACH ROW EXECUTE FUNCTION public.guard_monument_answer();