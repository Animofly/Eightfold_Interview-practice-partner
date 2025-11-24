interface ConversationMessageProps {
  role: 'interviewer' | 'candidate';
  content: string;
}

export function ConversationMessage({ role, content }: ConversationMessageProps) {
  return (
    <div className={`mb-4 ${role === 'candidate' ? 'ml-8' : 'mr-8'}`}>
      <div className={`text-xs font-medium mb-1 ${
        role === 'interviewer' ? 'text-primary' : 'text-accent'
      }`}>
        {role === 'interviewer' ? 'Interviewer' : 'You'}
      </div>
      <div className={`p-4 rounded-lg ${
        role === 'interviewer' 
          ? 'bg-secondary/50 text-foreground' 
          : 'bg-primary/10 text-foreground'
      }`}>
        {content}
      </div>
    </div>
  );
}
