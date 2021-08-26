sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/message/ControlMessageProcessor",
  "sap/ui/core/message/Message",
  "../model/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/Device",
  "sap/m/GroupHeaderListItem",
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/core/library",
  "sap/m/MessagePopover",
  "sap/m/MessagePopoverItem",
  "sap/ui/table/RowAction",
  "sap/ui/table/RowActionItem"
], function(BaseController, JSONModel, ControlMessageProcessor, Message, formatter, Filter, FilterOperator, Device, GroupHeaderListItem, Controller,
  MessageToast, coreLibrary, MessagePopover, MessagePopoverItem, RowAction, RowActionItem) {
  "use strict";

  // var MessageType = coreLibrary.MessageType;
  var oMessagePopover;
  var oMessageTemplate;

  return BaseController.extend("de.sealsystems.sap.ddc.controller.Joblist", {

    formatter: formatter,
    _oFormFragments: {},

    onInit: function() {
      var oViewModel,
        oTable = this.byId("idJobTable"),
        iOriginalBusyDelay = oTable.getBusyIndicatorDelay();

      oViewModel = new JSONModel({
        tableTitle: this.getResourceBundle().getText("table-Title"),
        delay: 0,
      });
      this.setModel(oViewModel, "JoblistView");
      this.oFilterBar = this.byId("idFilterBar");

      oTable.attachEventOnce("updateFinished", function() {
        oViewModel.setProperty("/delay", iOriginalBusyDelay);
      });

      oMessageTemplate = new sap.m.MessagePopoverItem({
        type: '{severity}',
        title: '{code}',
        description: '{message}'
      });

      oMessagePopover = new sap.m.MessagePopover({
        items: {
          path: '/',
          template: oMessageTemplate
        }
      });
      var oModel = new JSONModel();
      oModel.setData();
      this.getView().setModel(oModel, "returnMessages");

      var fnPress = this.onPress.bind(this);
      var oTemplate = new RowAction({
        items: [
          new RowActionItem({
            type: "Navigation",
            press: fnPress,
            visible: "{Available}"
          })
        ]
      });

      oTable.setRowActionTemplate(oTemplate);
      oTable.setRowActionCount(1);
    },

     onRevertColumnWidthsBtnPress: function() {
      this.byId("idJobTable").getColumns().map(
        function(col) {
          col.setWidth(col.origWidth);
        }
      );
    },

    _autoResizeColumns: function() {
      var table = this.byId("idJobTable");
      table.getColumns().map(function(col, index) {
        col.origWidth = col.getWidth();
        table.autoResizeColumn(index);
      });
    },

    //*************************************************************** */
    //***     Printing and refreshing                               ***/
    //*************************************************************** */
    onPrintButtonPress: function(oEvent) {
      var aSelectedItems, i, sPath, oObject, bindingCtx;

      aSelectedItems = this.getView().byId("idJobTable").getSelectedIndices();
      if (aSelectedItems.length) {
        for (i = 0; i < aSelectedItems.length; i++) {
          bindingCtx = this.getView().byId("idJobTable").getContextByIndex(i + 1);
          sPath = bindingCtx.getPath();
          oObject = bindingCtx.getObject();

          this.getModel().update(sPath, oObject, {
            success: (function(data, response) {
              this._handleReorderActionResult.bind(this, oObject, true, i + 1, aSelectedItems.length);

              var responseheader = response.headers["sap-message"];
              if (responseheader != null) {
                // var msgObj = JSON.parse(JSON.stringify(response.headers["sap-message"]));
                var msgObj = JSON.parse(response.headers["sap-message"]);
                console.log(msgObj);
                console.log(msgObj.details);
                var oModel = new JSONModel();
                //var oModel = this.getView().getModel("returnMessages");
                oModel.setData(msgObj.details);
                console.log(oModel.oData);

                for (var i = 0; i < msgObj.details.length; i++) {
                  switch (msgObj.details[i].severity) {
                    case "error":
                      oModel.setProperty('/' + i + '/severity', "Error");
                      break;
                    case "warning":
                      oModel.setProperty('/' + i + '/severity', "Warning");
                      break;
                    case "success":
                      oModel.setProperty('/' + i + '/severity', "Success");
                      break;
                    case "information":
                      oModel.setProperty('/' + i + '/severity', "Information");
                      break;
                    default:
                      oModel.setProperty('/' + i + '/severity', "None");
                      break;
                  }
                }

                oMessagePopover.setModel(oModel);
                this.getView().setModel(oModel, "returnMessages");
                this.byId("messageIndic").addDependent(oMessagePopover);
                this.byId("messagePopoverBtn").addDependent(oMessagePopover);
                this.byId("messageIndic").setModel(oModel);
                this.byId("messagePopoverBtn").setModel(oModel);
              }
            }).bind(this),
            error: (function(data, response) {
              this._handleReorderActionResult.bind(this, oObject, false, i + 1, aSelectedItems.length);

              console.log(response.headers["sap-message"]);
              var msgObj = JSON.parse(response.headers["sap-message"]);
              console.log(msgObj.details);
            }).bind(this)
          });
        }
      } else {
        sap.m.MessageToast.show(this.getModel("i18n").getResourceBundle().getText("printNoJobsSel"));
      }
    },

    onRefreshButtonPress: function(oEvent) {
      this.getJobList();
    },

    _handleReorderActionResult: function(oObject, bSuccess, iRequestNumber, iTotalRequests) {
      if (iRequestNumber === iTotalRequests) {
        sap.m.MessageToast.show(this.getModel("i18n").getResourceBundle().getText("printProcessMsg", [iTotalRequests]));
      }
    },

    onChange: function(event) {
      var newCount = event.getSource().getLength();
      var sTitle = this.getResourceBundle().getText("table-TitleCnt", newCount);
      this.getModel("JoblistView").setProperty("/tableTitle", sTitle);
      var that = this;
      setTimeout(function() {
        that._autoResizeColumns();
      });
    },


    //*************************************************************** */
    //***     Filtering by Job number                               ***/
    //*************************************************************** */

    onJobNumberSubmit: function(oEvent) {
      this.getJobList();
    },

    //*************************************************************** */
    //***              Common filtering                             ***/
    //*************************************************************** */
    getJobList: function(oEvent) {
      var aFilter = [];
     
      var oJobNumberInput = this.getView().byId("idJobNumber");
      var sJobNumberValue = oJobNumberInput.getValue();
      if (sJobNumberValue !== "") {
        aFilter.push(new Filter("Jobnumber", FilterOperator.Contains, sJobNumberValue));
      }

      var oTable = this.byId("idJobTable");
      oTable.getBinding("rows").filter(aFilter);
    },

    //*************************************************************** */
    //***              handle MessagePopover                        ***/
    //*************************************************************** */

    // Display the button type according to the message with the highest severity
    // The priority of the message types are as follows: Error > Warning > Success > Info
    buttonTypeFormatter: function() {
      var sHighestSeverityIcon;
      var aMessages = this.getView().getModel("returnMessages");
      console.log(aMessages);
      if (aMessages.oData != null) {
        aMessages.oData.forEach(function(sMessage) {
          switch (sMessage.severity) {
            case "Error":
              sHighestSeverityIcon = "Negative";
              break;
            case "Warning":
              sHighestSeverityIcon = sHighestSeverityIcon !== "Negative" ? "Critical" : sHighestSeverityIcon;
              break;
            case "Success":
              sHighestSeverityIcon = sHighestSeverityIcon !== "Negative" && sHighestSeverityIcon !== "Critical" ? "Success" : sHighestSeverityIcon;
              break;
            default:
              sHighestSeverityIcon = !sHighestSeverityIcon ? "Neutral" : sHighestSeverityIcon;
              break;
          }
        });
        return sHighestSeverityIcon;
      } else { return sHighestSeverityIcon = !sHighestSeverityIcon ? "Neutral" : sHighestSeverityIcon; }
    },


    // Set the button icon according to the message with the highest severity
    buttonIconFormatter: function() {
      var sIcon;
      var aMessages = this.getView().getModel("returnMessages");
      console.log(aMessages);
      if (aMessages.oData != null) {
        aMessages.oData.forEach(function(sMessage) {
          switch (sMessage.severity) {
            case "Error":
              sIcon = "sap-icon://message-error";
              break;
            case "Warning":
              sIcon = sIcon !== "sap-icon://message-error" ? "sap-icon://message-warning" : sIcon;
              break;
            case "Success":
              sIcon = "sap-icon://message-error" && sIcon !== "sap-icon://message-warning" ? "sap-icon://message-success" : sIcon;
              break;
            default:
              sIcon = !sIcon ? "sap-icon://message-information" : sIcon;
              break;
          }
        });
        return sIcon;
      } else { return sIcon = "sap-icon://message-information"; }
    },

    onMessagesButtonPress: function(oEvent) {
      var oMessagesButton = oEvent.getSource();

      if (!this._messagePopover) {
        this._messagePopover = oMessagePopover;
        oMessagesButton.addDependent(this._messagePopover);
      }
      this._messagePopover.toggle(oMessagesButton);
    },

    // // Display the number of messages with the highest severity
    highestSeverityMessages: function() {
      var sHighestSeverityIconType = this.buttonTypeFormatter();
      var sHighestSeverityMessageType;

      switch (sHighestSeverityIconType) {
        case "Negative":
          sHighestSeverityMessageType = "Error";
          break;
        case "Critical":
          sHighestSeverityMessageType = "Warning";
          break;
        case "Success":
          sHighestSeverityMessageType = "Success";
          break;
        default:
          sHighestSeverityMessageType = !sHighestSeverityMessageType ? "Information" : sHighestSeverityMessageType;
          break;
      }
      var msgModel = this.getView().getModel("returnMessages");
      if (msgModel.oData != null) {
        return msgModel.oData.reduce(function(iNumberOfMessages, oMessageItem) {
          return oMessageItem.severity === sHighestSeverityMessageType ? ++iNumberOfMessages : iNumberOfMessages;
        }, 0);
      } else { return 0; }
    },

    //*************************************************************** */
    //***          Navigation to the detail view                    ***/
    //*************************************************************** */
    onPress: function(oEvent) {
      // The source is the list item that got pressed
      this._showObject(oEvent.getSource());
    },

    onClear: function() {
      var oItems = this.oFilterBar.getAllFilterItems(true);
      for (var i = 0; i < oItems.length; i++) {
        var oControl = this.oFilterBar.determineControlByFilterItem(oItems[i]);
        if (oControl) {
          oControl.setValue("");
        }
      }
      this.getJobList();
    },

    onClearFilterPress: function() {
      var oTable = this.byId("idJobTable");
      var aColumns = oTable.getColumns();
      for (var i = 0; i < aColumns.length; i++) {
        oTable.filter(aColumns[i], null);
      }
      oTable.getModel().getModel().refresh(true);
    },

    _showObject: function(oItem) {

      var sVersion = oItem.getBindingContext().getProperty("Jobversion");

      if (sVersion === undefined || sVersion === null || sVersion === "") {
        sVersion = "00";
      }

      // set the layout property of FCL control to show two columns
      //	this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
      this.getRouter().navTo("detail", {
        Jobnumber: oItem.getBindingContext().getProperty("Jobnumber"),
        Jobtype: oItem.getBindingContext().getProperty("Jobtype"),
        Jobversion: sVersion
      });
    },
  });
});
