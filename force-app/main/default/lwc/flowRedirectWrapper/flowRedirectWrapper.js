import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class FlowRedirectWrapper extends NavigationMixin(LightningElement) {
    flowFinished(event) {
        if (event.detail.status === 'FINISHED') {
            const outputs = event.detail.outputVariables;
            const newRecordId = outputs.find(v => v.name === 'patientCase')?.value;

            if (newRecordId) {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: newRecordId,
                        objectApiName: 'Case',
                        actionName: 'view'
                    }
                });
            }

            // ✅ Notifica al Aura wrapper que el Flow terminó
           const flowFinishedEvent = new CustomEvent('flowfinished', {
    bubbles: true,
    composed: true,
    detail: {
        recordId: newRecordId
    }
});
this.dispatchEvent(flowFinishedEvent);
        }
    }
}