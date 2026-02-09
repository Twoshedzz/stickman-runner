# Putting the game on the web for friends to try

You can host the **web version** of Stickman Runner so people can play it in a browser and give feedback. The app is already set up to build as a **static website** (just files, no server needed).

---

## Step 1: Build the web version (do this first)

In the project folder, in the terminal (or in Cursor’s terminal), run:

```bash
npm run build:web
```

This creates a **`dist`** folder with the built site. That folder is what you’ll upload or deploy.

---

## Option A: GitHub Pages (you’ve used this before)

**Good if:** Your repo is on GitHub and you’re happy pushing a branch and turning on Pages.

1. **Build** (see Step 1 above).
2. **Push the `dist` folder to a branch GitHub Pages can use:**
   - Either push the contents of `dist` to a branch named **`gh-pages`**.
   - Or use a **GitHub Action** that runs `npm run build:web` and deploys the `dist` folder to Pages whenever you push (so you don’t commit `dist` by hand).

**URL you’ll get:**

- If the repo is `username/stickman-runner`:  
  `https://username.github.io/stickman-runner/`
- If you use a **user/org site** repo (e.g. `username.github.io`):  
  `https://username.github.io/`

**One gotcha:** If the game is at `.../stickman-runner/` (with a subpath), the app may need to know that path so images and scripts load. If something doesn’t load on GitHub Pages, say so and we can add a base path for that URL.

---

## Option B: Vercel or Netlify (very little setup)

**Good if:** You want “push to GitHub → site updates” with minimal config.

Both have a **free tier** and work well for static sites.

**Rough steps (same idea for both):**

1. Create an account at [vercel.com](https://vercel.com) or [netlify.com](https://netlify.com).
2. “Import” or “Add new project” and connect your **GitHub** repo (`stickman-runner`).
3. **Vercel:** This repo has a `vercel.json` that already sets the build command, output folder (`dist`), and SPA routing—no need to change dashboard settings.
4. **Netlify:** Set build command `npm run build:web` and publish directory `dist`.
5. Deploy. They’ll give you a URL like `stickman-runner.vercel.app` or `something.netlify.app`.

After that, each time you push to GitHub, they rebuild and update the site. No need to commit the `dist` folder.

---

## Heroku

You mentioned using Heroku at work. For this project:

- The **web build is just static files** (HTML, JS, images). Heroku is aimed at apps that need a **server** (e.g. Node, Ruby, Python). So it’s more than you need and not the best fit.
- Heroku’s **free tier is gone**, so it would be a paid option.

For “share a link with friends,” **GitHub Pages, Vercel, or Netlify** are simpler and free.

---

## Quick comparison

| Option        | You do once                         | Updates                         | Best for you if…              |
|---------------|-------------------------------------|----------------------------------|-------------------------------|
| **GitHub Pages** | Build, push `dist` (or set up Action) | Push again / push code           | You like staying in GitHub    |
| **Vercel**      | Connect repo, set build + `dist`     | Push to GitHub → auto deploy     | You want the least setup      |
| **Netlify**     | Same as Vercel                      | Same                             | You prefer Netlify’s UI       |

---

## After you choose

1. Run **`npm run build:web`**.
2. Deploy the **`dist`** folder using one of the options above.
3. Share the URL with friends and ask them to try it on a **recent browser** (and ideally on a laptop/desktop; the web build can be heavy on some phones).

If you tell me which you prefer (GitHub Pages, Vercel, or Netlify), I can give you step-by-step clicks and exact commands for that option next (and, if needed, how to set the base path for GitHub Pages).
