# Deep Thought Education

Story-driven JEE Advanced lessons with a question after every idea, fully solved previous-year
problems, interactive labs, handwriting on every lesson, and ambient study sound.

## Use it

- **Online:** enable GitHub Pages for this repository (Settings → Pages → deploy from branch, root folder)
  and open the site.
- **Offline:** clone or download the repository and open `index.html`. It works straight from disk,
  with no server and no internet connection.

**Search** (🔍 in the top bar, `Ctrl/⌘ K` or `/`) finds anything inside the lessons: ideas, formulas,
key results, JEE traps, questions, solutions and labs. It understands formulas typed loosely (`F=qvB`,
`mu0 I/2 pi r`, `qB/m`), typos, abbreviations (emf, KVL, RHR…) and words like *formula*, *trap*, *pyq 2019*
or *lab*. Picking a result opens the lesson at that exact spot, highlighted. The Library search box shows
matches from inside the lessons too.

Progress, answers, handwritten notes and settings are kept on the device. Use **Export backup** /
**Import backup** at the bottom of the Library page to save them to a `.json` file or move them to
another device or browser. Backups are interchangeable with the single-file version of the app.

## How it's laid out

| Path | What it is |
| --- | --- |
| `index.html` | The app shell: layout, navigation, syllabus manifest |
| `assets/app.css` | All styles, with fonts embedded |
| `assets/app.js` | App core: router, quiz engine, lab framework, handwriting, ambient sound, backup |
| `chapters/<id>.js` | One file per chapter (its lessons and interactive labs). It loads the first time one of that chapter's lessons is opened |
| `tools/build.py` | Builds all of the above from the single-file version of the app |
| `assets/search-index.js` | The search index (every lesson cut into findable pieces). It loads the first time you search |
| `tools/backup.js` | The Export / Import backup module |
| `tools/search.js`, `tools/search.css` | Search: ranking, the search panel, jumping to a result |
| `tools/search_index.py` | Builds the search index, turning each rendered formula back into searchable text |
| `content/<id>/` | Source of a chapter written on its own (outside the single-file app): `chapter.json`, `lessons/NN.html`, `labs.js`, and optionally `theme.css`, `ambient.js`, `synonyms.txt` |
| `tools/add_chapter.py` | Builds one `content/<id>/` chapter into the site (see below) |
| `tools/chemfig.py`, `tools/tex.js` | Chemistry figures (rings, formulas, reaction arrows) as themed SVG; TeX/mhchem → KaTeX HTML |

The first visit loads about 0.5 MB instead of the whole 8.5 MB course. Each chapter (about 2 MB) loads when
you need it, and opening a chapter overview fetches it in the background.

## Adding or updating chapters

The app is authored as one self-contained HTML file. To publish a new version:

```bash
python3 tools/build.py site path/to/single-file.html
```

That regenerates `index.html`, `assets/` and `chapters/`. To add Export / Import to a single-file copy:

```bash
python3 tools/build.py single path/to/single-file.html path/to/output.html
```

The script checks every place it patches and stops with a message if the source has changed shape.

### Chapters written as their own source folder

**Alcohols, Phenols & Ethers** lives in `content/alcohols-phenols-and-ethers/` rather than in the single-file app.
Its lessons use light markup — `<card>`, `<callout kind="…">`, `<q type="…" answer="…" pyq="…">`, `<lab sim="…">`,
`$…$` maths with `\ce{…}` chemistry, and `<?py fig(…) ?>` figures drawn with `tools/chemfig.py`. The full syntax is
in the docstring of `tools/add_chapter.py`. To build it (or a new chapter written the same way):

```bash
(cd tools && npm install)        # once: KaTeX 0.19.1, the version the site's CSS and fonts are for
python3 tools/add_chapter.py content/alcohols-phenols-and-ethers
```

That writes `chapters/<id>.js`, adds the chapter to the manifest in `index.html` and to the search index, and adds its
colour tone (`assets/app.css`), ambient soundscape and search synonyms (`assets/app.js`, `tools/search.js`) between
`chapter:<id>` marker comments. It is safe to run again. **`tools/build.py site` regenerates those files from the
single-file app, which does not contain this chapter — so run `add_chapter.py` again after it.**

### Enriching a chapter that came from the single-file app

`content/enrich/<id>/` holds additions to an existing chapter — story openers, a breather in every lesson,
memory hooks, splits of overlong cards and a closing game — written in the same light markup, each placed
relative to a heading, question, lab or callout of the original lesson (see the docstring of
`tools/enrich_chapter.py`). Current Electricity and Magnetism are enriched this way:

```bash
python3 tools/enrich_chapter.py current-electricity magnetism
```

The original lessons are not edited: every addition is wrapped in `<!--enrich-->` comments, so the tool removes
its previous output before applying, and is safe to re-run. **Run it again after `tools/build.py site`**, which
rebuilds those chapter files from the single-file app. Styles shared by every chapter (breathers) live in
`content/shared/styles.css`; the quick-fire game engine both enriched chapters use is `content/shared/rush.js`.

