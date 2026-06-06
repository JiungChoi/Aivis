import type { Message } from '../../types';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
