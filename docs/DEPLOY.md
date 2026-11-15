# Putting the portal on a real server: checklist

1. **Settings (.env on the server, never in the zip / git):** delete `ADMIN_PASSWORD`, `ADMIN_PASSWORD_RESET` and `DEV_STAFF_PASSWORD` after the admin has logged in once and chosen their own password. Set `NODE_ENV=production`, `TRUST_PROXY=1` (behind nginx). The server prints a warning at start for each unsafe setting (`[setup warn] ...`).
2. **HTTPS is a must** (free certificate with Let's Encrypt). Without it logins travel in the clear and the browser will not allow **voice recording** in the chat.
3. **nginx:** `client_max_body_size 12m;` (uploads, voice messages), `proxy_set_header Host $host; X-Forwarded-For`, and pass `/api` + everything else to the Node port (default 3000).
4. **Keep it running:** run `npm run build` once, then `npm start` under `systemd` or `pm2` so it restarts after a crash or reboot.
5. **First passwords:** `data/initial-credentials.txt` holds the first staff passwords. Hand them out and delete the file.
6. **Backup every night:** `npm run backup` (cron, e.g. `30 2 * * * cd /srv/portal && npm run backup`). It saves the database, the Aadhaar key (`.secret`), uploaded files + voice messages and photos in `backups/backup-<date>-<time>/` and keeps the newest 14 (`BACKUP_KEEP`). **Copy that folder to another disk or computer** (a backup on the same disk is lost with it). It contains the key that decrypts Aadhaar numbers: keep it private.
7. **Restore:** stop the server, copy `portal.db`, `.secret`, `uploads/`, `photos/` from the backup into `data/`, start the server.
8. **Authenticator app:** admin and teachers must set one at first login (`MFA_REQUIRED_ROLES`).
9. **SMS password reset** stays off until DLT registration + a provider exist (docs/STEP3.md).
10. **Privacy:** chats and files are stored unencrypted in `data/`; limit who can log in to the server and decide how long old messages are kept.
