# to-jekyll-collection
Convert a tabular data file (CSV, JSON, etc.) to a Jekyll collection.

Install it with:

```sh
npm i [-g] to-jekyll-collection
```

Then run it like so:

```
to-jekyll-collection data.csv _my_collection
```

Each row in `data.csv` will be converted into a Markdown file in the
`_my_collection` with the row's data encoded as front matter. Check the help
text for more options:

```sh
to-jekyll-collection --help
```
