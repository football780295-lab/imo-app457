
import React, { useState, useMemo } from 'react';
import { Profile, Message, CallType } from './types';
import { ALL_PROFILES, INITIAL_GREETINGS } from './constants';
import ChatWindow from './components/ChatWindow';
import CallOverlay from './components/CallOverlay';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserPlus, Plus, MessageSquare, Phone, Users, UserCircle } from 'lucide-react';

// Helper to pick daily profiles based on date to keep it fresh
const getDailyProfiles = (profiles: Profile[], count: number) => {
  const dateStr = new Date().toISOString().split('T')[0]; // Format: "YYYY-MM-DD"
  const seed = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  
  const shuffled = [...profiles].sort((a, b) => {
    const hashA = a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + (seed * 13);
    const hashB = b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + (seed * 13);
    return (hashA % 100) - (hashB % 100);
  });

  return shuffled.slice(0, count);
};

// Safe Image Component to prevent broken icons
const SafeAvatar: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  const fallback = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&h=400&auto=format&fit=crop";
  return (
    <img 
      src={error ? fallback : src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)}
    />
  );
};

export default function App() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});
  const [activeCall, setActiveCall] = useState<{ type: CallType; profile: Profile } | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'explore'>('chats');

  const dailyProfiles = useMemo(() => getDailyProfiles(ALL_PROFILES, 12), []);

  const openChat = (profile: Profile) => {
    setSelectedProfile(profile);
    if (!chatHistory[profile.id]) {
      const initialMessage: Message = {
        id: Math.random().toString(),
        senderId: profile.id,
        text: INITIAL_GREETINGS[profile.id] || "Hi there!",
        timestamp: new Date(),
        type: 'text'
      };
      setChatHistory(prev => ({ ...prev, [profile.id]: [initialMessage] }));
    }
  };

  const handleSendMessage = (text: string, senderId: 'me' | string = 'me') => {
    if (!selectedProfile) return;
    const newMessage: Message = {
      id: Math.random().toString(),
      senderId: senderId,
      text,
      timestamp: new Date(),
      type: 'text'
    };
    setChatHistory(prev => ({
      ...prev,
      [selectedProfile.id]: [...(prev[selectedProfile.id] || []), newMessage]
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto shadow-2xl border-x border-gray-100 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {activeCall ? (
          <motion.div 
            key="call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50"
          >
            <CallOverlay profile={activeCall.profile} type={activeCall.type} onEnd={() => setActiveCall(null)} />
          </motion.div>
        ) : selectedProfile ? (
          <motion.div 
            key="chat"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-40"
          >
            <ChatWindow 
              profile={selectedProfile} 
              messages={chatHistory[selectedProfile.id] || []}
              onSendMessage={(text) => handleSendMessage(text, 'me')}
              onReceiveMessage={(text) => handleSendMessage(text, selectedProfile.id)}
              onBack={() => setSelectedProfile(null)}
              onCall={(type) => setActiveCall({ type, profile: selectedProfile })}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="home"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0.5 }}
            className="flex flex-col h-full"
          >
            <div className="imo-blue p-4 text-white flex justify-between items-center shadow-lg">
              <h1 className="text-2xl font-bold tracking-tight">Bondhu</h1>
              <div className="flex gap-4">
                <Search className="w-6 h-6 opacity-90 cursor-pointer" />
                <UserPlus className="w-6 h-6 opacity-90 cursor-pointer" />
                <Plus className="w-6 h-6 opacity-90 cursor-pointer" />
              </div>
            </div>

            <div className="flex bg-white border-b border-gray-100">
              {['Chats', 'Contacts', 'Explore'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase() as any)}
                  className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
                    activeTab === tab.toLowerCase() ? 'imo-blue-text' : 'text-gray-500'
                  }`}
                >
                  {tab}
                  {activeTab === tab.toLowerCase() && (
                    <motion.div 
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 imo-blue"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fafafa]">
              <div className="flex gap-4 p-4 overflow-x-auto border-b border-gray-50 scrollbar-hide">
                <div className="flex flex-col items-center gap-1 min-w-[64px]">
                   <div className="w-14 h-14 rounded-full border-2 border-dashed border-blue-400 flex items-center justify-center bg-blue-50">
                      <Plus className="w-5 h-5 text-blue-500" />
                   </div>
                   <span className="text-[10px] text-gray-500">My Status</span>
                </div>
                {dailyProfiles.slice(0, 5).map(p => (
                  <div key={p.id} className="flex flex-col items-center gap-1 min-w-[64px]">
                     <div className="w-14 h-14 rounded-full border-2 border-blue-500 p-0.5">
                        <SafeAvatar src={p.avatar} alt="status" className="w-full h-full rounded-full object-cover" />
                     </div>
                     <span className="text-[10px] text-gray-500 truncate w-14 text-center">{p.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              {dailyProfiles.map((profile) => {
                const lastMsg = chatHistory[profile.id]?.[chatHistory[profile.id].length - 1];
                return (
                  <motion.div 
                    key={profile.id}
                    whileTap={{ backgroundColor: '#f3f4f6' }}
                    onClick={() => openChat(profile)}
                    className="flex items-center p-4 cursor-pointer border-b border-gray-50 transition-colors"
                  >
                    <div className="relative">
                      <SafeAvatar 
                        src={profile.avatar} 
                        alt={profile.name} 
                        className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover shadow-sm" 
                      />
                      {profile.isOnline && (
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{profile.name}</h3>
                        <span className="text-xs text-gray-400">
                          {lastMsg ? lastMsg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                         <p className="text-sm text-gray-500 truncate max-w-[220px]">
                          {lastMsg ? lastMsg.text : profile.status}
                        </p>
                        {profile.isOnline && !lastMsg && (
                          <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">1</span>
                        )}
                      </div>
                      <p className="text-[10px] text-blue-400 font-medium mt-1 uppercase tracking-wider">{profile.location}, Bangladesh</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-white border-t border-gray-100 flex justify-around py-2.5 shadow-inner">
              <div className="flex flex-col items-center gap-1 imo-blue-text cursor-pointer">
                <MessageSquare className="w-6 h-6" />
                <span className="text-[10px] font-bold">Chats</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-gray-400 cursor-pointer hover:text-blue-400">
                <Phone className="w-6 h-6" />
                <span className="text-[10px] font-bold">Calls</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-gray-400 cursor-pointer hover:text-blue-400">
                <Users className="w-6 h-6" />
                <span className="text-[10px] font-bold">Contacts</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-gray-400 cursor-pointer hover:text-blue-400">
                <UserCircle className="w-6 h-6" />
                <span className="text-[10px] font-bold">Me</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
