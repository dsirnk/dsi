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
    fs          = require('fs'),
    querystring = require('querystring'),

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
    obj         = function(str, style) {
                    str = casper.colorizer.format(
                        typeof str === 'object' ? JSON.stringify(str, null, 4) : str,
                        style || logStyle.default
                    );
                    return str;
                },
    log         = function(str, style) { casper.echo(obj(str, style)); },
    logInfo     = function(str) { if(debug) log(str, logStyle.info); },
    logInfo2    = function(str) { if(debug) log(str, logStyle.info2); },
    logVerbose  = function(str) { if(verbo) log(str, logStyle.info2); },
    logSuccess  = function(str) { log(str, logStyle.success); },
    logWarning  = function(str) { log(str, logStyle.warning); },
    logError    = function(str) { log(str, logStyle.error); },

    simulate    = {
                    wait       : function(q) { return q[0]; },
                    scrolly    : function(q) { casper.scrollTo(0, q[0]); },
                    hover      : function(q) { casper.mouse.move(q[0]); },
                    focus      : function(q) { casper.mouse.click(q[0]); },
                    click      : function(q) { casper.mouse.click(q[0]); },
                    addclass   : function(q) {
                        if (q[1]) logVerbose('- ' + q[0] + ' >> ' + casper.evaluate(function(q) { return $(q[0]).addClass(q[1]).attr('class'); }, q));
                        else logError('Error: expected format for addClass is addClass=selector|className');
                    },
                    addattr    : function(q) {
                        if (q[1] && q[2]) logVerbose('-  ' + casper.evaluate(function(q) { return $(q[0]).attr(q[1], q[2]).attr(q[1]); }, q));
                        else logError('Error: expected format for addAttr is addAttr=selector|AttributeName|Attribute value');
                    }
                },

    id          = 0,
    sep         = fs.separator,
    config      = require('../config.json'),
    debug       = config.debug,
    verbo       = config.verbose,
    args        = JSON.parse(phantom.args[0]),
    startUrl    = args.domain || 'http://localhost/',
    hostUrl     = '',
    visitedUrls = [],
    pendingUrls = [],
    customUrls  = (function(links) {
                    for (var l in links) {
                        pendingUrls.push({ 'url': links[l], 'filename': l });
                        hostUrl = startUrl;
                        // avoid addition of duplicates while crawling
                        visitedUrls.push(links[l]);
                    }
                    return links;
                })(args.links),

    Screenfly   = function (options) {
        this._id         = ++id;
        this._url        = ((typeof options === 'string') ? options : options.url).split('?');
        this._qs         = querystring.parse(this._url[1]);

        this._qs['?']    = {};
        for (var e in this._qs)
            if (simulate[e.toLowerCase()]) this._qs[e] = this._qs[e].split('|');
            else if(e !== '?') this._qs['?'][e] = delete this._qs[e];
        this._qs['?']    = querystring.stringify(this._qs['?']);
        this._url        = this._url[0] + (this._qs['?'] ? ('?' + this._qs['?']) : '');

        this._filename   = options.filename;
        this._onPageUrls = options.onPageUrls || [];

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
            visitedUrls.push(this._url);
            log(this._status + ' Opened ' + this._url, logStyle[this._status]);
        } else {
            logError(this._status || '   ' + ' Escaped ' + this._url);
            casper.bypass(3);
        }
    },
    simulate: function () { for (var e in this._qs) simulate[e.toLowerCase()](this._qs[e]); },
    screenshot : function() {
        var $this = this;
        casper.wait(($this._qs.wait || [1])[0], function() {
            phantomcss.screenshot('body', './' + $this._filename);
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
                            if (tempLink.hostname === window.location.hostname) logInfo('->> Pushed ' + l);
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
            logInfo2('<<- Popped ' + obj(nextUrl));
            new Screenfly(nextUrl);
        }
    }
};

casper.options.verbose = verbo;
casper.options.logLevel = debug ? 'debug' : '';

casper.start();

phantomcss.init({
    mismatchTolerance       : 0.0,
    hideElements            : '#fixed-isi',
    cleanupComparisonImages : true,
    addLabelToFailedImage   : false,
    fileNameGetter          : function (root, filename) {
                                var name = root + sep + filename + '.png';
                                return fs.isFile(name) ? (root + sep + 'diff' + sep + filename + '.diff.png') : name;
                            },
    onFail                  : function (test) {},
    onPass                  : function (test) {},
    onTimeout               : function (test) {},
    onComplete              : function (allTests, noOfFails, noOfErrors) {
                                allTests.forEach(function (test) {
                                    if (test.fail) logError(test.mismatch + ' ' + test.filename);
                                });
                            },
    outputSettings          : {
                                errorColor: {
                                    red   : 255,
                                    green : 255,
                                    blue  : 0
                                },
                                errorType    : 'movement',
                                transparency : 0.3
                            }
});

// log(JSON.parse(phantom.args[0]));
new Screenfly(!customUrls ? startUrl : pendingUrls.shift());
