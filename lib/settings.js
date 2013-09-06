/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Mustache */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        dialogTemplate = require("text!htmlContent/settings-dialog.html");

    var KARMA_SETTINGS_CLIENT_ID = "karma.settings";

    var settings;
    var context = {};
    var defaults = {
        port: 5000,
        configFile: 'karma.conf.js',
        openPanel: 'onerror'
    };
    
    var isWin = window.navigator.appVersion.indexOf("Win") !== -1;

    defaults.executable = isWin ? 'C:\\Program Files (x86)\\nodejs\\node_modules\\karma' : '/usr/local/bin/karma';
    var openPanelOptions = [
        {
            name: 'always',
            value: 'Every time a test suite complete'
        },
        {
            name: 'onerror',
            value: 'Every time at least one test fail'
        },
        {
            name: 'never',
            value: 'Never (click the "K" in the status bar to open)'
        }
    ];

    var storage;

    var _init = function () {
        storage = PreferencesManager.getPreferenceStorage(KARMA_SETTINGS_CLIENT_ID, defaults);
        settings = storage.getAllValues();
    };

    var _handleSave = function () {
        var inputValues = $(".karma-settings-dialog").find('input, select').serializeArray();
        inputValues.forEach(function (configElement) {
            settings[configElement.name] = configElement.value;
        });
        storage.setAllValues(settings);
        settings = storage.getAllValues();
    };

    var _showDialog = function () {
        context.configFile = settings.configFile;
        context.openPanel = openPanelOptions.map(function (option) {
            if (settings.openPanel === option.name) {
                option.selected = true;
            } else {
                option.selected = null;
            }
            return option;
        });
        
        context.executable = settings.executable;
        
        Dialogs.showModalDialogUsingTemplate(Mustache.render(dialogTemplate, context)).done(function (retval) {
            console.log('Settings:', settings);
        });
        $("#karma-settings-save").click(_handleSave);
    };



    var _getAll = function () {
        return settings;
    };

    var _get = function (key) {
        return settings[key];
    };

    _init();

    exports.showDialog = _showDialog;
    exports.getAll = _getAll;
    exports.get = _get;

    // We could also add a key binding at the same time:
    //menu.addMenuItem(KARMA_COMMAND_ID, "Ctrl-Alt-H");
    // (Note: "Ctrl" is automatically mapped to "Cmd" on Mac)
});