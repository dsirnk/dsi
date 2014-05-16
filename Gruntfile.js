module.exports = function (grunt) {

	// Metadata.
	var pkg = grunt.file.readJSON('package.json'),
		banner = '/*! ' + pkg.name + ' - v' + pkg.version + ' - ' +
				grunt.template.today("yyyy-mm-dd") + '\n' +
				pkg.homepage ? ('* ' + pkg.homepage + '\n') : '' +
				'* Copyright (c) ' + grunt.template.today("yyyy") + ' ' +
				pkg.author.name + ';' + ' Licensed MIT */\n',
		config = grunt.file.readJSON('config.json'),
		path = require('path'),

		// My custom variables
		win = process.platform === 'win32',
		webistes = 'webistes/',
		webisteFiles = webistes + '**/*.+(css|js|htm|html|cshtml|gif|png|jpg|jpeg)',

		emails = 'emails/',
		emailFiles = '**/*.+(htm|html)',
		emailZips = emails + emailFiles + '.zip',

		screenfly = 'test/**/*screenfly.js',

		screenshots = 'screenshots/',
		lastShots = screenshots + 'base/',
		resultShots = screenshots + 'results/';

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
			screenshots: [resultShots],
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
			desktop: {
				options: {
					screenshots: lastShots + 'desktop/',
					results: resultShots + 'desktop',
					viewportSize: [1024, 768]
				},
				src: [screenfly]
			},
			mobile: {
				options: {
					screenshots: lastShots + 'mobile/',
					results: resultShots + 'mobile',
					viewportSize: [320, 480]
				},
				src: [screenfly]
			}
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
				files: webisteFiles,
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
						var websiteDir = webistes.replace('/', path.sep),
							websiteName, websiteDest,
							cmd = 'mkdir ' + websiteDir;
						config.websites.forEach(function(website) {
							websiteName =  websiteDir + website.name;
							websiteDest = website.dir;
							cmd += (win ?
								'& mklink /J ' + websiteName + ' ' + websiteDest :
								'& ln -s ' + websiteDest + ' ' + websiteName);
						});
						return cmd;
					}
			},
			echo_grunt_version: {
				cmd: function() { return 'echo ' + this.version; }
			},
			echo_name: {
				cmd: function(firstName, lastName) {
					firstName = typeof firstName !== 'undefined' ? firstName : 'Ronak';
					lastName = typeof lastName !== 'undefined' ? lastName : 'Desai';
					var formattedName = [
						lastName.toUpperCase(),
						firstName.toUpperCase()
					].join(', ');

					return 'echo ' + formattedName;
				}
			},
			remove_logs: {
				command: 'rm -f *.log',
				stdout: false,
				stderr: false
			},
		}
	});

	// Watch events
	grunt.event.on('watch', function(action, filepath, target) {
		// // configure copy:devTmpl to only run on changed file
		// grunt.config(['copy','devTmpl'], filepath);
		// // configure copy:devImg to only run on changed file
		// grunt.config(['copy','devImg'], filepath);
		switch(target) {
			case 'emails': {
				grunt.config(['exec', 'open', 'cmd'], 'open "' + filepath + '"');
				grunt.config(['emailer', 'zip', 'cwd'], require('path').dirname(filepath));
				break;
			}
			case 'webistes': {
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
		'Running "DEFAULT: jshint, clean, watch"...',
		['jshint:all', 'clean', 'watch']
	);
	grunt.registerTask(
		'emails',
		'Running Emailer - zip and upload...',
		['clean', 'emailer', 'watch']
	);
	grunt.registerTask(
		'screenshots',
		'Taking Screenshots - crawl, screenshot and diff',
		['clean', 'exec:symLink', 'phantomcss', 'watch']
	);
};