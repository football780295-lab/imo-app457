
import React, { useState, useRef, useEffect } from 'react';
import { Profile, Message } from '../types';
import { geminiService } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Phone, Video, MoreVertical, PlusCircle, Smile, Send, Paperclip } from 'lucide-react';

interface ChatWindowProps {
  profile: Profile;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onReceiveMessage: (text: string) => void;
  onCall: (type: 'audio' | 'video') => void;
  onBack: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ profile, messages, onSendMessage, onReceiveMessage, onCall, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    
    scrollToBottom();
    
    // Some mobile browsers need a slight delay for keyboard expansion
    const timers = [
      setTimeout(scrollToBottom, 100),
      setTimeout(scrollToBottom, 300)
    ];
    
    window.addEventListener('resize', scrollToBottom);
    return () => {
      window.removeEventListener('resize', scrollToBottom);
      timers.forEach(clearTimeout);
    };
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const currentInput = inputText;
    setInputText('');
    onSendMessage(currentInput);
    
    setIsTyping(true);
    try {
      const response = await geminiService.getChatResponse(profile, currentInput);
      onReceiveMessage(response);
    } catch (error) {
      console.error("Gemini Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFocus = () => {
    // Small delay to allow the keyboard to start opening and viewport to resize
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 150);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#f0f2f5] animate-fade-in relative overflow-hidden">
      {/* Header */}
      <div className="imo-blue text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-3 text-xl p-1 active:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="relative">
            <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full border border-white/30 object-cover" />
            {profile.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
          </div>
          <div className="ml-3">
            <h2 className="font-semibold text-base leading-tight truncate max-w-[120px]">{profile.name}</h2>
            <p className="text-[10px] text-blue-100 uppercase tracking-wide font-medium">{profile.isOnline ? 'Online' : 'Active'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => onCall('audio')} className="p-1 hover:text-blue-200 transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button onClick={() => onCall('video')} className="p-1 hover:text-blue-200 transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-1">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0 scrollbar-hide"
      >
        <div className="flex flex-col justify-end min-h-full">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`flex mb-4 ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm relative ${
                  msg.senderId === 'me' 
                  ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  {msg.type === 'text' ? (
                    <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                  ) : (
                    <img src={msg.imageUrl} alt="shared" className="rounded-lg max-w-full" />
                  )}
                  <div className="text-[9px] text-gray-400 mt-1 text-right flex justify-end items-center gap-1">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.senderId === 'me' && <span className="text-blue-400">✓✓</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-start mb-4"
            >
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex space-x-1 items-center">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full"></motion.div>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full"></motion.div>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full"></motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
          <Paperclip className="w-6 h-6" />
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            onFocus={handleFocus}
            placeholder="Write a message..."
            className="w-full bg-gray-50 rounded-full py-2.5 px-5 pr-12 focus:outline-none border border-transparent focus:bg-white focus:border-blue-300 transition-all text-sm"
          />
          <button className="absolute right-3 top-2.5 text-gray-400 hover:text-yellow-500">
            <Smile className="w-6 h-6" />
          </button>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!inputText.trim() && !isTyping}
          className={`p-2.5 rounded-full w-11 h-11 flex items-center justify-center transition-all shadow-md ${
            inputText.trim() ? 'bg-blue-500 text-white shadow-blue-200' : 'text-gray-400 bg-gray-100 shadow-none'
          }`}
        >
          <Send className="w-5 h-5 ml-0.5" />
        </motion.button>
      </div>
    </div>
  );
};

export default ChatWindow;
