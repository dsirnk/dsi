/*
 * DSI - Screening
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';
/*jshint scripturl:true*/

var _           = require('lodash'),
    qs          = require('querystring'),
    fs          = require('fs'),

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
                    wait       : function (q) { return q[0]; },
                    scrolly    : function (q) { casper.scrollTo(0, q[0]); },
                    hover      : function (q) { casper.mouse.move(q[0]); },
                    focus      : function (q) { casper.mouse.click(q[0]); },
                    click      : function (q) { casper.mouse.click(q[0]); },
                    addclass   : function (q) {
                                    if (q[1]) logVerbose('- ' + q[0] + ' >> ' + casper.evaluate(function (q) { return $(q[0]).addClass(q[1]).attr('class'); }, q));
                                    else logError('Error: expected format for addClass is addClass=selector|className');
                                },
                    addattr    : function (q) {
                                    if (q[1] && q[2]) logVerbose('-  ' + casper.evaluate(function (q) { return $(q[0]).attr(q[1], q[2]).attr(q[1]); }, q));
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

    Screening   = function (options) {
        var page = this;

        page._id         = ++id;
        page._url        = ((typeof options === 'string') ? options : options.url).split('?');
        page._qs         = qs.parse(page._url[1]);
        page._ev         = {};
        for (var e in page._qs) {
            if (simulate[e.toLowerCase()]) {
                page._ev[e.toLowerCase()] = page._qs[e].split('|');
                delete page._qs[e];
            }
        }
        page._qs         = qs.stringify(page._qs);
        page._url        = [page._url[0], page._qs].join(page._qs?'?':'');
        page._filename   = options.filename;
        page._onPageUrls = options.onPageUrls || [];

        casper
            .thenOpen((!~page._url.indexOf(hostUrl) ? hostUrl : '') + page._url)
            .then(function () {
                // init
                page._location = casper.getGlobal('location');
                page._filename = page._filename || (page._id + '.' + (page._location.pathname.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'home'));
                page._status = casper.status().currentHTTPStatus;
                page._isOpen = !!page._status;
                if (!hostUrl) hostUrl = page._location.origin;
            })
            .then(function () {
                // process
                if (page._isOpen) {
                    visitedUrls.push(page._url);
                    log(page._status + ' Opened ' + page._url + ' ' + obj(page._ev), logStyle[page._status]);
                } else {
                    logError(page._status || '   ' + ' Escaped ' + page._url);
                    casper.bypass(3);
                }
            })
            .then(function () {
                // simulate
                casper.wait(500, function () {
                    for (var e in page._ev) simulate[e](page._ev[e]);
                    logScreen();
                });
            })
            .then(function () {
                // screenshot
                casper.wait((page._qs.wait || [1])[0], function () {
                    // phantomcss.turnOffAnimations();
                    phantomcss.screenshot('body', './' + page._filename);
                });
            })
            .then(function () {
                // crawl
                if (!customUrls) {
                    pendingUrls = pendingUrls.concat(
                        _.uniq(
                            _.filter(
                                casper.evaluate(function () {
                                    return Array.prototype.map.call(document.querySelectorAll('a'), function (e) {
                                        // #todo: Uniq or Filtering or Both can happen here
                                        return e.getAttribute('href');
                                    });
                                }), function (l) {
                                    // Filter redundant and external urls
                                    if (!!~visitedUrls.concat(pendingUrls).indexOf(l) || l.match(/^$|^(javascript:\s*void\(0*\))|^\/$|^#$|^tel:/gi)) return false;
                                    if (!!~['#', '?', '&'].indexOf(l[0])) { page._onPageUrls.push(); return false; }
                                    var tempLink = document.createElement('a');
                                    tempLink.href = l;
                                    if (tempLink.hostname === window.location.hostname) logInfo('->> Pushed ' + l);
                                    return tempLink.hostname === window.location.hostname;
                                }
                            )
                        )
                    );
                }
            })
            .then(function () {
                // next
                // If there are URLs to be processed
                if (!!pendingUrls.length) {
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
new Screening(!customUrls ? startUrl : pendingUrls.shift());
