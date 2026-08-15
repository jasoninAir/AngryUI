import { ThoughtAccordion } from './ThoughtAccordion';
import { ToolCard } from './ToolCard';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; thought?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string };

export function MessageItem({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg p-3 bg-primary text-primary-foreground">{msg.text}</div>
      </div>
    );
  }
  if (msg.role === 'tool') {
    return <ToolCard name={msg.name} input={msg.input} output={msg.output} />;
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-3 bg-secondary text-secondary-foreground">
        {msg.thought && <ThoughtAccordion thought={msg.thought} />}
        <div className="whitespace-pre-wrap">{msg.text}</div>
      </div>
    </div>
  );
}
