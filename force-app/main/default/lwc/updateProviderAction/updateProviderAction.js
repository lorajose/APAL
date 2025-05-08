import {LightningElement, api, track} from 'lwc';
import createExternalAccount from '@salesforce/apex/AccountSearchInputControllerApal.createNewExternalAccount';
import updateCase from '@salesforce/apex/AccountSearchInputControllerApal.updateCaseWithNewAccount';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {CloseActionScreenEvent} from 'lightning/actions';

export default class UpdateProviderAction extends LightningElement {
    @api recordId;
    @track isLoading = true;

    @track accountId;
    @track currentAccountId;
    @track accountRecord;

    @track errorMessage;
    @track isError = false;
    @track errorHeader;

    updateErrorHeader = 'Something went wrong while updating the Case. Check the details below for more information.'

    get isSaveButtonDisabled() {
        return this.isLoading || !this.accountId || (this.accountId === this.currentAccountId);
    }

    get componentClass() {
        return this.isLoading ? 'slds-hide' : '';
    }

    handleLoadingEnd(event) {
        console.log('handle loading end');
        console.log('event.detail.accountId: ' + event.detail.accountId);
        this.currentAccountId = event.detail.accountId;
        this.isLoading = false;
    }

    handleClearSelection() {
        this.accountId = null;
        this.accountRecord = null;
    }

    handleAccountSelected(event) {
        this.accountId = event.detail.accountId;
        console.log('handle account select on update: ' + this.accountId);
        this.accountRecord = null;
        console.log('handle account select on update: ' + JSON.stringify(this.accountRecord));
        if (this.accountId.startsWith('apal') || this.accountId.startsWith('vmap')) {
            console.log('in if block');
            this.accountRecord = event.detail.accountRecord;
            console.log('handle account select on update (in if block): ' + JSON.stringify(this.accountRecord));
        }
    }

    handleSave() {
        this.isLoading = true;

        const showSuccess = () => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Provider updated successfully.',
                    variant: 'success'
                })
            );
            //eval("$A.get('e.force:refreshView').fire();");
            window.location.reload(); 
            this.dispatchEvent(new CloseActionScreenEvent());
        };

        const showError = (message) => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: message || 'Something went wrong.',
                    variant: 'error'
                })
            );
        };

        if (this.accountRecord) {
            createExternalAccount({accountRecord: this.accountRecord})
                .then(result => {
                    const newAccountId = result?.accountId;
                    if (!newAccountId) {
                        this.isLoading = false;
                        this.isError = true;
                        this.errorMessage = result?.message;
                        this.errorHeader = null;
                        return;
                    }
                    return updateCase({accountId: newAccountId, caseId: this.recordId});
                })
                .then(() => {
                    if (!this.isError) {
                        this.isLoading = false;
                        showSuccess();
                    }
                })
                .catch(error => {
                    this.isLoading = false;
                    this.isError = true;
                    this.errorMessage = error?.body?.message || error.message;
                    this.errorHeader = this.updateErrorHeader;
                });
        } else {
            updateCase({caseId: this.recordId, accountId: this.accountId})
                .then(() => {
                    this.isLoading = false;
                    showSuccess();
                })
                .catch(error => {
                    this.isLoading = false;
                    this.isError = true;
                    this.errorMessage = error?.body?.message || error.message;
                    this.errorHeader = this.updateErrorHeader;
                });
        }
    }
}