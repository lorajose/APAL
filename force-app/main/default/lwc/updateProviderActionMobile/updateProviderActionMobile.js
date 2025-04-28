/*import {LightningElement, api, track} from 'lwc';

import createExternalAccount from '@salesforce/apex/AccountSearchInputControllerApal.createNewExternalAccount';
import updateCase from '@salesforce/apex/AccountSearchInputControllerApal.updateCaseWithNewAccount';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {CloseActionScreenEvent} from 'lightning/actions';

export default class UpdateProviderActionMobile extends LightningElement {
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
*/
import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import createExternalAccount from '@salesforce/apex/AccountSearchInputControllerApal.createNewExternalAccount';
import updateCase from '@salesforce/apex/AccountSearchInputControllerApal.updateCaseWithNewAccount';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';

// Importa el campo Provider__c del objeto Case
import PROVIDER_FIELD from '@salesforce/schema/Case.Provider__c';
import PROVIDER_NAME_FIELD from '@salesforce/schema/Case.Provider__r.Name';

export default class UpdateProviderActionMobile extends LightningElement {
    @api recordId;
    @track isLoading = true;

    @track accountId;
    @track currentAccountId;
    @track accountRecord;

     @track providerName; // 👈 Nuevo: para guardar el nombre del Provider

    @track errorMessage;
    @track isError = false;
    @track errorHeader;

    updateErrorHeader = 'Something went wrong while updating the Case. Check the details below for more information.'

    // Wire optimizado para traer ID y Nombre
    @wire(getRecord, { recordId: '$recordId', fields: [PROVIDER_FIELD, PROVIDER_NAME_FIELD] })
    wiredCase({ error, data }) {
        if (data && !this.currentAccountId) {
            this.currentAccountId = data.fields.Provider__c?.value || null;
            this.providerName = data.fields.Provider__r?.displayValue || '';
            console.log('Provider loaded:', this.currentAccountId, this.providerName);
            this.isLoading = false;
        } else if (error) {
            console.error('Error loading provider via wire:', error);
            this.isLoading = false;
        }
    }

    // Wire para traer el Provider__c del Case si el event.detail no funciona
  /*  @wire(getRecord, { recordId: '$recordId', fields: [PROVIDER_FIELD] })
    wiredCase({ error, data }) {
        if (data && !this.currentAccountId) {
            this.currentAccountId = data.fields.Provider__c?.value || null;
            console.log('Provider loaded from wire:', this.currentAccountId);
            this.isLoading = false;
        } else if (error) {
            console.error('Error loading provider via wire:', error);
            this.isLoading = false;
        }
    } . */

    get isSaveButtonDisabled() {
        return this.isLoading || !this.accountId || (this.accountId === this.currentAccountId);
    }

    get componentClass() {
        return this.isLoading ? 'slds-hide' : '';
    }

    handleLoadingEnd(event) {
        console.log('handle loading end');
        if (event && event.detail && event.detail.accountId) {
            console.log('event.detail.accountId: ' + event.detail.accountId);
            this.currentAccountId = event.detail.accountId;
        } else {
            console.warn('No accountId found in event.detail, relying on wired Provider__c');
            // No hacemos nada aquí porque el @wire lo traerá
        }
        this.isLoading = false;
    }

    handleClearSelection() {
        this.accountId = null;
        this.accountRecord = null;
    }

    handleAccountSelected(event) {
        if (event && event.detail && event.detail.accountId) {
            this.accountId = event.detail.accountId;
            console.log('handle account select on update: ' + this.accountId);
            this.accountRecord = null;
            console.log('handle account select on update: ' + JSON.stringify(this.accountRecord));
            if (this.accountId.startsWith('apal') || this.accountId.startsWith('vmap')) {
                console.log('in if block');
                this.accountRecord = event.detail.accountRecord;
                console.log('handle account select on update (in if block): ' + JSON.stringify(this.accountRecord));
            }
        } else {
            console.warn('No account selected (event.detail missing)');
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
            createExternalAccount({ accountRecord: this.accountRecord })
                .then(result => {
                    const newAccountId = result?.accountId;
                    if (!newAccountId) {
                        this.isLoading = false;
                        this.isError = true;
                        this.errorMessage = result?.message;
                        this.errorHeader = null;
                        return;
                    }
                    return updateCase({ accountId: newAccountId, caseId: this.recordId });
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
            updateCase({ caseId: this.recordId, accountId: this.accountId })
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