/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global $, define, brackets */

(function () {
    'use strict';
    console.log('running test suite');
    var runner = require('karma').runner,
        data = {
            configFile: 'karma.conf.js'
        };
    try {
        runner.run(data);
    } catch (e) {
        console.error("ERROR WHILE STARTING KARMA RUNNER", e);
    }
}());