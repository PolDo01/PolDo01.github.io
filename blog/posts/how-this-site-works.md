---
title: How this site works
date: 2026-10-01
excerpt: Static HTML, a tiny Bun build step, and Markdown files — here's the whole pipeline behind this portfolio.
---

People often expect a portfolio site to need a framework, a headless CMS, or at least a
database. This one runs on three ideas: static files, a small build script, and GitHub
Pages.

## The stack

| Piece | Job |
| --- | --- |
| HTML + CSS + vanilla JS | Everything visitors see |
| Bun | Runs the local dev server and the blog build |
| Markdown | Source of truth for posts |
| GitHub Pages | Hosting, straight from `main` |

## How a post gets published

1. Drop a Markdown file in `blog/posts/` with a small front matter block
2. Run `bun run build` locally
3. Commit and push — Pages takes care of the rest

The build script renders each post into a styled page, rebuilds the blog index, and
refreshes the "Latest post" card on the home page.

## Keeping it small

The entire toolchain is one dev dependency (`marked`, for Markdown rendering). Output is
committed, so the deployed site is nothing but static files — fast to load, easy to
cache, and impossible to break at runtime.

```bash
bun install
bun run build
bun run dev   # preview at http://localhost:4173
```

That's it. Boring infrastructure is a feature.
