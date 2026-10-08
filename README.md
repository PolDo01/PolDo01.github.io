# poldo01.github.io

Personal portfolio site — plain HTML, CSS, and vanilla JS. Blog posts are written in
Markdown and rendered by a small Bun build script. Hosted with GitHub Pages.

**Live:** https://poldo01.github.io

## Structure

```
index.html            Home page (hero, profile, latest post, projects, contact)
404.html              Custom not-found page
blog/
  index.html          Blog index (post list is generated between markers)
  posts/*.md          Blog posts (Markdown + front matter)
  <slug>/index.html   Generated post pages (do not edit by hand)
scripts/
  build-blog.mjs      Renders posts, blog index, and the home page latest-post card
  dev.mjs             Local static server
assets/
  css/style.css       Design system (dark theme, Departure Mono + Fira Sans)
  js/main.js          Menu, copy-to-clipboard, scrollspy
  fonts/              Departure Mono (SIL OFL — see LICENSE-departure-mono.txt)
  img/                Favicon and placeholder project thumbnails
```

## Editing content

- **Home page text and projects:** edit `index.html` directly. Project thumbnails live in
  `assets/img/` (SVG placeholders — swap in screenshots when ready).
- **Profile details:** the `Profile` section of `index.html` and the contact links in the
  footer (search for `hello@example.com` and `PolDo01` to replace the placeholders).

## Writing a blog post

1. Create a Markdown file in `blog/posts/`, e.g. `my-post.md`:

   ```markdown
   ---
   title: My post title
   date: 2026-10-08
   excerpt: One-sentence summary used on the blog index and home page card.
   ---

   Post content in Markdown...
   ```

2. Rebuild:

   ```bash
   bun run build
   ```

   This generates `blog/<slug>/index.html`, refreshes the blog list, and updates the
   "Latest post" card on the home page.

3. To remove a post, delete its Markdown file and its generated `blog/<slug>/` folder,
   then rebuild.

## Local preview

```bash
bun run dev
```

Serves the site at http://localhost:4173 (rebuild before previewing new posts).

## Deploying

The site deploys automatically from the `main` branch:

```bash
git add -A
git commit -m "Update site"
git push
```

GitHub Pages serves the repository root. Generated HTML is committed, so the deployed
site is fully static.

## Fonts

- **Departure Mono** by Helena Zhang — self-hosted, SIL OFL license included at
  `assets/fonts/LICENSE-departure-mono.txt`.
- **Fira Sans** — loaded from Google Fonts.
