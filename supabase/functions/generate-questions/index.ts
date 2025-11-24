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
    const { role, company, resume } = await req.json();
    
    if (!role || !company) {
      throw new Error('Role and company are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating structured questions for role:', role, 'at company:', company);

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
            content: `You are an expert interviewer preparing a structured interview for a ${role} position at ${company}. 

Generate exactly 3 questions for each category in this specific order:
1. BEHAVIORAL: Start with "Tell me about yourself" followed by 2 behavioral/soft skill questions
2. TECHNICAL: 3 technical questions specific to the ${role} role${resume ? ' - Include questions about the candidate\'s projects and experience from their resume' : ''}
3. HR: 3 HR/culture fit questions

${resume ? `\nCandidate's Resume:\n${resume}\n\nMake sure to ask specific questions about their projects and technical experience mentioned in the resume.` : ''}

Return ONLY a JSON array of exactly 9 question strings in this exact order, no other text or formatting.
Example format: ["Tell me about yourself and your background.", "Behavioral Q2?", "Behavioral Q3?", "Technical Q1?", "Technical Q2?", "Technical Q3?", "HR Q1?", "HR Q2?", "HR Q3?"]`
          },
          {
            role: 'user',
            content: `Generate structured interview questions for a ${role} position at ${company}.${resume ? ' The candidate has provided their resume with project details.' : ''}`
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
    console.log('Grok response:', JSON.stringify(data));
    
    const content = data.choices[0].message.content;
    
    // Parse the JSON array from the response
    let questions;
    try {
      questions = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse questions:', content);
      // Fallback: try to extract array from markdown code blocks
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse questions from response');
      }
    }

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});