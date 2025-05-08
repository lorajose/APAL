import { LightningElement, api } from 'lwc';

export default class ProviderinCaseFlow extends LightningElement {
    @api accountId;
    @api accountRecord;
    @api isFromFlow;
    @api recordId;

    handleValueChange(event) {
        this.accountId = event.detail.accountId;
        this.accountRecord = null;
        if(this.accountId.startsWith('apal') || this.accountId.startsWith('vmap')) {
            this.accountRecord = event.detail.accountRecord;
        }
    }

    handleClearSelection() {
        this.accountId = null;
        this.accountRecord = null;
    }

    handleInitialPopulate() {
        if(this.accountId) {
            let searchInput = this.template.querySelector('c-account-search-input');
            searchInput.setPreSelectedAccount(this.accountId);
        } else {
            this.handleClearSelection();
        }
    }

    @api
    validate() {
        if (this.accountId) {
            return { isValid: true };
        } else {
            return {
                isValid: false,
                errorMessage: 'Please select a provider.'
            }
        }
    }

    finishAction = ({ outputVariables }) => {
        let searchInput = this.template.querySelector('c-account-search-input');
        outputVariables.forEach(outputVar => {
            if (outputVar.name == "provider") {
                const newAccount = outputVar.value;
                this.accountId = newAccount.Id
                this.accountRecord = null;
                searchInput.addNewAccount(newAccount);
                const accountSelectedEvent = new CustomEvent('accountselected', {
                    detail: {
                        accountId: newAccount.Id,
                        accountRecord: newAccount
                    },
                    bubbles: true,
                    composed: true
                });
                this.dispatchEvent(accountSelectedEvent);
            }
        });
    }
}