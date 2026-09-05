import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useChatUI } from '../context/ChatUIContext';
import AvatarSvg from '../avatar/AvatarSvg';

function nazivKonverzacije(k) {
  if (k.tip === 'tim') return k.tim?.naziv || 'Tim';
  return k.sagovornici?.[0]?.ime || 'Nepoznat korisnik';
}

export default function ChatWidget() {
  const { korisnik } = useAuth();
  const { otvoren: otvoreno, setOtvoren: setOtvoreno, aktivnaId, setAktivnaId } = useChatUI();
  const [tab, setTab] = useState('chatovi');
  const [podaci, setPodaci] = useState({ prihvacene: [], zahtjevi: [], ukupnoNeprocitano: 0 });
  const [poruke, setPoruke] = useState([]);
  const [tekst, setTekst] = useState('');
  const [pretraga, setPretraga] = useState('');
  const poljeRef = useRef(null);

  const ucitajListu = () => {
    api.get('/chat/konverzacije').then((res) => setPodaci(res.data)).catch(() => {});
  };

  useEffect(() => {
    if (!korisnik) return;
    ucitajListu();
    const t = setInterval(ucitajListu, 8000);
    return () => clearInterval(t);
  }, [korisnik]);

  const ucitajPoruke = (id) => {
    api.get(`/chat/konverzacije/${id}/poruke`).then((res) => setPoruke(res.data)).catch(() => {});
  };

  useEffect(() => {
    if (!aktivnaId) return;
    ucitajPoruke(aktivnaId);
    const t = setInterval(() => ucitajPoruke(aktivnaId), 4000);
    return () => clearInterval(t);
  }, [aktivnaId]);

  useEffect(() => {
    if (poljeRef.current) poljeRef.current.scrollTop = poljeRef.current.scrollHeight;
  }, [poruke]);

  if (!korisnik) return null;

  const sveKonverzacije = [...podaci.prihvacene];
  const aktivna = sveKonverzacije.find((k) => k.id === aktivnaId) || podaci.zahtjevi.find((k) => k.id === aktivnaId);

  const otvoriKonverzaciju = (id) => {
    setAktivnaId(id);
    setPretraga('');
  };

  const posaljiPoruku = async (e) => {
    e.preventDefault();
    if (!tekst.trim() || !aktivnaId) return;
    await api.post(`/chat/konverzacije/${aktivnaId}/poruke`, { tekst });
    setTekst('');
    ucitajPoruke(aktivnaId);
    ucitajListu();
  };

  const odgovoriNaZahtjev = async (id, odgovor) => {
    await api.put(`/chat/konverzacije/${id}/odgovor`, { odgovor });
    ucitajListu();
    if (odgovor === 'odbijena' && aktivnaId === id) setAktivnaId(null);
  };

  return (
    <div className="chat-widget">
      {otvoreno && (
        <div className="chat-panel fade-in">
          {!aktivna && (
            <>
              <div className="chat-panel-header">
                <h4>Poruke</h4>
                <button onClick={() => setOtvoreno(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div className="chat-tabs">
                <div className={`chat-tab ${tab === 'chatovi' ? 'active' : ''}`} onClick={() => setTab('chatovi')}>Chatovi</div>
                <div className={`chat-tab ${tab === 'zahtjevi' ? 'active' : ''}`} onClick={() => setTab('zahtjevi')}>
                  Zahtjevi {podaci.zahtjevi.length > 0 && <span className="count">{podaci.zahtjevi.length}</span>}
                </div>
              </div>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                <input
                  placeholder="Pretraži poruke i razgovore..."
                  value={pretraga}
                  onChange={(e) => setPretraga(e.target.value)}
                  style={{ fontSize: 13, padding: '7px 10px' }}
                />
              </div>
              <div className="chat-list">
                {tab === 'chatovi' && podaci.prihvacene.length === 0 && (
                  <p className="muted" style={{ padding: 14 }}>Nemate još nijedan chat. Timski chat se pravi automatski čim se pridružite timu.</p>
                )}
                {tab === 'chatovi' && podaci.prihvacene
                  .filter((k) => {
                    if (!pretraga.trim()) return true;
                    const p = pretraga.toLowerCase();
                    return nazivKonverzacije(k).toLowerCase().includes(p) || (k.poslednjaPoruka?.tekst || '').toLowerCase().includes(p);
                  })
                  .map((k) => (
                  <div key={k.id} className="chat-list-item" onClick={() => otvoriKonverzaciju(k.id)}>
                    {k.tip === 'tim'
                      ? <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👥</div>
                      : <AvatarSvg avatar={k.sagovornici?.[0]?.avatar} pol={k.sagovornici?.[0]?.pol} size={34} glow={false} />}
                    <div style={{ minWidth: 0 }}>
                      <div className="name">
                        {k.tip === 'tim' && <span className="chat-pin">📌 TIM</span>}
                        {nazivKonverzacije(k)}
                      </div>
                      <div className="preview">{k.poslednjaPoruka ? k.poslednjaPoruka.tekst : 'Nema poruka još.'}</div>
                    </div>
                    <div className="meta">
                      {k.nepr > 0 && <div className="unread-dot">{k.nepr}</div>}
                    </div>
                  </div>
                ))}
                {tab === 'zahtjevi' && podaci.zahtjevi.length === 0 && (
                  <p className="muted" style={{ padding: 14 }}>Nemate zahtjeve za poruke.</p>
                )}
                {tab === 'zahtjevi' && podaci.zahtjevi.map((k) => (
                  <div key={k.id} className="chat-list-item" onClick={() => otvoriKonverzaciju(k.id)}>
                    <AvatarSvg avatar={k.sagovornici?.[0]?.avatar} pol={k.sagovornici?.[0]?.pol} size={34} glow={false} />
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{nazivKonverzacije(k)}</div>
                      <div className="preview">{k.poslednjaPoruka ? k.poslednjaPoruka.tekst : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {aktivna && (
            <div className="chat-thread">
              <div className="chat-thread-header">
                <button className="back" onClick={() => { setAktivnaId(null); setPretraga(''); }}>←</button>
                {aktivna.tip === 'tim'
                  ? <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
                  : <AvatarSvg avatar={aktivna.sagovornici?.[0]?.avatar} pol={aktivna.sagovornici?.[0]?.pol} size={28} glow={false} />}
                <strong style={{ fontSize: 13 }}>{nazivKonverzacije(aktivna)}</strong>
              </div>

              {aktivna.mojStatus === 'prihvacena' && (
                <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
                  <input
                    placeholder="Pretraži poruke u ovom razgovoru..."
                    value={pretraga}
                    onChange={(e) => setPretraga(e.target.value)}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  />
                </div>
              )}

              {aktivna.mojStatus === 'na_cekanju' && (
                <div className="chat-request-banner">
                  <span>Zahtjev za poruku</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => odgovoriNaZahtjev(aktivna.id, 'prihvacena')}>Prihvati</button>
                    <button className="btn btn-sm btn-outline" onClick={() => odgovoriNaZahtjev(aktivna.id, 'odbijena')}>Odbij</button>
                  </div>
                </div>
              )}

              <div className="chat-messages" ref={poljeRef}>
                {poruke
                  .filter((p) => !pretraga.trim() || p.tekst.toLowerCase().includes(pretraga.toLowerCase()))
                  .map((p, idx, niz) => {
                    const mojaPoruka = p.posiljalac_id === korisnik.id;
                    // U timskom (grupnom) čatu ima više učesnika — ime/avatar pošiljaoca se prikazuje
                    // iznad poruke SAMO kad se promijeni pošiljalac (ne ponavlja se za svaku uzastopnu poruku iste osobe).
                    const prethodna = niz[idx - 1];
                    const prikaziIme = aktivna.tip === 'tim' && !mojaPoruka && (!prethodna || prethodna.posiljalac_id !== p.posiljalac_id);
                    return (
                      <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mojaPoruka ? 'flex-end' : 'flex-start' }}>
                        {prikaziIme && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, marginLeft: 4 }}>
                            <AvatarSvg avatar={p.posiljalac?.avatar} pol={p.posiljalac?.pol} size={16} glow={false} />
                            <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{p.posiljalac?.ime}</span>
                          </div>
                        )}
                        <div className={`chat-bubble ${mojaPoruka ? 'out' : 'in'}`} style={pretraga.trim() ? { outline: '1px solid var(--neon-yellow)' } : undefined}>
                          {p.tekst}
                        </div>
                      </div>
                    );
                  })}
                {pretraga.trim() && poruke.filter((p) => p.tekst.toLowerCase().includes(pretraga.toLowerCase())).length === 0 && (
                  <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>Nema poruka koje sadrže "{pretraga}".</p>
                )}
              </div>

              <form className="chat-input-row" onSubmit={posaljiPoruku}>
                <input
                  placeholder={aktivna.mojStatus === 'na_cekanju' ? 'Prihvatite zahtjev da biste odgovorili...' : 'Poruka...'}
                  value={tekst}
                  onChange={(e) => setTekst(e.target.value)}
                  disabled={aktivna.mojStatus === 'na_cekanju'}
                />
                <button className="btn btn-sm" type="submit" disabled={aktivna.mojStatus === 'na_cekanju'}>Pošalji</button>
              </form>
            </div>
          )}
        </div>
      )}

      <button className="chat-toggle-btn" onClick={() => setOtvoreno((o) => !o)}>
        {otvoreno ? '✕' : '💬'}
        {!otvoreno && podaci.ukupnoNeprocitano > 0 && (
          <span className="chat-toggle-badge">{podaci.ukupnoNeprocitano > 9 ? '9+' : podaci.ukupnoNeprocitano}</span>
        )}
      </button>
    </div>
  );
}
