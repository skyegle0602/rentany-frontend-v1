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
      <div className="flex justify-center my-3">
        <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 border-slate-200">
          {message.content}
        </Badge>
      </div>
    );
  }

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} mb-3`}>
      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
        <UserIcon className="w-3.5 h-3.5 text-slate-600" />
      </div>
      
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div 
          className={`rounded-2xl px-3 py-2 ${
            isOwn 
              ? 'bg-slate-900 text-white rounded-tr-sm' 
              : 'bg-slate-100 text-slate-900 rounded-tl-sm'
          }`}
        >
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {hasAttachments && message.attachments && (
            <MessageAttachmentDisplay attachments={message.attachments} />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-[10px] text-slate-400">
            {format(new Date(message.created_date), 'h:mm a')}
          </span>
          {isOwn && (
            <div className="flex items-center">
              {message.is_read ? (
                <div 
                  className="flex items-center" 
                  title={message.read_at ? `Read at ${format(new Date(message.read_at), 'h:mm a')}` : 'Read'}
                >
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                </div>
              ) : (
                <div title="Sent">
                  <Check className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}