/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Mustache */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        dialogTemplate = require("text!htmlContent/settings-dialog.html");


    var context = {};
    var prefs;
    var defaults = {
        port: 5000,
        configFile: "karma.conf.js",
        openPanel: "onerror"
    };
    
    var isWin = window.navigator.appVersion.indexOf("Win") !== -1;

    defaults.executable = isWin ? "C:\\Program Files (x86)\\nodejs\\node_modules\\karma" : "/usr/local/bin/karma";
    var openPanelOptions = [
        {
            name: "always",
            value: "Every time a test suite complete"
        },
        {
            name: "onerror",
            value: "Every time at least one test fail"
        },
        {
            name: "never",
            value: "Never (click the 'K' in the status bar to open)"
        }
    ];


    var _init = function () {
        prefs = PreferencesManager.getExtensionPrefs("karma");
        prefs.definePreference("port", "number", 5000);
        prefs.definePreference("configFile", "string", "karma.conf.js");
        prefs.definePreference("openPanel", "string", "onerror");
        prefs.definePreference("executable", "string", defaults.executable);

    };

    var _handleSave = function () {
        var inputValues = $(".karma-settings-dialog").find('input, select').serializeArray();
        inputValues.forEach(function (configElement) {
            prefs.set(configElement.name, configElement.value);
        });
        prefs.save();
         $("#karma-settings-save").off("click", _handleSave);
    };

    var _showDialog = function () {
        context.configFile = prefs.get("configFile");
        context.openPanel = openPanelOptions.map(function (option) {
            if (prefs.get("openPanel") === option.name) {
                option.selected = true;
            } else {
                option.selected = null;
            }
            return option;
        });
        
        context.executable = prefs.get("executable");
        
        Dialogs.showModalDialogUsingTemplate(Mustache.render(dialogTemplate, context)).done(function (retval) {
            // console.log("Settings:", settings);
        });
        $("#karma-settings-save").on("click", _handleSave);
    };



    var _getAll = function () {
        return {
            port: prefs.get("port"),
            configFile: prefs.get("configFile"),
            openPanel: prefs.get("openPanel"),
            executable: prefs.get("executable")
        };
    };

    var _get = function (key) {
        return prefs.get(key);
    };

    _init();

    exports.showDialog = _showDialog;
    exports.getAll = _getAll;
    exports.get = _get;

    // We could also add a key binding at the same time:
    //menu.addMenuItem(KARMA_COMMAND_ID, "Ctrl-Alt-H");
    // (Note: "Ctrl" is automatically mapped to "Cmd" on Mac)
});