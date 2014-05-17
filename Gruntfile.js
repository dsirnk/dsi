module.exports = function(grunt) {

    // Metadata.
    var config = grunt.file.readJSON('config.json'),
        path = require('path'),

        // My custom variables
        webistes = 'webistes/',
        webisteFiles = webistes + '**/*.+(css|js|htm|html|cshtml|gif|png|jpg|jpeg)',

        emails = 'emails/',
        emailFiles = '**/*.+(htm|html)',
        emailZips = emails + emailFiles + '.zip',

        screenfly = 'test/**/*screenfly.js',

        screenshots = 'screenshots/',
        lastShots = screenshots + 'base/',
        resultShots = screenshots + 'results/';

    win = process.platform === 'win32',

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
                src: screenfly,
            },
            all: ['*.js']
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            emails: [emailZips],
            screenshots: [screenshots],
            // screenshots: [resultShots],
            webistes: [webistes]
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
            screenshot: {
                options: {
                    screenshots: lastShots,
                    results: resultShots,
                    viewportSize: [1024]
                },
                src: [screenfly]
            },
            /**
			screenshot_mobile: {
				options: {
					screenshots: lastShots + 'mobile/',
					results: resultShots + 'mobile',
					viewportSize: [320]
				},
				src: [screenfly]
			},
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
                    spawn: false
                }
            },
            webistes: {
                files: [webisteFiles],
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
            open: {
                cmd: 'echo '
            },
            list_files: {
                cmd: 'ls -l **'
            },
            symLink: {
                cmd: function() {
                    var websiteName, websiteDest,
                        websiteDir = webistes.replace('/', path.sep),
                        cmd = 'mkdir ' + websiteDir;
                    config.websites.forEach(function(website) {
                        websiteName = websiteDir + website.name;
                        websiteDest = website.dir;
                        winCmd = 'mklink /J ' + websiteName + ' ' + websiteDest;
                        lnCmd = 'ln -s ' + websiteDest + ' ' + websiteName;
                        cmd += ' &&\n ' + (win ? winCmd : lnCmd);
                    });
                    // return 'echo "' + cmd + '"';
                    return cmd;
                }
            },
        }
    });

    // Watch events
    grunt.event.on('watch', function(action, filepath, target) {
        // Re-configure tasks to only run on changed file
        switch (target) {
            case 'emails':
                {
                    grunt.config(['exec', 'open', 'cmd'], 'open "' + filepath + '"');
                    grunt.config(['emailer', 'zip', 'cwd'], require('path').dirname(filepath));
                    break;
                }
            case 'webistes':
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
        'screenshots',
        'Taking Screenshots - crawl, screenshot and diff', ['clean', 'exec:symLink', 'phantomcss', 'watch']
    );
};
