/*
 * DSI - Emailer
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

module.exports = function(grunt) {

	grunt.registerMultiTask('emailer', 'Compress files.', function() {
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

				// Must be a file else go to next file
				if (grunt.file.isDir(src)) {
					return nextFile();
				} // else return;

				var basepath = path.dirname(src);
				var dest = src + '.zip';

				// Where to write the file
				var destStream = fs.createWriteStream(dest);

				// In case error occurs during writing
				destStream.on('error', function(err) {
					grunt.log.error(err);
					grunt.fail.warn('WriteStream failed.');
				});

				// On file close after writing
				destStream.on('close', function() {
					grunt.log.writeln('Created '.green + String(dest).cyan + ' (' + exports.getSize(dest).yellow + ')');
					nextFile();
				});

				var archive = require('archiver').create('zip', exports.options);

				// In case error occurs during archiving
				archive.on('error', function(err) {
					grunt.log.error(err);
					grunt.fail.warn('Archiving failed.');
				});

				archive.pipe(destStream);

				// For each 'misc' type of files
				grunt.util.async.forEachSeries(filePair.misc, function(pattern, nextPattern) {
					// Expand the 'misc' regex and get the paths
					glob(exports.unixifyPath(path.join(basepath || '', pattern)), function(er, expandedFiles) {
						// add 'src' to the array, because it needs to be included in the final result
						expandedFiles.unshift(src);

						// For each file found + the 'src'
						expandedFiles.forEach(function(file) {

							// Read content of each file
							var srcStream = new require('lazystream').Readable(function() {
								return fs.createReadStream(file);
							});
							// Get relative path to this path
							var internalFileName = path.relative(basepath, file);

							// Add the file to the Archive with the name 'internalFileName'
							archive.append(srcStream, { name: internalFileName }, function(err) {
								grunt.verbose.writeln('Archiving ' + file.cyan + ' -> ' + String(dest).cyan + '/'.cyan + file.cyan);
							});
						});
						// Go to next 'misc' pattern
						nextPattern();
					});
				}, function() {
					archive.finalize();
				});
			}, nextPair);
		}, this.async());

		return exports;
	});
};
