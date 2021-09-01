sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/library",
    "sap/ui/model/Sorter",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    'sap/m/MessageToast',
    'sap/ui/core/message/Message',
    'sap/ui/core/Element',
    'sap/ui/core/library',
    'sap/ui/core/Core',
    "sap/ui/core/Fragment",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/Text",

], function(BaseController, JSONModel, formatter, mobileLibrary, Sorter,
    MessagePopover, MessageItem, MessageToast, Message, Element, coreLibrary, Core, Fragment,
    Dialog, DialogType, Button, ButtonType, Text) {
    "use strict";

    //var MessageType = coreLibrary.MessageType;
    var MessageType = coreLibrary.MessageType;

    return BaseController.extend("de.sealsystems.sap.ddc.controller.Detail", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function() {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel,
                oPage = this.byId("ObjectPageLayout"),
                iOriginalBusyDelay = oPage.getBusyIndicatorDelay(),
                oTable = this.byId("idItemsList"),
                iOriginalBusyItemsDelay = oTable.getBusyIndicatorDelay();

            oViewModel = new JSONModel({
                busy: true,
                delay: 0,
                itemsBusy: true,
                itemsDelay: 0,
                itemsTitle: this.getResourceBundle().getText("itemsTitle"),
                paramTitle: this.getResourceBundle().getText("paramTitle"),
                editMode: false,
                displayMode: true
            });

            //set message model
            this._MessageManager = Core.getMessageManager();
            this._MessageManager.removeAllMessages();
            this.oView.setModel(this._MessageManager.getMessageModel(), "message");
            //activate automatic message generation for the whole view
            this._MessageManager.registerObject(this.oView, true);

            this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

            oPage.attachEventOnce("updateFinished", function() {
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            });
            oTable.attachEventOnce("updateFinished", function() {
                oViewModel.setProperty("/itemsDelay", iOriginalBusyItemsDelay);
            });

            this.prepareView();
        },


        //*************************************************************** */
        //***                 Messages handling                         ***/
        //*************************************************************** */
        _getMessagePopover: function() {
            var oView = this.getView();

            // create popover lazily (singleton)
            if (!this._pMessagePopover) {
                this._pMessagePopover = Fragment.load({
                    id: oView.getId(),
                    name: "de.sealsystems.sap.ddc.joblist.view.fragments.MessagePopover"
                }).then(function(oMessagePopover) {
                    oView.addDependent(oMessagePopover);
                    return oMessagePopover;
                });
            }
            return this._pMessagePopover;
        },

        onMessagePopoverPress: function(oEvent) {
            var oSourceControl = oEvent.getSource();
            this._getMessagePopover().then(function(oMessagePopover) {
                oMessagePopover.openBy(oSourceControl);
            });
        },

        buttonIconFormatter: function() {
            var sIcon;
            var aMessages = this._MessageManager.getMessageModel().oData;
            aMessages.forEach(function(sMessage) {
                switch (sMessage.type) {
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
        },


        // Display the button type according to the message with the highest severity
        // The priority of the message types are as follows: Error > Warning > Success > Info
        buttonTypeFormatter: function() {
            var sHighestSeverity;
            var aMessages = this._MessageManager.getMessageModel().oData;
            aMessages.forEach(function(sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sHighestSeverity = "Negative";
                        break;
                    case "Warning":
                        sHighestSeverity = sHighestSeverity !== "Negative" ? "Critical" : sHighestSeverity;
                        break;
                    case "Success":
                        sHighestSeverity = sHighestSeverity !== "Negative" && sHighestSeverity !== "Critical" ? "Success" : sHighestSeverity;
                        break;
                    default:
                        sHighestSeverity = !sHighestSeverity ? "Neutral" : sHighestSeverity;
                        break;
                }
            });
            return sHighestSeverity;
        },

        // Display the number of messages with the highest severity
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

            var aMessages = this._MessageManager.getMessageModel().oData;
            var iNumberOfMessages;
            aMessages.forEach(function(sMessage) {
                iNumberOfMessages = 1;
                var sMsg = sMessage.message;
                if (sMessage.type === sHighestSeverityMessageType) {
                    if (sMessage.message !== sMsg) {
                        ++iNumberOfMessages;
                    }
                }
            });
            return iNumberOfMessages;

        },

        /*============================================================ */
        /*      begin: internal methods                                */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function(oEvent) {
            var sJobnumber = oEvent.getParameter("arguments").Jobnumber;
            var sJobtype = oEvent.getParameter("arguments").Jobtype;
            var sJobversion = oEvent.getParameter("arguments").Jobversion;

            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getModel().metadataLoaded().then(function() {
                var sObjectPath = this.getModel().createKey("JobSet", {
                    Jobnumber: sJobnumber,
                    Jobtype: sJobtype,
                    Jobversion: sJobversion
                });
                this._bindView("/" + sObjectPath);
            }.bind(this));

        },

        /**
         * Binds the view to the object path. Makes sure that detail view displays
         * a busy indicator while data for the corresponding element binding is loaded.
         * @function
         * @param {string} sObjectPath path to the object to be bound to the view.
         * @private
         */
        _bindView: function(sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function() {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function() {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function() {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the master list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearMasterListSelection();
                return;
            }
        },

        _onMetadataLoaded: function() {
            // Store original busy indicator delay for the detail view
            var oViewModel = this.getModel("detailView");
            oViewModel.setProperty("/itemsBusy", false);
            oViewModel.setProperty("/busy", false);
        },

        onParamChange: function(event) {
            var newCount = event.getSource().getLength();
            var sTitle = this.getResourceBundle().getText("paramTitleCnt", newCount);
            this.getView().getModel("detailView").setProperty("/paramTitle", sTitle);
        },

        onSavePress: function() {
            //Lock controls
            this.prepareView();
            this._MessageManager.removeAllMessages();
            //Save
            var i, aRows = this.getView().byId("idItemsList").getRows();
            if (aRows.length) {
                for (i = 0; i < aRows.length; i++) {
                    if (aRows[i].getBindingContext() !== null) {
                        var sPath = aRows[i].getBindingContext().getPath();
                        var oObject = aRows[i].getBindingContext().getObject();
                        var that = this;
                        this.getModel().update(sPath, oObject, {
                            success: function(oData, response, oModel) {
                                var hdrMessage = response.headers["sap-message"];
                                if (hdrMessage !== undefined) {
                                    var hdrMessageObject = JSON.parse(hdrMessage);

                                    var oMsgType = MessageType.Error;
                                    if (hdrMessageObject.severity === "info") {
                                        oMsgType = MessageType.Success;
                                    } else if (hdrMessageObject.severity === "warning") {
                                        oMsgType = MessageType.Warning;
                                    }

                                    var oMessage = new Message({
                                        message: hdrMessageObject.message,
                                        type: oMsgType,
                                        target: "/Dummy",
                                        processor: that.getView().getModel()
                                    });
                                    sap.ui.getCore().getMessageManager().addMessages(oMessage);
                                    var oButton = that.getView().byId("idMessageBtn");
                                    oButton.setIcon(that.buttonIconFormatter());
                                    oButton.setType(that.buttonTypeFormatter());
                                    oButton.setText(that.highestSeverityMessages());
                                }
                            }
                        });
                    }
                }
            }
        },

        onEditPress: function() {
            this.prepareView("edit");
        },

        prepareView: function(sMode) {
            var oFlexBox = this.getView().byId("flexBoxParameter");
            oFlexBox.destroyItems();
            if (sMode === "edit") {
                this.getModel("detailView").setProperty("/editMode", true);
                this.getModel("detailView").setProperty("/displayMode", false);
                var oFragmentEdit = sap.ui.xmlfragment("de.sealsystems.sap.ddc.view.fragments.DetailParamEdit");
                oFlexBox.addItem(oFragmentEdit);
            } else {
                this.getModel("detailView").setProperty("/editMode", false);
                this.getModel("detailView").setProperty("/displayMode", true);
                var oFragmentDisplay = sap.ui.xmlfragment("de.sealsystems.sap.ddc.view.fragments.DetailParamDisplay");
                oFlexBox.addItem(oFragmentDisplay);
            }
        },

        onCancelPress: function() {
            //alert (this.getView().getModel().hasPendingChanges());
            if (this.getView().getModel().hasPendingChanges() === true) {
                this.showApproveDialog();
            } else {
                this.exitDetailView();
            }
        },

        showApproveDialog: function() {
            if (!this.oApproveDialog) {
                this.oApproveDialog = new Dialog({
                    type: DialogType.Message,
                    title: "Sichern",
                    content: new Text({ text: this.getModel("i18n").getResourceBundle().getText("dlgApproveMsg") }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: this.getModel("i18n").getResourceBundle().getText("dlgApproveJa"),
                        press: function() {
                            this.oApproveDialog.close();
                            this.onSavePress();
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: this.getModel("i18n").getResourceBundle().getText("dlgApproveNein"),
                        press: function() {
                            this.oApproveDialog.close();
                            this.exitDetailView();
                        }.bind(this)
                    })
                });
            }
            this.oApproveDialog.open();
        },

        exitDetailView: function() {
            this._MessageManager.removeAllMessages();
            history.go(-1);
            this.byId("idItemsList").clearSelection();
            this.prepareView();
        },

        onSelectPress: function() {
            var aSelectedItems, i, sPath;
            aSelectedItems = this.getView().byId("idItemsList").getSelectedIndices();
            if (aSelectedItems.length) {
                for (i = 0; i < aSelectedItems.length; i++) {
                    sPath = this.getView().byId("idItemsList").getContextByIndex(aSelectedItems[i]).getPath();
                    this.getOwnerComponent().getModel().setProperty(sPath + "/OutputFlag", true);
                }
            } else {
                sap.m.MessageToast.show(this.getModel("i18n").getResourceBundle().getText("itemsNoObjSel"));
            }
        },

        onDeselectPress: function() {
            var aSelectedItems, i, sPath;
            aSelectedItems = this.getView().byId("idItemsList").getSelectedIndices();
            if (aSelectedItems.length) {
                for (i = 0; i < aSelectedItems.length; i++) {
                    sPath = this.getView().byId("idItemsList").getContextByIndex(aSelectedItems[i]).getPath();
                    this.getOwnerComponent().getModel().setProperty(sPath + "/OutputFlag", false);
                }
            } else {
                sap.m.MessageToast.show(this.getModel("i18n").getResourceBundle().getText("itemsNoObjSel"));
            }
        },

        onClearFilterPress: function() {
            var oTable = this.byId("idItemsList");
            var aColumns = oTable.getColumns();
            for (var i = 0; i < aColumns.length; i++) {
                oTable.filter(aColumns[i], null);
            }
            oTable.getModel().refresh(true);
        },

    });

});
