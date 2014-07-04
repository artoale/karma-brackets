/*global define, $, brackets, window, Mustache */
define(function () {
	"use strict";
	return {
		NODE_CONNECTION: {
			message: "Unable to connect to brackets node process. Please try to restart Brackets, if the problem persists, please report it on <a href=\"https://github.com/artoale/karma-brackets/issues\">https://github.com/artoale/karma-brackets/issues</a>",
			code: "NODE_CONNECTION"
		},
		DOMAIN: {
			message: "Unable to get karma domain. Please try to restart Brackets, if the problem persists, please report it on <a href=\"https://github.com/artoale/karma-brackets/issues\">https://github.com/artoale/karma-brackets/issues</a>",
			code: "DOMAIN"
		},
		KARMA_REPORTER: {
			message: "We weren't able to connect to karma brackets reporter - please make sure it is installed and in the list of reporter of your karma.conf.js file",
			code: "KARMA_REPORTER"
		},
		START_KARMA: {
			message: "There was an error while starting karma server. Check you have the path to karma executable configured correctly and that karma config file is in the root of the current project.",
			code: "START_KARMA"
		},
		CONNECT_SERVER: {
			message: "Apparently, we weren't able to find a karma server with brackets reporter running. Please make sure that karma is running and  it's properly configured to use brackets reporter. If the problem persists, please file an issue on <a href=\"https://github.com/artoale/karma-brackets/issues\">https://github.com/artoale/karma-brackets/issues</a>",
			code: "CONNECT_SERVER"
		},
		RUN_KARMA: {
			message: "There was an error while trying to run the tests suite. Please, make sure you have karma running in the project root. If the problem persist, please report it on <a href=\"https://github.com/artoale/karma-brackets/issues\">https://github.com/artoale/karma-brackets/issues</a>",
			code: "RUN_KARMA"
		}
	};
});