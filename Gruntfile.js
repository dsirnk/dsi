module.exports = function (grunt) {

    // Metadata.
    var config = require('./config.json'),
        path = require('path'),

        // My custom variables
        websites = 'websites',
        websiteFiles = path.join(websites, '**/*.+(css|js|htm|html|cshtml|gif|png|jpg|jpeg)'),

        emails = 'emails',
        emailFiles = '**/*.+(htm|html)',
        emailZips = path.join(emails, emailFiles + '.zip'),

        screening = 'lib/**/*screening.js',

        base = 'base',
        next = 'next',

        win = process.platform === 'win32';

    // load all npm grunt tasks
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        // jsHint all js files
        jshint: {
            gruntfile: {
                src: 'Gruntfile.js'
            },
            emailer: {
                src: 'tasks/**/*emailer.js',
            },
            phantomcss: {
                src: screening,
            },
            all: ['*.js']
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            emails: [emailZips],
            // screenOld: ['*/' + base],
            screenNew: ['*/' + next],
            websites: [websites]
        },

        emailer: {
            zip: {
                expand: true,
                cwd: emails,
                src: [emailFiles],
                misc: ['**/*.+(jpg|jpeg|gif|png)']
            }
        },

        phantomcss: {
            /**
            desktop: {
                options: {
                    viewportSize: [1280, 800],
                    domain: config.websites.brintellix.domain,
                    links: config.websites.brintellix.pkgs.desktop.links,
                    screenshots: path.join('brintellix', base, 'desktop'),
                    results: path.join('brintellix', next, 'desktop')
                },
                src: [screening]
            },
            /**
            mobile: {
                options: {
                    viewportSize: [320, 480],
                    domain: config.websites.brintellix.domain,
                    links: config.websites.brintellix.pkgs.mobile.links || config.websites.brintellix.pkgs.desktop.links,
                    screenshots: path.join('brintellix', base, 'mobile'),
                    results: path.join('brintellix', next, 'mobile')
                },
                src: [screening]
            }
            /**/
        },

        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint:gruntfile'],
                options: {
                    spawn: false
                }
            },
            emailer: {
                files: '<%= jshint.emailer.src %>',
                tasks: ['jshint:emailer', 'emailer'],
                options: {
                    // spawn: false
                }
            },
            emails: {
                files: [emailFiles],
                tasks: ['emails'],
                options: {
                    spawn: false
                }
            },
            phantomcss: {
                files: '<%= jshint.phantomcss.src %>',
                tasks: ['jshint:phantomcss', 'phantomcss'],
                options: {
                    // spawn: false
                }
            },
            websites: {
                files: [websiteFiles],
                tasks: ['phantomcss'],
                options: {
                    spawn: false
                }
            }
        },

        /* Grunt exec properties
        __command:__ The shell command to be executed. Must be a string or a function that returns a string. (__alias:__ cmd)
        __stdout:__ If true, stdout will be printed. Defaults to true.
        __stderr:__ If true, stderr will be printed. Defaults to true.
        __cwd:__ Current working directory of the shell command. Defaults to the directory containing your Gruntfile.
        __exitCode:__ The expected exit code, task will fail if the actual exit code doesn't match. Defaults to 0.
        __callback:__ The callback function passed child_process.exec. Defaults to a noop.
        */

        exec: {
            symLink: {
                cmd: function () {
                    var websiteName, websiteDest,
                        websiteDir = path.resolve(__dirname, websites),
                        cmd = 'mkdir ' + websiteDir;
                    for(var webSite in config.websites) {
                        websiteName = path.resolve(websiteDir, webSite);
                        websiteDest = config.websites[webSite].dir;
                        if (websiteDest) {
                            winCmd = 'mklink /J ' + websiteName + ' ' + websiteDest;
                            lnCmd = 'ln -s ' + websiteDest + ' ' + websiteName;
                            cmd += ' && ' + (win ? winCmd : lnCmd);
                        }
                    }
                    // return 'echo "' + cmd + '"';
                    return cmd;
                }
            },
        }
    });

    var viewport = function(viewport) { return [parseInt(viewport) || 1280, 480]; },
        expand = function(site, conf) {
            if(conf.pkgs)
                return (function(pkgs) {
                    for(var pkg in conf.pkgs) {
                        pkgs[site + '-' + pkg] = {
                            options : {
                                domain       : conf.pkgs[pkg].domain || conf.domain,
                                links        : conf.pkgs[pkg].links || conf.links,
                                viewportSize : viewport(conf.pkgs[pkg].viewport),
                                screenshots  : path.join(site, base, pkg),
                                results      : path.join(site, next, pkg)
                            },
                            src     : [screening]
                        };
                    }
                    return pkgs;
                })({});
            else
                return (function(pkg) {
                    pkg[site] = {
                        options : {
                            domain       : conf.domain,
                            links        : conf.links,
                            viewportSize : viewport(conf.viewport),
                            screenshots  : path.join(webSite, base),
                            results      : path.join(webSite, next)
                        },
                        src     : [screening]
                    };
                    return pkg;
                })({});
        };

    for(var webSite in config.websites) if(!config.websites[webSite].ignore) grunt.config(['phantomcss'], expand(webSite, config.websites[webSite]));

    // Watch events
    grunt.event.on('watch', function (action, filepath, target) {
        // Re-configure tasks to only run on changed file
        switch (target) {
        case 'emails':
            {
                grunt.config(['exec', 'open', 'cmd'], 'open "' + filepath + '"');
                grunt.config(['emailer', 'zip', 'cwd'], path.dirname(filepath));
                break;
            }
        case 'websites':
            {
                grunt.log.subhead(filepath + ' updated');
                break;
            }
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // By default, lint and run all tests.
    grunt.registerTask(
        'default',
        'Running "DEFAULT: jshint, clean, watch"...', ['jshint:all', 'clean', 'watch']
    );
    grunt.registerTask(
        'emails',
        'Running Emailer - zip and upload...', ['clean', 'emailer', 'watch']
    );
    grunt.registerTask(
        'default',
        'Taking Screenshots - crawl, screenshot and diff', ['jshint:all', 'clean', 'exec', 'phantomcss', 'watch']
    );
};
