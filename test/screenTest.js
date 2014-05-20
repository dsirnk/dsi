/*
 * DSI - Screenfly
 *
 *
 * Copyright (c) 2013 Ronak Desai
 * Licensed under the MIT license.
 */

// 'use strict';
/*jshint scripturl:true*/

var startUrl = require('../config.json').websites[0].link,
    hostUrl = '',
    specialUrl = ['#', '?', '&'],
    redundantUrl = ['', '/', '#', 'javascript:void(0)'],

    // URL variables
    visitedUrls = [],
    pendingUrls = [],

    $c = casper,
    _ = require('lodash'),
    // Create instances
    // $c = require('$c').create({ /*verbose: true, logLevel: 'debug'*/ }),

    Screenfly = function (options) {
        // init URLs
        this._url = ((typeof options === 'string') ?
            options : options.url
        ) || 'http://localhost/';
        this._filename = options.filename || 'home';
        this._status = '';
        this._onPageUrls = options.onPageUrls || [];

        this._url = (this._url.indexOf(hostUrl) !== -1 ? '' : hostUrl) + this._url;

        this.init();
    };

Screenfly.prototype = {
    // Fly by the given URL
    init: function () {

        var $page = this;

        // Open the URL
        $c
            .start(this._url)
            .then(function () {

                // Add the URL to the visited stack
                visitedUrls.push($page._url);

                console.log('/*==========  Screenfly -> $page  ==========*/');
                console.log(JSON.stringify($page));
                console.log('/*==========  visitedUrls  ==========*/');
                console.log(JSON.stringify(visitedUrls));

                hostUrl = $c.evaluate(function () {
                    $page._filename = window.location.href
                        .toLowerCase()
                        .replace(window.location.origin, '')
                        .replace(/[^\w]+/g, '-')
                        .replace(/^-+|-+$/g, '') || 'home';
                    return window.location.origin;
                });

                // Display the URL and status
                $page._status = $c.status().currentHTTPStatus;

                if ($page._status) {
                    // #todo: use modular code (dependency: oop) to avoid confusion (i.e. implement -> [$page._status ? 'proceed' : 'stop'](); )
                    $c.echo($c.colorizer.format($page._status + ' Opened ' + url, {
                        fg: {
                            200: 'green',
                            404: 'red',
                            'default': 'magenta'
                        }.$page._status,
                        bold: true
                    }));
                } else {
                    $c.echo($c.colorizer.format('>< Escaped ' + url, {
                        fg: 'red'
                    }));
                }
            });
    },
    screenshot: function () {
        phantomcss.init({
            mismatchTolerance: 0.0,
            hideElements: '.logger',
            addLabelToFailedImage: true,
            onFail: function (test) {
                console.log('onFail');
                console.log(test.filename, test.mismatch);
            },
            onPass: function () {
                console.log('onPass');
                console.log(test.filename);
            },
            onTimeout: function () {
                console.log('onTimeout');
                console.log(test.filename);
            },
            onComplete: function (allTests, noOfFails, noOfErrors) {
                allTests.forEach(function (test) {
                    if (test.fail) {
                        console.log('onComplete');
                        console.log(test.filename, test.mismatch);
                    }
                });
            },
        });
        phantomcss.turnOffAnimations();
        $c.echo('Taking screenshot');
        phantomcss.screenshot(
            'body',
            0,
            '#fixed-isi',
            // #todo: use oop implementation to resolve incorrect filenames
            url.filename
        );
    },
    crawl: function () {
        // Add newly found URLs to the stack
        pendingUrls = pendingUrls.concat(
            _.uniq(
                _.filter(
                    // Find links present on this page
                    $c.evaluate(function () {
                        return Array.prototype.map.call(document.querySelectorAll('a'), function (e) {
                            // #todo: Filtering can / should happen here
                            return e.getAttribute('href');
                        });
                    }),
                    // Filter redundant and external urls

                    function (l) {
                        if (redundantUrl.concat(pendingUrls).concat(visitedUrls).indexOf(l) !== -1) return false;
                        if (specialUrl.indexOf(l[0]) !== -1) {
                            onPageUrls.push();
                            return false;
                        }
                        var tempLink = document.createElement('a');
                        tempLink.href = l;
                        if (tempLink.hostname === window.location.hostname) $c.echo($c.colorizer.format('->> Pushed ' + l, {
                            fg: 'magenta'
                        }));
                        return tempLink.hostname === window.location.hostname;
                    }
                )
            )
        );
    },
    nextOpen: function () {
        // If there are URLs to be processed
        if (pendingUrls.length > 0) {
            var nextUrl = pendingUrls.shift();
            $c.echo($c.colorizer.format('<<- Popped ' + nextUrl, {
                fg: 'blue'
            }));
            pendingUrls[nextUrl] = new Screenfly(nextUrl);
        }
    }
};

pendingUrls.push(new Screenfly(startUrl));

/**

// Start flying
$c
    .start(startUrl, function () {
        pendingUrls.push(new Screenfly(startUrl));
    });

// Start the run
$c.run();

/**

function ParentClass() {}

ParentClass.prototype = {
    walk: function () {
        console.log('I am walking!');
    },
    sayHello: function () {
        console.log('hello');
    },
}

// define the ChildClass class

function ChildClass() {
    // Call the parent constructor
    ParentClass.call(this);
};

// inherit ParentClass
ChildClass.prototype = new ParentClass();

// correct the constructor pointer because it points to ParentClass
ChildClass.prototype.constructor = ChildClass;

// replace the sayHello method
ChildClass.prototype.sayHello = function () {
    console.log('hi, I am a ChildClass');
};

// add sayGoodBye method
ChildClass.prototype.sayGoodBye = function () {
    console.log('goodBye');
};

var ChildClass1 = new ChildClass();
ChildClass1.sayHello();
ChildClass1.walk();
ChildClass1.sayGoodBye();
/**/
