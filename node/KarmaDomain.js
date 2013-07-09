
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global $, define, brackets */

(function () {
    'use strict';
    
    var karmaProcess;
    
    var timeout = 10000;
    
    var connected;
    /**
     *
     *  @param {funct} Callback function upon connection
     */
    function startServer(cwd, callback) {
        var io = require('socket.io').listen(5000, {
            'log level': 1 //warnings and errors only
        }),
            //karma = require('karma').server,
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
            var specsResults = [];
            console.log('Client connected');
            socket.on('runComplete', function (data) {
//                console.log('run completed', data);
                io.server.close();
                callback(null, specsResults);
            });
            socket.on('specComplete', function (data) {
                var specId = data.result.id,
                    browser = data.browser;
                if (!specsResults[specId]) {
                    specsResults[specId] = {
                        description: data.result.description,
                        suite: data.result.suite,
                        browsers: {}
                    };
                }
                specsResults[specId].browsers[browser.id] = data.result;
                specsResults[specId].browsers[browser.id].details = browser;
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
        
        karmaProcess.on('close', function (code) {
            var error = {
                exitcode: code,
                msg: karmaOut.replace(/\[[0-9]+m/g, '') //hack to remove colors code
            };
            console.log('Karma process terminated because of stdio closed. Code: ', code);
            io.server.close();
            clearTimeout(t);
            callback(error);
        });
        
        
        karmaProcess.stdout.on('data', function (data) {
            karmaOut += data;
            console.log('stdout: ' + data);
        });
//        
        karmaProcess.stderr.on('data', function (data) {
            karmaOut += data;
            console.error('stderr: ' + data);
        });

        
//        karmaProcess.on('close', function (code) {
//            console.log('child process exited with code ' + code);
//        });
//        karma.start(null, function (exitCode) {
//            console.log('Karma has exited with ' + exitCode);
//        });
    }
    
    
    
    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        if (!DomainManager.hasDomain("karmaServer")) {
            DomainManager.registerDomain("karmaServer", {major: 0, minor: 1});
        }
        DomainManager.registerCommand(
            "karmaServer",       // domain name
            "startServer",    // command name
            startServer,   // command handler function
            true,          // this command is NOT synchronous
            "Call this!",
            [{
                name: "cwd",
                type: "string",
                description: "absolute filesystem path to be used as karma cwd"
            }],             // parameters
            [{
            }]
        );
    

    }
    module.exports = {
        init: init
    };
}());