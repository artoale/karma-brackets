/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global $, define, brackets */

(function () {
    'use strict';

    var karmaProcess;

    var timeout = 10000;

    function once(fn) {
        var called = false;
        return function (arg1, arg2) {
            if (!called) {
                //console.log('Calling cb');
                fn(arg1, arg2);
            }
//            else {
//                //console.log('Calling nothing');
//            }
        };
    }
    var connected;
    /**
     *
     *  @param {funct} Callback function upon connection
     */
    function startServer(cwd, cb) {
        var callback = once(cb);
        var io = require('socket.io').listen(5000, {
                'log level': 1 //warnings and errors only
            }),
            fork = require('child_process').fork,
            procOpt = {
                cwd: cwd,
                silent: true
            },
            karmaOut = '';
        connected = false;
        var t = setTimeout(function () {
            var error;
            if (!connected) {
                console.error('No reporters connected in ' + timeout + 'ms. Aborting');
                error = {
                    msg: karmaOut.replace(/\[[0-9]+m/g, '')
                };
                io.server.close();
                karmaProcess.kill();
                callback(error);
            }
        }, timeout);

        io.sockets.on('connection', function (socket) {
            connected = true;
            clearTimeout(t);
            var browsers = {};
            var specsResults = [];
            //console.log('Client connected');
            
            
            socket.on('runStart', function (brws) {
//                console.log('run completed', data);
                brws.forEach(function (browser) {
                    browsers[browser.id] = {
                        browserDetail: browser,
                        specsResults: {}
                    };
                });
                //console.log('Browsers:', browsers);
            });
            
            socket.on('runComplete', function (data) {
                if (!data.results.error) {
                    io.server.close();
                }
                console.log('run Complete with', data);
                callback(null, {
                    browsers: browsers,
                    results: data.results
                });
            });
            socket.on('browserError', function (data) {
                var browserId = data.browser.id;
                browsers[browserId].error = data.error.replace('\n', '<br>');
            });
            socket.on('specComplete', function (data) {
                var specId = data.result.id,
                    browserId = data.browser.id;
                //console.log('browsers onspec complete:', browsers);
                //console.log('browserId :', browserId);
                browsers[browserId].specsResults[specId] = data.result;
            });
        });


        //        console.log('Running karma server with cwd: ', cwd);
        var execPath = require('path').join(__dirname, 'background.js');
        karmaProcess = fork(execPath, [], procOpt);
        karmaProcess.on('error', function (err) {
            console.error('Error while starting karma: ', err);
            io.server.close();
            clearTimeout(t);
            callback(err);
        });

        //        karmaProcess.on('close', function (code) {
        //            try {
        //                var error = {
        //                    exitcode: code,
        //                    msg: karmaOut.replace(/\[[0-9]+m/g, '') //hack to remove colors code
        //                };
        //                console.log('Karma process terminated because of stdio closed. Code: ', code);
        //                io.server.close();
        //                clearTimeout(t);
        //            } catch (e) {
        //                console.error("[Exception]", e);
        //            }
        //            callback(error);
        //        });


        karmaProcess.stdout.on('data', function (data) {
            karmaOut += data;
            //console.log('stdout: ' + data);
        });
        //        
        karmaProcess.stderr.on('data', function (data) {
            karmaOut += data;
            //console.error('stderr: ' + data);
        });


        karmaProcess.on('exit', function (code) {
            var error;
            try {
                error = {
                    exitcode: code,
                    msg: karmaOut.replace(/\[[0-9]+m/g, '') //hack to remove colors code
                };
                //console.log('Karma process terminated with code: ', code);
                io.server.close();
                clearTimeout(t);
            } catch (e) {
                //console.error("[Exception]", e);
            }
            callback(error);
        });
    }



    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        if (!DomainManager.hasDomain("karmaServer")) {
            DomainManager.registerDomain("karmaServer", {
                major: 0,
                minor: 1
            });
        }
        DomainManager.registerCommand(
            "karmaServer",
            "startServer",
            startServer,
            true,
            "Call this!",
            [{
                name: "cwd",
                type: "string",
                description: "absolute filesystem path to be used as karma cwd"
            }], // parameters
            [{}]
        );


    }
    module.exports = {
        init: init
    };
}());