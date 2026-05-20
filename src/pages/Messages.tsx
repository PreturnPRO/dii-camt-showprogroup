import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCheck, ChevronLeft, Info, MessageCircle, MoreHorizontal, Paperclip, Plus, Search, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { mapMessage } from '@/lib/live-mappers';
import { asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

type MessageRow = ReturnType<typeof mapMessage>;
type DirectoryUser = {
  id: string;
  email: string;
  name: string;
  nameThai: string;
  role: string;
};

type Conversation = {
  peerId: string;
  peerName: string;
  lastMessage: MessageRow;
  unreadCount: number;
  messages: MessageRow[];
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const initials = (name: string) => (name || '?').trim().charAt(0).toUpperCase();

export default function Messages() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [selectedPeerId, setSelectedPeerId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [replyText, setReplyText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [recipientQuery, setRecipientQuery] = React.useState('');
  const [recipients, setRecipients] = React.useState<DirectoryUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = React.useState<DirectoryUser | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const messageEndRef = React.useRef<HTMLDivElement | null>(null);

  const currentUserId = user?.id ?? '';
  const copy = React.useMemo(() => ({
    newChat: language === 'th' ? 'เริ่มแชทใหม่' : 'New chat',
    searchPeople: language === 'th' ? 'ค้นหาชื่อหรืออีเมล...' : 'Search name or email...',
    searchChats: language === 'th' ? 'ค้นหาแชท...' : 'Search chats...',
    noChats: language === 'th' ? 'ยังไม่มีบทสนทนา' : 'No conversations yet',
    noConversation: language === 'th' ? 'เลือกบทสนทนาเพื่อเริ่มแชท' : 'Select a conversation to start chatting',
    activeNow: language === 'th' ? 'พร้อมรับข้อความ' : 'Available',
    typeMessage: language === 'th' ? 'พิมพ์ข้อความ...' : 'Type a message...',
    you: language === 'th' ? 'คุณ' : 'You',
    messageSent: language === 'th' ? 'ส่งข้อความแล้ว' : 'Message sent',
    selectRecipient: language === 'th' ? 'เลือกผู้รับก่อนส่งข้อความ' : 'Choose a recipient first',
    conversation: language === 'th' ? 'บทสนทนา' : 'Conversation',
  }), [language]);

  React.useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    api.messages
      .list()
      .then((response) => {
        if (!mounted) return;
        setMessages(response.messages.map(mapMessage));
      })
      .catch((error) => {
        console.warn('Unable to load messages from API', error);
        if (mounted) setMessages([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const query = recipientQuery.trim();

    if (query.length < 2 || selectedRecipient) {
      setRecipients([]);
      return () => {
        mounted = false;
      };
    }

    const timer = window.setTimeout(() => {
      api.users
        .directory(`?q=${encodeURIComponent(query)}`)
        .then((response) => {
          if (!mounted) return;
          setRecipients(response.users.map((item) => {
            const record = asRecord(item);
            return {
              id: asString(record.id),
              email: asString(record.email),
              name: asString(record.name),
              nameThai: asString(record.nameThai, asString(record.name)),
              role: asString(record.role).toLowerCase(),
            };
          }).filter((item) => item.id && item.id !== currentUserId));
        })
        .catch(() => {
          if (mounted) setRecipients([]);
        });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [currentUserId, recipientQuery, selectedRecipient]);

  const conversations = React.useMemo<Conversation[]>(() => {
    const grouped = new Map<string, Conversation>();

    [...messages]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((message) => {
        const isMine = currentUserId && message.fromId === currentUserId;
        const peerId = isMine ? message.toId : message.fromId;
        const peerName = isMine ? message.to : message.from;
        if (!peerId) return;

        const existing = grouped.get(peerId);
        const nextMessages = existing ? [...existing.messages, message] : [message];
        grouped.set(peerId, {
          peerId,
          peerName: peerName || 'Unknown',
          lastMessage: message,
          unreadCount: nextMessages.filter((item) => !item.read && item.fromId !== currentUserId).length,
          messages: nextMessages,
        });
      });

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastMessage.date).getTime() - new Date(a.lastMessage.date).getTime(),
    );
  }, [currentUserId, messages]);

  const filteredConversations = conversations.filter((conversation) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      conversation.peerName.toLowerCase().includes(q) ||
      conversation.lastMessage.subject.toLowerCase().includes(q) ||
      conversation.lastMessage.preview.toLowerCase().includes(q)
    );
  });

  const selectedConversation = selectedPeerId
    ? conversations.find((conversation) => conversation.peerId === selectedPeerId)
    : null;

  React.useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'end' });
  }, [selectedConversation?.messages.length, selectedPeerId]);

  const selectConversation = (conversation: Conversation) => {
    setSelectedPeerId(conversation.peerId);
    setSelectedRecipient(null);
    setRecipientQuery('');
    setMessages((current) => current.map((message) => (
      message.fromId === conversation.peerId && !message.read ? { ...message, read: true } : message
    )));
    conversation.messages
      .filter((message) => message.fromId === conversation.peerId && !message.read)
      .forEach((message) => {
        api.messages.markRead(message.id).catch((error) => {
          console.warn('Unable to mark message as read', error);
        });
      });
  };

  const selectRecipient = (recipient: DirectoryUser) => {
    setSelectedRecipient(recipient);
    setSelectedPeerId(recipient.id);
    setRecipientQuery(`${recipient.nameThai || recipient.name} <${recipient.email}>`);
    setRecipients([]);
  };

  const activePeerId = selectedRecipient?.id || selectedConversation?.peerId || '';
  const activePeerName = selectedRecipient
    ? selectedRecipient.nameThai || selectedRecipient.name
    : selectedConversation?.peerName || '';

  const sendMessage = async () => {
    if (!replyText.trim()) return;
    if (!activePeerId) {
      toast.error(copy.selectRecipient);
      return;
    }

    setIsSending(true);
    try {
      const response = await api.messages.create({
        toId: activePeerId,
        subject: selectedConversation?.lastMessage.subject
          ? `Re: ${selectedConversation.lastMessage.subject.replace(/^Re:\s*/i, '')}`
          : copy.conversation,
        body: replyText.trim(),
        category: 'direct',
      });
      const nextMessage = mapMessage(response.message);
      setMessages((current) => [nextMessage, ...current]);
      setSelectedPeerId(activePeerId);
      setSelectedRecipient(null);
      setRecipientQuery('');
      setReplyText('');
      toast.success(copy.messageSent);
    } catch (error) {
      console.warn('Unable to send message', error);
      toast.error(error instanceof ApiError ? error.message : t.messagesPage.systemStatus);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="h-[calc(100dvh-6rem)] overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="grid h-full grid-cols-1 md:grid-cols-[360px_1fr]">
        <aside className={`h-full border-r border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 ${selectedPeerId ? 'hidden md:flex' : 'flex'} flex-col`}>
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{t.messagesPage.subtitle}</p>
                <h1 className="text-2xl font-black text-slate-950 dark:text-white">{t.messagesPage.title}</h1>
              </div>
              <Button
                size="icon"
                className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => {
                  setSelectedPeerId(null);
                  setSelectedRecipient(null);
                  setRecipientQuery('');
                }}
                title={copy.newChat}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={recipientQuery || searchQuery}
                onChange={(event) => {
                  setRecipientQuery(event.target.value);
                  setSearchQuery(event.target.value);
                  setSelectedRecipient(null);
                }}
                placeholder={copy.searchPeople}
                className="h-11 rounded-full border-slate-200 bg-white pl-10 dark:border-slate-800 dark:bg-slate-900"
              />
              {recipients.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  {recipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      type="button"
                      onClick={() => selectRecipient(recipient)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {initials(recipient.nameThai || recipient.name || recipient.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{recipient.nameThai || recipient.name}</span>
                        <span className="block truncate text-xs text-slate-500">{recipient.email} · {recipient.role}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isLoading && (
              <div className="p-6 text-center text-sm font-medium text-slate-500">Loading...</div>
            )}
            {!isLoading && filteredConversations.length === 0 && (
              <div className="m-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
                {copy.noChats}
              </div>
            )}
            {filteredConversations.map((conversation) => {
              const selected = conversation.peerId === selectedPeerId;
              const mine = conversation.lastMessage.fromId === currentUserId;
              return (
                <motion.button
                  variants={itemVariants}
                  type="button"
                  key={conversation.peerId}
                  onClick={() => selectConversation(conversation)}
                  className={`mb-2 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                    selected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className={selected ? 'bg-white/20 font-bold text-white' : 'bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'}>
                      {initials(conversation.peerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-black">{conversation.peerName}</span>
                      <span className={`text-[11px] font-semibold ${selected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {new Date(conversation.lastMessage.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                    <span className={`block truncate text-sm ${selected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {mine ? `${copy.you}: ` : ''}{conversation.lastMessage.body || conversation.lastMessage.preview || conversation.lastMessage.subject}
                    </span>
                  </span>
                  {conversation.unreadCount > 0 && !selected && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </aside>

        <section className={`h-full min-w-0 ${selectedPeerId ? 'flex' : 'hidden md:flex'} flex-col bg-white dark:bg-slate-950`}>
          {activePeerId ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activePeerId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col"
              >
                <header className="flex h-20 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800 md:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={() => setSelectedPeerId(null)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {initials(activePeerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-slate-950 dark:text-white">{activePeerName}</div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {copy.activeNow}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Info className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-950 md:p-6">
                  <div className="mx-auto flex max-w-3xl flex-col gap-3">
                    {(selectedConversation?.messages ?? []).map((message) => {
                      const mine = message.fromId === currentUserId;
                      return (
                        <div key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {initials(activePeerName)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div className={`rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                              mine
                                ? 'rounded-br-md bg-indigo-600 text-white'
                                : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800'
                            }`}>
                              {message.subject && !message.subject.startsWith('Re:') && (
                                <div className={`mb-1 font-bold ${mine ? 'text-white' : 'text-slate-950 dark:text-white'}`}>{message.subject}</div>
                              )}
                              <div className="whitespace-pre-wrap break-words">{message.body || message.preview}</div>
                            </div>
                            <div className="flex items-center gap-1 px-1 text-[11px] font-medium text-slate-400">
                              {new Date(message.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {mine && <CheckCheck className="h-3.5 w-3.5 text-indigo-400" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {selectedRecipient && !selectedConversation && (
                      <div className="py-12 text-center text-sm text-slate-500">
                        {language === 'th' ? 'เริ่มส่งข้อความแรกถึงผู้รับคนนี้ได้เลย' : 'Send the first message to this recipient.'}
                      </div>
                    )}
                    <div ref={messageEndRef} />
                  </div>
                </main>

                <footer className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:p-4">
                  <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-slate-500">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder={copy.typeMessage}
                      className="max-h-32 min-h-10 resize-none border-0 bg-transparent px-2 py-2 focus-visible:ring-0"
                    />
                    <Button
                      onClick={() => void sendMessage()}
                      disabled={isSending || !replyText.trim()}
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </footer>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <MessageCircle className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t.messagesPage.emptyInbox}</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500">{copy.noConversation}</p>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
