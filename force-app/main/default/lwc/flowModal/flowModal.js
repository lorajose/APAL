import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class FlowModal extends LightningModal {
    @api flowApiName;
    @api finishAction = () => { };

    @api caseRecordTypeId;

    get flowParams() {
        if(this.caseRecordTypeId) {
            return [
                {
                    name: 'recordTypeIdCase',
                    type: 'String',
                    value: this.caseRecordTypeId
                }
            ];
        }
        return [];
    }

    handleCancel() {
        this.close('cancel');
    }

    handleStatusChange(event) {
        if (event.detail.status === "FINISHED") {
            this.finishAction(event.detail);
            this.close('finished');
        }
    }
}