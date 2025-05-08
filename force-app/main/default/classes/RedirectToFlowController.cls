public with sharing class RedirectToFlowController {

    public RedirectToFlowController(ApexPages.StandardController stdController) {
        // Constructor requerido para usar standardController
    }

    public PageReference redirectToFlow() {
        PageReference flowPage = new PageReference('/flow/New_Case_Patient_Case');
        flowPage.setRedirect(true);
        return flowPage;
    }
}