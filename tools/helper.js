/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use strict';
const path = require('node:path');
const stream = require('node:stream');
const Vinyl = require('vinyl');
const vinylSourcemap = require('vinyl-sourcemap');

// Identity transform.
function buildIdentity() {
    return new stream.Transform({
        objectMode: true,
        transform: (chunk, enc, callback) => callback(null, chunk)
    });
}

function composePipeline(pipeline) {
    return stream.compose(buildIdentity(), ...pipeline, buildIdentity() /* through2 polyfill */);
}

function buildInitSourceMap() {
    return new stream.Transform({
        objectMode: true,
        transform(f, enc, callback) {
            if (!Vinyl.isVinyl(f))
                return callback(new TypeError());
            if (f.isDirectory() || f.isNull())
                return callback(null, f);
            vinylSourcemap.add(f, callback);
        }
    });
}

function buildEmbedSourceMap() {
    return new stream.Transform({
        objectMode: true,
        transform(f, enc, callback) {
            if (!Vinyl.isVinyl(f))
                return callback(new TypeError());
            if (f.isDirectory() || f.isNull() || f.sourceMap == null)
                return callback(null, f);
            f.sourceMap.file = f.basename;
            f.sourceMap.sourceRoot = path.relative(f.dirname, f.base).replaceAll(path.sep, '/');
            vinylSourcemap.write(f, null, (err, f, map) => callback(err, f));
        }
    });
}

module.exports = {
    buildIdentity, composePipeline,
    buildInitSourceMap, buildEmbedSourceMap
};
