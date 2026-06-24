import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Inbox, Archive, Trash2, Search, Star, Paperclip, Filter, MoreVertical,
  Reply, Forward, Mail, CheckCheck, Phone, Video, Info, User, ChevronLeft,
  Sparkles, Zap, ShieldAlert, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function Messages() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedMessage, setSelectedMessage] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [replyText, setReplyText] = React.useState('');
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [recipientQuery, setRecipientQuery] = React.useState('');
  const [recipients, setRecipients] = React.useState<DirectoryUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = React.useState<DirectoryUser | null>(null);
  const [composeSubject, setComposeSubject] = React.useState('');
  const [composeBody, setComposeBody] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  // Pre-fill recipient from URL query param (e.g. from StudentProfiles page)
  const [searchParams, setSearchParams] = useSearchParams();
  React.useEffect(() => {
    const toParam = searchParams.get('to');
    if (toParam) {
      setRecipientQuery(toParam);
      // Clean up the URL param after reading
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('to');
        return next;
      }, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    let mounted = true;

    api.messages
      .list()
      .then((response) => {
        if (!mounted) return;
        setMessages(response.messages.map(mapMessage));
      })
      .catch((error) => {
        console.warn('Unable to load messages from API', error);
        setMessages([]);
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

    if (query.length < 2) {
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
          }).filter((item) => item.id));
        })
        .catch(() => {
          if (mounted) setRecipients([]);
        });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [recipientQuery]);

  const currentUserId = user?.id ?? '';
  const inboxMessages = messages;

  const filteredMessages = inboxMessages.filter(m =>
    m.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMsg = inboxMessages.find(m => m.id === selectedMessage);
  const selectedIsMine = Boolean(selectedMsg && currentUserId && selectedMsg.fromId === currentUserId);
  const selectedPeerId = selectedMsg ? (selectedIsMine ? selectedMsg.toId : selectedMsg.fromId) : '';
  const selectedPeerName = selectedMsg ? (selectedIsMine ? selectedMsg.to || selectedMsg.from : selectedMsg.from || selectedMsg.to) : '';
  const selectedPeerInitial = (selectedPeerName || selectedMsg?.subject || '?').charAt(0);
  const conversationMessages = React.useMemo(() => {
    if (!selectedMsg) return [];
    if (!currentUserId || !selectedPeerId) return [selectedMsg];

    const thread = messages.filter((message) => (
      (message.fromId === currentUserId && message.toId === selectedPeerId) ||
      (message.fromId === selectedPeerId && message.toId === currentUserId)
    ));

    return (thread.length ? thread : [selectedMsg]).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [currentUserId, messages, selectedMsg, selectedPeerId]);

  const handleSelectMessage = (id: string) => {
    setSelectedMessage(id);
    const message = messages.find(item => item.id === id);
    if (!message || message.read) return;

    setMessages(current => current.map(item => item.id === id ? { ...item, read: true } : item));
    api.messages.markRead(id).catch((error) => {
      console.warn('Unable to mark message as read', error);
    });
  };

  const handleSendReply = async () => {
    if (!selectedMsg || !replyText.trim()) return;

    try {
      const response = await api.messages.create({
        toId: selectedPeerId || selectedMsg.fromId,
        subject: `Re: ${selectedMsg.subject}`,
        body: replyText.trim(),
        category: selectedMsg.category || 'general',
      });
      setMessages(current => [mapMessage(response.message), ...current]);
      setReplyText('');
      toast.success(t.messagesPage.normalStatus);
    } catch (error) {
      console.warn('Unable to send reply', error);
      toast.error(error instanceof ApiError ? error.message : t.messagesPage.systemStatus);
    }
  };

  const handleSendNewMessage = async () => {
    if (!selectedRecipient || !composeSubject.trim() || !composeBody.trim()) return;

    setIsSending(true);
    try {
      const response = await api.messages.create({
        toId: selectedRecipient.id,
        subject: composeSubject.trim(),
        body: composeBody.trim(),
        category: 'direct',
      });
      const nextMessage = mapMessage(response.message);
      setMessages((current) => [nextMessage, ...current]);
      setSelectedMessage(nextMessage.id);
      setRecipientQuery('');
      setSelectedRecipient(null);
      setComposeSubject('');
      setComposeBody('');
      setRecipients([]);
      toast.success(t.messagesPage.normalStatus);
    } catch (error) {
      console.warn('Unable to send message', error);
      toast.error(error instanceof ApiError ? error.message : t.messagesPage.systemStatus);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-[calc(100dvh-6rem)] flex flex-col gap-4 overflow-hidden"
    >
      {/* Header Section */}
      <div className="flex-shrink-0">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-4 px-6 rounded-[1.5rem] border border-white/60 dark:border-slate-800/60 shadow-sm">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-2 uppercase tracking-wider"
            >
              <Mail className="w-4 h-4" />
              <span>{t.messagesPage?.subtitle || 'MESSAGES & COMMS'}</span>
            </motion.div>
            <motion.h1
              className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.messagesPage?.title || 'ข้อความ'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">{t.messagesPage?.titleHighlight || 'ของคุณ'}</span>
            </motion.h1>
          </div>
          <div className="w-full lg:w-auto flex-1 max-w-2xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={recipientQuery}
                  onChange={(event) => {
                    setRecipientQuery(event.target.value);
                    setSelectedRecipient(null);
                  }}
                  placeholder="ค้นชื่อหรืออีเมลผู้รับ..."
                  className="h-12 w-full rounded-[1.25rem] border-0 bg-white/80 pl-12 shadow-sm backdrop-blur-xl focus-visible:ring-indigo-500 dark:bg-slate-950/80 dark:text-white font-medium"
                />
                {recipients.length > 0 && !selectedRecipient && (
                  <div className="absolute left-0 right-0 top-14 z-50 max-h-64 overflow-y-auto rounded-2xl border border-slate-200/50 bg-white/90 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/90 custom-scrollbar">
                    {recipients.map((recipient) => (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => {
                          setSelectedRecipient(recipient);
                          setRecipientQuery(`${recipient.nameThai || recipient.name} <${recipient.email}>`);
                          setRecipients([]);
                        }}
                        className="flex w-full items-center gap-4 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Avatar className="h-10 w-10 rounded-xl shadow-sm">
                          <AvatarFallback className="rounded-xl bg-indigo-50 text-indigo-600 font-bold dark:bg-indigo-500/20 dark:text-indigo-300">
                            {(recipient.nameThai || recipient.name || recipient.email).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{recipient.nameThai || recipient.name}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{recipient.email} • {recipient.role}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                placeholder="หัวข้อ..."
                className="h-12 sm:w-48 rounded-[1.25rem] border-0 bg-white/80 shadow-sm backdrop-blur-xl focus-visible:ring-indigo-500 dark:bg-slate-950/80 dark:text-white font-medium"
              />
              <div className="flex flex-1 sm:flex-none gap-2">
                <Input
                  value={composeBody}
                  onChange={(event) => setComposeBody(event.target.value)}
                  placeholder="ข้อความ..."
                  className="h-12 flex-1 sm:w-64 rounded-[1.25rem] border-0 bg-white/80 shadow-sm backdrop-blur-xl focus-visible:ring-indigo-500 dark:bg-slate-950/80 dark:text-white font-medium"
                />
                <Button
                  onClick={handleSendNewMessage}
                  disabled={isSending || !selectedRecipient || !composeSubject.trim() || !composeBody.trim()}
                  className="h-12 w-12 rounded-[1.25rem] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center p-0 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Send className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 pb-2 h-full">
        {/* Sidebar / List */}
        <div className={`md:col-span-4 lg:col-span-3 flex flex-col h-full bg-white/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden ${selectedMessage ? 'hidden md:flex' : 'flex'} dark:bg-slate-900/40`}>
          <div className="p-5 border-b border-white/40 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder={t.messagesPage?.searchMessages || 'ค้นหาข้อความ...'}
                className="pl-11 h-11 bg-white/60 dark:bg-slate-950/60 border-0 rounded-2xl focus-visible:ring-indigo-500 font-medium text-sm shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1 p-1 bg-white/50 dark:bg-slate-950/50 rounded-2xl shadow-inner">
              <Button size="sm" variant="ghost" className="rounded-xl text-xs h-9 flex-1 bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold">Inbox</Button>
              <Button size="sm" variant="ghost" className="rounded-xl text-xs h-9 flex-1 text-slate-500 dark:text-slate-400 font-bold hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">{t.messagesPage?.starred || 'Starred'}</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
            {!isLoading && filteredMessages.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-slate-200/50 bg-slate-50/50 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-slate-400 m-2">
                {t.messagesPage?.emptyInbox || 'ไม่มีข้อความในกล่องจดหมาย'}
              </div>
            )}
            {filteredMessages.map((msg) => {
              const isMine = Boolean(currentUserId && msg.fromId === currentUserId);
              const displayName = isMine ? msg.to : msg.from;
              const displayInitial = (displayName || msg.subject || '?').charAt(0);
              const isSelected = selectedMessage === msg.id;

              return (
                <motion.div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg.id)}
                  className={`p-4 rounded-[1.25rem] cursor-pointer transition-all relative group border ${isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-transparent z-10 dark:bg-indigo-600'
                    : 'bg-white/60 hover:bg-white border-transparent text-slate-900 dark:bg-slate-950/40 dark:hover:bg-slate-900/80 dark:text-white shadow-sm hover:shadow-md'
                    }`}
                >
                  {!msg.read && !isSelected && (
                    <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                  )}
                  <div className="flex gap-3">
                    <div className="relative">
                      <Avatar className={`w-12 h-12 border-2 ${isSelected ? 'border-white/20' : 'border-white dark:border-slate-800'} shadow-sm rounded-2xl`}>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`} />
                        <AvatarFallback className={`rounded-2xl font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'}`}>{displayInitial}</AvatarFallback>
                      </Avatar>
                      {displayName.includes('Admin') && (
                        <div className="absolute -bottom-1 -right-1 bg-amber-400 p-1 rounded-lg border-2 border-white dark:border-slate-900 shadow-sm">
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-950" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-baseline mb-0.5 gap-2">
                        <span className={`font-bold text-[15px] truncate tracking-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{displayName}</span>
                        <span className={`text-[10px] font-bold whitespace-nowrap ${isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`text-xs font-bold truncate mb-1 tracking-tight ${isSelected ? 'text-indigo-50' : 'text-slate-700 dark:text-slate-300'}`}>{msg.subject}</div>
                      <div className={`text-xs truncate font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isMine ? 'คุณ: ' : ''}{msg.preview}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`md:col-span-8 lg:col-span-9 h-full bg-white/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col ${selectedMessage ? 'flex' : 'hidden md:flex'} dark:bg-slate-900/40`}>
          {selectedMsg ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMsg.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-white/40 dark:border-slate-800/50 flex items-center justify-between bg-white/60 backdrop-blur-md z-10 dark:bg-slate-900/60 shadow-sm">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedMessage(null)} className="md:hidden rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-white dark:border-slate-800 shadow-sm rounded-2xl">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPeerName}`} />
                        <AvatarFallback className="rounded-2xl bg-indigo-50 text-indigo-600 font-bold dark:bg-indigo-500/20 dark:text-indigo-300">{selectedPeerInitial}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-lg tracking-tight flex items-center gap-2">
                        {selectedPeerName}
                        {selectedPeerName.includes('Admin') && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md">Official</Badge>}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t.messagesPage?.onlineNow || 'Active now'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 bg-white dark:bg-slate-800 shadow-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition-all"><Phone className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 bg-white dark:bg-slate-800 shadow-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition-all"><Video className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 bg-white dark:bg-slate-800 shadow-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition-all"><Info className="w-4 h-4" /></Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar dark:bg-slate-950/20">
                  <div className="flex flex-col gap-6">
                    <div className="text-center relative my-4">
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200/50 dark:bg-slate-800/50" />
                      <span className="bg-white dark:bg-slate-900 px-4 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 rounded-full relative z-10 border border-slate-100 dark:border-slate-800 shadow-sm uppercase tracking-wider">
                        {new Date(selectedMsg.date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>

                    {conversationMessages.map((message, index) => {
                      const isMine = Boolean(currentUserId && message.fromId === currentUserId);
                      const senderName = isMine ? 'คุณ' : message.from;
                      const senderInitial = (senderName || '?').charAt(0);
                      const showAvatar = !isMine && (index === 0 || conversationMessages[index - 1].fromId !== message.fromId);

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={message.id} 
                          className={`flex items-end gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMine && (
                            <div className="w-8 shrink-0">
                              {showAvatar && (
                                <Avatar className="w-8 h-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.from}`} />
                                  <AvatarFallback className="rounded-xl text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">{senderInitial}</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}
                          <div className={`flex max-w-[85%] flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                            <div className={`px-5 py-3.5 rounded-[1.5rem] shadow-sm font-medium text-[15px] leading-relaxed ${isMine
                                ? 'rounded-br-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                                : 'rounded-bl-sm bg-white border border-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {message.subject && !message.subject.startsWith('Re:') && (
                                <h4 className={`font-bold mb-2 text-base tracking-tight ${isMine ? 'text-indigo-50' : 'text-slate-900 dark:text-white'}`}>{message.subject}</h4>
                              )}
                              <p className={`whitespace-pre-wrap break-words ${isMine ? 'text-white/95' : 'text-slate-700 dark:text-slate-200'}`}>{message.body || message.preview}</p>
                            </div>
                            <div className="flex items-center gap-1.5 px-1">
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                {new Date(message.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMine && <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white/60 backdrop-blur-md border-t border-white/40 dark:border-slate-800/50 z-10 dark:bg-slate-900/60">
                  <div className="flex items-end gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <Textarea
                      placeholder={t.messagesPage?.typeReply || "พิมพ์ข้อความที่นี่..."}
                      className="min-h-[44px] max-h-32 w-full border-0 focus-visible:ring-0 p-2.5 font-medium text-[15px] text-slate-800 dark:text-slate-100 bg-transparent resize-none scrollbar-hide"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                    <Button 
                      className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center p-0 transition-all ${replyText.trim() ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/30 dark:bg-slate-900/30 p-8 text-center h-full">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group cursor-pointer mb-8"
              >
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl scale-50 group-hover:scale-100 transition-transform duration-500" />
                <div className="w-32 h-32 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-full border border-white dark:border-slate-800 flex items-center justify-center shadow-2xl relative z-10 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 transition-all duration-300">
                  <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors duration-300" />
                </div>
              </motion.div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">{t.messagesPage?.emptyInbox || 'กล่องข้อความ'}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed font-medium">
                {t.messagesPage?.emptyDesc || 'เลือกข้อความจากรายการด้านซ้ายเพื่ออ่านหรือตอบกลับ'}
              </p>

              <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-[320px]">
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 dark:border-slate-800/50 shadow-sm flex flex-col items-center gap-1.5 transition-all hover:scale-105">
                  <Inbox className="w-5 h-5 text-indigo-500 mb-1" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.messagesPage?.recentContacts || 'INBOX'}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{messages.filter(m => !m.read).length} Unread</span>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 dark:border-slate-800/50 shadow-sm flex flex-col items-center gap-1.5 transition-all hover:scale-105">
                  <Star className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.messagesPage?.starred || 'STARRED'}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">0 Saved</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
