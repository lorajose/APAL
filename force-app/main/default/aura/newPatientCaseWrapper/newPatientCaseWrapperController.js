({
    handleFlowFinished: function(component, event, helper) {
        var workspaceAPI = component.find("workspace");
        var recordId = event.getParam("recordId");

        if (!recordId) {
            console.warn("No recordId returned");
            return;
        }

        // Abrir el nuevo Case en una nueva pestaña y cerrar la actual
        workspaceAPI.openTab({
            recordId: recordId,
            focus: true
        }).then(function() {
            return workspaceAPI.getFocusedTabInfo();
        }).then(function(tabInfo) {
            return workspaceAPI.closeTab({ tabId: tabInfo.tabId });
        }).catch(function(error) {
            console.error("Error al cerrar pestaña:", error);
        });
    }
})