import { Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { Icon } from '@/components/ui';

interface CopiesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  emails: string[];
  onChange: (emails: string[]) => void;
}

export function CopiesSection({ isExpanded, onToggle, emails, onChange }: CopiesSectionProps) {
  const { t } = useLanguage();
  const add = () => onChange([...emails, '']);
  const remove = (i: number) => onChange(emails.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) =>
    onChange(emails.map((e, idx) => (idx === i ? v : e)));

  return (
    <SectionWrapper
      title={t('checkout.tab.copies')}
      icon={Mail}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={emails.length || undefined}
    >
      <p className="text-[12px] text-muted-foreground">
        {t('checkout.copies.intro')}
      </p>

      {emails.map((email, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => update(i, e.target.value)}
            placeholder={t('checkout.copies.placeholder')}
            className="flex-1 h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => remove(i)}
            title={t('common.delete')}
            className="h-10 w-10 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={add}
        className="w-full h-9 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        {t('checkout.copies.add')}
      </button>
    </SectionWrapper>
  );
}
