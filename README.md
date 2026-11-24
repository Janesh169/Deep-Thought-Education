# Deep Thought Education

Story-driven JEE Advanced lessons with a question after every idea, fully solved previous-year
problems, interactive labs, handwriting on every lesson, and ambient study sound.

## Use it

- **Online:** enable GitHub Pages for this repository (Settings → Pages → deploy from branch, root folder)
  and open the site.
- **Offline:** clone or download the repository and open `index.html`. It works straight from disk,
  with no server and no internet connection.

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
| `tools/backup.js` | The Export / Import backup module |

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
