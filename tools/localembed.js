/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use strict';
const path = require('node:path');
const stream = require('node:stream');
const globParent = require('glob-parent');
const Vinyl = require('vinyl');
const vinylMatch = require('gulp-match');
const vinylSourcemap = require('vinyl-sourcemap');
const Concat = require('concat-with-sourcemaps');

/* ========== Internal Functions ========== */

// Check if a Vinyl matches the specified path.
function matchPath(file, match, glob = false) {
    return glob ?
        vinylMatch(file, match) :
        path.relative(path.resolve(file.base, match), file.path) === '';
}

function attachSourceMap(file, targetDir, embed = true) {
    if (file.sourceMap == null)
        return null;
    let dir = path.dirname(path.resolve(targetDir ?? file.base, file.relative));
    file.sourceMap.file = file.basename;
    file.sourceMap.sourceRoot = path.relative(dir, file.base).replaceAll(path.sep, '/');
    !embed && delete file.sourceMap.sourcesContent;
    let mapfile = null;
    vinylSourcemap.write(file, embed ? null : '.', (err, _f, mapf) => {
        if (err != null)
            throw err;
        mapfile = mapf;
    });
    return mapfile;
}

/* ========== Handlers ========== */

function handleMerge(op, files, _opts) {
    let matches = files.filter((f) => op.sources.some((src) => matchPath(f, src, true)));
    if (matches.length === 0)
        return files;
    files = files.filter((f) => !matches.includes(f));
    let concat = new Concat(true, path.basename(op.target));
    for (let f of matches) {
        concat.add(f.basename, f.contents, f.sourceMap);
    }
    files.push(new Vinyl({
        base: matches[0].base,
        path: path.resolve(matches[0].base, op.target),
        contents: concat.content,
        sourceMap: JSON.parse(concat.sourceMap)
    }));
    return files;
}

function handleMigrate(op, files, _opts) {
    for (let f of files) {
        for (let src of op.sources) {
            if (!matchPath(f, src, true))
                continue;
            f.path = path.resolve(f.base, op.target, path.relative(globParent(src), f.relative));
            break;
        }
    }
    return files;
}

function handleEmbedWorker(op, files, opts) {
    let target = files.find((f) => matchPath(f, op.target));
    let matches = files.filter((f) => op.sources.some((src) => matchPath(f, src, true)));
    if (target == null || matches.length === 0)
       return files;
    files = files.filter((f) => f === target || !matches.includes(f));
    let concat = new Concat(true, path.basename(op.target));
    let name = op.name ?? path.basename(path.basename(op.sources[0], '.js'), '.worker');
    concat.add(null, `(URL.local??={})[${JSON.stringify(name)}]=URL.createObjectURL(new Blob([`);
    for (let f of matches) {
        if (opts.embedSourceMap && f.sourceMap != null)
            attachSourceMap(f, opts.targetDir);
        concat.add(null, JSON.stringify(f.contents.toString()) + ',');
    }
    concat.add(null, ']));');
    concat.add(target.basename, target.contents, target.sourceMap);
    target.contents = concat.content;
    target.sourceMap = JSON.parse(concat.sourceMap);
    return files;
}

const handlers = {
    'stylesheet': handleMerge,
    'bundle': handleMerge,
    'worker': handleEmbedWorker,
    'migrate': handleMigrate
};

/* ========== Exports ========== */

function transform(ops, opts) {
    opts ??= {};
    if (typeof ops !== 'object' || typeof opts !== 'object')
        throw new TypeError();
    for (let op of ops) {
        if (typeof op !== 'object' || !(op.type in handlers))
           throw new TypeError();
    }
    if (opts.targetDir != null && typeof opts.targetDir !== 'string')
        throw new TypeError();
    opts.embedSourceMap = (opts.mode === 'dev');
    let files = [];
    return new stream.Transform({
        objectMode: true,
        transform(f, _enc, callback) {
            if (!Vinyl.isVinyl(f))
                return callback(new TypeError());
            if (f.isDirectory())
                return callback();
            if (f.isStream())
                return callback(new TypeError());
            files.push(f);
            return callback();
        },
        flush(callback) {
            for (let op of ops) {
                files = handlers[op.type](op, files, opts);
            }
            for (let f of files) {
                if (f.sourceMap != null) {
                    let mapfile = attachSourceMap(f, opts.targetDir, opts.embedSourceMap);
                    mapfile != null && this.push(mapfile);
                }
                this.push(f);
            }
            return callback();
        }
    });
}

module.exports = transform;
