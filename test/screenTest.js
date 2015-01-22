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
    querystring = require('querystring'),
    startUrl = require('../config.json').websites[0].domain,
    customUrls = require('../config.json').websites[0].links,
    hostUrl = '',
    id = 0,

    // URL variables
    visitedUrls = [],
    pendingUrls = [],

    statusTheme = {
        200: 'green',
        404: 'magenta',
        'error': 'red',
        'default': 'cyan'
    },
    events = {
        wait: function(query) { delay = query.value; },
        click: function(query) { casper.mouse.click(query.selector); },
        hover: function(query) { casper.mouse.move(query.selector); },
        focus: function(query) { casper.mouse.click(query.selector); },
        scrolly: function(query) { casper.scrollTo(0, query.value); },
        addclass: function(query) {
            if (query.seg[1]) casper.evaluate(function(q) { $(q.selector).addClass(q.seg[1]); }, query);
            else casper.echo(casper.colorizer.format('Error: expected format for addClass is addClass=selector|className', {
                fg: statusTheme.error,
                bold: true
            }));
        },
        addattr: function(query) {
            if (query.seg[1] && query.seg[2]) casper.evaluate(function(q) { $(q.selector).attr(q.seg[1], q.seg[2]); }, query);
            else casper.echo(casper.colorizer.format('Error: expected format for addAttr is addAttr=selector|AttributeName|Attribute value', {
                fg: statusTheme.error,
                bold: true
            }));
        },
        setcookie: function(query) {
            document.cookie = query.seg[0] + "=" + '' + "; expires = -1; path=/"
            document.cookie = query.seg[0] + "=" + query.seg[1] + "; path=/";
        },
        deleteCookie: function(name) {
            events.setcookie(name, '', -1);
        }
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
            .then(function () { page.init(); })
            .then(function () { page.process(); })
            .then(function () { page.simulate(); })
            .then(function () { page.screenshot(); })
            .then(function () { page.crawl(); })
            .then(function () { page.next(); })
            .then(function () { page.done(); });
    };

Screenfly.prototype = {
    // Fly by the given URL
    init: function () {
        var page = this;
        page._id = ++id;
        page._location = casper.getGlobal('location');
        page._filename = page._filename || (page._id + '.' + (page._location.pathname.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'home'));
        page._status = casper.status().currentHTTPStatus;
        page._isOpen = !! page._status;
        page._shouldCrawl = page._isOpen && !customUrls;
        if (!hostUrl) hostUrl = page._location.origin;
    },
    process: function () {
        var page = this;
        if (page._isOpen) {
            // Add the URL to the visited stack
            visitedUrls.push(page._url);

            // #todo: use modular code (dependency: oop) to avoid confusion (i.e. implement -> [page._status ? 'proceed' : 'stop'](); )
            casper.echo(casper.colorizer.format(page._status + ' Opened ' + page._url, {
                fg: statusTheme[page._status] || statusTheme.default,
                bold: true
            }));
        } else {
            casper.echo(casper.colorizer.format('    Escaped ' + page._url, {
                fg: statusTheme.error,
                bold: true
            }));
        }
    },
    simulate: function () {
        var page = this;
        page._qs = querystring.parse(page._location.search.slice(1));
        for (var e in page._qs) {
            page._qs[e] = { 'seg' : page._qs[e].split('|') };
            page._qs[e].selector = (/[\.\[ ]/i.test(page._qs[e].seg[0]) ? '' : '#') + page._qs[e].seg[0];

            (events[e] || function() {})(page._qs[e]);
        }
    },
    screenshot: function () {
        var page = this;
        if (page._isOpen) {
            phantomcss.turnOffAnimations();
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
                    _.filter(
                        casper.evaluate(function () {
                            return Array.prototype.map.call(document.querySelectorAll('a'), function (e) {
                                // #todo: Filtering can / should happen here
                                return e.getAttribute('href');
                            });
                        }), function (l) {
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
                        }
                    )
                )
            );
        }
    },
    next: function () {
        // If there are URLs to be processed
        if ( !! pendingUrls.length) {
            var nextUrl = pendingUrls.shift();
            /**
            casper.echo(casper.colorizer.format('<<- Popped ' + nextUrl, {
                fg: 'blue',
                bold: true
            }));
            /**/
            new Screenfly(nextUrl);
        }
    },
    done: function () {
        if (!pendingUrls.length) {
            hostUrl = '';
            casper
                .then(function () { phantomcss.compareAll(); })
                .then(function () { casper.test.done(); })
                .run(function () { phantom.exit(phantomcss.getExitStatus()); });
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
    // code for website.domain;
})
/**/
