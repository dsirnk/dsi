/*
 * DSI - Screening
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';
/*jshint scripturl:true*/

var fs          = require('fs'),

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
    obj         = function (str, style) {
                    return casper.colorizer.format(
                        typeof str === 'object' ? JSON.stringify(str, null, 4) : str,
                        style || logStyle.default
                    );
                },
    log         = function (str, style) { casper.echo(obj(str, style)); },
    logInfo     = function (str) { if(debug) log(str, logStyle.info); },
    logInfo2    = function (str) { if(debug) log(str, logStyle.info2); },
    logVerbose  = function (str) { if(verbo) log(str, logStyle.info2); },
    logSuccess  = function (str) { log(str, logStyle.success); },
    logWarning  = function (str) { log(str, logStyle.warning); },
    logError    = function (str) { log(str, logStyle.error); },
    logScreen   = function () { if(debug) casper.evaluate(function (img) { __utils__.sendAJAX('http://localhost:8002/', 'POST', { 'img' : img }, false); }, casper.captureBase64('png')); },

    simulate    = {
                    wait       : function (e) { return e.el; },
                    scrolly    : function (e) { casper.scrollTo(0, e.el); },
                    hover      : function (e) { casper.mouse.move(e.el); },
                    focus      : function (e) { casper.mouse.click(e.el); },
                    click      : function (e) { casper.mouse.click(e.el); },
                    addclass   : function (e) {
                                    if (e.name) logVerbose('- ' + e.el + ' >> ' + casper.evaluate(function (e) { return $(e.el).addClass(e.name).attr('class'); }, e));
                                    else logError('Error: expected format for addClass is addClass=selector|className');
                                },
                    addattr    : function (e) {
                                    if (e.name && e.val) logVerbose('-  ' + casper.evaluate(function (e) { return $(e.el).attr(e.name, e.val).attr(e.name); }, e));
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
    customUrls  = (function (links) {
                    for (var l in links) {
                        pendingUrls.push({ 'url': links[l], 'filename': l });
                        hostUrl = startUrl;
                        // avoid addition of duplicates while crawling
                        visitedUrls.push(links[l]);
                    }
                    return links;
                })(args.links),
    selector    = function(s) { return (!s.indexOf('html') || !s.indexOf('body') || (/[\.\[ ]/i.test(s)) ? '' :  '#') + s; },

    Screening   = function (options) {
        var page        = this;

        page._id        = ++id;
        page._url       = decodeURIComponent((typeof options === 'string') ? options : options.url);
        page._ev        = (function() {
                            var regEx = /([^&=]+)=([^&|]*)\|*([^&]*)&*/g,
                                qs = page._url.split('?')[1], m, result = [];
                            while (m = regEx.exec(qs)) {
                                if(simulate[m[1] = m[1].toLowerCase()]) {
                                    page._url = page._url.replace(m[0], '', 1);
                                    result.push({ event: m[1], el: selector(m[2]), name: m[3], val: m[4] });
                                }
                            }
                            return result;
                        })();
        page._filename  = options.filename || (page._id + '.' + (page._url.replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'home').toLowerCase());
        page._anchors   = options.anchors || [];

        casper
            .thenOpen((!~page._url.indexOf(hostUrl) ? hostUrl : '') + page._url)
            .then(function () {
                // init
                page._location = this.getGlobal('location');
                page._status   = this.status().currentHTTPStatus;
                if (!hostUrl) hostUrl = page._location.origin;
            })
            .then(function () {
                // process
                if (!!page._status) {
                    visitedUrls.push(page._url);
                    log(page._status + ' Opened ' + page._filename + ' ' + page._url + ' ' + obj(page._ev), logStyle[page._status]);
                } else {
                    logError(page._status || '   ' + ' Escaped ' + page._url);
                    this.bypass(3);
                }
            })
            .then(function () {
                // simulate
                this.evaluate(function() {
                    if(window.getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)')
                        document.body.style.backgroundColor = 'white';
                });
                page._ev.forEach(function(e) { simulate[e.event](e); });
                logScreen(); this.bypass(1);
            })
            .then(function () {
                // screenshot
                this.wait(3000, function () {
                    // phantomcss.turnOffAnimations();
                    phantomcss.screenshot('body', './' + page._filename);
                });
            })
            .then(function () {
                // crawl
                if (!customUrls) {
                    logInfo('->> Pushed ' +
                        obj(pendingUrls = pendingUrls.concat(this.evaluate(
                            function (filteredUrls, redundantUrls) {
                                return Array.prototype.filter.call(document.querySelectorAll('a'), function (e) {
                                    var l = e.getAttribute('href');
                                    if (e.hostname !== window.location.hostname) return false;
                                    if (~filteredUrls.indexOf(l.toLowerCase())) return false;
                                    if (l.match(redundantUrls)) return false;
                                    return true;
                                }).map(function(e) { return e.getAttribute('href'); });
                            },
                            visitedUrls.concat(pendingUrls).map(function(l) { return l.toLowerCase(); }),
                            /^$|^(javascript:)|^\/$|^[#?&]|^tel:/gi
                        )))
                    );
                }
            })
            .then(function () {
                // If there are URLs to be processed
                if (!!pendingUrls.length) {
                    // next
                    var nextUrl = pendingUrls.shift();
                    logInfo2('<<- Popped ' + obj(nextUrl));
                    new Screening(nextUrl);
                }
            });
    };

casper.options.verbose = verbo;
casper.options.logLevel = debug ? 'debug' : '';

casper.start();

phantomcss.init({
    mismatchTolerance       : 0.0,
    hideElements            : '#fixed-isi',
    cleanupComparisonImages : true,
    addLabelToFailedImage   : false,
    // fileNameGetter          : function (root, filename) {},
    onFail                  : function (test) {},
    onPass                  : function (test) {},
    onTimeout               : function (test) {},
    onComplete              : function (allTests, noOfFails, noOfErrors) {
                                allTests.forEach(function (test) { if (test.fail) logError(test.filename); });
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
new Screening(!customUrls ? startUrl : pendingUrls.shift());
