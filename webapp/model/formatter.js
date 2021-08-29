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
    iconStatus: function (sStatus) {
      if (sStatus === "PE" || sStatus === "OE") {
        return "sap-icon://message-error";
      } else if (sStatus === "PS") {
        return "sap-icon://message-success";
      } else if (sStatus === "PR") {
        return "sap-icon://message-warning";
      } 
       return "";
    },

        // Icon formatting in the detail view (header)
    iconObject: function (sObjectType) {
      if (sObjectType === "@AR@" ) {
        return "./Images/s_b_docu.gif";
      } else if (sObjectType === "@HJ@") {
        return "./Images/s_readfi.gif";
      } else if (sObjectType === "@4W@") {
        return "./Images/s_b_bnbo.gif";
      } else if (sObjectType === "@FM@") {
        return "./Images/s_attach.gif";
      } else if (sObjectType === "@0K@") {
        return "./Images/s_b_nocr.gif";
      } else if (sObjectType === "@4I@") {
        return "./Images/s_b_plev.gif";
      } else if (sObjectType === "@IT@") {
        return "./Images/s_x__pdf.gif";
       } else if (sObjectType === "@J7@") {
        return "./Images/s_x__doc.gif";  
       } else if (sObjectType === "@0P@") {
        return "./Images/s_b_txdp.gif";
       } else if (sObjectType === "@J2@") {
        return "./Images/s_x__xls.gif";
       } else if (sObjectType === "@QE@") {
        return "./Images/s_lnkdoc.gif";
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
