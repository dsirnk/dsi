/*
 * DSI - Screenfly
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';
/*jshint scripturl:true*/

// init URLs
var startUrl = require('../config.json').websites[0].link,
    hostUrl = '',
    specialUrl = ['#', '?', '&'],
    redundantUrl = ['/', '#', 'javascript:void(0)'],

    // Modules
    _ = require('lodash'),

    // URL variables
    visitedUrls = [],
    pendingUrls = [],
    onpageUrls = [],

    // Set the status style based on server status code
    status = {
        'current': 'default',
        200: 'green',
        404: 'red',
        'default': 'magenta'
    },
    statusStyle = {
        fg: status['default'],
        bold: true
    },

    // Create instances
    // casper = require('casper').create({ /*verbose: true, logLevel: 'debug'*/ }),

    // Fly by the given URL
    screenfly = {
        onPage: function(url) {

            // Add the URL to the visited stack
            visitedUrls.push(url);
            onpageUrls = [];

            url = (url.indexOf(hostUrl) !== -1 ? '' : hostUrl) + url;

            // Open the URL
            casper
                .open(url)
                .then(function initPage() {
                    var $this = casper;

                    // Display the URL and status
                    status.current = $this.status().currentHTTPStatus;
                    if (status.current) {
                        statusStyle.fg = status[status.current] || status['default'];
                        $this.echo($this.colorizer.format(status.current + ' Opened ' + url, statusStyle));
                        // grunt.log.writeln('Opened ' + url);

                        url = $this.evaluate(function() {
                            return {
                                'host': window.location.origin,
                                'filename': window.location.href
                                    .toLowerCase()
                                    .replace(window.location.origin, '')
                                    .replace(/[^\w]+/g, '-')
                                    .replace(/^-+|-+$/g, '') || 'home'
                            };
                        });
                        hostUrl = url.host;

                        phantomcss.init({
                            mismatchTolerance: 0.0,
                            hideElements: '.logger',
                            addLabelToFailedImage: true,
                            onFail: function(test) {
                                console.log('onFail');
                                console.log(test.filename, test.mismatch);
                            },
                            onPass: function() {
                                console.log('onPass');
                                console.log(test.filename);
                            },
                            onTimeout: function() {
                                console.log('onTimeout');
                                console.log(test.filename);
                            },
                            onComplete: function(allTests, noOfFails, noOfErrors) {
                                allTests.forEach(function(test) {
                                    if (test.fail) {
                                        console.log('onComplete');
                                        console.log(test.filename, test.mismatch);
                                    }
                                });
                            },
                        });
                        phantomcss.turnOffAnimations();
                        $this.echo('Taking screenshot');
                        phantomcss.screenshot(
                            'body',
                            0,
                            '#fixed-isi',
                            url.filename
                        );

                        /**/
                        // Add newly found URLs to the stack
                        pendingUrls = pendingUrls.concat(
                            _.uniq(
                                _.filter(
                                    // Find links present on this page
                                    $this.evaluate(function() {
                                        return Array.prototype.map.call(document.querySelectorAll('a'), function(e) {
                                            return e.getAttribute('href');
                                        });
                                    }),
                                    // Filter redundant and external urls

                                    function(l) {
                                        if (redundantUrl.concat(pendingUrls).concat(visitedUrls).indexOf(l) !== -1) return false;
                                        if (specialUrl.indexOf(l[0]) !== -1) {
                                            onpageUrls.push();
                                            return false;
                                        }
                                        var tempLink = document.createElement('a');
                                        tempLink.href = l;
                                        if (tempLink.hostname === window.location.hostname) $this.echo($this.colorizer.format('->> Pushed ' + l, {
                                            fg: 'magenta'
                                        }));
                                        return tempLink.hostname === window.location.hostname;
                                    }
                                )
                            )
                        );
                        /**/
                    } else {
                        $this.echo($this.colorizer.format('>< Escaped ' + url, {
                            fg: 'red'
                        }));
                    }

                    // If there are URLs to be processed
                    if (pendingUrls.length > 0) {
                        var nextUrl = pendingUrls.shift();
                        $this.echo($this.colorizer.format('<<- Popped ' + nextUrl, {
                            fg: 'blue'
                        }));
                        screenfly.onPage(nextUrl);
                    }

                });
        }
    };

// Start flying
casper
    .start(startUrl, function() {
        screenfly.onPage(startUrl);
    });

// Start the run
casper.run();
