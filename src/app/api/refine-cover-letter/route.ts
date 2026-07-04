import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resumeText, jobDescription, currentCoverLetter, userInstruction } = body;

    if (!currentCoverLetter || typeof currentCoverLetter !== 'string' || currentCoverLetter.trim() === '') {
      return Response.json({ error: 'currentCoverLetter is required' }, { status: 400 });
    }

    if (!userInstruction || typeof userInstruction !== 'string' || userInstruction.trim() === '') {
      return Response.json({ error: 'userInstruction is required' }, { status: 400 });
    }

    const contextSection =
      resumeText || jobDescription
        ? `\n\nFor reference:\n${resumeText ? `RESUME:\n${resumeText.trim()}\n` : ''}${jobDescription ? `\nJOB DESCRIPTION:\n${jobDescription.trim()}` : ''}`
        : '';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a professional cover letter editor. Revise the cover letter below according to the instruction provided.

CURRENT COVER LETTER:
${currentCoverLetter.trim()}${contextSection}

INSTRUCTION:
${userInstruction.trim()}

Return only the revised cover letter text, with no additional commentary or explanation.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    const coverLetter = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    return Response.json({ coverLetter });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[refine-cover-letter] AuthenticationError:', error.message);
      return Response.json({ error: 'Invalid API key.' }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      console.error('[refine-cover-letter] RateLimitError:', error.message);
      return Response.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[refine-cover-letter] APIError ${error.status} (${error.name}):`, error.message);
      return Response.json({ error: 'AI service error. Please try again.' }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('[refine-cover-letter] Unexpected error:', message);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
