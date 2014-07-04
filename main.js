/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Mustache, console */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
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
        settings = require("lib/settings"),
        ResultsTemplate = require("text!htmlContent/results-table.html"),
        tabHeaderTemplate = require("text!htmlContent/tab-header.html"),
        errorTemplate = require("text!htmlContent/error.html"),
        errors = require("lib/errors"),
        io = require("lib/socket.io"),
        socket;

        
    var $karmaResults;

    var browsers = {};

    var INDICATOR_ID = "karma-status",
        KARMA_CONNECT_COMMAND_ID = "karma.connectToServer",
        KARMA_SERVER_COMMAND_ID = "karma.startserver",
        KARMA_STOP_COMMAND_ID = "karma.stopserver",
        KARMA_RUNNER_COMMAND_ID = "karma.run",
        KARMA_SETTINGS_COMMAND_ID = "karma.settings";
    // Helper function that chains a series of promise-returning
    // functions together via their done callbacks.

    function showTab($this) {
        var $ul = $this.closest("ul"),
            selector,
            $target,
            $parent;

        selector = $this.attr("href");
        if ($this.parent("li").hasClass("active")) {
            return;
        }
        $target = $(selector);
        $parent = $target.parent();

        var $active = $parent.find("> .active");
        $ul.find("> li.active").removeClass("active");
        $active.removeClass("active");
        $this.parent().addClass("active");
        $target.addClass("active");


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
                        return "error";
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
                status: "error"
            });
        }
        $.each(results, function (specId, spec) {
            data.push({
                title: spec.suite.join(" ") + " " + spec.description,
                status: function () {
                    return spec.success ? "success" : "error";
                },
                log: spec.log.map(function (logItem) {
                    return logItem.replace("\n", "<br>");
                }),
                data: spec
            });
        });

        return Mustache.render(ResultsTemplate, {
            reportList: data,
            id: browser.browserDetail.id
        });
    }


    function renderHtml(headerHtml, bodyHtml) {
        $karmaResults.find(".nav-tabs")
            .empty()
            .append(headerHtml);
        $karmaResults.find(".nav-tabs").find("> li > a").click(function () {
            showTab($(this));
        });

        $karmaResults.find(".tab-content")
            .empty()
            .append(bodyHtml);

        $karmaResults.find("ul.nav > li > a:first").click();
    }

    function handleError(error, additionalInfo) {
        var context = $.extend({}, error);

        context.additionalInfo = additionalInfo;
        var bodyHtml = Mustache.render(errorTemplate, context),
            headerHtml = " <li><a href=\"#karma-error\" class=\"error\">Whoops</a></li>";

        $karmaResults.find(".nav-tabs")
            .empty()
            .append(bodyHtml);
        StatusBar.updateIndicator(INDICATOR_ID, true, "karma-errors", "");
        renderHtml(headerHtml, bodyHtml);
        if (settings.get("openPanel") !== "never") {
            showPanel();
        }
    }

    function handleResults(browsers, result) {
        var headerHtml = generateTabHeader(browsers);
        var bodyHtml = "";
        $.each(browsers, function (browserId, browser) {
            bodyHtml += generateBrowserTab(browser);
        });
        var error = result.failed > 0 || result.error;

        if (error) {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-errors", "");
        } else {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-valid", "");
        }

        renderHtml(headerHtml, bodyHtml);
        if (error) {
            if (settings.get("openPanel") !== "never") {
                showPanel();
            }
        } else {
            if (settings.get("openPanel") === "always") {
                showPanel();
            }
        }
    }




    AppInit.appReady(function () {
        ExtensionUtils.loadStyleSheet(module, "karma.css");

        var nodeConnection = new NodeConnection();


        // Helper function to connect to node

        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                handleError(errors.NODE_CONNECTION);
            });
            return connectionPromise;
        }

        // Helper function that loads our domain into the node server

        function loadKarmaDomain() {
            var path = ExtensionUtils.getModulePath(module, "node/KarmaDomain");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.fail(function () {
                handleError(errors.DOMAIN);
            });
            return loadPromise;
        }


        

        function run() {
            if (!nodeConnection || !nodeConnection.domains || !nodeConnection.domains.karmaServer) {
                return connect().then(loadKarmaDomain).then(run);
            }
            var runPromise = nodeConnection.domains.karmaServer.run();
            CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(false);
            runPromise.fail(function (err) {
                handleError(errors.RUN_KARMA, err);
            });
            runPromise.done(function (/*data*/) {
                CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(true);
            });
            return runPromise;
        }

       

        function connectToServer () {
            var deferred = $.Deferred();
            socket = io("http://localhost:5000");
            socket.on("connect", function () {
                deferred.resolve();
            });
            socket.on("connect_error", deferred.reject.bind(deferred));
            StatusBar.updateIndicator(INDICATOR_ID, true, "running", "");
            socket.on("runStart", function (brws) {
                StatusBar.updateIndicator(INDICATOR_ID, true, "running", "");
                browsers = {};
                brws.forEach(function (browser) {
                    browsers[browser.id] = {
                        browserDetail: browser,
                        specsResults: {}
                    };
                });
            });

            socket.on("browserError", function (data) {
                var browserId = data.browser.id;
                browsers[browserId].error = data.error.replace("\n", "<br>");
            });

            socket.on("specComplete", function (data) {
                var specId = data.result.id || data.result.suite.join("") + data.result.description,
                    browserId = data.browser.id;
                browsers[browserId].specsResults[specId] = data.result;
            });

            socket.on("runComplete", function (data) {
                handleResults(browsers, data.results);
            });

            return deferred.promise();
            
        }

        function startServer() {
            if (!nodeConnection || !nodeConnection.domains || !nodeConnection.domains.karmaServer) {
                return connect().then(loadKarmaDomain).then(startServer);
            }
            var projectRoot = ProjectManager.getProjectRoot().fullPath;
            var memoryPromise = nodeConnection.domains.karmaServer.startServer(projectRoot, settings.getAll());
            return memoryPromise;
        }   

        CommandManager.register("Connect to karma server", KARMA_CONNECT_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "running", "");
            connectToServer().then(function () {
                CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(true);
                CommandManager.get(KARMA_STOP_COMMAND_ID).setEnabled(false);
                CommandManager.get(KARMA_SERVER_COMMAND_ID).setEnabled(false);
                CommandManager.get(KARMA_CONNECT_COMMAND_ID).setEnabled(false);
                StatusBar.updateIndicator(INDICATOR_ID, true, "karma-enabled", "");  
            }, function () {
                handleError(errors.CONNECT_SERVER);
            });
        });

        
        CommandManager.register("Start karma server", KARMA_SERVER_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "running", "");
            var startPromise = startServer();
            startPromise.fail(function (err) {
                handleError(errors.START_KARMA, err.msg);
            });
            startPromise.then(function () {
                return connectToServer().then(function () {
                    CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(true);
                    CommandManager.get(KARMA_STOP_COMMAND_ID).setEnabled(true);
                    CommandManager.get(KARMA_SERVER_COMMAND_ID).setEnabled(false);
                    CommandManager.get(KARMA_CONNECT_COMMAND_ID).setEnabled(false);
                    StatusBar.updateIndicator(INDICATOR_ID, true, "karma-enabled", "");        
                }, function () {
                    handleError(errors.KARMA_REPORTER);
                });
            });    
        });

        CommandManager.register("Launch tests", KARMA_RUNNER_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "running", "");
            run();
        }).setEnabled(false);

        CommandManager.register("Karma settings", KARMA_SETTINGS_COMMAND_ID, function () {
            settings.showDialog();
        }).setEnabled(true);

        CommandManager.register("Stop karma server", KARMA_STOP_COMMAND_ID, function () {
            StatusBar.updateIndicator(INDICATOR_ID, true, "karma-disabled", "");
            CommandManager.get(KARMA_SERVER_COMMAND_ID).setEnabled(true);
            CommandManager.get(KARMA_RUNNER_COMMAND_ID).setEnabled(false);
            CommandManager.get(KARMA_STOP_COMMAND_ID).setEnabled(false);
            nodeConnection.domains.karmaServer.stopServer();
        }).setEnabled(false);

        PanelManager.createBottomPanel("karma.results", $(KarmaTemplate), 100);
        $karmaResults = $("#karma-results");
        $("#karma-results .close").click(function () {
            Resizer.hide($karmaResults);
            _visible = false;
        });

        $karmaResults.find("ul.nav > li > a").click(function () {
            showTab($(this));
        });

        var karmaStatusHtml = Mustache.render("<div id=\"karma-status\">K</div>", Strings);
        $(karmaStatusHtml).insertBefore("#status-inspection");
        StatusBar.addIndicator(INDICATOR_ID, $("#karma-status"));
        StatusBar.updateIndicator(INDICATOR_ID, true, "karma-disabled", "");

        $("#karma-status").click(function () {
            if (!$(this).hasClass("karma-disabled")) {
                if (!_visible) {
                    showPanel();
                } else {
                    Resizer.hide($karmaResults);
                    _visible = false;
                }
            }
        });
       
        var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);

        
        menu.addMenuItem(KARMA_SERVER_COMMAND_ID);
        menu.addMenuItem(KARMA_CONNECT_COMMAND_ID);
        menu.addMenuItem(KARMA_STOP_COMMAND_ID);
        menu.addMenuItem(KARMA_RUNNER_COMMAND_ID, "Ctrl-Alt-K");
        menu.addMenuItem(KARMA_SETTINGS_COMMAND_ID);
        menu.addMenuDivider(Menus.BEFORE, KARMA_SERVER_COMMAND_ID);

    });

});
