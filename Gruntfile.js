module.exports = function(grunt) {
  var fs = require('fs');

  var mainPort = 1843;
  var livereloadPort = 1842;

  var jsFilesLoc = ['js/**/*.js', '!js/init.min.js', '!js/tests/*.js', '!js/tpl/template.js', '!js/eric.js', '!js/css.js'];

  // process es6 imports
  grunt.registerTask('es6transpile', function() {
    var esperanto = require('esperanto');
    var done = this.async();

    esperanto.bundle({
      base : 'js',
      entry : 'init.js'
    }).then(function(bundle) {
      var umd = bundle.toUmd({
        name : 'econ', strict : true,
        sourceMap : true,
        sourceMapFile : 'built.js'
      });
      grunt.file.write('dist/built.js', umd.code);
      grunt.file.write('dist/built.js.map', umd.map.toString());
    }).then(
      function() {
        grunt.log.ok();
        done();
      },
      function(error) {
        grunt.log.error();
        done(error);
      }
    );
  });

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    useminPrepare: {
      html: 'index.html'
    },
    connect: {
      server: {
        options: {
          base: '.',
          port: mainPort,
          hostname: '*',
          livereload: livereloadPort
        }
      }
    },
    githooks: {
      all: {
        'pre-commit': 'jshint'
      }
    },
    shell: {
      listFolders: {
        options: {
          stdout: true
        },
        command: 'git init'
      }
    },
    watch: {
      grunt : {
        files : ['Gruntfile.js']
      },
      data : {
        files : ['data/**/*.csv', 'data/**/*.json'],
        options : {
          livereload : livereloadPort
        }
      },
      sass: {
        files: ['css/sass/**/*.{scss,sass}',  '../../css/editorial.scss'],
        tasks: ['sass:dev'],
        options : {
          livereload: livereloadPort
        }
      },
      handlebars: {
        files: ['js/tpl/handlebars/*.handlebars'],
        tasks: ['handlebars'],
        options : {
          livereload: livereloadPort
        }
      },
      js : {
        files: jsFilesLoc,
        tasks: ['jshint', 'es6transpile'],
        options : {
          livereload : livereloadPort
        }
      },
      html : {
        files: ['./*.html'],
        options : {
          livereload : livereloadPort
        }
      }
    },
    concat: {
      dist: {
        src: ['js/css.js', 'js/init.min.js'],
        dest: 'js/init.min.js',
      },
    },
    uglify: {
      options: {
        mangle: {
          except: ['mnv']
        }
      }
    },
    sass: {
      dist: {
        options: {
          outputStyle: [
            'compressed'
          ]
        },
        files: {
          'css/style.css': 'css/sass/style.scss'
        }
      },
      dev: {
        files: {
          'css/style.css': 'css/sass/style.scss'
        }
      }
    },
    jshint: {
      files: jsFilesLoc,
      options: {
        camelcase: true,
        curly:   true,
        eqeqeq:  true,
        forin: true,
        immed:   true,
        latedef: true,
        newcap:  true,
        noarg:   true,
        sub:     true,
        undef:   true,
        boss:    true,
        eqnull:  true,
        browser: true,
        strict: false,
        trailing: true,
        esnext : true,

        globals: {
          // AMD
          module:     true,
          require:    true,
          requirejs:  true,
          define:     true,
          Handlebars: true,
          mnv: true,

          // Environments
          console:    true,

          // General Purpose Libraries
          $:          true,
          d3:         true,
          jQuery:     true,
          sinon:      true,
          describe:   true,
          it:         true,
          expect:     true,
          beforeEach: true,
          afterEach:  true
        }
      }
    },
    handlebars: {
      all: {
        files: {
            'js/tpl/template.js': 'js/tpl/handlebars/*.handlebars'
        }
      }
    },
    jasmine: {
      src: ['js/*.js', '../../js/*.js', '!js/init.min.js'],
      options: {
        specs: ['js/tests/*tests.js', '../../js/tests/*tests.js'],
      }
    },
    csstojs: {
      target: ['css/style.css', 'js/css.js']
    }
  });

  // Convert css into js
  grunt.registerMultiTask('csstojs', 'Convert CSS to JS.', function() {
    var cssPath = this.data[0];
    jsPath = this.data[1];

    grunt.log.writeln("Starting conversion...");
    var css = fs.readFileSync(cssPath).toString();

    if(!css) {
      grunt.log.writeln("The css file is empty, nothing to convert.");
      return false;
    }
    var cssStr = css.split("\n").map(function(l){return '"' + l + '\\n"';}).join(" + \n");
    var js = "(function() { var css = " + cssStr + ", head = document.getElementsByTagName('head')[0], style = document.createElement('style'); style.setAttribute('type', 'text/css'); var nodeStyle = document.createTextNode(css); if(style.styleSheet){ style.styleSheet.cssText = nodeStyle.toString();}else{ style.appendChild(nodeStyle); }; head.appendChild(style);})();";

    grunt.log.writeln("Conversion completed, js file created.");
    fs.writeFileSync(jsPath, js);
    return true;
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-handlebars-compiler');
  grunt.loadNpmTasks('grunt-usemin');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-githooks');
  grunt.loadNpmTasks('grunt-contrib-connect');

  // Compile sass and handlebars on the fly.
  grunt.registerTask('default', ['es6transpile', 'connect', 'sass:dev', 'handlebars', 'watch']);

  // Unit tests.
  grunt.registerTask('getready', ['jasmine', 'jshint']);

  // Git tasks.
  grunt.registerTask('git', ['shell', 'githooks']);

  // Run this task when the code is ready for production.
  // grunt.registerTask('production', ['sass:dist',  'csstojs', 'useminPrepare', 'concat',  'concat:dist', 'uglify']);
  grunt.registerTask('production', ['sass:dist',  'csstojs', 'useminPrepare', 'concat',  'concat:dist']);
};
