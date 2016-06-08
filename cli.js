const series = require('async-series');
const fs = require('fs');
const path = require('path');
const thru = require('through2').obj;
const tito = require('tito');
const yaml = require('js-yaml');
const argv = require('minimist')(process.argv.slice(2));

const DEFAULT_FORMAT = 'csv';

if (argv.h || argv.help) {
  return console.warn(
    process.argv[1], '[options] [filename.ext] [_directory]'
  );
}

var input = argv.input || argv.i || argv._.shift();

var format = argv.format || argv.f
  || input ? input.split('.').pop() || DEFAULT_FORMAT : DEFAULT_FORMAT;

var encoding = argv.encoding || argv.e || 'utf8';

var outdir = argv.name || argv.c || argv._.shift()
  || (input
    ? '_' + path.basename(input).replace(/\.\w+$/, '')
    : '.');

// return console.log('args:', argv, '->', input, outdir);

var ext = argv.ext || 'md';

var slugField = argv.slug || argv.s || 'id';

var mkdirIfNotExists = function(done) {
  fs.stat(outdir, function(error, stat) {
    if (error) {
      console.warn('making directory:', outdir);
      return fs.mkdir(outdir, done);
    } else if (!stat.isDirectory()) {
      return done(outdir + ' exists, but is not a directory!');
    }
    console.warn('directory exists:', outdir);
    done();
  });
};

var convert = function(done) {
  var stream = input
    ? fs.createReadStream(input, encoding)
    : process.stdin;

  var parse = tito.formats.createReadStream(format);

  stream
    .on('error', done)
    .pipe(parse)
    .on('error', done)
    .pipe(thru(function(row, enc, next) {
      var slug = row[slugField];
      if (!slug) {
        console.warn('no slug (%s) for:', slugField, row);
        return next();
      }

      var file = path.join(outdir, slug + '.' + ext);
      var out = fs.createWriteStream(file, encoding);
      out.write('---\n');
      out.write(yaml.safeDump(row));
      out.write('---\n');
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
