({
    doInit : function(component, event, helper) {
        var flow = component.find("theFlow");
        flow.startFlow("New_Case_Patient_Case"); // reemplaza con el API Name de tu Flow
    },

    onStatusChange : function(component, event, helper) {
        var status = event.getParam("status");
        if (status === "FINISHED" || status === "FINISHED_SCREEN") {
            var outputs = event.getParam("outputVariables") || [];
            var idVar = outputs.find(v => v.name === "newCaseId");
            var recId = idVar && idVar.value;

            if (recId) {
                var navEvt = $A.get("e.force:navigateToSObject");
                if (navEvt) {
                    navEvt.setParams({ recordId: recId, slideDevName: "detail" });
                    navEvt.fire();
                }
            } else {
                var navList = $A.get("e.force:navigateToList");
                if (navList) {
                    navList.setParams({ "scope": "Case" });
                    navList.fire();
                }
            }
        }
    }
})