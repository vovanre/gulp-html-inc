'use strict';

const
    expect = require('chai').expect,
    File = require('vinyl'),
    htmlInclude = require('../index'),
    es = require('event-stream')
;

describe('gulp-html-inc', function () {
    describe('should expand HTML include', function () {
        it('in buffer mode', function (done) {
            const fakeFile = new File({
                contents: new Buffer('<!-- include:js<async>(*.js) --> <!-- include:js(list:test) --> <!-- include:js(list:test2) --> <!-- include:css(*.css) -->')
            });
            const includeStream = htmlInclude({
                cwd: 'test/files/',
                hash: true,
                delimiter: '',
                skipEmptyFiles: true,
                context: {
                    test: [
                        'example.js',
                        '*.js'
                    ]
                }
            });

            includeStream.write(fakeFile);

            includeStream.once('data', function (file) {
                expect(file).to.not.equal(null);
                expect(file.isBuffer()).to.equal(true);

                expect(file.contents.toString('utf8')).to.equal('<script src="example2.js?v=txuopr" async></script><script src="example3.js?v=810i6h" async></script> <script src="example2.js?v=txuopr" ></script><script src="example3.js?v=810i6h" ></script> <!-- include:js(list:test2) --> <link rel="stylesheet" type="text/css" href="example2.css?v=txuopr" /><link rel="stylesheet" type="text/css" href="example3.css?v=810i6h" />');
                done();
            });
        });
        it('in stream mode', function (done) {
            const fakeFile = new File({
                contents: es.readArray(['<!-- include:js<async>(*.js) --> <!-- include:js(list:test) --> <!-- include:js(list:test2) --> <!-- include:css(*.css) -->'])
            });
            const includeStream = htmlInclude({
                cwd: 'test/files/',
                hash: true,
                delimiter: '',
                skipEmptyFiles: true,
                context: {
                    test: [
                        'example.js',
                        '*.js'
                    ]
                }
            });

            includeStream.write(fakeFile);

            includeStream.once('data', function (file) {
                expect(file).to.not.equal(null);
                expect(file.isStream()).to.equal(true);

                file.contents.pipe(es.wait(function (err, data) {
                    expect(String(data)).to.equal('<script src="example2.js?v=txuopr" async></script><script src="example3.js?v=810i6h" async></script> <script src="example2.js?v=txuopr" ></script><script src="example3.js?v=810i6h" ></script> <!-- include:js(list:test2) --> <link rel="stylesheet" type="text/css" href="example2.css?v=txuopr" /><link rel="stylesheet" type="text/css" href="example3.css?v=810i6h" />');
                    done();
                }));
            });
        });

    });
});