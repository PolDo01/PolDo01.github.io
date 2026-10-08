# poldo01.github.io

Personal portfolio site for **Leopoldo Dollete III** — Data Engineer | Data Analyst.
Plain HTML, CSS, and vanilla JS. Projects and blog posts are driven by small data files
and rendered by a Bun build script. Hosted with GitHub Pages.

**Live:** https://poldo01.github.io

## Structure

```
index.html            Home page (hero, profile, latest post, projects, contact)
404.html              Custom not-found page
data/
  projects.json       Projects — one JSON object per project
blog/
  index.html          Blog index (post list is generated between markers)
  posts/*.md          Blog posts (Markdown + front matter)
  <slug>/index.html   Generated post pages (do not edit by hand)
scripts/
  build.mjs           Renders blog posts and project cards, updates home page
  dev.mjs             Local static server
assets/
  css/style.css       Design system (dark theme, pixel mono + Fira Sans)
  js/main.js          Menu, copy-to-clipboard, scrollspy
  fonts/              Open-source mono font (OFL — see LICENSE-font.txt)
  img/                Favicon and project thumbnails
```

## Adding or editing projects

Open `data/projects.json` — one object per project:

```json
{
  "name": "My Project",
  "tagline": "One-line summary",
  "description": "Three to four sentences: what it is, who it's for, and what's interesting about it.",
  "stack": ["sql", "snowflake", "dbt"],
  "type": "Open source",
  "image": "/assets/img/project-1.svg",
  "site": "https://example.com",
  "repo": "https://github.com/PolDo01/example",
  "sourceNote": null
}
```

- `site` / `repo` are optional (set to `null` to hide a button)
- `sourceNote` adds a "Source" row, e.g. `"Closed. Details available on request."`
- `image` is optional — add a screenshot to `assets/img/` and reference it here

Then rebuild:

```bash
bun run build
```

Cards, the sticky index, and the "N records" count regenerate automatically. Nothing
else needs to change by hand.

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

2. Rebuild: `bun run build`

   This generates `blog/<slug>/index.html`, refreshes the blog list, and updates the
   "Latest post" card on the home page.

3. To remove a post, delete its Markdown file and its generated `blog/<slug>/` folder,
   then rebuild.

## Editing personal info

Search `index.html` for the hero (name, role, bio), the `Profile` pane, and the
`Contact` footer to update details. The email `leogdolleteiii@gmail.com` appears in two
places (profile row and footer).

## Local preview

```bash
bun run dev
```

Serves the site at http://localhost:4173 (rebuild before previewing new posts/projects).

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

- **Site Mono** (self-hosted pixel mono) — SIL OFL license included at
  `assets/fonts/LICENSE-font.txt`.
- **Fira Sans** — loaded from Google Fonts.