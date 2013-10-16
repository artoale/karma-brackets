Karma runner for brackets
===========
Run test on multiple browser within your editor!

This plugin allows to run your test suites with [karma-runner](http://karma-runner.github.io/) inside [Brackets IDE](http://brackets.io/) 

![Alt text](https://lh5.googleusercontent.com/-Hard7O7X69c/Ud8TluckO0I/AAAAAAAABl0/vR0yEKogFlA/w1113-h604-no/Schermata+2013-07-11+alle+22.18.27.png)

##Installation 

1. First you need karma and karma-brackets installed globally: `npm install -g karma karma-brackets`
1. Open Brackets > File > Extension Manager (or click on the icon on the sidebar)
2. Select the "Available" tab
3. Search for "karma" and press install
4. Restart brackets

##Usage

1. Add 'brackets' to the list of reporters in `karma.conf.js`
2. Open the configuration and (if needed) update the path to your karma executable
2. Start karma server with `File > Start karma server`
2. Once the server is running the status bar will show a black 'K'
3. You can now execute your tests with `File > launch tests` (`Cmd/Ctrl + Alt + k`)
4. **Bonus:** If you enable auto-watch in the config file, you won't need the previous step :)
3. Enjoy Testing with karma and brackets!

##Example config file
This is how your config file should look like in order to use karma within brackets

```javascript
module.exports = function (config) {
    'use strict';
    config.set({
        basePath: '.',
        files: [
            'someFile.js',
            'someFile.spec.js'
        ],
        reporters: ['progress', 'brackets'],
        frameworks: ['jasmine'],
        port: 9876,
        runnerPort: 9100,
        colors: true,
        autoWatch: true,
        browsers: ['Chrome', 'PhantomJS'],
        captureTimeout: 60000,
        singleRun: false
    });
};


```
##Settings

You can specify a different karma executable, configuration file, and when to open the results panel (always, when a test fail or never) by going to `File > Karma Settings`

You can also enjoy karma auto-watch feature by simply putting the `autoWatch` variable to `true` in karma config file.


##Troubleshooting

If the icon in the status bar keep spinning while karma started correctly (browsers opened and with green bar) check
if, for some reason, you have a local version of karma installed in `node_modules` (e.g, if you're using generator-angular
for Yeoman that's the case). Even  if you run the 'global' karma, plugins will be searched within the local installation. 
To fix it simply run `npm install --save-dev karma-brackets` to install the reporter locally and add it to your package.json

##To-do
* <del>Live testing, test-on-save</del>
* <del>Port the brackets reporter to the new (unstable) brackets reporter format</del>
* on error - go to line (needs karma modification)
##Contibution

Currently, this plugin is tested on Mac OSX 10.8. I don't have full-time access to windows machines, if you can help me
with testing on win, let me know!

Please use this plugin, enjoy it and report back any problem you may have (including your wife yelling at you).
If you find a bug, please, open an issue on github (or, if you have time, send a pull request!)

<del>Note that this plugin use a slightly modified version of karma.</del>

For any information, suggestion or if you just want to have a beer: <artoale@gmail.com>

###Licence

```
The MIT Licence

Copyright (C) 2013 Alessandro Artoni

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
