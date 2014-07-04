/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*eslint-env node*/
/*global $, define, brackets */

(function () {
    "use strict";

    var karmaProcess;

    
    var _domainManager;

    var path = require("path"),
        childProcess = require("child_process");
    
    var config = {};
    
    function once(fn) {
        var called = false;
        return function (arg1, arg2) {
            if (!called) {
                fn(arg1, arg2);
            }
        };
    }


    var currentDir;

    /**
     *
     *  @param {funct} Callback function upon connection
     */
    function startServer(cwd, settings, cb) {
        cb = once(cb);
        config = settings;
       
        var fork = childProcess.fork,
            procOpt = {
                cwd: cwd,
                silent: true
            },
            karmaOut = "";
        currentDir = cwd;


        var execPath = path.join(settings.executable);

        karmaProcess = fork(execPath, ["start", settings.configFile, "--no-single-run"], procOpt);

        karmaProcess.on("error", function (err) {
            console.error("Error while starting karma server: ", err);
            cb(err);
        });

        setTimeout(function () {
            karmaOut = "";
            karmaProcess.stderr.removeAllListeners();
            karmaProcess.stdin.removeAllListeners();
            karmaProcess.removeAllListeners();
            cb(undefined, karmaOut.toString());
        }, 1000);

        karmaProcess.stdout.on("data", function (data) {
            karmaOut += data;
        });
        //        
        karmaProcess.stderr.on("data", function (data) {
            karmaOut += data;
        });


        karmaProcess.on("exit", function (code) {
            var error;
            try {
                error = {
                    exitcode: code,
                    msg: karmaOut.replace(/\[[0-9]+m/g, "") //hack to remove colors code
                };
            } catch (e) {
//                console.error("[Exception]", e);
            }
            cb(error);
        });
    }

    function stopServer() {
        try {
            karmaProcess.kill();
        } catch (e) {
            console.error("Exception while terminating karma:", e);
        }
    }
    
    // process.on("exit", stopServer);
    // process.on("close", stopServer);

    function run(cb) {
        console.log("run called!");
        var callback = once(cb);
        var execPath = path.join(config.executable),
            fork = childProcess.fork,
            procOpt = {
                cwd: currentDir,
                silent: true
            };
        var runner = fork(execPath, ["run", config.configFile, "--no-colors"], procOpt);
        runner.on("error", function (err) {
            console.error("Error while running tests with karma: ", err);
            callback(err);
        });
        // runner.stdout.on("data", function (data) {
        //     // console.log("stdin:", data.toString());
        // });
        //   
        runner.on("exit", function () {
            console.log("karma run terminated with: ", arguments);
            callback(null, "run terminated");
        });
        runner.stderr.on("data", function (data) {
            console.error(data.toString());
            callback({
                exitcode: 1,
                msg: data.toString().replace(/\[[0-9]+m/g, "") //hack to remove colors code
            });
        });
    }

    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        _domainManager = DomainManager;
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
            }, {
                name: "settings",
                type: "{configFile: string}",
                description: "configuration object"
            }] // parameters
        );
        DomainManager.registerCommand(
            "karmaServer",
            "stopServer",
            stopServer,
            false,
            "Kill the running karma server"
        );
        DomainManager.registerCommand(
            "karmaServer",
            "run",
            run,
            true,
            "Exec the testsuite. This function require the server to be already running"
        );
        DomainManager.registerEvent(
            "karmaServer",
            "runStart",
            [{
                name: "browsers",
                type: "Array"
            }]
        );
        DomainManager.registerEvent(
            "karmaServer",
            "runComplete",
            [{
                name: "browsers",
                type: "Array"
            }]
        );
        DomainManager.registerEvent(
            "karmaServer",
            "browserError",
            [{
                name: "browsers",
                type: "Array"
            }]
        );
        DomainManager.registerEvent(
            "karmaServer",
            "specComplete",
            [{
                name: "browsers",
                type: "Array"
            }]
        );
    }

    module.exports = {
        init: init
    };
}());
