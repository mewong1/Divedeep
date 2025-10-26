import type {
  ConversationAnalysis,
  QuestionContext,
  GeneratedQuestion,
  ConnectionDomain,
} from '../types/ai';

// Connection research context for AI
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

const API_BASE_URL = 'http://localhost:3001/api/ai';

export class AIService {
  /**
   * Analyzes the conversation to understand which connection domains have been explored
   */
  async analyzeConversation(
    transcript: string,
    vibe: string,
    askedQuestions: string[]
  ): Promise<ConversationAnalysis> {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, vibe, askedQuestions }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result as ConversationAnalysis;
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      // Fallback analysis
      return {
        exploredDomains: [],
        unexploredDomains: [
          'values_beliefs',
          'personal_history',
          'aspirations',
          'emotions',
          'relational_style',
          'current_situation',
        ],
        connectionDepth: 1,
        suggestedDomain: 'current_situation',
        reasoning: 'Starting with current situation as a comfortable entry point.',
      };
    }
  }

  /**
   * Generates a contextual question based on conversation analysis
   */
  async generateQuestion(context: QuestionContext): Promise<GeneratedQuestion> {
    try {
      const systemPrompt = `You are an expert facilitator of deep human connection, based on "We're Not Really Strangers" principles.

${CONNECTION_RESEARCH}

Your role is to generate questions that:
1. Build on what's been discussed (continuity)
2. Deepen the conversation in unexplored domains
3. Match the vibe (fun, thoughtful, or deep)
4. Feel natural and timely
5. Encourage mutual vulnerability and self-disclosure
6. Are open-ended to invite stories

VIBE GUIDELINES:
- Fun: Light, playful, creative - but still meaningful
- Thoughtful: Intellectual, reflective, perspective-shifting
- Deep: Vulnerable, emotional, intimate
- Mixed: Balance of all three`;

      const userPrompt = `Generate the next question for this conversation.

Context:
- Current Vibe: ${context.vibe}
- Connection Depth: ${context.conversationAnalysis.connectionDepth}/10
- Explored Domains: ${context.conversationAnalysis.exploredDomains.join(', ') || 'none yet'}
- Suggested Domain: ${context.conversationAnalysis.suggestedDomain}
- Reasoning: ${context.conversationAnalysis.reasoning}
- Recent Conversation: ${context.recentTranscript.slice(-500)}
- Previously Asked: ${context.askedQuestions.slice(-3).join(', ')}

Generate ONE question that:
1. Fits the ${context.vibe} vibe
2. Explores the ${context.conversationAnalysis.suggestedDomain} domain
3. Builds naturally on the recent conversation
4. Hasn't been asked before
5. Encourages deeper connection

Return JSON with:
- question: the question text
- domain: the connection domain it targets
- followUp: (optional) a gentle follow-up prompt if they go shallow
- reasoning: why this question fits the moment

Respond ONLY with valid JSON.`;

      const response = await fetch(`${API_BASE_URL}/generate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { systemPrompt, userPrompt },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result as GeneratedQuestion;
    } catch (error) {
      console.error('Error generating question:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      // Fallback to static questions based on vibe
      const fallbackQuestions = {
        fun: "Who's here today and what brings you all together?",
        thoughtful: "Let's start with introductions - who are we with and what's the situation?",
        deep: "Before we dive in, who's in the room and what brings us together today?",
        mixed: "Let's start - who are we with today and what's the context?",
      };

      return {
        question:
          fallbackQuestions[context.vibe as keyof typeof fallbackQuestions] ||
          fallbackQuestions.mixed,
        domain: 'current_situation' as ConnectionDomain,
        reasoning: 'Fallback question due to API error',
      };
    }
  }

  /**
   * Analyzes if it's a good moment to ask a question based on conversation flow
   */
  async shouldAskQuestion(
    recentTranscript: string,
    lastQuestionTime: number,
    currentTime: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/should-ask-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentTranscript, lastQuestionTime, currentTime }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.shouldAsk;
    } catch (error) {
      console.error('Error checking question timing:', error);
      // Conservative fallback - ask if enough time has passed
      return currentTime - lastQuestionTime > 120000; // 2 minutes
    }
  }

  /**
   * Generates session summary for reflection screen
   */
  async generateSessionSummary(
    transcript: string,
    vibe: string,
    duration: number,
    questionsAnswered: number
  ): Promise<{
    keyThemes: string[];
    insights: string;
    connectionDepth: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/session-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, vibe, duration, questionsAnswered }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error generating session summary:', error);
      return {
        keyThemes: ['Shared experiences', 'Personal growth', 'Future aspirations'],
        insights:
          'You shared meaningful moments and learned more about each other. The conversation touched on both lighthearted and deeper topics.',
        connectionDepth: 5,
      };
    }
  }
}

export const aiService = new AIService();