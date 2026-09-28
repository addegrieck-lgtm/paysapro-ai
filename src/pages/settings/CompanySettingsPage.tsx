import { useState } from 'react';
import { useAppState } from '../../lib/store';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextArea } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Feedback';
import { CompanyFields } from '../../components/CompanyFields';
import { updateCompany } from '../../features/settings/actions';
import { isValidEmail } from '../../utils/validation';

export function CompanySettingsPage() {
  const { settings } = useAppState();
  const toast = useToast();
  const [company, setCompany] = useState(settings.company);

  return (
    <div className="space-y-5">
      <PageHeader back="/more" title="Entreprise" subtitle="Ces informations apparaissent sur vos devis." />
      <Card>
        <CompanyFields value={company} onChange={setCompany} />
      </Card>
      <Card>
        <TextArea
          label="Conditions générales (imprimées sur les nouveaux devis)"
          value={company.terms}
          onChange={(v) => setCompany({ ...company, terms: v })}
          rows={6}
        />
      </Card>
      <StickyActions>
        <Button
          block
          size="lg"
          onClick={() => {
            if (!isValidEmail(company.email)) return toast('Adresse e-mail invalide.', 'danger');
            updateCompany(company);
            toast('Profil de l’entreprise enregistré.');
          }}
        >
          Enregistrer
        </Button>
      </StickyActions>
    </div>
  );
}
