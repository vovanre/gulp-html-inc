# gulp-html-inc

Html include preprocessor.


## Install

Install with [npm](https://npmjs.org/)

```
npm install gulp-html-inc --save-dev
```

## Options

```
{
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
```

## License

MIT © vovanre
