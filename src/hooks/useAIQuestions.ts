import { useState, useEffect, useCallback, useRef } from 'react';
import { aiService } from '../services/aiService';
import type { GeneratedQuestion, ConversationAnalysis } from '../types/ai';

interface UseAIQuestionsOptions {
  vibe: string;
  getTranscript: () => string;
  enabled?: boolean;
  checkInterval?: number;
}

export function useAIQuestions(options: UseAIQuestionsOptions) {
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [conversationAnalysis, setConversationAnalysis] =
    useState<ConversationAnalysis | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasShownFirstQuestion, setHasShownFirstQuestion] = useState(false);
  const lastQuestionTimeRef = useRef<number>(0);
  const lastAnalysisTimeRef = useRef<number>(0);

  const analyzeConversation = useCallback(async () => {
    if (isAnalyzing) return;

    const transcript = options.getTranscript();
    console.log('Analyzing conversation, transcript length:', transcript.length);
    
    setIsAnalyzing(true);
    try {
      const analysis = await aiService.analyzeConversation(
        transcript,
        options.vibe,
        askedQuestions
      );
      console.log('Analysis complete:', analysis);
      setConversationAnalysis(analysis);
      lastAnalysisTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error analyzing conversation:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [options.vibe, options.getTranscript, askedQuestions, isAnalyzing]);

  const generateQuestion = useCallback(async () => {
    console.log('generateQuestion called, isGenerating:', isGenerating);
    
    if (isGenerating) {
      console.log('Already generating, skipping...');
      return;
    }
    
    // Create a default analysis if none exists (for first question)
    const analysis = conversationAnalysis || {
      exploredDomains: [],
      unexploredDomains: [
        'values_beliefs',
        'personal_history',
        'aspirations',
        'emotions',
        'relational_style',
        'current_situation',
      ],
      connectionDepth: 0,
      suggestedDomain: 'current_situation',
      reasoning: 'Starting conversation - gathering context about who is present and the situation.',
    };

    console.log('Generating question with analysis:', analysis);
    setIsGenerating(true);
    
    try {
      const question = await aiService.generateQuestion({
        vibe: options.vibe,
        conversationAnalysis: analysis,
        recentTranscript: options.getTranscript(),
        askedQuestions,
      });

      console.log('Question generated:', question);
      setCurrentQuestion(question);
      setAskedQuestions((prev) => [...prev, question.question]);
      lastQuestionTimeRef.current = Date.now();
      setHasShownFirstQuestion(true);
    } catch (error) {
      console.error('Error generating question:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    options.vibe,
    options.getTranscript,
    conversationAnalysis,
    askedQuestions,
    isGenerating,
  ]);

  const checkAndAskQuestion = useCallback(async () => {
    if (!options.enabled || isGenerating || currentQuestion) return;

    const transcript = options.getTranscript();
    const now = Date.now();

    // Analyze conversation every 30 seconds if needed
    if (now - lastAnalysisTimeRef.current > 30000) {
      await analyzeConversation();
    }

    // Check if it's a good time to ask a question
    const shouldAsk = await aiService.shouldAskQuestion(
      transcript,
      lastQuestionTimeRef.current,
      now
    );

    if (shouldAsk) {
      await generateQuestion();
    }
  }, [
    options.enabled,
    options.getTranscript,
    currentQuestion,
    isGenerating,
    analyzeConversation,
    generateQuestion,
  ]);

  const dismissQuestion = useCallback(() => {
    setCurrentQuestion(null);
  }, []);

  const skipQuestion = useCallback(() => {
    setCurrentQuestion(null);
  }, []);

  const forceNextQuestion = useCallback(async () => {
    console.log('forceNextQuestion called');
    console.log('Current question:', currentQuestion);
    console.log('Asked questions:', askedQuestions);
    
    // Dismiss current question first
    setCurrentQuestion(null);
    
    // Get fresh transcript
    const transcript = options.getTranscript();
    console.log('Transcript for next question (length):', transcript.length);
    
    // Set analyzing state
    setIsAnalyzing(true);
    
    try {
      // Analyze conversation with current transcript
      const analysis = await aiService.analyzeConversation(
        transcript,
        options.vibe,
        askedQuestions
      );
      console.log('Fresh analysis:', analysis);
      setConversationAnalysis(analysis);
      lastAnalysisTimeRef.current = Date.now();
      
      // Now generate question with the fresh analysis
      setIsGenerating(true);
      const question = await aiService.generateQuestion({
        vibe: options.vibe,
        conversationAnalysis: analysis,
        recentTranscript: transcript,
        askedQuestions,
      });
  
      console.log('New question generated:', question);
      setCurrentQuestion(question);
      setAskedQuestions((prev) => [...prev, question.question]);
      lastQuestionTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error in forceNextQuestion:', error);
    } finally {
      setIsAnalyzing(false);
      setIsGenerating(false);
    }
  }, [askedQuestions, currentQuestion, options]);

  // Show first question immediately when enabled
  useEffect(() => {
    console.log('First question effect:', {
      enabled: options.enabled,
      hasShownFirstQuestion,
      currentQuestion: !!currentQuestion,
      isGenerating
    });
    
    if (options.enabled && !hasShownFirstQuestion && !currentQuestion && !isGenerating) {
      console.log('Triggering first question...');
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        generateQuestion();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [options.enabled, hasShownFirstQuestion, currentQuestion, isGenerating, generateQuestion]);

  // Periodic check for asking questions (after first question)
  useEffect(() => {
    if (!options.enabled || !hasShownFirstQuestion) return;

    const interval = setInterval(
      checkAndAskQuestion,
      options.checkInterval || 15000
    );

    return () => clearInterval(interval);
  }, [options.enabled, options.checkInterval, hasShownFirstQuestion, checkAndAskQuestion]);

  return {
    currentQuestion,
    conversationAnalysis,
    askedQuestions,
    isAnalyzing,
    isGenerating,
    dismissQuestion,
    skipQuestion,
    forceNextQuestion,
    analyzeConversation,
  };
}