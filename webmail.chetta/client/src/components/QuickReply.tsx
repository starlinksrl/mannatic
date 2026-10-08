import React, { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useWebmailStore } from '../store/useWebmailStore.js';

interface QuickReplyProps {
  onSent?: () => void;
}

export const QuickReply: React.FC<QuickReplyProps> = ({ onSent }) => {
  const { selectedMessage, activeAccount } = useWebmailStore();
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!selectedMessage || !activeAccount) return null;

  const handleSend = async () => {
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/mail/${activeAccount.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [selectedMessage.from_address],
          subject: selectedMessage.subject.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`,
          htmlBody: `<p>${replyText.replace(/\n/g, '<br>')}</p>`,
          textBody: replyText,
          inReplyTo: selectedMessage.message_id
        })
      });

      const data = await res.json();
      if (data.success) {
        setReplyText('');
        if (onSent) onSent();
      }
    } catch (e) {
      console.error('Quick reply error', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-[#323130] rounded-lg bg-white dark:bg-[#252423] p-3 shadow-xs mt-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Rispondi a <strong className="text-gray-800 dark:text-gray-200">{selectedMessage.from_name || selectedMessage.from_address}</strong>
      </div>

      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Scrivi una risposta rapida qui..."
        rows={3}
        className="w-full text-xs p-2.5 rounded bg-gray-50 dark:bg-[#1f1e1d] text-[#242424] dark:text-[#f3f2f1] border border-gray-200 dark:border-[#3d3b39] focus:outline-none focus:ring-1 focus:ring-[#0078d4] resize-none"
      />

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#2f2e2d]">
        <div className="flex items-center gap-2 text-gray-400">
          <button className="p-1 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <Paperclip className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <Smile className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={!replyText.trim() || isSending}
          className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSending ? 'Invio in corso...' : 'Invia'}</span>
        </button>
      </div>
    </div>
  );
};
