import { cn } from '@/lib/utils';
import { useDocumentStore } from '@/store/documentStore';

export function IssuedReceivedToggle() {
  const { is_received, setIsReceived } = useDocumentStore();

  return (
    <div className="flex rounded-md border border-border bg-muted p-0.5">
      {([false, true] as const).map((received) => (
        <button
          key={String(received)}
          onClick={() => setIsReceived(received)}
          className={cn(
            'px-4 py-1.5 rounded text-[12px] font-semibold transition-colors',
            is_received === received
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {received ? 'Recibidos' : 'Emitidos'}
        </button>
      ))}
    </div>
  );
}
