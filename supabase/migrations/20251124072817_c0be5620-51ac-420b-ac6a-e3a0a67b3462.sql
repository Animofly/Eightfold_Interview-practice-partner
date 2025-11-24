-- Add resume column to interview_sessions table
ALTER TABLE interview_sessions 
ADD COLUMN resume_text TEXT;