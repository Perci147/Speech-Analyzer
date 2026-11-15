import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;
    const scenario = formData.get('scenario') as string || 'General Public Speaking';

    if (!file) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
    You are an expert, empathetic Speech & Public Speaking Coach. 
    Analyze the attached audio recording for a "${scenario}" scenario.
    
    CRITICAL FAIRNESS RULE: Do NOT penalize the speaker for having an accent, regional pronunciation, or non-native dialect.
    
    Analyze the speech and return a strict JSON object matching this exact schema:
    {
      "overallScore": number (0-100),
      "rating": string (e.g., "Excellent", "Strong", "Developing", "Needs Improvement"),
      "transcript": "Full text of what they said",
      "scores": {
        "pace": number (out of 20),
        "confidence": number (out of 25),
        "fluency": number (out of 20),
        "clarity": number (out of 15),
        "structure": number (out of 20)
      },
      "metrics": {
        "durationSeconds": number,
        "wordCount": number,
        "wordsPerMinute": number,
        "fillerWordCount": number,
        "fillerRate": number,
        "longestPause": number
      },
      "strengths": [ "string" ],
      "improvements": [
        { "title": "string", "context": "string", "exercise": "string" }
      ]
    }
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type,
          data: base64Audio
        }
      },
      prompt
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to analyze speech' }, { status: 500 });
  }
}
