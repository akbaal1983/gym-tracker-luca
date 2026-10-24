GYM TRACKER LUCA — BETA 0.2
24 ottobre 2026

AGGIORNAMENTO SU GITHUB PAGES
1. Estrai questo ZIP sul computer.
2. Carica il contenuto nella root del repository gym-tracker-luca,
   sostituendo index.html, app.js, styles.css, manifest.webmanifest e sw.js.
   Mantieni la cartella icons/ con le due immagini al suo interno.
   Non caricare lo ZIP come singolo file e non creare una sottocartella beta-0.2.
3. Lascia Pages configurato su main / (root), come nella Beta 0.1.
4. Dopo la pubblicazione apri il sito online, chiudilo e riaprilo se compare
   ancora Beta 0.1. Controlla che in alto compaia Beta 0.2.
5. Per usare l'app offline, aprila almeno una volta online dopo l'aggiornamento.

I dati sono salvati nel browser del dispositivo, con la stessa chiave della
Beta 0.1 (gymTrackerLuca.v1). Usa lo stesso browser e lo stesso indirizzo del
sito per ritrovare i dati. Non cancellare i dati del sito e non disinstallare
l'app per aggiornarla. La Beta 0.2 non sincronizza dispositivi diversi.
Il pulsante Esporta backup dati nello Storico permette di scaricare una copia
JSON dei dati. Questa versione non include un comando di ripristino del backup.
Se ci sono altre app sotto lo stesso dominio GitHub Pages, lo spazio locale
del browser è condiviso; la chiave originale viene mantenuta per compatibilità.

NOVITÀ
- Nuove schede A/B/C full body con serie, ripetizioni e recuperi concordati.
- A e B: cardio iniziale 8–10 min e finale 12–15 min.
- C: cardio iniziale 8–10 min e finale 10–15 min.
- Solo cardio e Camminata outdoor con durata, distanza, passo e velocità.
- Torna alla lista in alto e in fondo a ogni card, anche cardio.
- Esercizi completati sempre consultabili: aprili e premi MODIFICA DATI.
- Le correzioni di peso e ripetizioni si confermano per serie con
  SALVA CORREZIONE. La sensazione si salva subito al tocco.
- Le modifiche si possono effettuare anche negli allenamenti dello Storico.
- Annulla completamento serie riapre una serie registrata per errore.
- Stato e suggerimento si ricalcolano dai dati salvati; una serie incompleta
  non può generare un suggerimento di aumento.
- Correggere una serie registrata non avvia un nuovo recupero.
- Le bozze dei campi non completati restano disponibili dopo ricaricamento.

FUNZIONI CONSERVATE
- Palestra affollata, macchina occupata/da recuperare, salta esercizio.
- Avviso cambio gruppo muscolare e possibilità di continuare.
- Recupero persistente, +30 secondi e conteggio positivo dopo lo zero.
- Peso ereditato dall'ultima serie completata e dati della seduta precedente.
- Storico locale, registrazione peso e circonferenza vita, grafico del peso.

COMPATIBILITÀ
Le nuove schede si applicano alle nuove sedute. Gli allenamenti già salvati
e l'eventuale seduta aperta mantengono gli esercizi e gli obiettivi originali.
Per iniziare la nuova scheda termina prima la seduta aperta. Un allenamento
nuovo non può sovrascrivere quello in corso.
Non servono installazione di librerie, account o compilazione.
Per PWA e uso offline occorre HTTPS (GitHub Pages) oppure localhost nei test.
Aprire index.html come file locale non equivale a usare la PWA pubblicata.

SORGENTE
Aggiornamento dei file originali del repository:
https://github.com/akbaal1983/gym-tracker-luca
app.js Beta 0.1: SHA 391bc6f5b1f0b989cc1867341a438d622964b8a9.
Le icone originali sono state mantenute e collocate in icons/, come previsto
dal manifest e dai riferimenti dell'app. Nessun file del repository remoto
è stato modificato durante la preparazione di questo ZIP.

La pubblicazione GitHub Pages e l'installazione sul tuo telefono restano
da verificare dopo il caricamento del pacchetto.
