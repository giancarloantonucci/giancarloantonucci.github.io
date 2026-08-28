const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const matter = require('gray-matter');

// markdown-it-attrs is deliberately not used: its {...} syntax collides with
// LaTeX braces on the maths pages. typographer is off for the same reason —
// it rewrites quotes and dashes inside inline maths.
const markdownIt = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: false
});

const projectDirectory = __dirname;
const sourceDirectory = path.join(projectDirectory, 'src');
const buildDirectory = path.join(projectDirectory, 'build');
const templatesDirectory = path.join(sourceDirectory, 'templates');
const pagesDirectory = path.join(sourceDirectory, 'pages');

const site = yaml.load(
  fs.readFileSync(path.join(sourceDirectory, 'data', 'site.yml'), 'utf-8')
);
const langConfig = yaml.load(
  fs.readFileSync(path.join(sourceDirectory, 'data', 'languages.yml'), 'utf-8')
);
const strings = yaml.load(
  fs.readFileSync(path.join(sourceDirectory, 'data', 'ui.yml'), 'utf-8')
);

const languages = langConfig.map(l => l.code);
const defaultLanguage = site.defaultLanguage;
const langMeta = Object.fromEntries(langConfig.map(l => [l.code, l]));

// Used for sitemap.xml and robots.txt. Set SITE_URL in CI, or edit this.
// Must be the full public URL of the site root, with a trailing slash.
const siteUrl = (process.env.SITE_URL || site.url).replace(/\/?$/, '/');

const navOrder = site.nav;


// ---------------------------------------------------------------------------

// --- Pages ------------------------------------------------------------------
// Layout: src/pages/<slug>/<language>.md, with optional shared front matter in
// src/pages/<slug>/_page.yml. Every translation of a page sits in one folder,
// so gaps are visible and page-level settings can't drift between languages.

function pageSlugs() {
  if (!fs.existsSync(pagesDirectory)) return [];
  return fs
    .readdirSync(pagesDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function sharedFrontMatter(slug) {
  const file = path.join(pagesDirectory, slug, '_page.yml');
  return fs.existsSync(file)
    ? yaml.load(fs.readFileSync(file, 'utf-8')) || {}
    : {};
}

function loadPage(slug, language) {
  const file = path.join(pagesDirectory, slug, `${language}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, 'utf-8'));
  // The language file wins over the shared defaults.
  return { data: { ...sharedFrontMatter(slug), ...data }, content };
}

function sourcePageExists(language, slug) {
  // The CV has no markdown — it is generated from src/data/cv.yml, and exists
  // in every language as long as that file does.
  if (slug === 'cv') return Boolean(cv);
  return fs.existsSync(path.join(pagesDirectory, slug, `${language}.md`));
}

// draft: true in _page.yml or in the language file keeps a page out of the nav,
// the language switcher, the sitemap and the hreflang set. It still builds, so
// you can open it locally, and it carries a noindex tag in case it ships.
function isDraft(language, slug) {
  if (slug === 'cv') return false;
  const page = loadPage(slug, language);
  return Boolean(page && page.data.draft);
}

function isPublished(language, slug) {
  return sourcePageExists(language, slug) && !isDraft(language, slug);
}

function buildNav(language, currentSlug) {
  return navOrder
    .filter(slug => isPublished(language, slug))
    .map(slug => {
      const isCurrent = slug === currentSlug;
      const classes = isCurrent ? ' class="nav-link is-current"' : ' class="nav-link"';
      const aria = isCurrent ? ' aria-current="page"' : '';
      return `<a${classes}${aria} href="${slug}.html">${strings[language].nav[slug]}</a>`;
    })
    .join('\n        ');
}

// A language option is only shown when that page really exists in that language.
function buildLanguageOptions(currentLanguage, slug) {
  return languages
    .filter(language => isPublished(language, slug))
    .map(language => {
      const meta = langMeta[language];
      const isCurrent = language === currentLanguage;
      const classes = isCurrent ? 'lang-option is-current' : 'lang-option';
      const aria = isCurrent ? ' aria-current="true"' : '';
      // The flag is decorative — the name carries the meaning, so alt is empty
      // and a language without a flag simply shows its name.
      const flag = meta.flag
        ? `<img src="../assets/images/flags/${meta.flag}" alt="" class="language-flag"
            width="28" height="21" loading="lazy" decoding="async" aria-hidden="true">`
        : '<span class="language-flag is-empty" aria-hidden="true"></span>';
      // dir goes on the name, not the row. On the row it would reverse the
      // flex order, throwing the Arabic flag to the opposite side of the
      // column. On the span it only does what it should: lay the Arabic
      // glyphs out right-to-left within their own box.
      const dir = meta.dir === 'rtl' ? ' dir="rtl"' : '';
      return `<a class="${classes}"${aria} lang="${meta.tag}" hreflang="${meta.tag}"
          href="../${language}/${slug}.html">${flag}<span class="lang-name"${dir}>${meta.name}</span></a>`;
    })
    .join('\n        ');
}

// --- CV ---------------------------------------------------------------------

const cvPath = path.join(sourceDirectory, 'data', 'cv.yml');
const cv = fs.existsSync(cvPath)
  ? yaml.load(fs.readFileSync(cvPath, 'utf-8'))
  : null;

function escapeHtml(value) {
  return String(value).replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;');
}

function formatDates(entry, language) {
  if (!entry.from) return '';
  const end = entry.to === 'present' ? strings[language].present : entry.to;
  return end && end !== entry.from ? `${entry.from}–${end}` : entry.from;
}

function renderCvEntry(entry, language) {
  const t = strings[language];
  const parts = [];

  let heading = `<span class="cv-role">${escapeHtml(entry.title)}</span>`;
  if (entry.org) heading += ` <span class="cv-org">${escapeHtml(entry.org)}</span>`;
  if (entry.badge === 'invited') heading += ` <span class="cv-badge">${t.invited}</span>`;
  parts.push(`<p class="cv-heading">${heading}</p>`);

  const meta = [];
  if (entry.status === 'in_preparation') meta.push(t.inPreparation);
  if (entry.doi) {
    meta.push(`DOI: <a href="https://doi.org/${entry.doi}">${escapeHtml(entry.doi)}</a>`);
  }
  if (entry.url) {
    meta.push(`<a href="${entry.url}">${escapeHtml(entry.url_text || entry.url)}</a>`);
  }
  (entry.notes || []).forEach(note => meta.push(note));

  if (meta.length) {
    parts.push(`<ul class="cv-notes">${meta.map(m => `<li>${m}</li>`).join('')}</ul>`);
  }

  const dates = formatDates(entry, language);
  return `<div class="cv-entry">
    <div class="cv-dates">${dates}</div>
    <div class="cv-body">${parts.join('\n    ')}</div>
  </div>`;
}

function renderCv(language) {
  if (!cv) return '';
  const t = strings[language];
  const blocks = [];

  if (cv.profile && cv.profile[language]) {
    blocks.push(`<p class="cv-profile">${escapeHtml(cv.profile[language])}</p>`);
  }

  if (cv.contact && cv.contact.length) {
    const rows = cv.contact
      .map(c => `<div class="cv-entry">
    <div class="cv-dates">${escapeHtml(c.label)}</div>
    <div class="cv-body"><a href="${c.url}">${escapeHtml(c.text)}</a></div>
  </div>`)
      .join('\n');
    blocks.push(`<section class="cv-section">
  <h2>${t.cvSections.contact}</h2>
  ${rows}
</section>`);
  }

  (cv.sections || []).forEach(section => {
    const heading = t.cvSections[section.id] || section.id;
    const entries = (section.entries || [])
      .map(entry => renderCvEntry(entry, language))
      .join('\n');
    blocks.push(`<section class="cv-section">
  <h2>${heading}</h2>
  ${entries}
</section>`);
  });

  blocks.push(`<p class="cv-references">${t.referencesNote}</p>`);
  return blocks.join('\n\n');
}

// ----------------------------------------------------------------------------

// --- Optional per-page assets -----------------------------------------------
// Only pages that declare these in their front matter pay for the download.

// Pin this to a tag once the repo has one — an unpinned default-branch URL
// will change silently under you.
const PHONETICS_RENDERER =
  'https://cdn.jsdelivr.net/gh/giancarloantonucci/sophonetica/render.js';

// Macros are written with single backslashes here and serialised with
// JSON.stringify, so the escaping is done by the language rather than by hand.
const MATHJAX_MACROS = {
  RR: '\\mathbb{R}',
  grad: '\\nabla',
  dv: ['\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}', 2],
  pdv: ['\\frac{\\partial#1}{\\partial#2}', 2],
  pdvn: ['\\frac{\\partial^{#3}#1}{\\partial#2^{#3}}', 3],
  inner: ['\\langle#1|#2\\rangle', 2],
  Re: ['\\operatorname{Re}#1', 1],
  Im: ['\\operatorname{Im}#1', 1]
};

const MATHJAX_CONFIG = `<script>
window.MathJax = ${JSON.stringify(
  {
    tex: {
      tags: 'ams',
      inlineMath: [['$', '$']],
      macros: MATHJAX_MACROS
    },
    svg: { fontCache: 'global' }
  },
  null,
  2
)};
</script>
<script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>`;

const PRISM_ASSETS = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css">
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>`;

function headAssets(data) {
  const out = [];
  if (data.math) out.push(MATHJAX_CONFIG);
  if (data.code) out.push(PRISM_ASSETS);
  if (data.phonetics) out.push(`<script defer src="${PHONETICS_RENDERER}"></script>`);
  return out.join('\n  ');
}

// --- Notebook index ----------------------------------------------------------

const postSectionOrder = site.postSections;

// Posts are gathered across every language, keyed by slug, so the notebook
// lists everything that exists rather than only what has been translated.
function collectAllPosts() {
  return pageSlugs()
    .map(slug => {
      const shared = sharedFrontMatter(slug);
      const versions = {};
      languages.forEach(language => {
        const page = loadPage(slug, language);
        if (page) versions[language] = page.data;
      });
      return { slug, versions, section: shared.section, date: shared.date || '', post: shared.post };
    })
    .filter(post => post.post && Object.keys(post.versions).length);
}


function renderPostIndex(language) {
  const posts = collectAllPosts();
  if (!posts.length) return '';

  const t = strings[language];

  return postSectionOrder
    .map(sectionId => {
      const inSection = posts
        .filter(p => p.section === sectionId)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      if (!inSection.length) return '';

      const items = inSection
        .map(post => {
          // Prefer the reader's language; fall back to whatever exists.
          const readIn = post.versions[language]
            ? language
            : languages.find(l => post.versions[l]);
          const title = escapeHtml(post.versions[readIn].title);

          const flags = languages
            .filter(l => post.versions[l])
            .map(l => {
              const meta = langMeta[l];
              const current = l === readIn ? ' is-current' : '';
              const inner = meta.flag
                ? `<img src="../assets/images/flags/${meta.flag}" alt="${meta.name}">`
                : `<span class="post-flag-text">${meta.tag}</span>`;
              return `<a class="post-flag${current}" href="../${l}/${post.slug}.html"
              lang="${meta.tag}" title="${meta.name}">${inner}</a>`;
            })
            .join('');

          const date = post.date
            ? `<span class="post-date">${post.date}</span>`
            : '';

          return `<li>
        <a class="post-title" href="../${readIn}/${post.slug}.html">${title}</a>
        <span class="post-langs">${flags}</span>${date}
      </li>`;
        })
        .join('\n      ');

      return `<h2>${t.postSections[sectionId] || sectionId}</h2>
    <ul class="post-list">
      ${items}
    </ul>`;
    })
    .filter(Boolean)
    .join('\n\n    ');
}

function buildAlternates(slug) {
  const links = languages
    .filter(language => isPublished(language, slug))
    .map(
      language =>
        `<link rel="alternate" hreflang="${langMeta[language].tag}" href="../${language}/${slug}.html">`
    );
  if (isPublished(defaultLanguage, slug)) {
    links.push(
      `<link rel="alternate" hreflang="x-default" href="../${defaultLanguage}/${slug}.html">`
    );
  }
  return links.join('\n  ');
}

// The dropdown script is under a kilobyte — a separate request costs more in
// round-trip latency than the bytes are worth, so it is inlined at build time.
const inlineScript = (() => {
  const file = path.join(sourceDirectory, 'assets', 'js', 'dropdown.js');
  return fs.existsSync(file)
    ? `<script>\n${fs.readFileSync(file, 'utf-8').trim()}\n</script>`
    : '';
})();

function render(templateName, placeholders) {
  const template = fs.readFileSync(path.join(templatesDirectory, templateName), 'utf-8');
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(placeholders, key) ? placeholders[key] : ''
  );
}

// ---------------------------------------------------------------------------

// --- Validation --------------------------------------------------------------
// ui.yml holds labels for identifiers defined elsewhere: nav slugs and post
// sections live in this file, CV section ids and download keys live in cv.yml.
// Nothing links the two ends, so a typo or an omission renders as an empty
// string in one of twelve languages and is never noticed. These checks make
// that a build failure instead.

function validate() {
  const problems = [];
  const warnings = [];

  // Everything below reads the default language's block as the template, so a
  // bad defaultLanguage has to be caught here or the later checks throw a raw
  // TypeError instead of printing a message anyone can act on.
  const reference = strings[defaultLanguage];
  if (!reference) {
    console.error('\nBuild aborted — the data files disagree:\n');
    console.error(
      `  site.yml: defaultLanguage "${defaultLanguage}" has no block in ui.yml\n`
    );
    process.exit(1);
  }

  // 1. Every identifier defined elsewhere needs a label, in every language.
  const contracts = [
    { label: 'nav', ids: navOrder, source: 'nav in site.yml' },
    {
      label: 'postSections',
      ids: postSectionOrder,
      source: 'postSections in site.yml'
    },
    {
      label: 'cvSections',
      ids: cv ? ['contact', ...cv.sections.map(s => s.id)] : [],
      source: 'section ids in cv.yml'
    },
    {
      label: 'cvDownloads',
      ids: cv ? (cv.downloads || []).map(d => d.key) : [],
      source: 'downloads[].key in cv.yml'
    }
  ];

  contracts.forEach(({ label, ids, source }) => {
    languages.forEach(language => {
      const map = strings[language] && strings[language][label];
      ids.forEach(id => {
        if (!map || !map[id]) {
          problems.push(
            `ui.yml: ${language}.${label}.${id} is missing (id comes from ${source})`
          );
        }
      });
      // and the reverse: a label with no identifier behind it
      Object.keys(map || {}).forEach(key => {
        if (!ids.includes(key)) {
          warnings.push(`ui.yml: ${language}.${label}.${key} labels nothing in ${source}`);
        }
      });
    });
  });

  // 2. site.yml must name things that exist.
  if (!languages.includes(defaultLanguage)) {
    problems.push(
      `site.yml: defaultLanguage "${defaultLanguage}" is not a code in languages.yml`
    );
  }
  if (!/^https?:\/\//.test(site.url || '')) {
    problems.push('site.yml: url must be a full URL including https://');
  }
  navOrder.forEach(slug => {
    if (slug === 'cv') return;
    if (!fs.existsSync(path.join(pagesDirectory, slug))) {
      problems.push(
        `site.yml: nav lists "${slug}", but src/pages/${slug}/ does not exist`
      );
    }
  });
  // A section nothing is filed under is fine, but worth knowing about.
  const sectionsInUse = new Set(
    pageSlugs().map(slug => sharedFrontMatter(slug).section).filter(Boolean)
  );
  postSectionOrder.forEach(id => {
    if (!sectionsInUse.has(id)) {
      warnings.push(`site.yml: postSections lists "${id}", which no post uses yet`);
    }
  });
  sectionsInUse.forEach(id => {
    if (!postSectionOrder.includes(id)) {
      problems.push(
        `a post declares section "${id}", which is not listed in site.yml postSections`
      );
    }
  });

  // 3. Every language needs the same set of keys as the default one.
  languages.forEach(language => {
    const block = strings[language];
    if (!block) {
      problems.push(`ui.yml: no block for "${language}" (listed in languages.yml)`);
      return;
    }
    Object.keys(reference).forEach(key => {
      if (key.startsWith('_')) return;
      if (!(key in block)) problems.push(`ui.yml: ${language}.${key} is missing`);
    });
    // and the reverse — a key only one language has is drift, not a feature
    Object.keys(block).forEach(key => {
      if (key.startsWith('_')) return;
      if (!(key in reference)) {
        warnings.push(
          `ui.yml: ${language}.${key} exists but ${defaultLanguage} has no such key`
        );
      }
    });
  });

  // 4. Keys nothing in the codebase reads.
  const source = fs.readFileSync(__filename, 'utf-8');
  Object.keys(reference).forEach(key => {
    if (key.startsWith('_')) return;
    if (contracts.some(c => c.label === key)) return;
    // Word boundary, or "cvDownload" matches inside "cvDownloads".
    if (!new RegExp(`\\.${key}\\b`).test(source)) {
      warnings.push(`ui.yml: "${key}" is defined in all languages but read by nothing`);
    }
  });

  // 5. Every language in languages.yml needs a ui.yml block and vice versa.
  Object.keys(strings).forEach(code => {
    if (!languages.includes(code)) {
      problems.push(`ui.yml has "${code}", which is not in languages.yml`);
    }
  });

  // 6. Flags that are configured but absent.
  langConfig.forEach(l => {
    if (!l.flag) return;
    const p = path.join(sourceDirectory, 'assets', 'images', 'flags', l.flag);
    if (!fs.existsSync(p)) {
      problems.push(`languages.yml: ${l.code} points at flags/${l.flag}, which does not exist`);
    }
  });

  // Descriptions come from the page's first paragraph. A page with no prose at
  // all yields nothing, and then the meta tag is omitted rather than emitted
  // empty — worth knowing about, since search engines will write their own.
  pageSlugs().forEach(slug => {
    languages.forEach(language => {
      if (!isPublished(language, slug)) return;
      const page = loadPage(slug, language);
      if (!page) return;

      if (!summarise(page.content)) {
        warnings.push(
          `src/pages/${slug}/${language}.md has no prose, so it gets no meta description`
        );
      }

      // Unfinished text on a page that is neither draft nor unlinked.
      const marks = (page.content.match(/\[PLACEHOLDER\]|\bTODO\b|\bFIXME\b/g) || []).length;
      if (marks) {
        warnings.push(
          `src/pages/${slug}/${language}.md has ${marks} placeholder${marks > 1 ? 's' : ''} ` +
            `and is published — mark it draft: true or finish the text`
        );
      }
    });
  });

  // 4. Placeholders the templates ask for that the build never supplies, and
  //    values the build supplies that no template uses.
  ['index-template.html', 'page-template.html'].forEach(name => {
    const file = path.join(templatesDirectory, name);
    if (!fs.existsSync(file)) return;
    const used = new Set(
      [...fs.readFileSync(file, 'utf-8').matchAll(/{{\s*([\w.]+)\s*}}/g)].map(m => m[1])
    );
    used.forEach(key => {
      if (!new RegExp(`\\b${key}[,:]`).test(source)) {
        problems.push(`${name} uses {{${key}}}, which build.js never sets`);
      }
    });
  });

  if (warnings.length) {
    console.log('\nWarnings:');
    [...new Set(warnings)].forEach(w => console.log(`  ${w}`));
  }

  if (problems.length) {
    console.error('\nBuild aborted — the data files disagree:\n');
    [...new Set(problems)].forEach(p => console.error(`  ${p}`));
    console.error('');
    process.exit(1);
  }
}

validate();

fs.emptyDirSync(buildDirectory);
fs.copySync(path.join(sourceDirectory, 'assets'), path.join(buildDirectory, 'assets'));

// Tells GitHub Pages not to run the output through Jekyll.
fs.writeFileSync(path.join(buildDirectory, '.nojekyll'), '');

let pageCount = 0;
const builtPages = [];

pageSlugs().forEach(slug => {
  languages.forEach(language => {
    const page = loadPage(slug, language);
    if (!page) return;

    const { data, content } = page;
    const title = data.title || slug;
    const draft = Boolean(data.draft);

    let renderedContent = markdownIt.render(content).trim();

    // The notebook page lists whatever posts exist, after any intro prose.
    if (slug === 'notebook') {
      const index = renderPostIndex(language);
      renderedContent = index ? `${renderedContent}\n${index}` : renderedContent;
    }

    if (!renderedContent) {
      renderedContent = `<p class="empty-note">${strings[language].empty}</p>`;
    }

    if (draft) {
      renderedContent =
        `<p class="draft-banner">${strings[language].draftNotice}</p>\n` + renderedContent;
    }

    const html = render(
      slug === 'index' ? 'index-template.html' : 'page-template.html',
      {
        language,
        langTag: langMeta[language].tag,
        dir: langMeta[language].dir || 'ltr',
        title,
        renderedContent,
        head: (draft ? '<meta name="robots" content="noindex, nofollow">\n  ' : '') +
              headAssets(data),
        inlineScript,
        alternates: buildAlternates(slug),
        nav: buildNav(language, data.post ? 'notebook' : slug),
        languageOptions: buildLanguageOptions(language, slug),
        switchLabel: strings[language].switchLabel,
        themeLabel: strings[language].themeLabel,
        skip: strings[language].skip,
        descriptionMeta: metaDescription(summarise(content)),
        year: new Date().getFullYear(),
        // Every page sits one level deep (build/<lang>/page.html).
        assets: '../assets'
      }
    );

    const outPath = path.join(buildDirectory, language, `${slug}.html`);
    fs.ensureDirSync(path.dirname(outPath));
    fs.writeFileSync(outPath, html);
    if (!draft) builtPages.push(`${language}/${slug}.html`);
    pageCount += 1;
  });
});

// The CV page, generated from src/data/cv.yml rather than markdown.
if (cv) {
  // Filenames live in cv.yml alongside the rest of the CV, not here. Each
  // entry appears only when its file exists, so there is never a dead link.
  const pdfs = (cv.downloads || []).filter(p =>
    fs.existsSync(path.join(sourceDirectory, 'assets', 'pdfs', p.file))
  );

  languages.forEach(language => {
    const t = strings[language];
    let content = renderCv(language);
    if (pdfs.length) {
      const links = pdfs
        .map(p => `<a href="../assets/pdfs/${p.file}">${t.cvDownloads[p.key]}</a>`)
        .join('');
      content = `<p class="cv-download">${links}</p>\n\n${content}`;
    }

    const html = render('page-template.html', {
      language,
      langTag: langMeta[language].tag,
      dir: langMeta[language].dir || 'ltr',
      title: t.cvTitle,
      renderedContent: content,
      head: '',
      inlineScript,
      alternates: buildAlternates('cv'),
      nav: buildNav(language, 'cv'),
      languageOptions: buildLanguageOptions(language, 'cv'),
      switchLabel: t.switchLabel,
      themeLabel: t.themeLabel,
      skip: t.skip,
      descriptionMeta: metaDescription(t.cvDescription),
      year: new Date().getFullYear(),
      assets: '../assets'
    });

    const cvPath = path.join(buildDirectory, language, 'cv.html');
    fs.ensureDirSync(path.dirname(cvPath));
    fs.writeFileSync(cvPath, html);
    builtPages.push(`${language}/cv.html`);
    pageCount += 1;
  });
}

// Root redirect, so the bare site URL lands somewhere sensible.
fs.writeFileSync(
  path.join(buildDirectory, 'index.html'),
  `<!DOCTYPE html>
<html lang="${defaultLanguage}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./${defaultLanguage}/index.html">
  <link rel="canonical" href="./${defaultLanguage}/index.html">
  <title>G. A. Antonucci</title>
</head>
<body>
  <p><a href="./${defaultLanguage}/index.html">Continue to the site</a></p>
</body>
</html>
`
);

// --- Meta description --------------------------------------------------------
// Taken from the page's first paragraph, so every page describes itself rather
// than sharing one generic line.

function metaDescription(text) {
  // An empty content="" is worse than no tag: it tells a crawler the page has
  // been described and the description is nothing.
  if (!text) return '';
  const safe = text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<meta name="description" content="${safe}">`;
}

function summarise(markdown, limit = 155) {
  const firstPara = markdown
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .find(
      block =>
        block &&
        !block.startsWith('#') &&      // headings
        !block.startsWith('<') &&      // raw HTML: tables, figures, maths
        !block.startsWith('!') &&      // images
        !block.startsWith('|')         // tables
    );
  if (!firstPara) return '';

  const text = firstPara
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')        // links keep their text
    .replace(/[*_`]/g, '')                          // emphasis, code
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= limit) return text;
  // Cut on a word boundary, and prefer ending at a sentence if one is near.
  const cut = text.slice(0, limit);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > limit * 0.6) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

// --- Post media --------------------------------------------------------------
// Anything that is not a .md or _page.yml inside a page folder is that page's
// own media. It is copied once to build/media/<slug>/ — once, not per language,
// since the same figure serves every translation. Keeping it beside the page
// means deleting or renaming the page takes its images with it; a shared
// folder lets images outlive their owner unnoticed.

function pageMediaDir(slug) {
  return path.join(pagesDirectory, slug, 'media');
}

function copyPageMedia() {
  const used = new Set();
  const present = [];

  pageSlugs().forEach(slug => {
    const dir = pageMediaDir(slug);
    if (!fs.existsSync(dir)) return;

    fs.copySync(dir, path.join(buildDirectory, 'media', slug));

    fs.readdirSync(dir).forEach(file => present.push(`${slug}/${file}`));

    // Which of them does the page's markdown actually reference?
    languages.forEach(language => {
      const page = loadPage(slug, language);
      if (!page) return;
      fs.readdirSync(dir).forEach(file => {
        if (page.content.includes(file)) used.add(`${slug}/${file}`);
      });
    });
  });

  const orphans = present.filter(f => !used.has(f));
  if (orphans.length) {
    console.log('\nUnreferenced media (nothing links to these):');
    orphans.forEach(f => console.log(`  src/pages/${f.replace('/', '/media/')}`));
  }
}

copyPageMedia();

// --- Legacy redirects --------------------------------------------------------

const redirectsPath = path.join(sourceDirectory, 'data', 'redirects.yml');
const redirects = fs.existsSync(redirectsPath)
  ? yaml.load(fs.readFileSync(redirectsPath, 'utf-8')) || []
  : [];

redirects.forEach(rule => {
  const from = rule.from.replace(/^\/+/, '');
  const outPath = from.endsWith('/') || from === ''
    ? path.join(buildDirectory, from, 'index.html')
    : path.join(buildDirectory, from);

  // Link relatively so the page works on any host, and canonically in full so
  // search engines are told which URL is the real one.
  const rel = path
    .relative(path.dirname(outPath), path.join(buildDirectory, rule.to))
    .split(path.sep)
    .join('/');
  const canonical = `${siteUrl}${rule.to}`;

  fs.ensureDirSync(path.dirname(outPath));
  fs.writeFileSync(
    outPath,
    `<!DOCTYPE html>
<html lang="${defaultLanguage}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${rel}">
  <link rel="canonical" href="${canonical}">
  <title>G. A. Antonucci</title>
</head>
<body>
  <p><a href="${rel}">Continue to the site</a></p>
</body>
</html>
`
  );
  console.log(`Redirect: /${from} -> /${rule.to}`);
});

// --- sitemap.xml, robots.txt, 404.html ---------------------------------------

const sitemapEntries = ['', ...builtPages.sort()]
  .map(page => `  <url><loc>${siteUrl}${page}</loc></url>`)
  .join('\n');

fs.writeFileSync(
  path.join(buildDirectory, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`
);

fs.writeFileSync(
  path.join(buildDirectory, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`
);

// Served by GitHub Pages for any unmatched path, so its asset paths are
// relative to the site root rather than to a language folder.
const notFoundLinks = languages
  .filter(language => sourcePageExists(language, 'index'))
  .map(
    language =>
      `<a class="contact-link" href="${siteUrl}${language}/index.html">${strings[language].nav.index}</a>`
  )
  .join('\n        ');

fs.writeFileSync(
  path.join(buildDirectory, '404.html'),
  `<!DOCTYPE html>
<html lang="${defaultLanguage}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>G. A. Antonucci — Page not found</title>
  <link rel="stylesheet" href="${siteUrl}assets/styles.css">
</head>
<body>
  <div class="content-wrapper">
    <main class="content" id="main">
      <h1 class="page-title">Page not found</h1>
      <div class="prose">
        <p>That address doesn't match anything on this site. It may have moved, or the link may be mistyped.</p>
      </div>
      <div class="contact">
        ${notFoundLinks}
      </div>
    </main>
  </div>
  <footer class="site-footer">
    &copy; ${new Date().getFullYear()} Giancarlo Antonino Antonucci
  </footer>
</body>
</html>
`
);

// --- Translation coverage ----------------------------------------------------
// Printed on every build so missing translations are visible rather than
// silently absent from the nav.

const coverage = pageSlugs().map(slug => ({
  slug,
  missing: languages.filter(language => !sourcePageExists(language, slug))
}));

const drafts = [];
pageSlugs().forEach(slug =>
  languages.forEach(language => {
    if (isDraft(language, slug)) drafts.push(`${slug}/${language}`);
  })
);
if (drafts.length) {
  console.log('\nDrafts (built, but not linked or indexed):');
  drafts.forEach(d => console.log(`  ${d}`));
}

const gaps = coverage.filter(page => page.missing.length);
if (gaps.length) {
  console.log('\nUntranslated pages:');
  gaps.forEach(page => {
    console.log(`  ${page.slug.padEnd(16)} missing: ${page.missing.join(', ')}`);
  });
  console.log('');
}

console.log(
  `Built ${pageCount} pages into ${path.relative(projectDirectory, buildDirectory)}/ ` +
    `(sitemap, robots.txt and 404 page use ${siteUrl})`
);
