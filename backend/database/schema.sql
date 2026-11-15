-- Schema definition for public.schemes
CREATE TABLE IF NOT EXISTS public.schemes (
    id SERIAL PRIMARY KEY,
    scheme_name TEXT,
    scheme_slug TEXT UNIQUE NOT NULL,
    level TEXT,
    state_ut_ministry TEXT,
    application_mode TEXT,
    tags TEXT[],
    description TEXT,
    eligibility_criteria TEXT,
    eligibility_general TEXT,
    exclusions_ineligibility TEXT,
    benefits TEXT,
    application_process TEXT,
    documents_required TEXT,
    faqs TEXT,
    official_link TEXT,
    myscheme_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recommended indexes for query performance
CREATE INDEX IF NOT EXISTS idx_schemes_slug ON public.schemes(scheme_slug);
CREATE INDEX IF NOT EXISTS idx_schemes_state_ut_ministry ON public.schemes(state_ut_ministry);
CREATE INDEX IF NOT EXISTS idx_schemes_tags ON public.schemes USING GIN(tags);
