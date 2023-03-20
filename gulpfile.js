/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use strict';
const fs = require('node:fs');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gulpRename = require('gulp-rename');
const helper = require('./tools/helper');
const gulpPostcss = require('gulp-postcss');
const gulpUglify = require('gulp-uglify');
const gulpLocalembed = require('./tools/localembed');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

// ========== Options ==========

const options = {
    sourceDir: './source',
    staticDir: './static',
    buildDir: './build',
    'autoprefixer': {
    },
    'cssnano': {
        preset: 'default'
    },
    'uglify': {
        module: false,
        compress: {}
    },
    'localembed-stylesheet': [
        {
            type: 'stylesheet',
            sources: ['web/main.css', 'web/mask.css', 'web/content.css'],
            target: 'web/main.css'
        }
    ],
    'localembed-script': [
        {
            type: 'worker',
            name: 'decoder',
            sources: ['web/decoder.worker.js'],
            target: 'web/load.worker.js'
        }, {
            type: 'worker',
            name: 'loader',
            sources: ['web/loader.worker.js'],
            target: 'web/data.js'
        }, {
            type: 'bundle',
            sources: ['web/page.js', 'web/scene.js'],
            target: 'web/main.js'
        }
    ]
};

// ========== Actions ==========

function buildOptimizeStylesheet() {
    return gulpPostcss([
        autoprefixer(options['autoprefixer']),
        cssnano(options['cssnano'])
    ]);
}

function buildMakeStylesheet(mode) {
    let pipeline = [];
    pipeline.push(
        helper.buildInitSourceMap());
    mode !== 'dev' && pipeline.push(
        buildOptimizeStylesheet());
    pipeline.push(
        gulpLocalembed(options['localembed-stylesheet'], {mode, targetDir: options.buildDir}));
    pipeline.push(gulpIf('*.css',
        gulpRename({extname: '.min.css'})));
    return helper.composePipeline(pipeline);
}

function buildOptimizeScript() {
    return gulpUglify(options['uglify']);
}

function buildMakeScript(mode) {
    let pipeline = [];
    pipeline.push(
        helper.buildInitSourceMap());
    mode !== 'dev' && pipeline.push(
        buildOptimizeScript());
    pipeline.push(
        gulpLocalembed(options['localembed-script'], {mode, targetDir: options.buildDir}));
    pipeline.push(gulpIf('*.js',
        gulpRename({extname: '.min.js'})));
    return helper.composePipeline(pipeline);
}

function buildMakeSource(mode) {
    let pipeline = [];
    pipeline.push(gulpIf('*.css', buildMakeStylesheet(mode)));
    pipeline.push(gulpIf('*.js', buildMakeScript(mode)));
    return helper.composePipeline(pipeline);
}

// ========== Tasks ==========

function clean(callback) {
    fs.rm(options.buildDir, {recursive: true, force: true}, callback);
}

function buildSource(mode) {
    return gulp.src(`${options.sourceDir}/**`, {nodir: true})
        .pipe(buildMakeSource(mode))
        .pipe(gulp.dest(`${options.buildDir}/`));
}

function copyStatic(callback) {
    fs.cp(`${options.staticDir}/`, `${options.buildDir}/`, {recursive: true}, callback);
}

module.exports = {
    'clean': clean,
    'build-dev': gulp.series(clean, buildSource.bind(null, 'dev'), copyStatic),
    'build-site': gulp.series(clean, buildSource.bind(null, 'site'), copyStatic)
};
