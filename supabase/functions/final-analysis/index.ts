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
    const { conversationHistory, role, company } = await req.json();
    
    if (!conversationHistory) {
      throw new Error('Conversation history is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating final analysis...');

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
            content: `You are an expert interviewer analyzing a candidate's performance for a ${role} position at ${company}.

Analyze the full conversation and provide scores and descriptions in the following JSON format:
{
  "clarity_score": <number 0-100>,
  "confidence_score": <number 0-10>,
  "fluency_description": "<brief description of speaking fluency>",
  "technical_accuracy_score": <number 0-100>,
  "problem_solving_description": "<brief description of problem-solving ability>",
  "relevance_analysis": "<brief analysis of how relevant the answers were>"
}

Be constructive but honest in your evaluation. Return ONLY the JSON object, no other text.`
          },
          {
            role: 'user',
            content: `Full interview conversation:\n\n${conversationHistory}\n\nProvide the analysis in JSON format.`
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
    console.log('Analysis response:', data.choices[0].message.content);
    
    const content = data.choices[0].message.content;
    
    // Parse the JSON from the response
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse analysis:', content);
      // Fallback: try to extract JSON from markdown code blocks
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        analysis = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse analysis from response');
      }
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating final analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});