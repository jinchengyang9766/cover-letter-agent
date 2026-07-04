import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildPrompt(tone: string, jobDescription: string, resumeText?: string) {
  const introAndNotes = resumeText?.trim()
    ? `The candidate's resume is attached above as a PDF document.\n\nADDITIONAL NOTES FROM THE CANDIDATE:\n${resumeText.trim()}`
    : `The candidate's resume is attached above as a PDF document.`;

  return `You are a professional cover letter writer. Write a ${tone} cover letter based on the resume and job description below.

${introAndNotes}

JOB DESCRIPTION:
${jobDescription.trim()}

Write a compelling, tailored cover letter. Return only the cover letter text, with no additional commentary or explanation.`;
}

function buildTextOnlyPrompt(tone: string, jobDescription: string, resumeText: string) {
  return `You are a professional cover letter writer. Write a ${tone} cover letter based on the resume and job description below.

RESUME:
${resumeText.trim()}

JOB DESCRIPTION:
${jobDescription.trim()}

Write a compelling, tailored cover letter. Return only the cover letter text, with no additional commentary or explanation.`;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let resumeText = '';
    let jobDescription = '';
    let tone = 'professional';
    let pdfBase64: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const resumeFile = formData.get('resumeFile');
      const resumeTextField = formData.get('resumeText');
      const jobDescriptionField = formData.get('jobDescription');
      const toneField = formData.get('tone');

      resumeText = typeof resumeTextField === 'string' ? resumeTextField : '';
      jobDescription = typeof jobDescriptionField === 'string' ? jobDescriptionField : '';
      tone = typeof toneField === 'string' && toneField ? toneField : 'professional';

      if (resumeFile instanceof File) {
        const isPdf = resumeFile.type === 'application/pdf' || resumeFile.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          return Response.json({ error: 'Only PDF file uploads are supported by the server.' }, { status: 400 });
        }
        const arrayBuffer = await resumeFile.arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
      }
    } else {
      const body = await request.json();
      resumeText = typeof body.resumeText === 'string' ? body.resumeText : '';
      jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription : '';
      tone = typeof body.tone === 'string' && body.tone ? body.tone : 'professional';
    }

    if (!pdfBase64 && resumeText.trim() === '') {
      return Response.json({ error: 'resumeText is required' }, { status: 400 });
    }

    if (jobDescription.trim() === '') {
      return Response.json({ error: 'jobDescription is required' }, { status: 400 });
    }

    const content: Anthropic.Messages.ContentBlockParam[] = [];

    if (pdfBase64) {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64,
        },
      });
      content.push({
        type: 'text',
        text: buildPrompt(tone, jobDescription, resumeText),
      });
    } else {
      content.push({
        type: 'text',
        text: buildTextOnlyPrompt(tone, jobDescription, resumeText),
      });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content,
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
