import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resumeText, jobDescription, tone = 'professional' } = body;

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim() === '') {
      return Response.json({ error: 'resumeText is required' }, { status: 400 });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim() === '') {
      return Response.json({ error: 'jobDescription is required' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a professional cover letter writer. Write a ${tone} cover letter based on the resume and job description below.

RESUME:
${resumeText.trim()}

JOB DESCRIPTION:
${jobDescription.trim()}

Write a compelling, tailored cover letter. Return only the cover letter text, with no additional commentary or explanation.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    const coverLetter = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    return Response.json({ coverLetter });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[generate-cover-letter] AuthenticationError:', error.message);
      return Response.json({ error: 'Invalid API key.' }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      console.error('[generate-cover-letter] RateLimitError:', error.message);
      return Response.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[generate-cover-letter] APIError ${error.status} (${error.name}):`, error.message);
      return Response.json({ error: 'AI service error. Please try again.' }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('[generate-cover-letter] Unexpected error:', message);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
