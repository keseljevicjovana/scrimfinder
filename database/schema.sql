-- ============================================================
-- ScrimFinder — baza podataka (MySQL 8+)
-- Ispravljena šema — vidi napomene uz svaku tabelu za razlog izmjene
-- ============================================================

CREATE DATABASE IF NOT EXISTS scrimfinder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE scrimfinder;

-- ------------------------------------------------------------
-- IGRE (podržane igre na platformi)
-- ------------------------------------------------------------
CREATE TABLE igre (
  id INT AUTO_INCREMENT PRIMARY KEY,
  naziv VARCHAR(50) NOT NULL UNIQUE,
  ima_pozicije BOOLEAN NOT NULL DEFAULT FALSE, -- npr. LoL=TRUE, CS2=FALSE
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- POZICIJE (vezane za igru — pozicije se razlikuju po igri, ISPRAVKA #11)
-- ------------------------------------------------------------
CREATE TABLE pozicije (
  id INT AUTO_INCREMENT PRIMARY KEY,
  igra_id INT NOT NULL,
  naziv VARCHAR(30) NOT NULL,
  FOREIGN KEY (igra_id) REFERENCES igre(id) ON DELETE CASCADE,
  UNIQUE KEY uq_pozicija (igra_id, naziv)
);

-- ------------------------------------------------------------
-- KORISNICI
-- ------------------------------------------------------------
-- ISPRAVKA/DOPUNA: dodato polje pol (za dodjelu podrazumijevanog avatara),
-- avatar (JSON konfiguracija izgleda — koža, oči, frizura, boja kose, odjeća, dodatak),
-- i mora_promijeniti_lozinku (za tok registracije preko jednokratne lozinke poslane na email).
CREATE TABLE korisnici (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ime VARCHAR(60) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  lozinka_hash VARCHAR(255) NOT NULL,
  pol ENUM('muski','zenski') NOT NULL DEFAULT 'muski',
  avatar JSON,
  bio TEXT, -- opšti opis igrača (premješteno iz profili_igraca — jedan igrač sad može imati VIŠE igara, bio je zajednički za sve)
  mora_promijeniti_lozinku BOOLEAN NOT NULL DEFAULT TRUE,
  uloga ENUM('igrac','admin') NOT NULL DEFAULT 'igrac',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PROFIL IGRAČA (1:1 sa korisnikom — jedna igra/rank po profilu, po originalnom konceptu)
-- ------------------------------------------------------------
-- ------------------------------------------------------------
-- PROFIL IGRAČA (ISPRAVKA: 1:N sa korisnikom — igrač MOŽE igrati više igara,
-- svaka sa svojom pozicijom; uq_profil_igraca sprečava dodavanje iste igre dvaput)
-- ------------------------------------------------------------
CREATE TABLE profili_igraca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  korisnik_id INT NOT NULL,
  igra_id INT NOT NULL,
  rank ENUM('Bronze','Silver','Gold','Platinum','Diamond','Pro') NOT NULL DEFAULT 'Bronze', -- ZASTARJELO: rank se više NE bira ručno; prikazuje se rank TIMA (izračunat iz mečeva), ova kolona se više ne koristi u UI-u
  pozicija_id INT NULL, -- može biti NULL ako igra nema pozicije
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  FOREIGN KEY (igra_id) REFERENCES igre(id),
  FOREIGN KEY (pozicija_id) REFERENCES pozicije(id),
  UNIQUE KEY uq_profil_igraca (korisnik_id, igra_id)
);

-- ------------------------------------------------------------
-- DOSTUPNOST (ISPRAVKA #2 — strukturirano, ne slobodan tekst, radi filtriranja)
-- ------------------------------------------------------------
CREATE TABLE dostupnost (
  id INT AUTO_INCREMENT PRIMARY KEY,
  korisnik_id INT NOT NULL,
  dan_u_sedmici TINYINT NOT NULL, -- 0=ponedjeljak ... 6=nedjelja
  vrijeme_od TIME NOT NULL,
  vrijeme_do TIME NOT NULL,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TIMOVI
-- ------------------------------------------------------------
CREATE TABLE timovi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  naziv VARCHAR(60) NOT NULL UNIQUE,
  logo_url VARCHAR(255),
  grb JSON, -- generisani grb tima (oblik, boje, simbol) — alternativa ručnom URL-u loga, uređuje kapiten
  igra_id INT NOT NULL,
  opis TEXT,
  kapiten_id INT NOT NULL,
  trazi_igrace BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (igra_id) REFERENCES igre(id),
  FOREIGN KEY (kapiten_id) REFERENCES korisnici(id)
);

-- ------------------------------------------------------------
-- ČLANOVI TIMA (aktivno članstvo, nastaje tek nakon prihvaćene pozivnice/aplikacije)
-- ------------------------------------------------------------
CREATE TABLE clanovi_tima (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tim_id INT NOT NULL,
  korisnik_id INT NOT NULL,
  pozicija_id INT NULL,
  datum_pridruzenja DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tim_id) REFERENCES timovi(id) ON DELETE CASCADE,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  FOREIGN KEY (pozicija_id) REFERENCES pozicije(id),
  UNIQUE KEY uq_clan (tim_id, korisnik_id)
);

-- ------------------------------------------------------------
-- POZIVNICE (kapiten -> igrač) — ISPRAVKA #1
-- ------------------------------------------------------------
CREATE TABLE pozivnice (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tim_id INT NOT NULL,
  pozvani_korisnik_id INT NOT NULL,
  poslao_korisnik_id INT NOT NULL, -- kapiten koji šalje
  status ENUM('na_cekanju','prihvacena','odbijena') NOT NULL DEFAULT 'na_cekanju',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tim_id) REFERENCES timovi(id) ON DELETE CASCADE,
  FOREIGN KEY (pozvani_korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  FOREIGN KEY (poslao_korisnik_id) REFERENCES korisnici(id)
);

-- ------------------------------------------------------------
-- APLIKACIJE (igrač -> tim) — ISPRAVKA #1, nova tabela koje nije bilo
-- ------------------------------------------------------------
CREATE TABLE aplikacije (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tim_id INT NOT NULL,
  korisnik_id INT NOT NULL,
  poruka TEXT,
  status ENUM('na_cekanju','prihvacena','odbijena') NOT NULL DEFAULT 'na_cekanju',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tim_id) REFERENCES timovi(id) ON DELETE CASCADE,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- SCRIM ZAHTJEVI
-- ------------------------------------------------------------
CREATE TABLE scrim_zahtjevi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tim_posiljalac_id INT NOT NULL,
  tim_primalac_id INT NOT NULL,
  predlozeni_termin DATETIME NOT NULL,
  broj_mapa TINYINT NOT NULL DEFAULT 1,
  pravila TEXT,
  status ENUM('na_cekanju','prihvacen','odbijen') NOT NULL DEFAULT 'na_cekanju',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tim_posiljalac_id) REFERENCES timovi(id),
  FOREIGN KEY (tim_primalac_id) REFERENCES timovi(id)
);

-- ------------------------------------------------------------
-- TURNIRI (mora postojati prije scrim_meceva zbog FK)
-- ------------------------------------------------------------
CREATE TABLE turniri (
  id INT AUTO_INCREMENT PRIMARY KEY,
  naziv VARCHAR(100) NOT NULL,
  igra_id INT NOT NULL,
  datum DATETIME NOT NULL,
  max_timova INT NOT NULL,
  format ENUM('single_elimination','double_elimination') NOT NULL DEFAULT 'single_elimination',
  status ENUM('prijave_otvorene','u_toku','zavrsen') NOT NULL DEFAULT 'prijave_otvorene',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (igra_id) REFERENCES igre(id)
);

-- ------------------------------------------------------------
-- SCRIM MEČEVI — ISPRAVKA #5: FK ka zahtjevu i ka turniru (nullable, meč može biti i turnirski)
-- ------------------------------------------------------------
CREATE TABLE scrim_mecevi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zahtjev_id INT NULL UNIQUE, -- NULL ako je meč iz turnirskog bracketa
  tim1_id INT NOT NULL,
  tim2_id INT NOT NULL,
  turnir_id INT NULL,
  runda_broj INT NULL,
  zakazano_za DATETIME NOT NULL,
  pobjednik_tim_id INT NULL, -- za turnire (bracket) postavlja se direktno; za obicne skrimove izvodi se iz 'ishod' nakon glasanja
  ishod ENUM('tim1','tim2','nerijeseno') NULL, -- popunjava se kad se oba kapitena slozu (ili admin rijesi spor)
  glas_tim1 ENUM('pobjeda','poraz','nerijeseno') NULL, -- glas kapitena tima1 o ishodu (iz NJEGOVE perspektive)
  glas_tim2 ENUM('pobjeda','poraz','nerijeseno') NULL, -- glas kapitena tima2 o ishodu (iz NJEGOVE perspektive)
  rezultat VARCHAR(20), -- npr. "2-1" (opciono, uglavnom za turnirske mečeve)
  status ENUM('zakazan','odigran','otkazan','sporno') NOT NULL DEFAULT 'zakazan',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zahtjev_id) REFERENCES scrim_zahtjevi(id),
  FOREIGN KEY (tim1_id) REFERENCES timovi(id),
  FOREIGN KEY (tim2_id) REFERENCES timovi(id),
  FOREIGN KEY (turnir_id) REFERENCES turniri(id),
  FOREIGN KEY (pobjednik_tim_id) REFERENCES timovi(id)
);

-- ------------------------------------------------------------
-- PRISUSTVA MEČU — ISPRAVKA: individualna statistika igrača je uklonjena;
-- umjesto nje pratimo da li je igrač POTVRDIO prisustvo zakazanom meču svog tima.
-- Ovo je osnova za "% prisustva" rangiranje igrača.
-- ------------------------------------------------------------
CREATE TABLE prisustva_meca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mec_id INT NOT NULL,
  korisnik_id INT NOT NULL,
  tim_id INT NOT NULL, -- za koji od dva tima igrač glasa (razlikuje clanove tima1 od tima2)
  status ENUM('na_cekanju','moze','ne_moze') NOT NULL DEFAULT 'na_cekanju',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mec_id) REFERENCES scrim_mecevi(id) ON DELETE CASCADE,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  FOREIGN KEY (tim_id) REFERENCES timovi(id) ON DELETE CASCADE,
  UNIQUE KEY uq_prisustvo (mec_id, korisnik_id)
);

-- ------------------------------------------------------------
-- STATISTIKE PO MEČU — ISPRAVKA (unique constraint da se ne duplira unos)
-- ------------------------------------------------------------
CREATE TABLE mec_statistike (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mec_id INT NOT NULL,
  korisnik_id INT NOT NULL,
  tim_id INT NOT NULL,
  kills INT NOT NULL DEFAULT 0,
  deaths INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  FOREIGN KEY (mec_id) REFERENCES scrim_mecevi(id) ON DELETE CASCADE,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id),
  FOREIGN KEY (tim_id) REFERENCES timovi(id),
  UNIQUE KEY uq_mec_korisnik (mec_id, korisnik_id)
);

-- ------------------------------------------------------------
-- PRIJAVE TIMOVA NA TURNIRE — nova tabela, nedostajala je (ISPRAVKA)
-- ------------------------------------------------------------
CREATE TABLE turnir_prijave (
  id INT AUTO_INCREMENT PRIMARY KEY,
  turnir_id INT NOT NULL,
  tim_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turnir_id) REFERENCES turniri(id) ON DELETE CASCADE,
  FOREIGN KEY (tim_id) REFERENCES timovi(id) ON DELETE CASCADE,
  UNIQUE KEY uq_prijava (turnir_id, tim_id)
);

-- ------------------------------------------------------------
-- BRACKET TURNIRA — ISPRAVKA #7: struktura runda/meč/next_meč
-- ------------------------------------------------------------
CREATE TABLE raspored_turnira (
  id INT AUTO_INCREMENT PRIMARY KEY,
  turnir_id INT NOT NULL,
  runda_broj INT NOT NULL,
  pozicija_u_rundi INT NOT NULL, -- redni broj meča unutar runde (1,2,3...)
  tim1_id INT NULL,
  tim2_id INT NULL,
  mec_id INT NULL, -- popunjava se kad se odigra (FK scrim_mecevi)
  sledeci_slot_id INT NULL, -- FK na raspored_turnira.id gdje pobjednik ide dalje
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turnir_id) REFERENCES turniri(id) ON DELETE CASCADE,
  FOREIGN KEY (tim1_id) REFERENCES timovi(id),
  FOREIGN KEY (tim2_id) REFERENCES timovi(id),
  FOREIGN KEY (mec_id) REFERENCES scrim_mecevi(id),
  FOREIGN KEY (sledeci_slot_id) REFERENCES raspored_turnira(id)
);

-- ------------------------------------------------------------
-- KOMENTARI — ISPRAVKA #4: polimorfno (tim ili meč)
-- ------------------------------------------------------------
CREATE TABLE komentari (
  id INT AUTO_INCREMENT PRIMARY KEY,
  autor_id INT NOT NULL,
  entitet_tip ENUM('tim','mec') NOT NULL,
  entitet_id INT NOT NULL,
  tekst TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (autor_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  INDEX idx_entitet (entitet_tip, entitet_id)
);

-- ------------------------------------------------------------
-- LAJKOVI KOMENTARA — ISPRAVKA #3: nova tabela, nije postojala
-- ------------------------------------------------------------
CREATE TABLE komentar_lajkovi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  komentar_id INT NOT NULL,
  korisnik_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (komentar_id) REFERENCES komentari(id) ON DELETE CASCADE,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  UNIQUE KEY uq_lajk (komentar_id, korisnik_id)
);

-- ------------------------------------------------------------
-- PRIJAVE NEPRIMJERENOG SADRŽAJA — ISPRAVKA #8: polimorfno
-- ------------------------------------------------------------
CREATE TABLE prijave_sadrzaja (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prijavio_korisnik_id INT NOT NULL,
  entitet_tip ENUM('komentar','korisnik') NOT NULL,
  entitet_id INT NOT NULL,
  razlog TEXT,
  status ENUM('na_cekanju','rijeseno','ignorisano') NOT NULL DEFAULT 'na_cekanju',
  rijesio_admin_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prijavio_korisnik_id) REFERENCES korisnici(id),
  FOREIGN KEY (rijesio_admin_id) REFERENCES korisnici(id)
);

-- ------------------------------------------------------------
-- DOSTIGNUĆA — ISPRAVKA #6: strukturiran uslov, ne slobodan tekst
-- ------------------------------------------------------------
CREATE TABLE dostignuca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  naziv VARCHAR(80) NOT NULL,
  opis TEXT,
  uslov_tip ENUM('odigranih_meceva','pobjeda','win_rate','osvojen_turnir') NOT NULL, -- svi uslovi su sada TIMSKI/PRISUSTVO bazirani, ne individualna statistika: 'odigranih_meceva'=broj mečeva kojima je igrač prisustvovao, 'pobjeda'=broj pobjeda tima u mečevima kojima je prisustvovao, 'win_rate'=win rate tima u tim mečevima
  uslov_vrijednost INT NOT NULL, -- npr. 10 (mečeva), 70 (% win rate)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE korisnik_dostignuca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  korisnik_id INT NOT NULL,
  dostignuce_id INT NOT NULL,
  dodijeljeno_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  FOREIGN KEY (dostignuce_id) REFERENCES dostignuca(id) ON DELETE CASCADE,
  UNIQUE KEY uq_dostignuce (korisnik_id, dostignuce_id)
);

-- ------------------------------------------------------------
-- CHAT — timski chat (auto) + direktne poruke sa "zahtjevima" (Instagram-stil)
-- ------------------------------------------------------------
CREATE TABLE konverzacije (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tip ENUM('tim','direktna') NOT NULL,
  tim_id INT NULL, -- popunjeno samo za tip='tim'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tim_id) REFERENCES timovi(id) ON DELETE CASCADE
);

CREATE TABLE clanovi_konverzacije (
  id INT AUTO_INCREMENT PRIMARY KEY,
  konverzacija_id INT NOT NULL,
  korisnik_id INT NOT NULL,
  status ENUM('prihvacena','na_cekanju','odbijena') NOT NULL DEFAULT 'prihvacena',
  pinovano BOOLEAN NOT NULL DEFAULT FALSE,
  poslednje_procitano_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (konverzacija_id) REFERENCES konverzacije(id) ON DELETE CASCADE,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
  UNIQUE KEY uq_clan_konverzacije (konverzacija_id, korisnik_id)
);

CREATE TABLE poruke (
  id INT AUTO_INCREMENT PRIMARY KEY,
  konverzacija_id INT NOT NULL,
  posiljalac_id INT NOT NULL,
  tekst TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (konverzacija_id) REFERENCES konverzacije(id) ON DELETE CASCADE,
  FOREIGN KEY (posiljalac_id) REFERENCES korisnici(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- NOTIFIKACIJE — ISPRAVKA #9: tip + pročitano
-- ------------------------------------------------------------
CREATE TABLE notifikacije (
  id INT AUTO_INCREMENT PRIMARY KEY,
  korisnik_id INT NOT NULL,
  tip ENUM(
    'pozivnica_u_tim','aplikacija_prihvacena','aplikacija_odbijena',
    'scrim_zahtjev_primljen','scrim_zahtjev_prihvacen','scrim_zahtjev_odbijen',
    'novo_dostignuce','komentar_na_timu','turnir_pocinje','poruka_zahtjev','prisustvo_pitanje'
  ) NOT NULL,
  poruka VARCHAR(255) NOT NULL,
  link_entitet_tip VARCHAR(30),
  link_entitet_id INT,
  procitano BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE
);
