import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportResultsToPDF } from '@/utils/pdfExport';
import { Home, Loader2, Download, ExternalLink } from 'lucide-react';

interface AnalysisData {
  clarity_score: number;
  confidence_score: number;
  fluency_description: string;
  technical_accuracy_score: number;
  problem_solving_description: string;
  relevance_analysis: string;
}

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [sessionData, setSessionData] = useState<{ role: string; company: string } | null>(null);
  const [resources, setResources] = useState<Array<{ title: string; url: string; description: string }>>([]);

  useEffect(() => {
    const loadResults = async () => {
      if (!sessionId) return;

      try {
        // Load session
        const { data: session, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        setSessionData({ role: session.role, company: session.company });

        // Check if analysis already exists
        const { data: existingAnalysis } = await supabase
          .from('interview_analysis')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (existingAnalysis) {
          setAnalysis({
            clarity_score: existingAnalysis.clarity_score || 0,
            confidence_score: existingAnalysis.confidence_score || 0,
            fluency_description: existingAnalysis.fluency_description || '',
            technical_accuracy_score: existingAnalysis.technical_accuracy_score || 0,
            problem_solving_description: existingAnalysis.problem_solving_description || '',
            relevance_analysis: existingAnalysis.relevance_analysis || '',
          });
          setIsLoading(false);
          return;
        }

        // Get conversation history
        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at');

        const conversationHistory = messages
          ?.map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
          .join('\n\n');

        // Generate final analysis
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          'final-analysis',
          {
            body: {
              conversationHistory,
              role: session.role,
              company: session.company,
            },
          }
        );

        if (analysisError) throw analysisError;

        console.log('Final analysis:', analysisData);
        setAnalysis(analysisData);

        // Generate resources
        const { data: resourcesData } = await supabase.functions.invoke('generate-resources', {
          body: { role: session.role, company: session.company }
        });

        if (resourcesData?.resources) {
          setResources(resourcesData.resources);
        }

        // Save analysis to database
        await supabase.from('interview_analysis').insert({
          session_id: sessionId,
          clarity_score: analysisData.clarity_score,
          confidence_score: analysisData.confidence_score,
          fluency_description: analysisData.fluency_description,
          technical_accuracy_score: analysisData.technical_accuracy_score,
          problem_solving_description: analysisData.problem_solving_description,
          relevance_analysis: analysisData.relevance_analysis,
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading results:', error);
        toast({
          title: 'Error',
          description: 'Failed to load interview results',
          variant: 'destructive',
        });
        navigate('/');
      }
    };

    loadResults();
  }, [sessionId, navigate, toast]);

  const handleExportPDF = () => {
    if (sessionData && analysis) {
      exportResultsToPDF(sessionData, analysis, resources);
      toast({
        title: 'PDF Exported',
        description: 'Results downloaded successfully',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Analyzing your performance...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>No analysis available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Interview Complete!</h1>
          <p className="text-xl text-muted-foreground">
            {sessionData?.role} at {sessionData?.company}
          </p>
        </div>

        {/* Communication Scores */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Communication</CardTitle>
            <CardDescription>How well you expressed yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Clarity</span>
                <span className="font-semibold">{analysis.clarity_score}%</span>
              </div>
              <Progress value={analysis.clarity_score} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Confidence</span>
                <span className="font-semibold">{analysis.confidence_score}%</span>
              </div>
              <Progress value={analysis.confidence_score} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Fluency</div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                {analysis.fluency_description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Technical Performance */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Technical Performance</CardTitle>
            <CardDescription>Knowledge and problem-solving ability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Technical Accuracy</span>
                <span className="font-semibold">{analysis.technical_accuracy_score}%</span>
              </div>
              <Progress value={analysis.technical_accuracy_score} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Problem-Solving</div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                {analysis.problem_solving_description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Relevance Analysis */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Relevance to Questions</CardTitle>
            <CardDescription>How well you addressed each question</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              {analysis.relevance_analysis}
            </p>
          </CardContent>
        </Card>

        {/* Preparation Resources */}
        {resources.length > 0 && (
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Preparation Resources</CardTitle>
              <CardDescription>
                Recommended links to learn about {sessionData?.company} and prepare for {sessionData?.role}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resources.map((resource, idx) => (
                <div key={idx} className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{resource.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                      <a 
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {resource.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate('/')} size="lg">
            <Home className="mr-2 h-5 w-5" />
            Practice Again
          </Button>
          <Button variant="outline" size="lg" onClick={handleExportPDF}>
            <Download className="mr-2 h-5 w-5" />
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
}