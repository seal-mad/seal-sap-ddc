sap.ui.define([], function () {
  "use strict";

  return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
    numberUnit: function (sValue) {
      if (!sValue) {
        return "";
      }
      return parseFloat(sValue).toFixed(2);
    },

    // Status formatting in the detail view  (header)
    status: function (sStatus) {
      if (sStatus === "PE" || sStatus === "OE") {
        return "Error";
      } else if (sStatus === "PS") {
        return "Success";
      } else if (sStatus === "PR") {
        return "Warning";
      }
       return null;
    },

    // Icon formatting in the detail view (header)
    icon: function (sStatus) {
      if (sStatus === "PE" || sStatus === "OE") {
        return "sap-icon://message-error";
      } else if (sStatus === "PS") {
        return "sap-icon://message-success";
      } else if (sStatus === "PR") {
        return "sap-icon://message-warning";
      }
       return "";
    },

    time: function (sTime) {
      if (sTime === "00:00") {
        return "";
      }
      return sTime;
    },


  };


});
