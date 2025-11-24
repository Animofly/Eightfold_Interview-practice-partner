-- Create interview sessions table
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation messages table
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('interviewer', 'candidate')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create interview analysis table
CREATE TABLE IF NOT EXISTS public.interview_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 10),
  fluency_description TEXT,
  technical_accuracy_score INTEGER CHECK (technical_accuracy_score >= 0 AND technical_accuracy_score <= 100),
  problem_solving_description TEXT,
  relevance_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access since no authentication required for MVP)
CREATE POLICY "Allow all access to interview_sessions" ON public.interview_sessions FOR ALL USING (true);
CREATE POLICY "Allow all access to conversation_messages" ON public.conversation_messages FOR ALL USING (true);
CREATE POLICY "Allow all access to interview_analysis" ON public.interview_analysis FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();