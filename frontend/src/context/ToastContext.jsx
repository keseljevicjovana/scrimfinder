import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  // dialog = { vrsta: 'confirm'|'izbor'|'prompt', poruka, opcije?, podrazumevano?, resolve }

  const toast = useCallback((poruka, tip = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, poruka, tip }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const confirmDialog = useCallback((poruka) => new Promise((resolve) => {
    setDialog({ vrsta: 'confirm', poruka, resolve });
  }), []);

  // opcije: [{ label, value }] — vraća izabranu 'value', ili null ako je otkazano
  const izborDialog = useCallback((poruka, opcije) => new Promise((resolve) => {
    setDialog({ vrsta: 'izbor', poruka, opcije, resolve });
  }), []);

  const promptDialog = useCallback((poruka, podrazumevano = '') => new Promise((resolve) => {
    setDialog({ vrsta: 'prompt', poruka, podrazumevano, resolve });
  }), []);

  const zatvoriDialog = (rezultat) => {
    if (dialog) dialog.resolve(rezultat);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirmDialog, izborDialog, promptDialog }}>
      {children}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tip}`} onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}>
            {t.poruka}
          </div>
        ))}
      </div>

      {dialog && <DialogModal dialog={dialog} onClose={zatvoriDialog} />}
    </ToastContext.Provider>
  );
}

function DialogModal({ dialog, onClose }) {
  const [vrijednost, setVrijednost] = useState(dialog.podrazumevano || '');

  return (
    <div className="dialog-overlay" onClick={() => onClose(dialog.vrsta === 'prompt' ? null : false)}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <p style={{ marginTop: 0, whiteSpace: 'pre-line' }}>{dialog.poruka}</p>

        {dialog.vrsta === 'confirm' && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={() => onClose(false)}>Otkaži</button>
            <button className="btn btn-sm" onClick={() => onClose(true)}>Potvrdi</button>
          </div>
        )}

        {dialog.vrsta === 'izbor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {dialog.opcije.map((o) => (
              <button key={o.value} className="btn btn-outline btn-sm" onClick={() => onClose(o.value)}>{o.label}</button>
            ))}
            <button className="btn btn-outline btn-sm" style={{ opacity: 0.6 }} onClick={() => onClose(null)}>Otkaži</button>
          </div>
        )}

        {dialog.vrsta === 'prompt' && (
          <form onSubmit={(e) => { e.preventDefault(); onClose(vrijednost); }}>
            <input autoFocus value={vrijednost} onChange={(e) => setVrijednost(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onClose(null)}>Otkaži</button>
              <button type="submit" className="btn btn-sm">Potvrdi</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
