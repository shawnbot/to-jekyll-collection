#!/usr/bin/env node
const series = require('async-series');
const fof = require('fof');
const fs = require('fs');
const path = require('path');
const thru = require('through2').obj;
const tito = require('tito');
const yaml = require('js-yaml');

const DEFAULT_FORMAT = 'csv';
const STDIN = '/dev/stdin';

const yargs = require('yargs')
  .usage('$0 [options] [filename] [output-directory]')
  .describe('i', 'The input filename (default: stdin)')
  .describe('o', 'The output directory name (default: ".")')
  .describe('slug', 'The field of each row to use as the filename "slug"')
  .default('slug', 'id')
  .describe('ext', 'The output filename extension')
  .default('ext', 'md')
  .describe('content', 'The field of each row to output as file content (rather than front matter)')
  .default('content', 'content')
  .describe('format', 'The input file format (default: derive from input filename extension, or "' + DEFAULT_FORMAT + '")')
  .describe('encoding', 'The input and output encoding')
  .default('encoding', 'utf8')
  .alias('h', 'help');

const argv = yargs.argv;

if (argv.help) {
  return yargs.showHelp();
}

var input = argv.i || argv._.shift();

var format = argv.format || argv.f
  || input ? input.split('.').pop() || DEFAULT_FORMAT : DEFAULT_FORMAT;

var outdir = argv.o || argv._.shift()
  || (input !== STDIN
    ? '_' + path.filename(input).replace(/\.\w+$/, '')
    : '.');

// return console.log('args:', argv, '->', input, outdir);

var getSlug = fof(argv.slug);
var getContent = argv.content ? fof(argv.content) : undefined;

var mkdirIfNotExists = function(done) {
  fs.stat(outdir, function(error, stat) {
    if (error) {
      console.warn('making directory:', outdir);
      return fs.mkdir(outdir, done);
    } else if (!stat.isDirectory()) {
      return done(outdir + ' exists, but is not a directory!');
    }
    // console.warn('directory exists:', outdir);
    done();
  });
};

var convert = function(done) {
  var stream = input
    ? fs.createReadStream(input, argv.encoding)
    : process.stdin;

  var parse = tito.formats.createReadStream(format);

  stream
    .on('error', done)
    .pipe(parse)
    .on('error', done)
    .pipe(thru(function(row, enc, next) {
      var slug = getSlug(row);
      if (!slug) {
        console.warn('no slug (%s) for:', slugField, row);
        return next();
      }

      var file = path.join(outdir, slug + '.' + argv.ext);
      console.warn('writing:', file);
      var out = fs.createWriteStream(file, argv.encoding);
      var content;
      if (getContent) {
        content = getContent(row);
        if (content && argv.content in row) {
          delete row[argv.content];
        }
      }
      out.write('---\n');
      out.write(yaml.safeDump(row));
      out.write('---\n');
      if (content) {
        out.write(content);
      }
      out.end(next);
    }))
    .on('end', done);
};

series([
  mkdirIfNotExists,
  convert,
], function(error) {
  if (error) {
    console.error(error);
    process.exit(1);
  }
});
