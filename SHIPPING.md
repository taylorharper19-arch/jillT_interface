# Shipping jillTbeatz to Another User (Including Mobile)

The app is **one HTML file** (`jillTbeatz.html`) plus an optional `manifest.json` for “Add to Home Screen” on phones. No server code or build step.

---

## How the other user can use it on a mobile phone

**Best option: give them a link.**  
Put the app on a host (see below) and send the URL. They open it in **Safari (iOS)** or **Chrome (Android)**.  
They can then **Add to Home Screen** so it opens like an app (icon, full screen, no browser UI).

**Steps for the mobile user:**
1. Open the link you sent in their phone’s browser.
2. (Optional) **Add to Home Screen**  
   - **iOS:** Share → “Add to Home Screen”  
   - **Android:** Menu (⋮) → “Add to Home screen” or “Install app”
3. Open “jillTbeatz” from the home screen to use it like an app.

**Note:** The first time they tap a pad or button, the browser may ask to allow sound; they must allow it.

---

## How to package and ship the application

### What to ship

- **Minimum:** `jillTbeatz.html`
- **Recommended (for Add to Home Screen on mobile):**  
  - `jillTbeatz.html`  
  - `manifest.json`  
  (Keep both in the same folder.)

### Option 1: Host online (recommended for mobile)

Put the folder on a free static host so the other user gets a **link** that works on mobile.

**GitHub Pages**
1. Create a repo (e.g. `jillTbeatz`).
2. Upload `jillTbeatz.html` (and `manifest.json` if you use it) to the repo.
3. Turn on GitHub Pages: **Settings → Pages → Source:** “Deploy from branch” → branch `main` (or `master`) → root or `/docs`.
4. Your app URL will be:  
   `https://<username>.github.io/<repo>/jillTbeatz.html`  
   (If the repo name is the username, it’s often `https://<username>.github.io/jillTbeatz.html`.)
5. Send that URL to the other user; they open it on their phone.

**Netlify / Vercel / Cloudflare Pages**
1. Sign up and create a new site/project.
2. Drag and drop the folder that contains `jillTbeatz.html` (and `manifest.json`) or connect the repo.
3. After deploy, you get a URL like `https://your-site.netlify.app/jillTbeatz.html`.
4. Send that URL; they open it on mobile and can Add to Home Screen if you included `manifest.json`.

### Option 2: Send the file

- **Email / messaging:** Attach `jillTbeatz.html` (and optionally `manifest.json` in a zip with the same folder structure).
- **Limitation:** On mobile, opening a **downloaded** HTML file in the browser is often awkward or restricted. Sound may not work. So for **phones**, prefer **Option 1 (hosted link)**.
- **Desktop:** They can save the file and open `jillTbeatz.html` in Chrome/Firefox/Edge.

### Option 3: Zip for download

1. Put `jillTbeatz.html` and `manifest.json` in a folder (e.g. `jillTbeatz`).
2. Zip the folder.
3. Share the zip (email, Drive, Dropbox, etc.).
4. They unzip and either:
   - **Desktop:** Open `jillTbeatz.html` in a browser, or  
   - **Mobile:** Upload the same folder to a host (e.g. GitHub Pages) and use the link, or open the file from a file manager if their browser supports it (less reliable).

---

## Quick reference

| Goal                         | Do this |
|-----------------------------|--------|
| Use on mobile (easiest)     | Host the app (e.g. GitHub Pages) and send the link. They open in browser and can Add to Home Screen. |
| “Install” on phone         | Use the hosted link and Add to Home Screen (works best with `manifest.json` in the same folder). |
| Share a programmed setup    | In the app: **Save project** or **Share to device**, then send the `.json` file. Other user opens the same app (same link) and uses **Load project** with that file. |
