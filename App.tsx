
import React, { useState, useMemo, useEffect } from 'react';
import { Profile, Message, CallType } from './types';
import { ALL_PROFILES, INITIAL_GREETINGS } from './constants';
import ChatWindow from './components/ChatWindow';
import CallOverlay from './components/CallOverlay';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserPlus, Plus, MessageSquare, Phone, Users, UserCircle, Download, X } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'contacts' | 'me'>('chats');
  
  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

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
    <div className="fixed inset-0 bg-white max-w-md mx-auto shadow-2xl border-x border-gray-100 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {activeCall ? (
          <motion.div 
            key="call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col"
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
            className="absolute inset-0 z-40 flex flex-col"
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
            className="flex flex-col h-full overflow-hidden"
          >
            {showInstallBanner && (
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-blue-600 text-white p-3 flex items-center justify-between shadow-lg z-50"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Install Bondhu App</p>
                    <p className="text-[10px] opacity-80">Use it like a real app on your phone</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleInstallClick}
                    className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm"
                  >
                    Install Now
                  </button>
                  <button onClick={() => setShowInstallBanner(false)} className="p-1 opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
            <div className="imo-blue p-4 text-white flex justify-between items-center shadow-lg">
              <h1 className="text-2xl font-bold tracking-tight">Bondhu</h1>
              <div className="flex gap-4">
                <Search className="w-6 h-6 opacity-90 cursor-pointer" />
                <UserPlus className="w-6 h-6 opacity-90 cursor-pointer" />
                <Plus className="w-6 h-6 opacity-90 cursor-pointer" />
              </div>
            </div>

            <div className="flex bg-white border-b border-gray-100">
              {['Chats', 'Calls', 'Explore'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => {
                    const tabValue = tab.toLowerCase() as any;
                    setActiveTab(tabValue === 'explore' ? 'contacts' : tabValue);
                  }}
                  className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
                    (tab.toLowerCase() === activeTab || (tab === 'Explore' && activeTab === 'contacts')) ? 'imo-blue-text' : 'text-gray-500'
                  }`}
                >
                  {tab}
                  {(tab.toLowerCase() === activeTab || (tab === 'Explore' && activeTab === 'contacts')) && (
                    <motion.div 
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 imo-blue"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fafafa]">
              {activeTab === 'chats' && (
                <div className="animate-fade-in">
                  {deferredPrompt && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-4 pt-4"
                    >
                      <div 
                        onClick={handleInstallClick}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-md cursor-pointer active:scale-95 transition-transform"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-xl">
                            <Download className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Install Bondhu App</p>
                            <p className="text-[10px] opacity-90">Enjoy a better chat experience</p>
                          </div>
                        </div>
                        <button className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          Install
                        </button>
                      </div>
                    </motion.div>
                  )}
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
              )}

              {activeTab === 'calls' && (
                <div className="p-4 animate-fade-in">
                  <h2 className="text-lg font-bold text-gray-700 mb-4">Recent Calls</h2>
                  {dailyProfiles.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 mb-2 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                         <SafeAvatar src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                         <div>
                            <p className="font-bold text-gray-800">{p.name}</p>
                            <p className="text-xs text-green-500">Incoming • 2h ago</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setActiveCall({ type: 'audio', profile: p })} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full">
                           <Phone className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-8 text-center text-gray-400 text-sm">
                    No more recent calls
                  </div>
                </div>
              )}

              {activeTab === 'contacts' && (
                <div className="animate-fade-in">
                   <div className="bg-white p-4 sticky top-0 z-10 border-b border-gray-100 flex gap-4">
                      <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2">
                         <Search className="w-4 h-4 text-gray-400" />
                         <input type="text" placeholder="Find contacts..." className="bg-transparent text-sm w-full outline-none" />
                      </div>
                   </div>
                   <div className="p-2">
                      {ALL_PROFILES.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                        <div key={p.id} onClick={() => openChat(p)} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer rounded-lg">
                           <SafeAvatar src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                           <div className="ml-3">
                              <p className="font-medium text-gray-800">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.location}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'me' && (
                <div className="p-6 animate-fade-in text-center">
                   <div className="relative inline-block">
                      <div className="w-24 h-24 rounded-full border-4 border-blue-500 p-1 mx-auto">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" className="w-full h-full rounded-full bg-blue-50" />
                      </div>
                      <div className="absolute bottom-1 right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
                   </div>
                   <h2 className="mt-4 text-xl font-bold text-gray-800">Your Profile</h2>
                   <p className="text-gray-500 text-sm">Managing Bondhu account</p>
                   
                   <div className="mt-8 space-y-3">
                      {deferredPrompt && (
                        <div 
                          onClick={handleInstallClick}
                          className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm cursor-pointer hover:bg-blue-100"
                        >
                           <div className="flex items-center gap-3">
                              <Download className="w-5 h-5 text-blue-600" />
                              <span className="font-bold text-blue-700">Install Bondhu App</span>
                           </div>
                           <Plus className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      {['Account Settings', 'Privacy', 'Notifications', 'Help & Feedback'].map(item => (
                        <div key={item} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm cursor-pointer hover:bg-gray-50">
                           <span className="font-medium text-gray-700">{item}</span>
                           <Plus className="w-4 h-4 text-gray-300 transform rotate-45" />
                        </div>
                      ))}
                   </div>
                   
                   <button className="mt-10 text-red-500 font-semibold text-sm">Log Out</button>
                </div>
              )}
              
              {deferredPrompt && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleInstallClick}
                  className="fixed bottom-20 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center border-4 border-white"
                >
                  <Download className="w-6 h-6" />
                </motion.button>
              )}
            </div>

            <div className="bg-white border-t border-gray-100 flex justify-around py-2.5 shadow-inner">
              <div 
                onClick={() => setActiveTab('chats')}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'chats' ? 'imo-blue-text' : 'text-gray-400'}`}
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-[10px] font-bold">Chats</span>
              </div>
              <div 
                onClick={() => setActiveTab('calls')}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'calls' ? 'imo-blue-text' : 'text-gray-400'}`}
              >
                <Phone className="w-6 h-6" />
                <span className="text-[10px] font-bold">Calls</span>
              </div>
              <div 
                onClick={() => setActiveTab('contacts')}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'contacts' ? 'imo-blue-text' : 'text-gray-400'}`}
              >
                <Users className="w-6 h-6" />
                <span className="text-[10px] font-bold">Contacts</span>
              </div>
              <div 
                onClick={() => setActiveTab('me')}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'me' ? 'imo-blue-text' : 'text-gray-400'}`}
              >
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
