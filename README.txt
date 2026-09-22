GYM TRACKER LUCA - BETA 0.1

Questa beta e' una PWA statica: non richiede database o login.
I dati sono salvati localmente sul telefono/browser con localStorage.

FUNZIONI INCLUSE
- Schede A/B/C
- Riscaldamento cardio e cardio finale
- Sessione Solo cardio, inclusa Camminata outdoor
- Vista lista esercizi
- Macchina occupata e modalita' Palestra affollata
- Popup cambio gruppo muscolare quando ha senso
- Registrazione peso/ripetizioni
- Il peso inserito in una serie viene proposto nella serie successiva
- Timer recupero persistente basato sull'orario reale
- Dopo 00:00 il timer continua in positivo (+00:01, +00:02...)
- Storico locale
- Peso corporeo e circonferenza vita
- Funzionamento offline dopo il primo caricamento

COME PROVARLA SUL PC
1. Aprire un terminale nella cartella.
2. Eseguire: python3 -m http.server 8080
3. Aprire http://localhost:8080

COME USARLA SUL TELEFONO
La PWA deve essere pubblicata via HTTPS. La via piu' semplice e' caricare questa cartella su Netlify, Vercel o GitHub Pages.
Poi aprire l'indirizzo sul telefono e usare "Aggiungi a schermata Home".

NOTA BETA
I dati sono solo sul dispositivo/browser corrente. In una fase successiva aggiungeremo sincronizzazione cloud e backup.
