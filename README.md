Karma runner for brackets
===========
Run test on multiple browser within your editor!

This plugin allows to run your test suites with [karma-runner](http://karma-runner.github.io/) inside [Brackets IDE](http://brackets.io/) 

![Alt text](https://lh5.googleusercontent.com/-Hard7O7X69c/Ud8TluckO0I/AAAAAAAABl0/vR0yEKogFlA/w1113-h604-no/Schermata+2013-07-11+alle+22.18.27.png)

##Installation 

1. Open Brackets > File > Extension Manager
2. Select "Install from uri"
3. Paste `https://github.com/artoale/karma-brackets`
4. Restart brackets

##Usage

1. Your project must contain a `karma.conf.js` file
2. First start karma server with `File > Start karma server`
2. Once the server is running the status bar will shou a black 'K'
3. You can now execute your tests with `File > launch tests` (`Cmd/Ctrl + Alt + k`)
3. Enjoy Testing with karma and brackets!


##Settings

You can specify a different karma configuration file, and when to open the results panel (always, when a test fail, never) by going to `File > Karma Settings`

You can also enjoy karma auto-watch feature by simply putting the `autoWatch` variable to `true` in karma config file.

##To-do
* Live testing, test-on-save
* Use external karma process (useful for grunt)
* Port the brackets reporter to the new (unstable) brackets reporter format

##Contibution

Please use this plugin, enjoy it and report back any problem you may have (including your wife yelling at you).
If you find a bug, please, open an issue on github (or, if you have time, send a pull request!)

Note that this plugin use a slightly modified version of karma.

For any information, suggestion or if you just want to have a beer: <artoale@gmail.com>

###Licence

```
The MIT Licence

Copyright (C) 2013 Alessandro Artoni

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
