import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Building2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.txt')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload a TXT file only. PDF support coming soon!',
          variant: 'destructive',
        });
        e.target.value = '';
        setResumeFile(null);
        return;
      }
      setResumeFile(file);
    }
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    const fileInput = document.getElementById('resume') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const extractTextFromResume = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleStartInterview = async () => {
    if (!role.trim() || !company.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both role and company',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      let resumeText = null;
      if (resumeFile) {
        resumeText = await extractTextFromResume(resumeFile);
      }

      // Create interview session
      const { data: session, error } = await supabase
        .from('interview_sessions')
        .insert({
          role: role.trim(),
          company: company.trim(),
          resume_text: resumeText,
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to interview page
      navigate(`/interview/${session.id}`);
    } catch (error) {
      console.error('Error creating interview session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start interview. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Interview Practice Partner
          </h1>
          <p className="text-xl text-muted-foreground">
            Perfect your interview skills with AI-powered practice sessions
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-elegant border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">Let's Get Started</CardTitle>
            <CardDescription>
              Tell us about the role you're practicing for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-base">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Role / Position
                </div>
              </Label>
              <Input
                id="role"
                placeholder="e.g., Software Engineer, Sales Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-base">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company
                </div>
              </Label>
              <Input
                id="company"
                placeholder="e.g., Google, Tesla, Local Startup"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume" className="text-base">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Resume (Optional)
                </div>
              </Label>
              {resumeFile ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex-1">
                    {resumeFile.name}
                  </span>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={handleRemoveResume}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Input
                  id="resume"
                  type="file"
                  accept=".txt"
                  onChange={handleResumeUpload}
                  className="text-base"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Upload your resume as a TXT file to get questions about your projects and experience
              </p>
            </div>

            <Button
              onClick={handleStartInterview}
              disabled={isLoading}
              className="w-full text-lg py-6"
              size="lg"
            >
              {isLoading ? 'Preparing Interview...' : 'Start Practice Interview'}
            </Button>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-card/50 border border-border/50">
            <h3 className="font-semibold text-foreground mb-2">Voice-Based</h3>
            <p className="text-sm text-muted-foreground">
              Practice with realistic speech-to-speech interaction
            </p>
          </div>
          <div className="p-4 rounded-lg bg-card/50 border border-border/50">
            <h3 className="font-semibold text-foreground mb-2">Real-time Feedback</h3>
            <p className="text-sm text-muted-foreground">
              Get instant analysis on your answers
            </p>
          </div>
          <div className="p-4 rounded-lg bg-card/50 border border-border/50">
            <h3 className="font-semibold text-foreground mb-2">Detailed Scoring</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive performance metrics after completion
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;