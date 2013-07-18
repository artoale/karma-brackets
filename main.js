/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Mustache */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
        Commands = brackets.getModule("command/Commands"),
        Menus = brackets.getModule("command/Menus"),
        PanelManager = brackets.getModule("view/PanelManager"),
        AppInit = brackets.getModule("utils/AppInit"),
        Strings = brackets.getModule("strings"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        NodeConnection = brackets.getModule("utils/NodeConnection"),
        Resizer = brackets.getModule("utils/Resizer"),
        KarmaTemplate = require("text!htmlContent/bottom-panel-tabs.html"),
        StatusBar = brackets.getModule("widgets/StatusBar"),
        ResultsTemplate = require("text!htmlContent/results-table.html"),
        tabHeaderTemplate = require("text!htmlContent/tab-header.html"),
        errorTemplate = require("text!htmlContent/error.html");


    var $karmaResults;

    var browsers = {};

    var INDICATOR_ID = 'karma-status',
        KARMA_SERVER_COMMAND_ID = "karma.startserver",
        KARMA_STOP_COMMAND_ID = "karma.stopserver",
        KARMA_RUNNER_COMMAND_ID = "karma.run";
    // Helper function that chains a series of promise-returning
    // functions together via their done callbacks.

    function showTab($this) {
        var $ul = $this.closest('ul'),
            selector,
            previous,
            $target,
            $parent,
            e;
        selector = $this.attr('href');
        if ($this.parent('li').hasClass('active')) {
            return;
        }
        $target = $(selector);
        $parent = $target.parent();
        var $active = $parent.find('> .active');
        $ul.find('> li.active').removeClass('active');
        $active.removeClass('active');
        $this.parent().addClass('active');
        $target.addClass('active');


    }

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

    function generateTabHeader(browsers) {
        var headerObject = {
            browsers: []
        };

        $.each(browsers, function (id, browser) {
            headerObject.browsers.push({
                id: id,
                name: browser.browserDetail.name,
                hasError: function () {
                    var errors = false;
                    if (browser.error) {
                        errors = true;
                    } else {
                        $.each(this.specsResults, function (specId, specResult) {
                            if (!specResult.success) {
                                errors = true;
                                return false;
                            }
                        });
                    }
                    if (errors) {
                        return 'error';
                    }

                },
                specsResults: browser.specsResults
            });
        });
        return Mustache.render(tabHeaderTemplate, headerObject);
    }

    function generateBrowserTab(browser) {
        var results = browser.specsResults;
        var data = [];
        if (browser.error) {
            data.push({
                title: browser.error,
                status: 'error'
            });
        }
        $.each(results, function (specId, spec) {
            data.push({
                title: spec.suite.join(' ') + ' ' + spec.description,
                status: function () {
                    return spec.success ? 'success' : 'error';
                },
                log: spec.log.map(function (logItem) {
                    return logItem.replace('\n', '<br>');
                }),
                data: spec
            });
        });
        //console.log('data', data);
        return Mustache.render(ResultsTemplate, {
            reportList: data,
            id: browser.browserDetail.id
        });
    }


    function renderHtml(headerHtml, bodyHtml) {
        $karmaResults.find(".nav-tabs")
            .empty()
            .append(headerHtml);
        $karmaResults.find(".nav-tabs").find('> li > a').click(function () {
            //console.log('clicked');
            showTab($(this));
        });

        $karmaResults.find(".tab-content")
            .empty()
            .append(bodyHtml);

        $karmaResults.find("ul.nav > li > a:first").click();

        showPanel();
    }

    function handleError(error) {

        var bodyHtml = Mustache.render(errorTemplate, error),
            headerHtml = ' <li><a href="#karma-error" class="error">Whoops</a></li>';

        $karmaResults.find(".nav-tabs")
            .empty()
            .append(bodyHtml);
        StatusBar.updateIndicator(INDICATOR_ID, true, "karma-errors", '');
        renderHtml(headerHtml, bodyHtml);
        showPanel();
    }

    function handleResults(browsers, result) {
        var headerHtml = generateTabHeader(browsers);
        var bodyHtml = '';
        $.each(browsers, function (browserId, browser) {
            bodyHtml += generateBrowserTab(browser);
        });
        console.log('result', result);
        var error = result.failed > 0 || result.error;

        if (error) {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-errors", '');
        } else {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-valid", '');
        }

        renderHtml(headerHtml, bodyHtml);
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


        function startServer() {
            var projectRoot = ProjectManager.getProjectRoot().fullPath;
            //console.log(nodeConnection.domains);
            //console.log('Starting karma server at ', projectRoot);
            var memoryPromise = nodeConnection.domains.karmaServer.startServer(projectRoot);
            memoryPromise.fail(function (err) {
                console.error("[brackets-karma] failed to run karmaServer.startServer", err);
                handleError(err);
            });
            memoryPromise.done(function (data) {
                console.log("[brackets-karma] karmaServer started completed with: ", data);
                CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(true);
                CommandManager.get(KARMA_STOP_COMMAND_ID).setEnabled(true);
                CommandManager.get(KARMA_SERVER_COMMAND_ID).setEnabled(false);
                StatusBar.updateIndicator(INDICATOR_ID, true, "karma-enabled", '');
                //                handleResults(data.browsers, data.results);
            });
            return memoryPromise;
        }

        function run() {
            var runPromise = nodeConnection.domains.karmaServer.run();
            CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(false);
            runPromise.fail(function (err) {
                console.error("[brackets-karma] failed to run karmaServer.run", err);
                handleError(err);
            });
            runPromise.done(function (data) {
                console.log("[brackets-karma] karmaServer.run completed with: ", data);
                CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(true);
//                handleResults(data.browsers, data.results);
            });
            return runPromise;
        }

        (function registerEventsHandler(nodeConnection) {
            $(nodeConnection).on("karmaServer.runStart", function (event, brws) {
                StatusBar.updateIndicator(INDICATOR_ID, true, "running", '');
                browsers = {};
                brws.forEach(function (browser) {
                    browsers[browser.id] = {
                        browserDetail: browser,
                        specsResults: {}
                    };
                });
            });

            $(nodeConnection).on("karmaServer.browserError", function (event, data) {
                var browserId = data.browser.id;
                browsers[browserId].error = data.error.replace('\n', '<br>');
            });

            $(nodeConnection).on("karmaServer.specComplete", function (event, data) {
                var specId = data.result.id,
                    browserId = data.browser.id;
                browsers[browserId].specsResults[specId] = data.result;
            });

            $(nodeConnection).on("karmaServer.runComplete", function (event, data) {
                handleResults(browsers, data.results);
            });
        }(nodeConnection));
        // First, register a command - a UI-less object associating an id to a handler
        // package-style naming to avoid collisions
        CommandManager.register("Start karma server", KARMA_SERVER_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "running", '');
            //            showPanel();
            chain(connect, loadKarmaDomain, startServer);
        });

        CommandManager.register("Test with karma", KARMA_RUNNER_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "running", '');
            run();
        }).setEnabled(false);
        
        CommandManager.register("Stop karma server", KARMA_STOP_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-disabled", '');
            CommandManager.get(KARMA_SERVER_COMMAND_ID).setEnabled(true);
            CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(false);
            CommandManager.get(KARMA_STOP_COMMAND_ID).setEnabled(false);
            nodeConnection.domains.karmaServer.stopServer();
        }).setEnabled(false);

        var karmaHtml = Mustache.render(KarmaTemplate, Strings);
        var resultsPanel = PanelManager.createBottomPanel("karma.results", $(KarmaTemplate), 100);
        $karmaResults = $('#karma-results');
        $("#karma-results .close").click(function () {
            Resizer.hide($karmaResults);
            _visible = false;
        });

        $karmaResults.find('ul.nav > li > a').click(function () {
            showTab($(this));
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
        
        menu.addMenuItem(KARMA_SERVER_COMMAND_ID);
        menu.addMenuItem(KARMA_STOP_COMMAND_ID);
        menu.addMenuItem(KARMA_RUNNER_COMMAND_ID, "Ctrl-Alt-K");
        menu.addMenuDivider(Menus.BEFORE, KARMA_SERVER_COMMAND_ID);






    });


    // We could also add a key binding at the same time:
    //menu.addMenuItem(KARMA_COMMAND_ID, "Ctrl-Alt-H");
    // (Note: "Ctrl" is automatically mapped to "Cmd" on Mac)
});