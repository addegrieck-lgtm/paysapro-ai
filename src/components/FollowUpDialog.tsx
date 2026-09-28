import { useState } from 'react';
import { Copy, Mail, MessageSquare, Share2 } from 'lucide-react';
import type { Client, CompanySettings } from '../types';
import { TEMPLATES } from '../features/quotes/followUp';
import { canShare, copyText, mailtoLink, shareNative, smsLink } from '../lib/share';
import { Dialog, useToast } from './ui/Feedback';
import { Button, buttonClass } from './ui/Button';
import { SelectField, TextArea } from './ui/Form';

/** Modèles de messages (envoi, relance…) : copier, partager, e-mail ou SMS. Rien n'est envoyé automatiquement. */
export function FollowUpDialog({
  open,
  onClose,
  client,
  company,
  quoteNumber,
  total,
  initialTemplate = 'followup',
  onUsed,
}: {
  open: boolean;
  onClose: () => void;
  client: Client | undefined;
  company: CompanySettings;
  quoteNumber: string | null;
  total: string;
  initialTemplate?: string;
  onUsed?: () => void;
}) {
  const toast = useToast();
  const build = (id: string) => TEMPLATES.find((t) => t.id === id)?.build({ client, company, quoteNumber, total }) ?? '';
  const [templateId, setTemplateId] = useState(initialTemplate);
  const [text, setText] = useState(() => build(initialTemplate));
  const subject = `Votre projet d’aménagement extérieur${quoteNumber ? ` — devis ${quoteNumber}` : ''}`;

  return (
    <Dialog open={open} onClose={onClose} title="Message au client">
      <div className="space-y-4">
        <SelectField
          label="Modèle"
          value={templateId}
          onChange={(v) => {
            setTemplateId(v);
            setText(build(v));
          }}
          options={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
        />
        <TextArea label="Message (modifiable)" value={text} onChange={setText} rows={9} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="soft"
            icon={<Copy className="h-5 w-5" />}
            onClick={async () => {
              const ok = await copyText(text);
              toast(ok ? 'Message copié.' : 'Copie impossible sur ce navigateur.', ok ? 'success' : 'danger');
              if (ok) onUsed?.();
            }}
          >
            Copier
          </Button>
          {canShare() && (
            <Button
              variant="soft"
              icon={<Share2 className="h-5 w-5" />}
              onClick={async () => {
                if (await shareNative({ title: subject, text })) onUsed?.();
              }}
            >
              Partager
            </Button>
          )}
          {client?.email && (
            <a href={mailtoLink(client.email, subject, text)} onClick={() => onUsed?.()} className={buttonClass('soft')}>
              <Mail className="h-5 w-5" aria-hidden /> E-mail
            </a>
          )}
          {client?.phone && (
            <a href={smsLink(client.phone, text)} onClick={() => onUsed?.()} className={buttonClass('soft')}>
              <MessageSquare className="h-5 w-5" aria-hidden /> SMS
            </a>
          )}
        </div>
      </div>
    </Dialog>
  );
}
