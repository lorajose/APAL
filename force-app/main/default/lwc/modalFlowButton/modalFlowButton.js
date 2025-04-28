import { LightningElement, api } from 'lwc';
import flowModal from 'c/flowModal';

export default class ModalFlowButton extends LightningElement {
    @api label = 'label';
    @api variant = 'brand';
    @api flowApiName = '';
    @api finishAction = () => {};
    @api caseRecordTypeId;

    showFlow() {
        flowModal.open({
            flowApiName: this.flowApiName,
            finishAction: this.finishAction,
            caseRecordTypeId: this.caseRecordTypeId
        })
        .then((result) => {
            console.log(result);
        });
    }
}