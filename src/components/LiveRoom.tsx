import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SkipForward,
  Shuffle,
  Copy,
  LogOut,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionCard } from './QuestionCard';
import { useLiveKit } from '../hooks/useLiveKit';
import { useTranscription } from '../hooks/useTranscription';
import { useAIQuestions } from '../hooks/useAIQuestions';
import { aiService } from '../services/aiService';

type Vibe = 'fun' | 'thoughtful' | 'deep' | 'mixed';

interface LiveRoomProps {
  vibe: Vibe;
  roomCode: string;
  onEndSession: (data: any) => void;
}

export function LiveRoom({ vibe, roomCode, onEndSession }: LiveRoomProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  // LiveKit connection
  const {
    participants,
    isConnected,
    isConnecting,
    error: connectionError,
    isMicEnabled,
    isCameraEnabled,
    connect,
    disconnect,
    toggleMicrophone,
    toggleCamera,
  } = useLiveKit({
    roomName: roomCode,
    participantName: 'User', // In production, get from user profile
    onConnected: () => {
      console.log('Connected to LiveKit room');
    },
    onDisconnected: () => {
      console.log('Disconnected from LiveKit room');
    },
    onError: (error) => {
      console.error('LiveKit error:', error);
    },
  });

  // Transcription
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    getFullTranscript,
    getRecentTranscript,
  } = useTranscription({
    participantId: participants[0]?.identity || 'user',
    participantName: participants[0]?.name || 'You',
    enabled: isConnected && isMicEnabled,
  });

  // AI question generation
  const {
    currentQuestion,
    isAnalyzing,
    isGenerating,
    askedQuestions,
    dismissQuestion,
    skipQuestion,
    forceNextQuestion,
  } = useAIQuestions({
    vibe,
    getTranscript: getRecentTranscript,
    enabled: isConnected
  });

  const vibeColors = {
    fun: { bg: 'from-yellow-400 to-orange-500', text: 'text-yellow-400' },
    thoughtful: { bg: 'from-blue-400 to-cyan-500', text: 'text-blue-400' },
    deep: { bg: 'from-pink-400 to-rose-500', text: 'text-pink-400' },
    mixed: { bg: 'from-purple-400 to-indigo-500', text: 'text-purple-400' },
  };

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  // Auto-start transcription when mic is enabled
  useEffect(() => {
    if (isConnected && isMicEnabled && !isListening) {
      startListening();
    } else if (!isMicEnabled && isListening) {
      stopListening();
    }
  }, [isConnected, isMicEnabled]);

  const handleSkipQuestion = () => {
    skipQuestion();
  };

  const handleAnswerQuestion = () => {
    dismissQuestion();
  };

  const handleNextQuestion = async () => {
    await forceNextQuestion();
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEndSession = async () => {
    const duration = Math.floor((Date.now() - sessionStartTime) / 60000);
    const fullTranscript = getFullTranscript();

    // Generate AI summary
    const summary = await aiService.generateSessionSummary(
      fullTranscript,
      vibe,
      duration,
      askedQuestions.length
    );

    const sessionData = {
      duration: `${duration} minutes`,
      vibeBreakdown: { deep: 40, fun: 30, thoughtful: 30 }, // Could be calculated from question types
      keyThemes: summary.keyThemes,
      questionsAnswered: askedQuestions.length,
      topQuestions: askedQuestions.slice(-3),
    };

    await disconnect();
    onEndSession(sessionData);
  };

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto" />
          <p className="text-white text-lg">Connecting to room...</p>
          <p className="text-slate-400 text-sm">Room: {roomCode}</p>
        </div>
      </div>
    );
  }

  // Show error state if connection failed
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">Failed to connect</p>
          <p className="text-slate-400 text-sm">{connectionError.message}</p>
          <Button onClick={() => connect()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`bg-gradient-to-r ${vibeColors[vibe].bg} text-white border-0`}>
            {vibe.charAt(0).toUpperCase() + vibe.slice(1)} Vibe
          </Badge>

          <button
            onClick={copyRoomCode}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <span className="text-sm">Room: {roomCode}</span>
            <Copy className="h-3 w-3" />
            {copiedCode && <span className="text-xs text-green-400">Copied!</span>}
          </button>

          {isConnected && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
              Connected
            </Badge>
          )}
        </div>

        <Button
          onClick={handleEndSession}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          End Session
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Video Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Grid */}
          <div className="grid grid-cols-2 gap-4">
            {participants.map((participant) => (
              <motion.div
                key={participant.id}
                className="relative aspect-video rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {/* Placeholder video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl">
                    {participant.name.charAt(0)}
                  </div>
                </div>
                
                {/* Name badge */}
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-black/50 text-white border-0">
                    {participant.name}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Controls */}
          <Card className="bg-slate-800/50 border-slate-700 p-4">
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isMicEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleMicrophone}
                className="rounded-full w-14 h-14"
              >
                {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={isCameraEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleCamera}
                className="rounded-full w-14 h-14"
              >
                {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <div className="flex-1" />

              <Button
                variant="outline"
                onClick={handleNextQuestion}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={!!currentQuestion || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <SkipForward className="h-4 w-4 mr-2" />
                )}
                Next Question
              </Button>
            </div>
          </Card>

          {/* AI Status Indicators */}
          <AnimatePresence>
            {(isAnalyzing || isGenerating) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-center gap-2 text-purple-300"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.div>
                <span>
                  {isAnalyzing
                    ? 'AI is analyzing the conversation...'
                    : 'AI is crafting the next question...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar - Transcript */}
        <div className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 h-full">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-white">Live Transcript</h3>
              <p className="text-sm text-slate-400">Real-time conversation</p>
            </div>
            
            <ScrollArea className="h-[calc(100vh-300px)] p-4">
              <div className="space-y-4">
                {transcript.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center mt-8">
                    {isListening
                      ? 'Listening... Start speaking to see transcript'
                      : 'Enable microphone to start transcription'}
                  </p>
                ) : (
                  transcript
                    .filter((segment) => segment.isFinal)
                    .map((segment, index) => (
                      <motion.div
                        key={`${segment.participantId}-${segment.timestamp}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${vibeColors[vibe].text}`}>
                            {segment.participantName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(segment.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{segment.text}</p>
                      </motion.div>
                    ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Question Card Overlay */}
      <AnimatePresence>
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion.question}
            vibe={vibe}
            onAnswer={handleAnswerQuestion}
            onSkip={handleSkipQuestion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
