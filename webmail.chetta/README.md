# 📧 Webmail IMAP Outlook Clone (Ultra-Veloce, Mobile & Docker su Ubuntu)

Webmail completa, ad alte prestazioni, con interfaccia grafica fedelmente ispirata a **Microsoft Outlook Web (Fluent Design)**, ottimizzata sia per **Desktop** che per **Smartphone / WebView App**, con motore IMAP/SMTP asincrono in tempo reale (`imapflow` + `IMAP IDLE`), caching a zero latenza e persistenza opzioni utente su database **SQL (SQLite / WAL mode)**.

---

## 🚀 Caratteristiche Principali

- **🎨 Design Microsoft Outlook (Fluent UI 365)**:
  - Header superiore con barra di ricerca istantanea, switch tema (Dark/Light mode) e gestione profilo.
  - **Left App Rail** verticale a sinistra (Posta, Contatti, Calendario, Impostazioni con badge non letti).
  - **Ribbon Bar** superiore con pulsanti: Nuovo messaggio, Elimina, Archivia, Indesiderata, Segna come letto/da leggere, Contrassegna, Sposta, Sincronizza.
  - **Pannello Elenco Email** con schede **In evidenza (Focused)** e **Altra (Other)**, raggruppamento temporale (*Oggi, Ieri, Questa settimana...*), avatar con iniziali colorate e azioni rapide al passaggio del mouse.
  - **Reading Pane** con header mittente, schede allegati scaricabili con anteprima e box **Risposta Rapida (Quick Reply)** integrato.
  - **Editor di Composizione** stile Outlook con chip destinatari A/Cc/Ccn, barra di formattazione ricca (WYSIWYG) e allegati drag-and-drop.

- **📱 Ottimizzazione Smartphone & Integrazione in App (WebView / PWA)**:
  - **Bottom Navigation Bar** nativa su smartphone con badge contatore non letti e pulsante centrale FAB "+ Nuovo messaggio".
  - **Gesti Touch (Swipe Actions)**:
    - *Swipe verso destra*: Elimina o Archivia istantaneamente.
    - *Swipe verso sinistra*: Segna come già letto o da leggere.
  - Pieno supporto per **`safe-area-inset`** (notch e barre inferiori iPhone/Android).
  - PWA Manifest e meta tags pronti per essere incapsulati in **Capacitor**, **Cordova**, **React Native WebView** o **Flutter WebView**.

- **⚡ Performance & Architettura SQL**:
  - **Database SQL (better-sqlite3 con Write-Ahead Logging)**: memorizza in modo permanente tutte le opzioni degli utenti (temi, densità layout, firme HTML, regole swipe per smartphone, notifiche) e mantiene una cache locale indicizzata per ricerche e visualizzazioni a latenza 0ms.
  - **Motore IMAP IDLE**: ricezione istantanea (push in tempo reale via WebSocket) di nuove email non appena arrivano sul server di posta.
  - **Sicurezza Avanzata**: Sanitizzazione HTML per bloccare attacchi XSS e protezione privacy con **blocco preventivo immagini remote** (con pulsante "Mostra immagini"). Cifratura AES-256 delle credenziali.

---

## 🐳 Avvio Rapido con Docker su Ubuntu

Il modo più rapido per avviare la webmail su un server Ubuntu con Docker e Docker Compose:

### 1. Clonare o posizionarsi nella cartella del progetto
```bash
cd webmail.chetta
```

### 2. Avviare il container in background
```bash
docker compose up -d --build
```

Il container:
- Espone l'applicazione sulla porta `3000`.
- Salva il database SQLite e gli allegati in modo persistente nel volume `./data`.
- Riavvia automaticamente il servizio in caso di crash o riavvio del server.

### 3. Verificare lo stato del container
```bash
docker compose ps
docker compose logs -f
```

La webmail sarà accessibile su: `http://IP_DEL_TUO_SERVER:3000`

---

## 🌐 Configurazione Reverse Proxy Nginx con HTTPS (Ubuntu)

Per pubblicare la webmail sul tuo dominio con certificato SSL Let's Encrypt (es. `webmail.tuodominio.it`):

### 1. Configurazione Nginx (`/etc/nginx/sites-available/webmail`)
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    server_name webmail.tuodominio.it; # Sostituisci con il tuo dominio reale

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Endpoint WebSocket dedicato per notifiche IMAP IDLE e Chat crittografata
    location /ws {
        proxy_pass http://127.0.0.1:8004/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### 2. Abilitare il sito e installare SSL
```bash
sudo ln -s /etc/nginx/sites-available/webmail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d webmail.tuodominio.it
```

---

## 🛠️ Sviluppo Locale (Senza Docker)

Se desideri eseguire l'applicazione in locale durante lo sviluppo:

### 1. Installare le dipendenze
```bash
npm install
```

### 2. Avviare Server Backend e Client Vite contemporaneamente
```bash
npm run dev
```

- **Frontend Vite**: `http://localhost:5173`
- **Backend Fastify & API**: `http://localhost:3000`

### 3. Compilazione di produzione
```bash
npm run build
npm start
```

---

## 📱 Integrazione in un'App Mobile (WebView / Capacitor)

Per incorporare la webmail all'interno della tua applicazione Android/iOS:

1. **URL WebView**: Punta la tua WebView (o InAppBrowser) all'indirizzo `https://webmail.tuodominio.it`.
2. **Supporto Viewport**: L'applicazione ha già configurato `viewport-fit=cover`, disabilitando lo zoom involontario e gestendo i margini del notch e della status bar.
3. **Capacitor / Cordova**: Puoi creare una build nativa impacchettando i file compilati in `dist/client`:
   ```bash
   npx cap init "Webmail" "com.azienda.webmail"
   npx cap add android
   npx cap add ios
   ```
