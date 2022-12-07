/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use strict';
const path = require('node:path');
const stream = require('node:stream');
const Vinyl = require('vinyl');
const Concat = require('concat-with-sourcemaps');

const handlers = {
    'stylesheet': undefined,
    'bundle': (op, files) => {
        let matches = files.filter((f) => op.sources.some((src) => matchPath(f, src)));
        if (matches.length === 0)
            return files;
        files = files.filter((f) => !matches.includes(f));
        let concat = new Concat(true, path.basename(op.target));
        for (let f of matches) {
            concat.add(f.basename, f.contents, f.sourceMap);
        }
        files.push(new Vinyl({
            path: path.resolve(op.target),
            contents: concat.content,
            sourceMap: JSON.parse(concat.sourceMap)
        }));
        return files;
    },
    'worker': (op, files) => {
        let target = files.find((f) => matchPath(f, op.target));
        let matches = files.filter((f) => op.sources.some((src) => matchPath(f, src)));
        if (target == null || matches.length === 0)
           return files;
        files = files.filter((f) => f !== target && !matches.includes(f));
        let concat = new Concat(true, path.basename(op.target));
        let name = op.name ?? path.basename(path.basename(op.sources[0], '.js'), '.worker');
        concat.add(null, 'URL.local??={};');
        concat.add(null, `URL.local[${JSON.stringify(name)}]=URL.createObjectURL(new Blob([`);
        for (let f of matches) {
            concat.add(f.basename, JSON.stringify(f.contents.toString()) + ',', f.sourceMap);
        }
        concat.add(null, ']));');
        concat.add(target.basename, target.contents, target.sourceMap);
        files.push(new Vinyl({
            path: path.resolve(op.target),
            contents: concat.content,
            sourceMap: JSON.parse(concat.sourceMap)
        }));
        return files;
    }
};
handlers['stylesheet'] = handlers['bundle'];

// Check if a Vinyl is the specified path.
function matchPath(file, src) {
    if (!Vinyl.isVinyl(file))
        throw new TypeError();
    return path.relative(path.resolve(file.base, src), file.path) === '';
}

function transform(ops) {
    if (typeof ops !== 'object')
        throw new TypeError();
    for (let op of ops) {
        if (typeof op !== 'object' || !(op.type in handlers))
           throw new TypeError();
    }
    let files = [];
    return new stream.Transform({
        objectMode: true,
        transform(f, enc, callback) {
            if (!Vinyl.isVinyl(f))
                return callback(new TypeError());
            if (f.isNull())
                return callback();
            if (f.isStream())
                return callback(new TypeError());
            files.push(f);
            return callback();
        },
        flush(callback) {
            for (let op of ops) {
                files = handlers[op.type](op, files);
            }
            for (let f of files) {
                this.push(f);
            }
            return callback();
        }
    });
};

module.exports = transform;
