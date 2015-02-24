module.exports = function (grunt) {
    var config       = require('./config.json'),
        path         = require('path'),

        websites     = 'websites',
        websiteFiles = path.join(websites, '**/*.+(css|js|htm|html|cshtml|gif|png|jpg|jpeg)'),

        emails       = 'emails',
        emailFiles   = '**/*.+(htm|html)',
        emailZips    = path.join(emails, emailFiles + '.zip'),

        screening    = 'lib/screening.js',
        base         = 'base',
        next         = 'next';

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        jshint  : {
            gruntfile   : { src : 'Gruntfile.js' },
            emailer     : { src : 'tasks/**/*emailer.js' },
            phantomcss  : { src : screening },
            all         : ['*.js']
        },
        clean   : {
            emails      : [emailZips],
            // screenOld   : ['*/' + base],
            screenNew   : ['*/' + next],
            websites    : [websites]
        },
        emailer : {
            zip : {
                expand  : true,
                cwd     : emails,
                src     : [emailFiles],
                misc    : ['**/*.+(jpg|jpeg|gif|png)']
            }
        },
        watch   : {
            gruntfile   : { files: '<%= jshint.gruntfile.src %>'  , tasks: ['jshint:gruntfile']                , options: { spawn: false } },
            emailer     : { files: '<%= jshint.emailer.src %>'    , tasks: ['jshint:emailer', 'emailer']       , options: { spawn: false } },
            emails      : { files: [emailFiles]                   , tasks: ['emails']                          , options: { spawn: false } },
            phantomcss  : { files: '<%= jshint.phantomcss.src %>' , tasks: ['jshint:phantomcss', 'phantomcss'] , options: { /** spawn: false /**/ } },
            websites    : { files: [websiteFiles]                 , tasks: ['phantomcss']                      , options: { spawn: false } }
        },
        exec    : {
            symLink     : {
                cmd     : function () {
                            var websiteName, websiteDest,
                                websiteDir = path.resolve(__dirname, websites),
                                cmd = 'mkdir ' + websiteDir;
                            for(var site in config.websites) {
                                websiteName = path.resolve(websiteDir, site);
                                websiteDest = config.websites[site].dir;
                                if (websiteDest) {
                                    winCmd = 'mklink /J ' + websiteName + ' ' + websiteDest;
                                    lnCmd = 'ln -s ' + websiteDest + ' ' + websiteName;
                                    cmd += ' && ' + (process.platform === 'win32' ? winCmd : lnCmd);
                                }
                            }
                            // cmd = 'echo "' + cmd + '"';
                            return cmd;
                        },
                callback: function () {
                            var gruntPkg = {};
                            for(var site in config.websites) {
                                if(!config.websites[site].ignore) {
                                    var conf = config.websites[site];
                                    if(!conf.pkgs) conf.pkgs = {'default':''};
                                    for(var pkg in conf.pkgs) {
                                        gruntPkg[site + '-' + pkg] = {
                                            options : {
                                                domain       : conf.pkgs[pkg].url || conf.url,
                                                links        : conf.pkgs[pkg].links || conf.links,
                                                viewportSize : [parseInt(conf.pkgs[pkg].viewport || config.viewport[pkg] || 1280), 480],
                                                screenshots  : path.join(site, base, pkg),
                                                results      : path.join(site, next, pkg)
                                            },
                                            src     : [screening]
                                        };
                                    }
                                }
                            }
                            grunt.config(['phantomcss'], gruntPkg);
                        }
            }
        }
    });

    grunt.event.on('watch', function (action, filepath, target) {
        // Re-configure tasks to only run on changed file
        switch (target) {
            case 'emails'   :  grunt.config(['emailer', 'zip', 'cwd'], path.dirname(filepath)); break;
            case 'websites' : grunt.log.subhead(filepath + ' updated'); break;
        }
    });
    grunt.loadTasks('tasks');
    grunt.registerTask('default' , ['jshint:all', 'clean'  , 'watch']);
    grunt.registerTask('emails'  , ['clean'     , 'emailer', 'watch']);
    grunt.registerTask('default' , ['jshint:all', 'clean'  , 'exec' , 'phantomcss', 'watch']);
};
