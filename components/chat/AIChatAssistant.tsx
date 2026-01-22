'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Sparkles, MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import from API client
import { askItemQuestion, type AskItemQuestionResponse } from '@/lib/api-client';

interface Item {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  daily_rate?: number;
  availability?: boolean;
  [key: string]: any;
}

type MessageType = 'user' | 'ai';
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface Message {
  id: number;
  type: MessageType;
  text: string;
  timestamp: Date;
  confidence?: ConfidenceLevel;
  suggestContactOwner?: boolean;
}

interface AIChatAssistantProps {
  item: Item;
  onContactOwner: () => void;
}

export default function AIChatAssistant({ item, onContactOwner }: AIChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'ai',
      text: `Hi! I'm your AI assistant. I can answer questions about "${item.title}". What would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askItemQuestion({
        item_id: item.id,
        question: currentInput
      });

      const aiMessage: Message = {
        id: messages.length + 2,
        type: 'ai',
        text: response.data?.answer || "I'm sorry, I couldn't process that question.",
        confidence: response.data?.confidence as ConfidenceLevel | undefined,
        suggestContactOwner: response.data?.suggest_contact_owner || false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMessage: Message = {
        id: messages.length + 2,
        type: 'ai',
        text: "I'm sorry, I encountered an error. Please try asking your question again, or contact the owner directly.",
        suggestContactOwner: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions: string[] = [
    "What's included with this rental?",
    "Is delivery available?",
    "What's the minimum rental period?",
    "What's the total cost for 3 days?",
    "Can I book this same-day?"
  ];

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
          size="icon"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0,
        height: isMinimized ? 'auto' : '600px'
      }}
      exit={{ scale: 0.8, opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
    >
      <Card className="border-0 shadow-2xl bg-white overflow-hidden flex flex-col" style={{ height: isMinimized ? 'auto' : '600px' }}>
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">AI Assistant</CardTitle>
                <p className="text-xs text-white/80">Ask me anything about this item</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'} rounded-2xl px-4 py-2`}>
                      {message.type === 'ai' && (
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-600">AI Assistant</span>
                          {message.confidence && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-1 py-0 ${
                                message.confidence === 'high' ? 'border-green-400 text-green-700' :
                                message.confidence === 'medium' ? 'border-yellow-400 text-yellow-700' :
                                'border-red-400 text-red-700'
                              }`}
                            >
                              {message.confidence}
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      {message.suggestContactOwner && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={onContactOwner}
                            className="w-full text-xs"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Contact Owner Directly
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-slate-500">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />

              {messages.length === 1 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setInputValue(question)}
                        className="text-xs h-auto py-1 px-2 text-left"
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                AI responses are for guidance only. Contact the owner for definitive answers.
              </p>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
}