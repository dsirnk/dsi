/*
 * DSI - Screenfly
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';
/*jshint scripturl:true*/

var startUrl = require('../config.json').websites[0].domain,
    hostUrl = '',

    // URL variables
    visitedUrls = [],
    pendingUrls = [],

    statusTheme = {
        200: 'green',
        404: 'red',
        'default': 'magenta'
    },

    _ = require('lodash'),

    Screenfly = function(options) {
        // init URLs
        this._url = ((typeof options === 'string') ?
            options : options.url
        ) || 'http://localhost/';
        this._filename = options.filename;
        this._status = '';
        this._onPageUrls = options.onPageUrls || [];

        this.Init();
    };

Screenfly.prototype = {
    // Fly by the given URL
    Init: function() {

        var $page = this;

        // Open the URL
        casper
            .start(($page._url.indexOf(hostUrl) !== -1 ? '' : hostUrl) + $page._url)
            .then(function() {

                if (!hostUrl) hostUrl = casper.getGlobal('location').origin;
                $page._filename = $page._filename || (casper.getGlobal('location').href
                    .toLowerCase()
                    .replace(casper.getGlobal('location').origin, '')
                    .replace(/[^\w]+/g, '-')
                    .replace(/^-+|-+$/g, '') || 'home');

                // Display the URL and status
                $page._status = this.status().currentHTTPStatus;

                if ( !! $page._status) {
                    // #todo: use modular code (dependency: oop) to avoid confusion (i.e. implement -> [$page._status ? 'proceed' : 'stop'](); )
                    casper.echo(casper.colorizer.format($page._status + ' Opened ' + $page._url, {
                        fg: 'green',
                        bold: true
                    }));

                    // Add the URL to the visited stack
                    visitedUrls.push($page._url);

                    $page.Screenshot();
                    $page.Crawl();
                } else {
                    casper.echo(casper.colorizer.format('    Escaped ' + $page._url, {
                        fg: 'red',
                        bold: true
                    }));
                }
            })
            .then(function() {
                $page.Next();
            });
    },
    Screenshot: function() {

        var $page = this;

        phantomcss.turnOffAnimations();
        casper.echo('Taking screenshot and saving to ' + $page._filename);
        phantomcss.screenshot(
            'body',
            0,
            '#fixed-isi',
            // #todo: use oop implementation to resolve incorrect filenames
            $page._filename
        );
    },
    Crawl: function() {

        var $page = this;

        // Add newly found URLs to the stack
        pendingUrls = pendingUrls.concat(
            _.uniq(
                _.filter(
                    // Find links present on this page
                    casper.evaluate(function() {
                        return Array.prototype.map.call(document.querySelectorAll('a'), function(e) {
                            // #todo: Filtering can / should happen here
                            return e.getAttribute('href');
                        });
                    }),
                    // Filter redundant and external urls

                    function(l) {
                        if (visitedUrls.concat(pendingUrls).indexOf(l) !== -1 || l.match(/^$|^(javascript:\s*void\(0*\))|^\/$|^#$|^tel:/gi)) return false;
                        if (['#', '?', '&'].indexOf(l[0]) !== -1) {
                            $page._onPageUrls.push();
                            return false;
                        }
                        var tempLink = document.createElement('a');
                        tempLink.href = l;
                        /**//*
                        if (tempLink.hostname === window.location.hostname) casper.echo(casper.colorizer.format('->> Pushed ' + l, {
                            fg: 'magenta',
                            bold: true
                        }));
                        /**/
                        return tempLink.hostname === window.location.hostname;
                    }
                )
            )
        );
    },
    Next: function() {
        // If there are URLs to be processed
        if (pendingUrls.length > 0) {
            var nextUrl = pendingUrls.shift();
            // casper.echo(casper.colorizer.format('<<- Popped ' + nextUrl, { fg: 'blue' }));
            new Screenfly(nextUrl);
        } else {
            hostUrl = '';
            casper
                .then(function() {
                    phantomcss.compareAll();
                })
                .then(function() {
                    casper.test.done();
                })
                .run(function() {
                    phantom.exit(phantomcss.getExitStatus());
                });
        }
    }
};

phantomcss.init({
    mismatchTolerance: 0.0,
    hideElements: '.logger',
    addLabelToFailedImage: true,
    onFail: function(test) {
        console.log('onFail');
        console.log(test.filename, test.mismatch);
    },
    onPass: function(test) {
        console.log('onPass');
        console.log(test.filename);
    },
    onTimeout: function(test) {
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

new Screenfly(startUrl);

/**//*
require('../config.json').websites.forEach(function(website) {
    code for website.domain;
})
/**/