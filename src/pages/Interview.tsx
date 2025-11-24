import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VoiceButton } from '@/components/VoiceButton';
import { ConversationMessage } from '@/components/ConversationMessage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BrowserSpeechSynthesis } from '@/utils/browserSpeech';
import { exportConversationToPDF } from '@/utils/pdfExport';
import { Loader2, Download } from 'lucide-react';

type InterviewState = 'loading' | 'ready' | 'speaking' | 'listening' | 'processing' | 'completed';

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [state, setState] = useState<InterviewState>('loading');
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionData, setSessionData] = useState<{ role: string; company: string; resume_text?: string | null } | null>(null);
  const [questionCategory, setQuestionCategory] = useState<'behavioral' | 'technical' | 'hr'>('behavioral');
  const [speechSynthesis] = useState(() => new BrowserSpeechSynthesis());
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load session and generate questions
  useEffect(() => {
    const initializeInterview = async () => {
      if (!sessionId) return;

      try {
        // Load session
        const { data: session, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        setSessionData({ role: session.role, company: session.company, resume_text: session.resume_text });

        // Generate questions
        const { data: questionsData, error: questionsError } = await supabase.functions.invoke(
          'generate-questions',
          { body: { role: session.role, company: session.company, resume: session.resume_text } }
        );

        if (questionsError) throw questionsError;
        
        console.log('Questions generated:', questionsData);
        setQuestions(questionsData.questions);

        // Save first question as interviewer message
        await supabase.from('conversation_messages').insert({
          session_id: sessionId,
          role: 'interviewer',
          content: questionsData.questions[0],
        });

        setMessages([{ role: 'interviewer', content: questionsData.questions[0] }]);

        // Speak the first question
        await speakQuestion(questionsData.questions[0]);
      } catch (error) {
        console.error('Error initializing interview:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize interview',
          variant: 'destructive',
        });
        navigate('/');
      }
    };

    initializeInterview();
  }, [sessionId, navigate, toast]);

  // Determine question category based on index
  useEffect(() => {
    if (currentQuestionIndex < 3) {
      setQuestionCategory('behavioral');
    } else if (currentQuestionIndex < 6) {
      setQuestionCategory('technical');
    } else {
      setQuestionCategory('hr');
    }
  }, [currentQuestionIndex]);

  const speakQuestion = async (question: string) => {
    setState('speaking');
    try {
      await speechSynthesis.speak(question, () => {
        setState('ready');
      });
    } catch (error) {
      console.error('Error speaking question:', error);
      toast({
        title: 'Speech Error',
        description: 'Could not speak the question. Please read it.',
        variant: 'destructive',
      });
      setState('ready');
    }
  };

  const handleTranscript = async (transcript: string) => {
    if (!transcript.trim()) {
      toast({
        title: 'No speech detected',
        description: 'Please try speaking again',
        variant: 'destructive',
      });
      return;
    }

    setState('processing');

    try {
      console.log('User answer:', transcript);

      // Save candidate's message
      await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        role: 'candidate',
        content: transcript,
      });

      setMessages(prev => [...prev, { role: 'candidate', content: transcript }]);

      // Get conversation history
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at');

      const conversationHistory = messages
        ?.map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n');

      // Analyze answer and get next question
      const remainingQuestions = questions.slice(currentQuestionIndex + 1);

      const { data: analysis, error: analysisError } = await supabase.functions.invoke(
        'analyze-answer',
        {
          body: {
            question: questions[currentQuestionIndex],
            answer: transcript,
            role: sessionData?.role,
            company: sessionData?.company,
            conversationHistory,
            remainingQuestions,
            resume: sessionData?.resume_text,
          },
        }
      );

      if (analysisError) throw analysisError;

      console.log('Analysis:', analysis.feedback);

      // Save interviewer's response
      await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        role: 'interviewer',
        content: analysis.feedback,
      });

      setMessages(prev => [...prev, { role: 'interviewer', content: analysis.feedback }]);

      // Check if interview is complete
      if (currentQuestionIndex >= questions.length - 1 || 
          analysis.feedback.toLowerCase().includes('wrap up') ||
          analysis.feedback.toLowerCase().includes('conclude')) {
        // Complete interview
        await supabase
          .from('interview_sessions')
          .update({ status: 'completed' })
          .eq('id', sessionId);

        setState('completed');
        
        // Speak final feedback
        await speakQuestion(analysis.feedback);
        
        toast({
          title: 'Interview Complete!',
          description: 'Redirecting to results...',
        });
        
        setTimeout(() => {
          navigate(`/results/${sessionId}`);
        }, 2000);
      } else {
        // Move to next question
        setCurrentQuestionIndex((prev) => prev + 1);
        setState('ready');
        
        // Speak feedback and next question
        await speakQuestion(analysis.feedback + ' ... ' + questions[currentQuestionIndex + 1]);
      }
    } catch (error) {
      console.error('Error processing answer:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your answer',
        variant: 'destructive',
      });
      setState('ready');
    }
  };

  const handleRepeatQuestion = async () => {
    if (questions[currentQuestionIndex]) {
      await speakQuestion(questions[currentQuestionIndex]);
    }
  };

  const handleEndInterview = () => {
    navigate('/');
  };

  const handleExportPDF = () => {
    if (sessionData) {
      exportConversationToPDF(messages, sessionData.role, sessionData.company);
      toast({
        title: 'PDF Exported',
        description: 'Interview conversation downloaded successfully',
      });
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Preparing your interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between max-w-7xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {sessionData?.role}
              </h1>
              <p className="text-sm text-muted-foreground">@ {sessionData?.company}</p>
            </div>
            <Button 
              variant="ghost" 
              className="text-destructive hover:text-destructive"
              onClick={handleEndInterview}
            >
              End Session
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, idx) => (
                <ConversationMessage
                  key={idx}
                  role={msg.role as 'interviewer' | 'candidate'}
                  content={msg.content}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-96 border-l border-border p-6 flex flex-col items-center justify-between bg-secondary/20">
            <div className="text-center space-y-4 flex-1 flex flex-col items-center justify-center">
              {/* Waveform Visualization */}
              <div className="w-full h-32 flex items-center justify-center">
                {state === 'speaking' || state === 'listening' ? (
                  <div className="flex items-end gap-1 h-20">
                    {[...Array(40)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    {messages.length === 0 
                      ? 'Metrics will appear here after your first response.'
                      : 'Voice visualization active during speech'}
                  </p>
                )}
              </div>

              {/* Question Progress */}
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    questionCategory === 'behavioral' ? 'bg-blue-500/20 text-blue-400' :
                    questionCategory === 'technical' ? 'bg-green-500/20 text-green-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {questionCategory.toUpperCase()}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {state === 'processing' && (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Analyzing your answer...</span>
                </div>
              )}
            </div>

            {/* Voice Button */}
            <div className="space-y-4 w-full">
              <div className="flex flex-col items-center">
                <VoiceButton
                  onTranscript={handleTranscript}
                  disabled={state !== 'ready'}
                  isProcessing={state === 'processing'}
                />
                <p className="text-xs text-muted-foreground mt-4">
                  Note: Using Gemini 2.5 Flash for high-speed analysis.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRepeatQuestion}
                  disabled={state !== 'ready'}
                  className="flex-1"
                >
                  Repeat Question
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={messages.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
