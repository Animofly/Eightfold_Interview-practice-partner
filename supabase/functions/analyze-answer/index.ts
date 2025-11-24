import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, role, company, conversationHistory, remainingQuestions, resume } = await req.json();
    
    if (!question || !answer) {
      throw new Error('Question and answer are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing answer for question:', question);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are conducting a professional interview for a ${role} position at ${company}. 
            
Your job is to:
1. Analyze the candidate's answer briefly
2. Provide constructive feedback (1-2 sentences max)
3. Ask EXACTLY ONE question from the remaining questions list, or if all questions are done, wrap up the interview

CRITICAL: You MUST ask only ONE question at a time. Do not ask multiple questions in a single response.

${resume ? `\nCandidate's Resume Context:\n${resume}\n\nUse this context to evaluate their answers about their projects and experience.` : ''}

Keep your responses natural and conversational, like a real interviewer would speak.

Conversation so far:
${conversationHistory || 'This is the first question.'}

Remaining questions to ask (pick ONLY ONE):
${remainingQuestions && remainingQuestions.length > 0 ? remainingQuestions.join('\n') : 'No more questions - wrap up the interview.'}

Based on the candidate's answer, provide a brief response (feedback + ONE question or wrap-up).`
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nCandidate's Answer: ${answer}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Grok API error:', error);
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Analysis response received');
    
    const feedback = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing answer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});