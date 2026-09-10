import { useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Čim se kapiten prijavi/uđe na sajt, PROAKTIVNO ga pita za rezultat svakog meča koji je
// već počeo a on još nije glasao — ne čeka se da sam ode na stranicu tog meča.
// Ako odgovori "Ne" (meč još nije gotov), ništa se ne mijenja — pitaće se ponovo sledeći put
// kad korisnik uđe na sajt (nova sesija/osvježena stranica), kao što je traženo.
export default function MatchVotePrompt() {
  const { korisnik } = useAuth();
  const { confirmDialog, izborDialog, toast } = useToast();
  const vecPitano = useRef(false);

  useEffect(() => {
    if (!korisnik || vecPitano.current) return;
    vecPitano.current = true; // pitaj samo JEDNOM po učitavanju stranice, ne u petlji

    (async () => {
      const res = await api.get('/scrim/mecevi/cekaju-glas');
      const mecevi = res.data;
      for (const mec of mecevi) {
        const zavrsen = await confirmDialog(
          `Da li je meč ${mec.tim1?.naziv} vs ${mec.tim2?.naziv} (zakazan za ${new Date(mec.zakazano_za).toLocaleString('sr-RS')}) završen?`
        );
        if (!zavrsen) continue; // "Ne" — preskoči, pitaćemo ponovo sledeći put kad uđe na sajt

        const glas = await izborDialog(`Koji je ishod meča ${mec.tim1?.naziv} vs ${mec.tim2?.naziv} (iz perspektive vašeg tima)?`, [
          { label: 'Pobjeda', value: 'pobjeda' },
          { label: 'Poraz', value: 'poraz' },
          { label: 'Nerešeno', value: 'nerijeseno' },
        ]);
        if (!glas) continue;

        try {
          await api.put(`/scrim/mecevi/${mec.id}/glasaj`, { glas });
          toast('Glas je zabilježen.', 'success');
        } catch (err) {
          toast(err.response?.data?.poruka || 'Greška prilikom glasanja.', 'error');
        }
      }
    })();
  }, [korisnik]);

  return null; // ova komponenta ne iscrtava ništa svoje — samo pokreće dijaloge
}
