/*jshint scripturl:true*/

// Set the start URL
var startUrl = 'http://rdesai:8022/',
    hostUrl = '',
    specialUrl = ['#', '?', '&'],
    redundantUrl = ['/', '#', 'javascript:void(0)'],

    // URL variables
    visitedUrls = [],
    onpageUrls = [],
    pendingUrls = [],

    // Set the status style based on server status code
    status = {
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
    // helpers = require('./helpers'),

    _ = require('underscore'),

    // Fly by the given URL
    screenfly = function(url) {

        // Add the URL to the visited stack
        visitedUrls.push(url);
        onpageUrls = [];

        // Open the URL
        casper.open(
            (url.indexOf(hostUrl)!==-1 ? '' : hostUrl) + url
        );
        casper.then(function initPage() {
            var $this = casper;

            // Display the URL and status
            statusStyle.fg = status[$this.status().currentHTTPStatus] || status['default'];
            $this.echo($this.colorizer.format(url, statusStyle));

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
                mismatchTolerance:0,
                hideElements: '.logger',
                addLabelToFailedImage: true
                // fileNameGetter: function overide_file_naming(){},
                // onPass: function(test){
                //     console.log('\n');
                //     casper.test.pass('No changes found for screenshot ' + test.filename);
                // },
                // onFail: function(test){
                //     console.log('\n');
                //     casper.test.fail('Visual change found for screenshot ' + test.filename + ' (' + test.mismatch + '% mismatch)');
                // },
                // onTimeout: function(test){
                //     console.log('\n');
                //     casper.test.info('Could not complete image comparison for ' + test.filename);
                // },
                // onComplete: function(tests, noOfFails, noOfErrors){

                //     if( tests.length === 0){
                //         console.log("\nMust be your first time?");
                //         console.log("Some screenshots have been generated in the directory " + _root);
                //         console.log("This is your 'baseline', check the images manually. If they're wrong, delete the images.");
                //         console.log("The next time you run these tests, new screenshots will be taken.  These screenshots will be compared to the original.");
                //         console.log('If they are different, PhantomCSS will report a failure.');
                //     } else {
                                
                //         if(noOfFails === 0){
                //             console.log("\nPhantomCSS found " + tests.length + " tests, None of them failed. Which is good right?");
                //             console.log("\nIf you want to make them fail, go change some CSS - weirdo.");
                //         } else {
                //             console.log("\nPhantomCSS found " + tests.length + " tests, " + noOfFails + ' of them failed.');
                //             console.log('\nPhantomCSS has created some images that try to show the difference (in the directory '+_diffRoot+'). Fuchsia colored pixels indicate a difference betwen the new and old screenshots.');
                //         }

                //         if(noOfErrors !== 0){
                //             console.log("There were " + noOfErrors + "errors.  Is it possible that a baseline image was deleted but not the diff?");
                //         }

                //         exitStatus = noOfErrors+noOfFails;
                //     }
                // },
            });
            phantomcss.turnOffAnimations();
            phantomcss.screenshot(
                'body',
                500,
                '#fixed-isi',
                url.filename
            );

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
                            // if(tempLink.hostname === window.location.hostname) $this.echo($this.colorizer.format('-> Pushed ' + l + ' onto the stack', { fg: 'magenta' }));
                            return tempLink.hostname === window.location.hostname;
                        }
                    )
                )
            );
        });
        casper.then(function nextLink() {
            // If there are URLs to be processed
            if (pendingUrls.length > 0) {
                var nextUrl = pendingUrls.shift();
                // $this.echo($this.colorizer.format('<- Popped ' + nextUrl + ' from the stack', { fg: 'blue' }));
                screenfly(nextUrl);
            }

        });
    };

// Start flying
casper
    .start(startUrl, function() {
        screenfly(startUrl);
    // })
    // .then( function now_check_the_screenshots(){
    //     phantomcss.compareAll();
    // })
    // .then( function end_it(){
    //     casper.test.done();
    // })
    // .run(function(){
    //     // Casper runs tests
    //     console.log('\nTHE END.');
    //     phantom.exit(phantomcss.getExitStatus());
    });

// Start the run
casper.run();
