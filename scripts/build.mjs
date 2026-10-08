import { marked } from "marked";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const postsDir = path.join(root, "blog", "posts");
const projectsFile = path.join(root, "data", "projects.json");
const homepagePath = path.join(root, "index.html");
const blogIndexPath = path.join(root, "blog", "index.html");

const AUTHOR = "Leopoldo Dollete III";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: raw.trim() };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (kv) data[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, body: raw.slice(match[0].length).trim() };
}

const readingMinutes = (body) =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function pageHead({ title, description }) {
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#0b111b">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/DepartureMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">`;
}

function pageHeader(active) {
  return `<header class="site-header">
    <div class="site-header__inner">
      <a class="site-brand" href="/" aria-label="poldo01.github.io — home">
        <svg class="site-brand__mark" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="1" y="1" width="18" height="18" rx="4" fill="#f4a35c"></rect>
          <path d="M10 4.25 15.75 10 10 15.75 4.25 10Z" fill="#0b111b"></path>
        </svg>
        <span class="site-brand__word">poldo01</span>
        <span class="site-brand__tag">.github.io</span>
      </a>

      <button class="site-header__menu" type="button" aria-expanded="false" aria-controls="site-nav">
        <span class="site-header__menuIcon" aria-hidden="true"></span>
        Menu
      </button>

      <nav id="site-nav" class="site-nav" aria-label="Primary">
        <ul>
          <li><a href="/"${active === "projects" ? ' aria-current="page"' : ""}>Projects</a></li>
          <li><a href="/blog/"${active === "blog" ? ' aria-current="page"' : ""}>Blog</a></li>
          <li><a href="https://github.com/PolDo01" target="_blank" rel="external noreferrer">GitHub <span class="site-nav__ext" aria-hidden="true">&#8599;</span></a></li>
          <li><a class="site-nav__cta" href="/#contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>`;
}

function pageCopyright() {
  return `<footer class="site-copyright" aria-label="Copyright">
    <p>
      <span>&copy; 2026 ${AUTHOR}</span>
      <span aria-hidden="true">|</span>
      <a href="/">poldo01.github.io</a>
    </p>
  </footer>

  <div class="toast-region" role="status" aria-live="polite"></div>
  <script src="/assets/js/main.js" defer></script>`;
}

function postPage(post) {
  return `<!doctype html>
<html lang="en">
<head>
  ${pageHead({ title: `${post.title} — ${AUTHOR}`, description: post.excerpt })}
</head>
<body>
  <a class="skip" href="#post">Skip to content</a>
  ${pageHeader("blog")}

  <main class="page shell" id="top">
    <p class="post__back"><a href="/blog/">&larr; All posts</a></p>

    <article class="post pane" id="post" aria-labelledby="post-title">
      <header class="pane__bar post__bar">
        <span class="legend">Post</span>
        <span class="post__readouts">
          <time class="lcd" datetime="${post.date}">${post.date}</time>
          <span class="lcd">${post.minutes} min read</span>
        </span>
      </header>
      <div class="post__body">
        <h1 class="post__title" id="post-title">${esc(post.title)}</h1>
        <p class="post__excerpt">${esc(post.excerpt)}</p>
        <div class="prose">
${post.html}
        </div>
      </div>
    </article>

    <div class="post__foot">
      <a class="btn" href="/blog/">&larr; Back to blog</a>
      <a class="btn btn--primary" href="/#contact">Get in touch</a>
    </div>
  </main>

  ${pageCopyright()}
</body>
</html>
`;
}

function bulletin(post) {
  return `<!-- latest-post:start -->
        <a class="bulletin pane" href="/blog/${post.slug}/" aria-label="Read latest blog post: ${esc(post.title)}">
          <span class="bulletin__bar pane__bar">
            <span class="legend">Latest post</span>
            <span class="bulletin__readouts">
              <time class="lcd" datetime="${post.date}">${post.date}</time>
              <span class="lcd">${post.minutes} min read</span>
            </span>
          </span>
          <span class="bulletin__body">
            <span class="bulletin__title">${esc(post.title)}</span>
            <span class="bulletin__room"><span class="bulletin__excerpt">${esc(post.excerpt)}</span></span>
            <span class="bulletin__open key" aria-hidden="true">Read post</span>
          </span>
        </a>
        <!-- latest-post:end -->`;
}

function postRow(post) {
  return `            <li class="post-list__row">
              <a class="post-list__link" href="/blog/${post.slug}/">
                <time class="lcd" datetime="${post.date}">${post.date}</time>
                <span class="post-list__body">
                  <span class="post-list__title">${esc(post.title)}</span>
                  <span class="post-list__excerpt">${esc(post.excerpt)}</span>
                </span>
                <span class="lcd" aria-hidden="true">${post.minutes} min</span>
              </a>
            </li>`;
}

async function loadPosts() {
  const files = (await readdir(postsDir)).filter((name) => name.endsWith(".md"));
  const posts = [];

  for (const file of files) {
    const raw = await readFile(path.join(postsDir, file), "utf8");
    const { data, body } = parseFrontMatter(raw);
    const slug = file.replace(/\.md$/, "");

    posts.push({
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString().slice(0, 10),
      excerpt: data.excerpt || "",
      minutes: readingMinutes(body),
      html: marked.parse(body),
    });
  }

  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return posts;
}

async function loadProjects() {
  const raw = await readFile(projectsFile, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("data/projects.json must contain an array of projects");
  return data;
}

function indexRow(project) {
  const id = slugify(project.name);
  return `<a class="index__row" href="#${id}">
                <span class="index__name">${esc(project.name)}</span>
                <span class="index__sub">${esc(project.tagline)}</span>
              </a>`;
}

function recordCard(project) {
  const id = slugify(project.name);
  const links = [];
  if (project.site) links.push({ href: project.site, label: "Visit Site", primary: true });
  if (project.repo) links.push({ href: project.repo, label: "GitHub", primary: false });

  const title = links.length
    ? `<a href="${esc(links[0].href)}" target="_blank" rel="external noreferrer">${esc(project.name)}</a>`
    : esc(project.name);

  let media = "";
  if (project.image) {
    const img = `<img class="media__img" src="${esc(project.image)}" alt="${esc(project.name)} thumbnail" loading="lazy">`;
    media = links.length
      ? `<div class="media"><a class="media__link" href="${esc(links[0].href)}" target="_blank" rel="external noreferrer" aria-label="Open ${esc(project.name)}">${img}</a></div>`
      : `<div class="media">${img}</div>`;
  }

  const props = [`<div><dt>Stack</dt><dd class="record__stack">${esc((project.stack || []).join(", "))}</dd></div>`];
  if (project.sourceNote) props.push(`<div><dt>Source</dt><dd>${esc(project.sourceNote)}</dd></div>`);

  const linksHtml = links.length
    ? `<div class="record__links">${links
        .map(
          (link) =>
            `<a class="btn btn--small${link.primary ? " btn--primary" : ""}" href="${esc(link.href)}" target="_blank" rel="external noreferrer">${link.label} <span aria-hidden="true">&#8599;</span></a>`,
        )
        .join("")}</div>`
    : "";

  return `<article id="${id}" class="record pane" aria-labelledby="${id}-title">
              <header class="record__bar pane__bar">
                <h3 class="record__title" id="${id}-title">${title}</h3>
                <span class="record__type legend">${esc(project.type || "")}</span>
              </header>
              <div class="record__body">
                ${media}
                <div class="record__text">
                  <p class="record__subtitle">${esc(project.tagline)}</p>
                  <p class="record__desc">${esc(project.description)}</p>
                  <dl class="record__props">${props.join("")}</dl>
                  ${linksHtml}
                </div>
              </div>
            </article>`;
}

function projectsBlock(projects) {
  return `<!-- projects:start -->
          <nav class="index pane" aria-label="Project index">
            <p class="pane__bar"><span class="legend">Index</span> <span class="index__count">${projects.length}</span></p>
            <ol class="index__list">
              ${projects.map((project) => `<li>${indexRow(project)}</li>`).join("")}
            </ol>
          </nav>
          <div class="records">
            ${projects.map(recordCard).join("")}
          </div>
          <!-- projects:end -->`;
}

function replaceBlock(source, startMarker, endMarker, replacement, label) {
  const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  if (!pattern.test(source)) {
    throw new Error(`Marker ${startMarker} / ${endMarker} not found in ${label}`);
  }
  return source.replace(pattern, replacement);
}

async function main() {
  const [posts, projects] = await Promise.all([loadPosts(), loadProjects()]);

  /* --- blog posts --- */
  for (const post of posts) {
    const outDir = path.join(root, "blog", post.slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), postPage(post), "utf8");
  }

  let blogIndex = await readFile(blogIndexPath, "utf8");
  const postListBlock = `<!-- post-list:start -->\n${posts.map(postRow).join("\n")}\n<!-- post-list:end -->`;
  blogIndex = replaceBlock(blogIndex, "<!-- post-list:start -->", "<!-- post-list:end -->", postListBlock, "blog/index.html");
  blogIndex = blogIndex.replace(
    /(<span class="index__count" data-post-count>)\s*\d*\s*(<\/span>)/,
    `$1${posts.length}$2`,
  );
  await writeFile(blogIndexPath, blogIndex, "utf8");

  /* --- home page --- */
  let home = await readFile(homepagePath, "utf8");
  home = replaceBlock(home, "<!-- projects:start -->", "<!-- projects:end -->", projectsBlock(projects), "index.html");
  home = home.replace(/(<span data-project-count>)\s*\d*\s*(<\/span>)/, `$1${projects.length}$2`);
  if (posts.length) {
    home = replaceBlock(home, "<!-- latest-post:start -->", "<!-- latest-post:end -->", bulletin(posts[0]), "index.html");
  }
  await writeFile(homepagePath, home, "utf8");

  console.log(`Built ${posts.length} post(s) and ${projects.length} project(s):`);
  for (const post of posts) console.log(`  /blog/${post.slug}/  (${post.date}, ${post.minutes} min)`);
  for (const project of projects) console.log(`  #${slugify(project.name)}  (${project.type || "untitled"})`);
  console.log("Updated blog/index.html and index.html");
}

main().catch((err) => {
  console.error("Build failed:", err.message);
  process.exit(1);
});