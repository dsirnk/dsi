/*
 * DSI - Screenfly
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';
/*jshint scripturl:true*/

var _           = require('lodash'),
    querystring = require('querystring'),
    startUrl    = require('../config.json').websites[0].domain || 'http://localhost/',
    customUrls  = require('../config.json').websites[0].links,

    id          = 0,
    hostUrl     = '',
    visitedUrls = [],
    pendingUrls = [],

    logStyle    = {
        'default': { fg: 'cyan',    bold: true },
        'info'   : { fg: 'blue',    bold: true },
        'info2'  : { fg: 'magenta', bold: true },
        'success': { fg: 'green',   bold: true },
        'warning': { fg: 'yellow',  bold: true },
        'error'  : { fg: 'red',     bold: true },
        '200'    : { fg: 'green',   bold: true },
        '404'    : { fg: 'yellow',  bold: true }
    },
    log         = function(str, style) { casper.echo(casper.colorizer.format(str, style || logStyle.default)); },
    logInfo     = function(str) { log(str, logStyle.info); },
    logInfo2    = function(str) { log(str, logStyle.info2); },
    logSuccess  = function(str) { log(str, logStyle.success); },
    logWarning  = function(str) { log(str, logStyle.warning); },
    logError    = function(str) { log(str, logStyle.error); },
    logObject   = function(obj) { return JSON.stringify(obj, null, 4); }

    Screenfly   = function (options) {
        // init URLs
        this._id         = ++id;
        this._url        = ((typeof options === 'string') ? options : options.url);
        this._filename   = options.filename;
        this._onPageUrls = options.onPageUrls || [];

        // Open the URL
        var page = this;
        casper
            .thenOpen((!~page._url.indexOf(hostUrl) ? hostUrl : '') + page._url)
            .then(function () { page.init(); })
            .then(function () { page.process(); })
            .then(function () { page.simulate(); })
            .then(function () { page.screenshot(); })
            .then(function () { page.crawl(); })
            .then(function () { page.next(); });
    };

Screenfly.prototype = {
    // Fly by the given URL
    init: function () {
        this._location = casper.getGlobal('location');
        this._filename = this._filename || (this._id + '.' + (this._location.pathname.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'home'));
        this._status = casper.status().currentHTTPStatus;
        this._isOpen = !!this._status;
        if (!hostUrl) hostUrl = this._location.origin;
    },
    process: function () {
        if (this._isOpen) {
            // #todo: use modular code (dependency: oop) to avoid confusion (i.e. implement -> [this._status ? 'proceed' : 'stop'](); )
            // Add the URL to the visited stack
            visitedUrls.push(this._url);
            log(this._status + ' Opened ' + this._url, logStyle[this._status]);
        } else {
            logError(this._status || '   ' + ' Escaped ' + this._url);
            casper.bypass(3);
        }
    },
    simulate: function () {
        var $this = this,
            events = {
                // wait    : function(query) { $this._delay = query.seg[0]; },
                // scrolly : function(query) { casper.scrollTo(0, query.seg[0]); },
                // hover   : function(query) { casper.mouse.move(query.selector); },
                // focus   : function(query) { casper.mouse.click(query.selector); },
                // click   : function(query) { casper.mouse.click(query.selector); },
                // addclass: function(query) {
                //     if (query.seg[1]) casper.evaluate(function(q) { $(q.selector).addClass(q.seg[1]); }, query);
                //     else logError('Error: expected format for addClass is addClass=selector|className');
                // },
                // addattr : function(query) {
                //     if (query.seg[1] && query.seg[2]) casper.evaluate(function(q) { $(q.selector).attr(q.seg[1], q.seg[2]); }, query);
                //     else logError('Error: expected format for addAttr is addAttr=selector|AttributeName|Attribute value');
                // }
            };

        this._qs = querystring.parse(this._location.search.slice(1).toLowerCase);
        for (var e in this._qs) {
            this._qs[e] = { 'seg' : this._qs[e].split('|') };
            this._qs[e].selector = (/[\.\[ ]/i.test(this._qs[e].seg[0]) ? '' : '#') + this._qs[e].seg[0];
            // logInfo(e + ' -> ' + logObject(this._qs[e]));
            if (events[e]) events[e](this._qs[e]);
            // else logError(e + ' -> ' + logObject(this._qs));
        }
    },
    screenshot: function () {
        var $this = this;
        casper.wait($this._delay || 1, function() {
            phantomcss.turnOffAnimations();
            phantomcss.screenshot('body', $this._filename);
        });
    },
    crawl: function () {
        var $this = this;
        if (!customUrls) {
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
                                $this._onPageUrls.push();
                                return false;
                            }
                            var tempLink = document.createElement('a');
                            tempLink.href = l;
                            // if (tempLink.hostname === window.location.hostname) logInfo('->> Pushed ' + l);
                            return tempLink.hostname === window.location.hostname;
                        }
                    )
                )
            );
        }
    },
    next: function () {
        // If there are URLs to be processed
        if (!!pendingUrls.length) {
            var nextUrl = pendingUrls.shift();
            // logInfo2('<<- Popped ' + logObject(nextUrl));
            new Screenfly(nextUrl);
        } else {
            // Done
            casper
                .then(function () { phantomcss.compareAll(); })
                .then(function () { casper.test.done(); })
                .run(function () { phantom.exit(phantomcss.getExitStatus()); });
        }
    }
};

casper.start();
// casper.options.verbose = true;
// casper.options.logLevel = "debug";
phantomcss.init({
    mismatchTolerance: 0.0,
    hideElements: '.logger, #fixed-isi',
    onFail: function (test) {},
    onPass: function (test) {},
    onTimeout: function (test) {},
    onComplete: function (allTests, noOfFails, noOfErrors) {
        allTests.forEach(function (test) {
            if (test.fail) logError(test.mismatch + ' ' + test.filename);
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
    hostUrl = startUrl;
    // avoid addition of duplicates while crawling
    visitedUrls.push(customUrls[page]);
}

new Screenfly(!customUrls ? startUrl : pendingUrls.shift());

/**
require('../config.json').websites.forEach(function(website) {
    // code for website.domain;
})
/**/
