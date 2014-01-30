/*
 * DSI
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var prettySize = require('prettysize');
var zlib = require('zlib');
var archiver = require('archiver');
var Readable = require('lazystream').Readable;

module.exports = function(grunt) {

	grunt.registerMultiTask('dsi', 'Compress files.', function() {
		var exports = {
			options: {
				pretty: true
			},
			getSize: function(filename, pretty) {
				var size = 0;
				if (typeof filename === 'string') {
					try {
						size = fs.statSync(filename).size;
					} catch (e) {}
				} else {
					size = filename;
				}
				if (pretty !== false) {
					if (!exports.options.pretty) {
						return size + ' bytes';
					}
					return prettySize(size);
				}
				return Number(size);
			},
			unixifyPath: function(filepath) {
				if (process.platform === 'win32') {
					return filepath.replace(/\\/g, '/');
				} else {
					return filepath;
				}
			}
		};

		grunt.util.async.forEachSeries(this.files, function(filePair, nextPair) {
			grunt.util.async.forEachSeries(filePair.src, function(src, nextFile) {

				// console.log(filePair);

				// Must be a file
				if (grunt.file.isDir(src)) {
					return nextFile();
				} // else return;

				var shouldGzip = false;

				var archive = archiver.create('zip', exports.options);

				var basepath = path.dirname(src);
				var dest = src + '.zip';
				// Where to write the file
				var destStream = fs.createWriteStream(dest);

				// var dest = filePair.dest;

				// // Ensure dest folder exists
				// grunt.file.mkdir(path.dirname(dest));

				// // Where to write the file
				// var destStream = fs.createWriteStream(dest);

				var gzipStream;

				archive.on('error', function(err) {
					grunt.log.error(err);
					grunt.fail.warn('Archiving failed.');
				});

				destStream.on('error', function(err) {
					grunt.log.error(err);
					grunt.fail.warn('WriteStream failed.');
				});

				destStream.on('close', function() {
					grunt.log.writeln('Created ' + String(dest).cyan + ' (' + exports.getSize(dest) + ')');
					nextFile();
				});

				archive.pipe(destStream);

				grunt.util.async.forEachSeries(filePair.images, function(pattern, nextPattern) {
					glob(exports.unixifyPath(path.join(basepath || '', pattern)), function(er, expandedFiles) {
						expandedFiles.unshift(src);

						expandedFiles.forEach(function(file) {

							var internalFileName = path.relative(basepath, file);
							var srcStream = new Readable(function() {
								return fs.createReadStream(file);
							});

							archive.append(srcStream, { name: internalFileName }, function(err) {
								grunt.verbose.writeln('Archiving ' + file.cyan + ' -> ' + String(dest).cyan + '/'.cyan + file.cyan);
							});
						});
						nextPattern();
					});
				}, function() {
					archive.finalize();
				});

				/**
				// Append ext if the specified one isnt there
				if (typeof filePair.orig.ext === 'undefined') {
					var ext = '.' + extension;
					// if the chosen ext is different then the dest ext lets use it
					if (String(filePair.dest).slice(-ext.length) !== ext) {
						filePair.dest += ext;
					}
				}
				/**/

				/**
				// Ensure the dest folder exists
				grunt.file.mkdir(path.dirname(filePair.dest));

				var srcStream = fs.createReadStream(src);
				var destStream = fs.createWriteStream(filePair.dest);
				var compressor = algorithm.call(zlib, exports.options);

				compressor.on('error', function(err) {
				grunt.log.error(err);
				grunt.fail.warn(algorithm + ' failed.');
				nextFile();
				});

				destStream.on('close', function() {
				grunt.log.writeln('Created ' + String(filePair.dest).cyan + ' (' + exports.getSize(filePair.dest) + ')');
				nextFile();
				});

				srcStream.pipe(compressor).pipe(destStream);
				/**/
			}, nextPair);
		}, this.async());

		return exports;
	});
};
