# Guida alla Migrazione su Ubuntu Server con Docker e Nginx Reverse Proxy

Questa guida è strutturata specificamente per il tuo server Ubuntu dove **sono già attive altre applicazioni** e **Nginx è già in esecuzione come reverse proxy**.

---

## 🏗️ Architettura del Setup

- **Docker Container (`mannatic-app`)**:
  - Esegue Next.js in modalità standalone ultra-leggera (~150MB).
  - È in ascolto **soltanto su `127.0.0.1` (localhost)** sulla porta configurata (`8001`). In questo modo l'applicazione non è esposta direttamente a Internet e non entra in conflitto con altre app su porte diverse.
- **Nginx (esistente sul server)**:
  - Riceve il traffico pubblico sul dominio prescelto (es. `app.tuodominio.it`) sulle porte standard 80/443.
  - Inoltra le richieste al container Docker su `http://127.0.0.1:8001`.
  - Gestisce il certificato SSL HTTPS tramite Let's Encrypt (Certbot).

---

## 📋 Passaggi di Installazione

### 1. Copia i file sul server Ubuntu

Puoi clonare il repository Git oppure trasferire la cartella del progetto:

```bash
# Esempio posizionandoti in /var/www o nella tua home directory:
cd /var/www
git clone <URL_TUO_REPOSITORY> mannatic
cd mannatic
```

*(Se trasferisci manualmente tramite `rsync` o `scp`, puoi escludere `node_modules` e `.next` che verranno compilati da Docker).*

---

### 2. Configura le Variabili d'Ambiente (`.env`)

Copia il file di esempio `.env.production.example` in `.env`:

```bash
cp .env.production.example .env
nano .env
```

Configura i parametri principali:
- **`APP_PORT`**: impostata su `8001`.
- **`NEXT_PUBLIC_APP_URL`**: l'URL pubblico della tua applicazione con HTTPS (es. `https://app.tuodominio.it`).
- Le chiavi di **Supabase**, **Firebase**, **Google Maps**, **WhatsApp** e **VAPID**.

Salva con `Ctrl + O` e chiudi con `Ctrl + X`.

---

### 3. Evita blocchi della VPS: Attiva un file di SWAP (Fondamentale!)

Se il tuo server VPS ha **1GB o 2GB di RAM**, la compilazione Next.js o i carichi di lavoro possono saturare completamente la memoria fisica, portando il kernel Linux al **blocco completo del sistema (OOM hang)**.

Per evitare qualsiasi blocco in fase di build e deploy, verifica e attiva uno Swap file da 2GB (se non già presente):

```bash
# Verifica se hai già swap attivo
free -h

# Se "Swap" indica 0B, crea 2GB di swap con questi comandi:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendi lo swap persistente al riavvio del server:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### 4. Avvia l'Applicazione con Docker Compose

Assicurati che Docker e il plugin compose siano installati sul server, poi compila e avvia in background:

```bash
docker compose up -d --build
```

Verifica lo stato del container:

```bash
# Controlla che il container sia in stato "Up (healthy)" o "Up"
docker compose ps

# Visualizza i log in tempo reale per verificare l'avvio
docker compose logs -f
```

Per testare che risponda localmente sul server:
```bash
curl -I http://127.0.0.1:8001
```

---

### 5. Configura Nginx come Reverse Proxy

Abbiamo predisposto il file di configurazione pronto per Nginx in `deploy/nginx/mannatic.conf`.

1. Copia il file nella cartella di configurazione di Nginx:
   ```bash
   sudo cp deploy/nginx/mannatic.conf /etc/nginx/sites-available/mannatic.conf
   ```

2. Modifica il file per inserire il tuo dominio effettivo e la porta (se diversa da 8001):
   ```bash
   sudo nano /etc/nginx/sites-available/mannatic.conf
   ```
   *Modifica la riga `server_name app.tuodominio.it;` con il tuo dominio reale.*

3. Abilita il sito creando il link simbolico in `sites-enabled`:
   ```bash
   sudo ln -s /etc/nginx/sites-available/mannatic.conf /etc/nginx/sites-enabled/
   ```

4. Testa la configurazione di Nginx (senza interrompere i siti esistenti):
   ```bash
   sudo nginx -t
   ```
   *(Se restituisce `syntax is ok` e `test is successful`, procedi al reload).*

5. Ricarica Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

---

### 6. Attiva il Certificato SSL Gratuito (HTTPS) con Certbot

Poiché usi già Nginx sul server, puoi generare o estendere il certificato SSL Let's Encrypt con un solo comando:

```bash
sudo certbot --nginx -d app.tuodominio.it
```

Certbot configurerà automaticamente i certificati SSL e il reindirizzamento da HTTP a HTTPS all'interno del file `/etc/nginx/sites-available/mannatic.conf`.

A questo punto la tua app sarà online e protetta da HTTPS! 🚀

---

## 🔄 Manutenzione e Aggiornamenti Futuri

Quando apporti modifiche al codice e fai il push su Git, per aggiornare l'app sul server Ubuntu ti basterà eseguire:

```bash
cd /var/www/mannatic

# Scarica le ultime modifiche
git pull origin main

# Ricompila e riavvia il container senza downtime percepibile
docker compose up -d --build

# Pulisci eventuali immagini vecchie inutilizzate
docker image prune -f
```

### Comandi Utili per la Gestione

| Azione | Comando |
| :--- | :--- |
| **Vedere i log in diretta** | `docker compose logs -f` |
| **Riavviare l'applicazione** | `docker compose restart` |
| **Fermare l'applicazione** | `docker compose down` |
| **Verificare utilizzo CPU/RAM** | `docker stats mannatic-app` |
