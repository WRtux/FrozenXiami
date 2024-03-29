/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use strict';
const fs             = require('node:fs');
const gulp           = require('gulp');
const gulpIf         = require('gulp-if');
const gulpRename     = require('gulp-rename');
const helper         = require('./tools/helper');
const gulpPostcss    = require('gulp-postcss');
const gulpUglify     = require('gulp-uglify');
const gulpLocalembed = require('./tools/localembed');
const cssPresetEnv   = require('postcss-preset-env');
const cssnano        = require('cssnano');

/* ========== Options ========== */

const options = {
    sourceDir: './source',
    staticDir: './static',
    buildDir:  './build',

    'postcss-preset-env': {
        stage: 2,
        enableClientSidePolyfills: false,
        features: {
            'is-pseudo-class': {
                specificityMatchingName: '-dummy'
            }
        }
    },
    'cssnano': {
        preset: 'default'
    },
    'uglify-js': {
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

/* ========== Transforms ========== */

function buildMakeStylesheet(mode) {
    let pipeline = [];
    mode !== 'site' && pipeline.push(
        helper.buildInitSourceMap());
    mode !== 'dev' && pipeline.push(
        buildOptimizeStylesheet());
    pipeline.push(
        gulpLocalembed(options['localembed-stylesheet'], {mode, targetDir: options.buildDir}));
//  pipeline.push(gulpIf('*.css',
//      gulpRename({suffix: '.min'})));
    return helper.composePipeline(pipeline);
}

function buildOptimizeStylesheet() {
    return gulpPostcss([
        cssPresetEnv(options['postcss-preset-env']),
        cssnano(options['cssnano'])
    ]);
}

function buildMakeScript(mode) {
    let pipeline = [];
    mode !== 'site' && pipeline.push(
        helper.buildInitSourceMap());
    mode !== 'dev' && pipeline.push(
        buildOptimizeScript());
    pipeline.push(
        gulpLocalembed(options['localembed-script'], {mode, targetDir: options.buildDir}));
//  pipeline.push(gulpIf('*.js',
//      gulpRename({suffix: '.min'})));
    return helper.composePipeline(pipeline);
}

function buildOptimizeScript() {
    return gulpUglify(options['uglify-js']);
}

function buildMakeSource(mode) {
    let pipeline = [];
    pipeline.push(gulpIf('*.css', buildMakeStylesheet(mode)));
    pipeline.push(gulpIf('*.js', buildMakeScript(mode)));
    return helper.composePipeline(pipeline);
}

/* ========== Tasks ========== */

function taskClean(callback) {
    fs.rm(options.buildDir, {recursive: true, force: true}, callback);
}

function taskMakeStatic(callback) {
    fs.cp(`${options.staticDir}/`, `${options.buildDir}/`, {recursive: true}, callback);
}

function _taskMakeSource(mode) {
    return gulp.src(`${options.sourceDir}/**`, {nodir: true})
        .pipe(buildMakeSource(mode))
        .pipe(gulp.dest(`${options.buildDir}/`));
}
let taskMakeDefaultSource = () => _taskMakeSource('default');
let taskMakeDevSource     = () => _taskMakeSource('dev');
let taskMakeSiteSource    = () => _taskMakeSource('site');

const tasks = {
    'clean':               taskClean,
    'make-static':         taskMakeStatic,
    'make-source-default': taskMakeDefaultSource,
    'make-source-dev':     taskMakeDevSource,
    'make-source-site':    taskMakeSiteSource,
    'build-default':       gulp.series(taskClean, taskMakeStatic, taskMakeDefaultSource),
    'build-dev':           gulp.series(taskClean, taskMakeStatic, taskMakeDevSource),
    'build-site':          gulp.series(taskClean, taskMakeStatic, taskMakeSiteSource)
};
tasks['make-source'] = tasks['make-source-default'];
tasks['build']       = tasks['build-default'];

module.exports = tasks;
