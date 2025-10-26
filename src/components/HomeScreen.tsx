import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Sparkles, Users, MessageCircle, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../assets/logo.png';  // Adjust filename to match yours

type Vibe = 'fun' | 'thoughtful' | 'deep' | 'mixed';

interface HomeScreenProps {
  onStartRoom: (vibe: Vibe) => void;
  onJoinRoom: (code: string, vibe: Vibe) => void;
}

export function HomeScreen({ onStartRoom, onJoinRoom }: HomeScreenProps) {
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('mixed');

  const vibes = [
    { id: 'fun' as Vibe, label: 'Fun', emoji: '🕺', color: 'from-yellow-400 to-orange-500', description: 'Light & playful' },
    { id: 'thoughtful' as Vibe, label: 'Thoughtful', emoji: '💭', color: 'from-blue-400 to-cyan-500', description: 'Intellectual & curious' },
    { id: 'deep' as Vibe, label: 'Deep', emoji: '❤️', color: 'from-pink-400 to-rose-500', description: 'Vulnerable & meaningful' },
    { id: 'mixed' as Vibe, label: 'Mixed', emoji: '🎲', color: 'from-purple-400 to-indigo-500', description: 'Surprise me!' },
  ];

  const handleJoin = () => {
    if (joinCode.trim()) {
      onJoinRoom(joinCode.trim().toUpperCase(), selectedVibe);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        {/* Logo & Title */}
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-30 h-30 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 mb-4"
          >
            <img src={logo} alt="DiveDeep Logo" className="w-20 h-20" />
          </motion.div>
          
          <h1 className="text-white text-6xl">
            DiveDeep
          </h1>
          
          <p className="text-purple-200 text-xl">
            Talk, listen, and discover something new about each other
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg"
            onClick={() => onStartRoom(selectedVibe)}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Start a Room
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="w-full h-16 bg-white/10 border-white/20 hover:bg-white/20 text-white text-lg"
            onClick={() => setShowJoinDialog(true)}
          >
            <Users className="mr-2 h-5 w-5" />
            Join with Code
          </Button>
        </div>

        {/* Vibe Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-purple-200">
            <Brain className="h-4 w-4" />
            <span className="text-sm">Set the Vibe</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {vibes.map((vibe) => (
              <motion.button
                key={vibe.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedVibe(vibe.id)}
                className={`p-4 rounded-2xl transition-all ${
                  selectedVibe === vibe.id
                    ? `bg-gradient-to-br ${vibe.color} shadow-lg`
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="text-3xl mb-2">{vibe.emoji}</div>
                <div className={`text-sm mb-1 ${selectedVibe === vibe.id ? 'text-white' : 'text-purple-200'}`}>
                  {vibe.label}
                </div>
                <div className={`text-xs ${selectedVibe === vibe.id ? 'text-white/80' : 'text-purple-300'}`}>
                  {vibe.description}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Floating particles effect */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 50,
              }}
              animate={{
                y: -50,
                x: Math.random() * window.innerWidth,
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle>Join a Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-purple-200 mb-2 block">Room Code</label>
              <Input
                placeholder="Enter 6-digit code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                maxLength={6}
              />
            </div>
            
            <div>
              <label className="text-sm text-purple-200 mb-2 block">Your Vibe</label>
              <div className="grid grid-cols-2 gap-2">
                {vibes.map((vibe) => (
                  <button
                    key={vibe.id}
                    onClick={() => setSelectedVibe(vibe.id)}
                    className={`p-3 rounded-lg transition-all ${
                      selectedVibe === vibe.id
                        ? `bg-gradient-to-br ${vibe.color}`
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span className="mr-2">{vibe.emoji}</span>
                    <span className="text-sm">{vibe.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <Button
              onClick={handleJoin}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={!joinCode.trim()}
            >
              Join Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
