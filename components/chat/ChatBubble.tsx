import React from 'react';
import { format } from 'date-fns';
import { User as UserIcon, CheckCircle2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MessageAttachmentDisplay from './MessageAttachmentDisplay';

interface Message {
  message_type?: string;
  sender_email: string;
  content?: string;
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    name?: string;
    size?: number;
  }>;
  created_date: string;
  is_read?: boolean;
  read_at?: string;
}

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const isSystemMessage = message.message_type === 'status_update' || message.sender_email === 'system';

  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-4">
        <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 border-gray-200 font-normal">
          {message.content}
        </Badge>
      </div>
    );
  }

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 border border-gray-300">
        <UserIcon className="w-4 h-4 text-gray-500" />
      </div>
      
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div 
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isOwn 
              ? 'bg-blue-600 text-white rounded-tr-md' 
              : 'bg-white text-gray-900 rounded-tl-md border border-gray-200'
          }`}
        >
          {message.content && (
            <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-gray-900'}`}>
              {message.content}
            </p>
          )}
          {hasAttachments && message.attachments && (
            <div className="mt-2">
              <MessageAttachmentDisplay attachments={message.attachments} />
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-gray-500">
            {format(new Date(message.created_date), 'h:mm a')}
          </span>
          {isOwn && (
            <div className="flex items-center">
              {message.is_read ? (
                <div 
                  className="flex items-center" 
                  title={message.read_at ? `Read at ${format(new Date(message.read_at), 'h:mm a')}` : 'Read'}
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
              ) : (
                <div title="Sent">
                  <Check className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}