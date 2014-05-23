/*
 * DSI - Screenfly
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';
/*jshint scripturl:true*/

var _ = require('lodash'),
    startUrl = require('../config.json').websites[0].domain,
    customUrls = require('../config.json').websites[0].links,
    hostUrl = '',

    // URL variables
    visitedUrls = [],
    pendingUrls = [],

    statusTheme = {
        200: 'green',
        404: 'red',
        'default': 'magenta'
    },

    Screenfly = function (options) {
        // init URLs
        this._url = ((typeof options === 'string') ?
            options : options.url
        ) || 'http://localhost/';
        this._filename = options.filename;
        this._status = '';
        this._onPageUrls = options.onPageUrls || [];

        // Open the URL
        var page = this;
        casper
            .start((page._url.indexOf(hostUrl) !== -1 ? '' : hostUrl) + page._url)
            .then(function () {
                page.init();
            })
            .then(function () {
                page.process();
            })
            .then(function () {
                page.screenshot();
            })
            .then(function () {
                page.crawl();
            })
            .then(function () {
                page.next();
            })
            .then(function () {
                page.done();
            });
    };

Screenfly.prototype = {
    // Fly by the given URL
    init: function () {
        var page = this;
        page._filename = page._filename || (casper.getGlobal('location').href.toLowerCase().replace(casper.getGlobal('location').origin, '').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'home');
        page._status = casper.status().currentHTTPStatus;
        page._isOpen = !! page._status;
        page._shouldCrawl = page._isOpen && !customUrls;
        if (!hostUrl) hostUrl = casper.getGlobal('location').origin;
    },
    process: function () {
        var page = this;
        if (page._isOpen) {
            // Add the URL to the visited stack
            visitedUrls.push(page._url);

            // #todo: use modular code (dependency: oop) to avoid confusion (i.e. implement -> [page._status ? 'proceed' : 'stop'](); )
            casper.echo(casper.colorizer.format(page._status + ' Opened ' + page._url, {
                fg: statusTheme[page._status] || statusTheme['default'],
                bold: true
            }));
        } else {
            casper.echo(casper.colorizer.format('    Escaped ' + page._url, {
                fg: 'red',
                bold: true
            }));
        }
    },
    screenshot: function () {
        var page = this;
        if (page._isOpen) {
            phantomcss.turnOffAnimations();
            // casper.echo('Taking screenshot and saving to ' + page._filename);
            phantomcss.screenshot(
                'body',
                0,
                '#fixed-isi',
                // #todo: use oop implementation to resolve incorrect filenames
                page._filename
            );
        }
    },
    crawl: function () {
        var page = this;
        if (page._shouldCrawl) {
            pendingUrls = pendingUrls.concat(
                _.uniq(
                    _.filter(page.links, page.filter)
                )
            );
        }
    },
    links: function () {
        var page = this;
        // Find links present on this page
        return casper.evaluate(function () {
            return Array.prototype.map.call(document.querySelectorAll('a'), function (e) {
                // #todo: Filtering can / should happen here
                return e.getAttribute('href');
            });
        });
    },
    filter: function (l) {
        var page = this;
        // Filter redundant and external urls
        if (visitedUrls.concat(pendingUrls).indexOf(l) !== -1 || l.match(/^$|^(javascript:\s*void\(0*\))|^\/$|^#$|^tel:/gi)) return false;
        if (['#', '?', '&'].indexOf(l[0]) !== -1) {
            page._onPageUrls.push();
            return false;
        }
        var tempLink = document.createElement('a');
        tempLink.href = l;
        /**
        if (tempLink.hostname === window.location.hostname) casper.echo(casper.colorizer.format('->> Pushed ' + l, {
            fg: 'magenta',
            bold: true
        }));
        /**/
        return tempLink.hostname === window.location.hostname;
    },
    next: function () {
        // If there are URLs to be processed
        if ( !! pendingUrls.length) {
            var nextUrl = pendingUrls.shift();
            // casper.echo(casper.colorizer.format('<<- Popped ' + nextUrl, { fg: 'blue' }));
            new Screenfly(nextUrl);
        }
    },
    done: function () {
        if (!pendingUrls.length) {
            hostUrl = '';
            casper
                .then(function () {
                    phantomcss.compareAll();
                })
                .then(function () {
                    casper.test.done();
                })
                .run(function () {
                    phantom.exit(phantomcss.getExitStatus());
                });
        }
    }
};

phantomcss.init({
    mismatchTolerance: 0.0,
    hideElements: '.logger',
    onFail: function (test) {},
    onPass: function (test) {},
    onTimeout: function (test) {},
    onComplete: function (allTests, noOfFails, noOfErrors) {
        allTests.forEach(function (test) {
            if (test.fail) {
                console.log(test.mismatch, test.filename);
            }
        });
    },
    outputSettings: {
        errorColor: {
            red: 255,
            green: 255,
            blue: 0
        },
        errorType: 'movement',
        transparency: 0.3
    }
});


for (var page in customUrls) {
    pendingUrls.push({
        'url': customUrls[page],
        'filename': page
    });
    // avoid addition of duplicates while crawling
    visitedUrls.push(customUrls[page]);
}

new Screenfly(startUrl);

/**
require('../config.json').websites.forEach(function(website) {
    code for website.domain;
})
/**/
