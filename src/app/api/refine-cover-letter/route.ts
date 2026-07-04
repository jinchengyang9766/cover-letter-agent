import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type HighlightLevel = 'keep' | 'improve' | 'rewrite';

const HIGHLIGHT_LEVEL_GUIDANCE: Record<HighlightLevel, string> = {
  keep: 'the user liked these parts and wants them preserved as much as possible',
  improve: 'the user thinks these parts are okay but wants them improved while keeping the core idea',
  rewrite: 'the user does not like these parts and wants them rewritten or removed',
};

function buildHighlightSection(highlightFeedback: unknown): string {
  if (!Array.isArray(highlightFeedback) || highlightFeedback.length === 0) {
    return '';
  }

  const grouped: Record<HighlightLevel, string[]> = { keep: [], improve: [], rewrite: [] };

  for (const item of highlightFeedback) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as { text?: unknown }).text === 'string' &&
      ['keep', 'improve', 'rewrite'].includes((item as { level?: unknown }).level as string)
    ) {
      const text = (item as { text: string }).text.trim();
      const level = (item as { level: HighlightLevel }).level;
      if (text) grouped[level].push(text);
    }
  }

  const sections = (['keep', 'improve', 'rewrite'] as const)
    .filter((level) => grouped[level].length > 0)
    .map(
      (level) =>
        `${level.toUpperCase()} (${HIGHLIGHT_LEVEL_GUIDANCE[level]}):\n${grouped[level]
          .map((text) => `- "${text}"`)
          .join('\n')}`,
    );

  if (sections.length === 0) return '';

  return `\n\nThe user highlighted specific parts of the current cover letter with feedback:\n\n${sections.join('\n\n')}`;
}

function buildRevisionFeedbackSection(revisionFeedback: unknown): string {
  if (typeof revisionFeedback !== 'string' || !revisionFeedback.trim()) {
    return '';
  }
  return `\n\nThe user also gave this overall guidance for the revision:\n${revisionFeedback.trim()}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resumeText, jobDescription, currentCoverLetter, userInstruction, highlightFeedback, revisionFeedback } =
      body;

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

    const highlightSection = buildHighlightSection(highlightFeedback);
    const revisionFeedbackSection = buildRevisionFeedbackSection(revisionFeedback);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a professional cover letter editor. Revise the cover letter below according to the instruction provided.

CURRENT COVER LETTER:
${currentCoverLetter.trim()}${contextSection}${highlightSection}${revisionFeedbackSection}

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
