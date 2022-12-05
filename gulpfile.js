'use strict';
const fs = require('node:fs');
const stream = require('node:stream');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const gulpPostcss = require('gulp-postcss');
const gulpUglify = require('gulp-uglify');
const localembed = require('./localembed');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

const options = {
    'sourcemaps-init': {},
    'sourcemaps-write': {},
    'autoprefixer': {},
    'cssnano': {preset: 'default'},
    'uglify': {}
};

// NOP transform.
function identity() {
    return new stream.Transform({
        objectMode: true,
        transform: (chunk, enc, callback) => callback(null, chunk)
    });
}

function composePipeline(pipeline) {
    return stream.compose(identity(), ...pipeline, identity() /* through2 polyfill */);
}

function transformStylesheet() {
    return gulpPostcss([
        autoprefixer(options['autoprefixer']),
        cssnano(options['cssnano'])
    ]);
}

function makeStylesheet(mode) {
    let pipeline = [];
    if (mode === 'dev')
        pipeline.push(sourcemaps.init(options['sourcemaps-init']));
    if (mode !== 'dev')
        pipeline.push(transformStylesheet());
    pipeline.push(localembed('stylesheets'));
    pipeline.push(rename({extname: '.min.css'}));
    if (mode === 'dev')
        pipeline.push(sourcemaps.write(options['sourcemaps-write']));
    return composePipeline(pipeline);
}

function transformScript() {
    return gulpUglify(options['uglify']);
}

function makeScript(mode) {
    let pipeline = [];
    if (mode === 'dev')
        pipeline.push(sourcemaps.init(options['sourcemaps-init']));
    if (mode !== 'dev')
        pipeline.push(transformScript());
    pipeline.push(localembed('scripts'));
    pipeline.push(rename({extname: '.min.js'}));
    if (mode === 'dev')
        pipeline.push(sourcemaps.write(options['sourcemaps-write']));
    return composePipeline(pipeline);
}

function makeSource(mode) {
    let pipeline = [];
    pipeline.push(gulpIf('*.css', makeStylesheet(mode)));
    pipeline.push(gulpIf('*.js', makeScript(mode)));
    return composePipeline(pipeline);
}

// ========== Tasks ==========

function clean(callback) {
    fs.rm('build', {recursive: true, force: true}, callback);
}

function buildSource(mode) {
    return gulp.src('source/**')
        .pipe(makeSource(mode))
        .pipe(gulp.dest('build'));
}

function copyStatic(callback) {
    fs.cp('static/', 'build/', {recursive: true}, callback);
}

module.exports = {
    'clean': clean,
    'build-dev': gulp.series(clean, buildSource.bind(null, 'dev'), copyStatic),
    'build-site': gulp.series(clean, buildSource.bind(null, 'site'), copyStatic)
};
