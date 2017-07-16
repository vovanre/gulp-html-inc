'use strict';

const
    through = require('through2'),
    BufferStreams = require('bufferstreams'),
    format = require('string-template'),
    glob = require('glob'),
    path = require('path'),
    fs = require("fs"),
    replaceExt = require('replace-ext'),
    CRC32 = require('crc-32'),
    PluginError = require('gulp-util').PluginError
;

const
    PLUGIN_NAME = 'gulp-html-inc',

    INCLUDE_REGEXP = /<!--\s*include:([a-zA-Z]+)(<[a-zA-Z\s]*>)?\(([^)]+)\)\s*-->/g,
    INCLUDE_ARGUMENT_LIST_REGEXP = /^list:([a-zA-Z0-9_-]+)$/,

    DEFAULT_OPTIONS = {
        'hash': false,
        'skipEmptyFiles': false,
        "allowDuplicate": false,
        'templates': {
            'js': '<script src="{file}" {modifiers}></script>',
            'css': '<link rel="stylesheet" type="text/css" href="{file}" {modifiers}/>'
        },
        'context': {},
        'cwd': undefined,
        'modifiers': undefined,
        'delimiter': '\n'
    }
;

function generateHash(file) {
    return '?v=' + Math.abs(CRC32.buf(fs.readFileSync(file))).toString(36);
}

function processFile(options, cwd, file) {
    var
        hash = '',
        prefix = ''
    ;

    if (typeof options.hash === 'function') {
        hash = options.hash(cwd + file);
    } else if (options.hash === true) {
        hash = generateHash(cwd + file);
    }

    if (typeof options.prefix === 'function') {
        prefix = options.prefix(cwd, file);
    } else if (typeof options.prefix === 'string') {
        prefix = options.prefix;
    }

    return prefix + file + hash;
}

function processModifiers(modifiers) {
    return modifiers.trim();
}

function getFilesFromGlobArray(cwd, globArray) {
    var result = [];
    globArray.filter(function (val) {
        return val && val.trim() !== '';
    }).forEach(function (val) {
        result = result.concat(glob.sync(val, {
            cwd: cwd
        }));
    });
    return result;
}

function getFilesFromList(options, cwd, argument) {
    const listName = INCLUDE_ARGUMENT_LIST_REGEXP.exec(argument)[1];
    if (!options.context.hasOwnProperty(listName))
        return false;
    return getFilesFromGlobArray(cwd, options.context[listName]);
}


function getFiles(options, cwd, argument) {
    var files;
    if (INCLUDE_ARGUMENT_LIST_REGEXP.test(argument)) {
        files = getFilesFromList(options, cwd, argument);
    } else {
        files = getFilesFromGlobArray(cwd, argument.match(/([^\\\][^,]|\\,)+/g));
    }
    if (files === false)
        return false;

    if (options.skipEmptyFiles === true) {
        files = files.filter(function (file) {
            return fs.statSync(cwd + file).size > 0;
        });
    }
    if (options.allowDuplicate === false) {
        const uniqueFiles = [];
        files.forEach(function (file) {
            if (uniqueFiles.indexOf(file) === -1) {
                uniqueFiles.push(file);
            }
        });
        files = uniqueFiles;
    }
    return files;
}

function processHtml(options, file, contents, callback) {
    const
        templates = options.templates,
        cwd = options.cwd || path.dirname(file.path)
    ;

    callback(new Buffer(contents.replace(INCLUDE_REGEXP, function (match, type, modifiers, argument) {
        if (!templates.hasOwnProperty(type))
            return match;
        const files = getFiles(options, cwd, argument);
        if (files === false)
            return match;

        var processedModifiers = '';
        if (modifiers !== undefined) {
            modifiers = modifiers.slice(1, -1);
            processedModifiers = typeof options.modifiers === 'function' ? options.modifiers(modifiers) : processModifiers(modifiers);
        }

        const result = [];
        files.forEach(function (file) {
            result.push(format(templates[type], {
                modifiers: processedModifiers,
                file: processFile(options, cwd, file)
            }));
        });
        return result.join(options.delimiter);
    })));
}

function gulpHtmlInc(options) {
    options = Object.assign({}, DEFAULT_OPTIONS, options);
    return through.obj(function (file, enc, callback) {
        try {
            if (file.isNull()) {
                this.push(file);
                return callback();
            }

            const self = this;
            if (file.isStream()) {
                file.contents = file.contents.pipe(new BufferStreams(function (none, buffer, done) {
                    processHtml(options, file, String(buffer), function (contents) {
                        done(null, contents);

                        self.push(file);
                        callback();
                    });
                }));
            } else {
                processHtml(options, file, String(file.contents), function (contents) {
                    file.contents = contents;
                    self.push(file);
                    callback();
                });
            }
        } catch (err) {
            this.emit('error', new PluginError(PLUGIN_NAME, err));
        }
    });
}

module.exports = gulpHtmlInc;
