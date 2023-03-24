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

/* ========== Options ========== */

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
            sources: [
                'styles/main.css',
                'styles/content.css',
                'styles/toolbar-*.css',
                'styles/overlay-*.css'
            ],
            target: 'styles/main.css'
        }, {
            type: 'migrate',
            sources: ['styles/**/*.css'],
            target: 'web/'
        }
    ],
    'localembed-script': [
        {
            type: 'worker',
            name: 'decoder',
            sources: ['scripts/decoder.worker.js'],
            target: 'scripts/loader.worker.js'
        }, {
            type: 'worker',
            name: 'loader',
            sources: ['scripts/loader.worker.js'],
            target: 'scripts/data.js'
        }, {
            type: 'bundle',
            sources: [
                'scripts/page.js',
                'scripts/scene.js'
            ],
            target: 'scripts/main.js'
        }, {
            type: 'migrate',
            sources: ['scripts/**/*.js'],
            target: 'web/'
        }
    ]
};

/* ========== Actions ========== */

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

function buildOptimizeStylesheet() {
    return gulpPostcss([
        autoprefixer(options['autoprefixer']),
        cssnano(options['cssnano'])
    ]);
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

function buildOptimizeScript() {
    return gulpUglify(options['uglify']);
}

function buildMakeSource(mode) {
    let pipeline = [];
    pipeline.push(gulpIf('*.css', buildMakeStylesheet(mode)));
    pipeline.push(gulpIf('*.js', buildMakeScript(mode)));
    return helper.composePipeline(pipeline);
}

/* ========== Tasks ========== */

const tasks = {
    'clean': (callback) => {
        fs.rm(options.buildDir, {recursive: true, force: true}, callback);
    },
    'make-source': (mode = 'default') => {
        return gulp.src(`${options.sourceDir}/**`, {nodir: true})
            .pipe(buildMakeSource(mode))
            .pipe(gulp.dest(`${options.buildDir}/`));
    },
    'make-source-dev': () => tasks['make-source']('dev'),
    'make-source-site': () => tasks['make-source']('site'),
    'make-static': (callback) => {
        fs.cp(`${options.staticDir}/`, `${options.buildDir}/`, {recursive: true}, callback);
    }
};

tasks['build'] = gulp.series(tasks['clean'], tasks['make-source'], tasks['make-static']);
tasks['build-dev'] = gulp.series(tasks['clean'], tasks['make-source-dev'], tasks['make-static']);
tasks['build-site'] = gulp.series(tasks['clean'], tasks['make-source-site'], tasks['make-static']);

module.exports = tasks;
