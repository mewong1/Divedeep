/**
 * Simple development server for LiveKit token generation
 * In production, implement this on your backend with proper security
 */

import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * Generate LiveKit access token
 * POST /api/livekit/token
 * Body: { roomName: string, participantName: string }
 */
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'Missing required fields: roomName, participantName',
      });
    }

    const apiKey = process.env.VITE_LIVEKIT_API_KEY;
    const apiSecret = process.env.VITE_LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'LiveKit credentials not configured',
      });
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    // Grant permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    res.json({ token: jwt });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`LiveKit token server running on http://localhost:${PORT}`);
  console.log(`Token endpoint: http://localhost:${PORT}/api/livekit/token`);
});

/**
 * Generate AI question
 * POST /api/ai/generate-question
 * Body: { context: { systemPrompt, userPrompt } }
 */
app.post('/api/ai/generate-question', async (req, res) => {
  try {
    const { context } = req.body;

    const apiKey = process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Dynamic import of OpenAI
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: context.systemPrompt,
        },
        {
          role: 'user',
          content: context.userPrompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    res.json({ result: JSON.parse(content) });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze conversation
 * POST /api/ai/analyze-conversation
 * Body: { transcript, vibe, askedQuestions }
 */
app.post('/api/ai/analyze-conversation', async (req, res) => {
  try {
    const { transcript, vibe, askedQuestions } = req.body;

    const apiKey = process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const CONNECTION_RESEARCH = `
Based on psychology research on interpersonal processes and connection:

CORE THEORIES:
1. Social Penetration Theory (SPT): Relationships deepen through increasing breadth and depth of self-disclosure over time
2. Uncertainty Reduction Theory (URT): People seek information about others to reduce uncertainty and make interaction predictable
3. Strong social connections affect both psychological and physiological health outcomes

KEY DOMAINS FOR CONNECTION:
1. VALUES/BELIEFS: Understanding what matters to someone, their principles, passions
2. PERSONAL HISTORY/IDENTITY: Past experiences, upbringing, cultural background
3. ASPIRATIONS/GOALS/MOTIVATIONS: Future direction, what drives them, meaning
4. EMOTIONS/INNER WORLD: Feelings, fears, joys, vulnerabilities
5. RELATIONAL STYLE/PREFERENCES: Communication style, boundaries, how they relate
6. CURRENT SITUATION/CONTEXT: What's happening now, current challenges/joys

BEST PRACTICES:
- Use open-ended questions to invite stories
- Practice active listening and reflect back
- Encourage mutual sharing (two-way disclosure)
- Recognize depth takes time - start superficial, move deeper
- Be mindful of readiness - trust and safety matter
- Pay attention to non-verbal cues
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert in interpersonal psychology and building deep human connections.

${CONNECTION_RESEARCH}

Analyze conversations to identify which connection domains have been explored and suggest next areas to deepen the relationship.`,
        },
        {
          role: 'user',
          content: `Analyze this conversation transcript and identify which connection domains have been explored.

Current Vibe: ${vibe}
Transcript: ${transcript}
Previously Asked Questions: ${askedQuestions.join(', ')}

Return a JSON object with:
- exploredDomains: array of domains that have been discussed (values_beliefs, personal_history, aspirations, emotions, relational_style, current_situation)
- unexploredDomains: array of domains not yet explored
- connectionDepth: number 0-10 indicating how deep the connection is
- suggestedDomain: the next domain to explore for deepening connection
- reasoning: brief explanation of your analysis

Respond ONLY with valid JSON.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    res.json({ result: JSON.parse(content) });
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check if should ask question
 * POST /api/ai/should-ask-question
 * Body: { recentTranscript, lastQuestionTime, currentTime }
 */
app.post('/api/ai/should-ask-question', async (req, res) => {
  try {
    const { recentTranscript, lastQuestionTime, currentTime } = req.body;

    // SPECIAL CASE: If this is the first question (lastQuestionTime is 0 or very old)
    // Show it immediately to get context
    if (lastQuestionTime === 0 || currentTime - lastQuestionTime > 300000) {
      return res.json({ shouldAsk: true });
    }

    // Don't ask too frequently (at least 30 seconds between questions - reduced from 60)
    if (currentTime - lastQuestionTime < 30000) {
      return res.json({ shouldAsk: false });
    }

    // Don't interrupt if there's been very recent conversation (last 5 seconds)
    const segments = recentTranscript.split('\n');
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && currentTime - lastQuestionTime < 5000) {
      return res.json({ shouldAsk: false });
    }

    const apiKey = process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert facilitator. Determine if this is a good moment to introduce a new question, or if the conversation is flowing naturally and should continue uninterrupted.',
        },
        {
          role: 'user',
          content: `Recent conversation:
${recentTranscript.slice(-300)}

Is this a good moment to introduce a new question? Consider:
- Is the conversation flowing naturally? (if yes, don't interrupt)
- Has there been a natural pause or lull? (good time)
- Are they deep in a topic? (let them continue)
- Has the energy dropped? (good time for new question)

Reply with just "yes" or "no".`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const answer = response.choices[0].message.content?.toLowerCase().trim();
    res.json({ shouldAsk: answer === 'yes' });
  } catch (error) {
    console.error('Error checking question timing:', error);
    // Conservative fallback - ask if enough time has passed
    res.json({ shouldAsk: currentTime - lastQuestionTime > 60000 });
  }
});

/**
 * Generate session summary
 * POST /api/ai/session-summary
 * Body: { transcript, vibe, duration, questionsAnswered }
 */
app.post('/api/ai/session-summary', async (req, res) => {
  try {
    const { transcript, vibe, duration, questionsAnswered } = req.body;

    const apiKey = process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const CONNECTION_RESEARCH = `
Based on psychology research on interpersonal processes and connection:

CORE THEORIES:
1. Social Penetration Theory (SPT): Relationships deepen through increasing breadth and depth of self-disclosure over time
2. Uncertainty Reduction Theory (URT): People seek information about others to reduce uncertainty and make interaction predictable
3. Strong social connections affect both psychological and physiological health outcomes
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing conversations and identifying themes, insights, and connection depth.

${CONNECTION_RESEARCH}`,
        },
        {
          role: 'user',
          content: `Analyze this conversation and provide a summary.

Duration: ${duration} minutes
Vibe: ${vibe}
Questions Answered: ${questionsAnswered}
Full Transcript: ${transcript}

Return JSON with:
- keyThemes: array of 3-5 main themes discussed (short phrases)
- insights: 2-3 sentence summary of what made this conversation meaningful
- connectionDepth: 0-10 score of how deep the connection went

Respond ONLY with valid JSON.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    res.json({ result: JSON.parse(content) });
  } catch (error) {
    console.error('Error generating session summary:', error);
    res.json({
      result: {
        keyThemes: ['Shared experiences', 'Personal growth', 'Future aspirations'],
        insights:
          'You shared meaningful moments and learned more about each other. The conversation touched on both lighthearted and deeper topics.',
        connectionDepth: 5,
      },
    });
  }
});