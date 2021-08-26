/*global QUnit*/

sap.ui.define([
	"desealsystems.sap./ddc/controller/Joblist.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Joblist Controller");

	QUnit.test("I should test the Joblist controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
