/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Mustache */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";

    var CommandManager          = brackets.getModule("command/CommandManager"),
        Commands                = brackets.getModule("command/Commands"),
        Menus                   = brackets.getModule("command/Menus"),
        PanelManager            = brackets.getModule("view/PanelManager"),
        AppInit                 = brackets.getModule("utils/AppInit"),
        Strings                 = brackets.getModule("strings"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        NodeConnection          = brackets.getModule("utils/NodeConnection"),
        Resizer                 = brackets.getModule("utils/Resizer"),
        KarmaTemplate           = require("text!htmlContent/bottom-panel.html"),
        StatusBar               = brackets.getModule("widgets/StatusBar"),
        ResultsTemplate         = require("text!htmlContent/results-table.html"),
        errorTemplate           = require("text!htmlContent/error.html");
    
    
    var $karmaResults;
    
    var INDICATOR_ID = 'karma-status';
    // Helper function that chains a series of promise-returning
    // functions together via their done callbacks.
    function chain() {
        var functions = Array.prototype.slice.call(arguments, 0);
        if (functions.length > 0) {
            var firstFunction = functions.shift();
            var firstPromise = firstFunction.call();
            firstPromise.done(function () {
                chain.apply(null, functions);
            });
        }
    }

    var _visible = false;
    
    function showPanel() {
        if (!_visible) {
            Resizer.show($karmaResults);
            _visible = true;
        }
    }
    
    function handleError(error) {
        var html = Mustache.render(errorTemplate, error);
        $karmaResults.find(".table-container")
                    .empty()
                    .append(html);
        StatusBar.updateIndicator(INDICATOR_ID, true, "karma-errors", '');
        showPanel();
    }
    
    function handleResults(results) {
        var error = false;
        
        results.forEach(function (spec) {
            var prop;
            for (prop in spec.browsers) {
                if (spec.browsers.hasOwnProperty(prop)) {
                    var browser = spec.browsers[prop];
                    if (!browser.success) {
                        error = true;
                    }
                }
            }
        });
        if (error) {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-errors", '');
        } else {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-valid", '');
        }
        var data = results.map(function (spec) {
            return {
                title : spec.suite.join(' ') + ' ' + spec.description,
                status: function () {
                    var prop;
                    var res = 'success';
                    for (prop in this.data.browsers) {
                        if (this.data.browsers.hasOwnProperty(prop)) {
                            var browser = this.data.browsers[prop];
                            if (!browser.success) {
                                res = 'error';
                            }
                        }
                    }
                    return res;
                },
                log: function () {
                    var prop;
                    for (prop in this.data.browsers) {
                        if (this.data.browsers.hasOwnProperty(prop)) {
                            var browser = this.data.browsers[prop];
                            if (!browser.success) {
                                return browser.log;
                            }
                        }
                    }
                    
                    return "";
                },
                data: spec
            };
        });
        var html = Mustache.render(ResultsTemplate, {reportList: data});
        $karmaResults.find(".table-container")
                    .empty()
                    .append(html);
        $karmaResults.find("tr.error").click(function () {
            console.log("clicked");
        });
        showPanel();
    }
    
    AppInit.htmlReady(function () {
        ExtensionUtils.loadStyleSheet(module, "karma.css");
        // Create a new node connection. Requires the following extension:
        // https://github.com/joelrbrandt/brackets-node-client
        var nodeConnection = new NodeConnection();
        
        // Every step of communicating with node is asynchronous, and is
        // handled through jQuery promises. To make things simple, we
        // construct a series of helper functions and then chain their
        // done handlers together. Each helper function registers a fail
        // handler with its promise to report any errors along the way.
        
        
        // Helper function to connect to node
        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                console.error("[brackets-karma] failed to connect to node");
            });
            return connectionPromise;
        }
        
        // Helper function that loads our domain into the node server
        function loadKarmaDomain() {
            var path = ExtensionUtils.getModulePath(module, "node/KarmaDomain");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.fail(function () {
                console.error("[brackets-karma] failed to load domain");
            });
            return loadPromise;
        }
        
        // Helper function that runs the simple.getMemory command and
        // logs the result to the console
        function startServer() {
            var projectRoot = ProjectManager.getProjectRoot().fullPath;
            console.log(nodeConnection.domains);
            console.log('Starting karma server at ', projectRoot);
            var memoryPromise = nodeConnection.domains.karmaServer.startServer(projectRoot);
            memoryPromise.fail(function (err) {
                console.error("[brackets-karma] failed to run karmaServer.startServer", err);
                handleError(err);
            });
            memoryPromise.done(function (data) {
                console.log("[brackets-karma] karmaServer run completed with: ", data);
                handleResults(data);
            });
            return memoryPromise;
        }
        
         // First, register a command - a UI-less object associating an id to a handler
        var KARMA_COMMAND_ID = "karma.startserver";   // package-style naming to avoid collisions
        CommandManager.register("Test with karma", KARMA_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "running", '');
            chain(connect, loadKarmaDomain, startServer);
        });
        
        var karmaHtml = Mustache.render(KarmaTemplate, Strings);
        var resultsPanel = PanelManager.createBottomPanel("karma.results", $(KarmaTemplate), 100);
        $karmaResults = $('#karma-results');
        $("#karma-results .close").click(function () {
            Resizer.hide($karmaResults);
            _visible = false;
        });
        
        var karmaStatusHtml = Mustache.render('<div id="karma-status">K</div>', Strings);
        $(karmaStatusHtml).insertBefore("#jslint-status");
//        $(karmaStatusHtml).insertBefore("#status-language");
        StatusBar.addIndicator(INDICATOR_ID, $("#karma-status"));
        StatusBar.updateIndicator(INDICATOR_ID, true, "karma-disabled", '');
        $('#karma-status').click(function () {
            if (!$(this).hasClass('karma-disabled')) {
                showPanel();
            }
        });
        // Then create a menu item bound to the command
        // The label of the menu item is the name we gave the command (see above)
        var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        menu.addMenuItem(KARMA_COMMAND_ID, "Ctrl-Shift-K");
        menu.addMenuDivider(Menus.BEFORE, KARMA_COMMAND_ID);
        // Call all the helper functions in order
        
        
    });


    // We could also add a key binding at the same time:
    //menu.addMenuItem(KARMA_COMMAND_ID, "Ctrl-Alt-H");
    // (Note: "Ctrl" is automatically mapped to "Cmd" on Mac)
});
