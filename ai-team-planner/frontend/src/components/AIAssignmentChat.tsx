import React, { useState, useRef, useEffect } from 'react';
import { 
  SendIcon, 
  BotIcon, 
  UserIcon, 
  WandIcon,
  LoaderIcon,
  CheckCircleIcon 
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGenerateAIPlan } from '../lib/api';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
}

interface AISegment {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
  skills?: string[];
}

// The AI plan result now includes assignment, tasks, and events from the backend
interface AIPlanResult {
  assignment: any;
  tasks: any[];
  events: any[];
}

interface AIAssignmentChatProps {
  onPlanGenerated: (plan: AIPlanResult) => void;
  onClose: () => void;
}

export default function AIAssignmentChat({ onPlanGenerated, onClose }: AIAssignmentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm your AI planning assistant. Describe the assignment you'd like to create, and I'll help break it down into manageable segments with estimated durations and priorities. What project are you working on?",
      timestamp: new Date(),
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const generatePlanMutation = useGenerateAIPlan();
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: 'user' | 'bot' | 'system', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage('user', userMessage);

    // Add thinking message
    const thinkingMessage = addMessage('bot', 'Let me analyze your assignment and create a detailed plan...');
    setIsGenerating(true);

    // Default values for required fields
    const today = new Date();
    const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const defaultPayload = {
      title: 'AI Assignment',
      description: userMessage,
      dueDate: dueDate.toISOString().slice(0, 10),
      parts: 3,
      members: [{ name: 'AI Member', role: 'team member' }],
      constraints: {
        workHoursPerDay: 8,
        startHour: 9,
        endHour: 17,
        daysOfWeek: [1, 2, 3, 4, 5]
      },
      requestType: 'assignment_planning'
    };

    try {
      // Generate AI plan
      const response = await generatePlanMutation.mutateAsync(defaultPayload);

      // Remove thinking message and add result
      setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id));

      if (response.assignment) {
        addMessage('bot', `Great! I've created your assignment: **${response.assignment.title}** (Due: ${response.assignment.due_date}).\n\nIt includes ${response.tasks.length} tasks and ${response.events.length} calendar events.\n\nWould you like to view it in your assignments list?`);

        // Pass the full plan to the parent for further use
        onPlanGenerated(response);
      } else {
        addMessage('bot', 'I apologize, but I had trouble creating your assignment. Please try again or create it manually.');
      }
    } catch (error) {
      console.error('AI planning error:', error);
      addMessage('bot', 'I encountered an error while planning your assignment. Please try again or create the assignment manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAcceptPlan = (assignmentId: number) => {
    addMessage('bot', 'Perfect! Your assignment is now available in your assignments list.');
    // Refetch assignments so the new one appears
    queryClient.invalidateQueries({ queryKey: ['assignments'] });
    // Optionally, close the chat or navigate to the assignment
    if (onPlanGenerated) onPlanGenerated({ assignmentId });
  };

  const handleRejectPlan = () => {
    addMessage('bot', 'No problem! Feel free to describe any changes you\'d like, or I can help you create a different plan.');
  };

  const renderMessage = (message: Message) => {
    return (
      <>
        {message.type === 'system' ? (() => {
          try {
            const data = JSON.parse(message.content);
            if (data.type === 'action_buttons') {
              return (
                <div className="flex gap-2 mt-2">
                  {data.assignmentId ? (
                    <button
                      onClick={() => handleAcceptPlan(data.assignmentId)}
                      className="btn-primary flex items-center text-sm"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      View Assignment
                    </button>
                  ) : null}
                  <button
                    onClick={handleRejectPlan}
                    className="btn-secondary text-sm"
                  >
                    Modify Plan
                  </button>
                </div>
              );
            }
          } catch (e) {
            return null;
          }
          return null;
        })() : null}
        {message.type !== 'system' && (
          <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex items-start max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                {message.type === 'user' ? (
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-primary-600" />
                  </div>
                ) : (
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <BotIcon className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
              <div className={`rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-primary-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <WandIcon className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">AI Assignment Planner</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, idx) => (
            <React.Fragment key={message.id + '-' + idx}>{renderMessage(message)}</React.Fragment>
          ))}
          {isGenerating && (
            <div className="flex justify-start mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-2">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <LoaderIcon className="h-4 w-4 text-green-600 animate-spin" />
                  </div>
                </div>
                <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                  <p className="text-sm">Analyzing your assignment and creating a plan...</p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your assignment in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={2}
                disabled={isGenerating}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isGenerating}
              className="btn-primary p-2 flex items-center justify-center"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
