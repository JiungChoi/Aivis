import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import { useConversationStore } from '../stores/conversationStore';

export default function ChatPage() {
  const { messages, isLoading, sendMessage } = useConversationStore();

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
