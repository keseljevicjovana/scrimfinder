import { createContext, useContext, useState } from 'react';

// Omogućava da BILO KOJA stranica (npr. profil igrača, nakon slanja poruke) otvori
// plutajući chat widget direktno na određenoj konverzaciji, umjesto da samo ispiše
// alert "poruka je poslata, otvorite chat sami".
const ChatUIContext = createContext(null);

export function ChatUIProvider({ children }) {
  const [otvoren, setOtvoren] = useState(false);
  const [aktivnaId, setAktivnaId] = useState(null);

  const otvoriChat = (konverzacijaId = null) => {
    setAktivnaId(konverzacijaId);
    setOtvoren(true);
  };

  return (
    <ChatUIContext.Provider value={{ otvoren, setOtvoren, aktivnaId, setAktivnaId, otvoriChat }}>
      {children}
    </ChatUIContext.Provider>
  );
}

export function useChatUI() {
  return useContext(ChatUIContext);
}
