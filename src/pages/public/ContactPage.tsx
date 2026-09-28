import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { TextArea, TextField } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';
import { SubmitResultPanel } from '../../components/SubmitResultPanel';
import { contact, validateContact, type ContactInput, type FieldErrors, type SubmitResult } from '../../services/forms/forms';
import { analytics } from '../../services/analytics/AnalyticsProvider';

export function ContactPage() {
  const [msg, setMsg] = useState<ContactInput>({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<FieldErrors<ContactInput>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    const errs = validateContact(msg);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      setResult(await contact.send(msg));
      analytics.track('contact_submitted');
    } catch {
      setFailure('L’envoi a échoué. Réessayez.');
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Une question ?</h1>
      <p className="mt-3 text-lg text-muted">Écrivez-nous : nous répondons à chaque professionnel de la bêta.</p>
      <div className="mt-8">
        {result ? (
          <SubmitResultPanel result={result} title="Merci pour votre message !" onReset={() => { setResult(null); setMsg({ name: '', email: '', message: '' }); }} />
        ) : (
          <form
            noValidate
            className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TextField label="Nom" value={msg.name} onChange={(v) => setMsg({ ...msg, name: v })} error={errors.name} autoComplete="name" />
            <TextField label="E-mail" type="email" value={msg.email} onChange={(v) => setMsg({ ...msg, email: v })} error={errors.email} autoComplete="email" />
            <div>
              <TextArea label="Message" value={msg.message} onChange={(v) => setMsg({ ...msg, message: v })} rows={6} />
              {errors.message && <p className="mt-1 text-sm text-danger">{errors.message}</p>}
            </div>
            {failure && <Alert tone="danger">{failure}</Alert>}
            <Button type="submit" block size="lg">
              Envoyer
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
