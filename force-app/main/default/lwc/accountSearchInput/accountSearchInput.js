import {LightningElement, track, api, wire} from 'lwc';
import getAccounts from '@salesforce/apex/AccountSearchInputController.retrieveAllAccounts';
import getHelpText from '@salesforce/apex/AccountSearchInputController.getInputHelpTextContent';

export default class AccountSearchDropdown extends LightningElement {
    @track searchTerm = '';
    @track showDropdown = false;
    @track selectedAccount = null;
    @track allAccounts = [];

    @track originalAccounts = [];
    @track showError = false;
    @track helpTextContent;
    @track isExternalRetrieveSuccessful;

     @track isModalOpen = false;


     @api
    get selectedSearchTerm() {
        //return this.searchTerm;
        return this.selectedAccount?.id || '';
    }

    @wire(getHelpText)
    wiredSettings({error, data}) {
        if (data) {
            this.helpTextContent = data;
        } else if (error) {
            console.error('Error loading settings:', error);
        }
    }

    connectedCallback() {
        getAccounts()
            .then((result) => {
                this.originalAccounts = result.accounts;
                this.allAccounts = result.accounts.map(acc => ({
                    id: acc.Id || acc.AccountSync_Id__c,
                    firstName: acc.FirstName || '',
                    lastName: acc.LastName || '',
                    email: acc.PersonEmail || '',
                    phone: acc.Phone || '',
                    npi: acc.pcpnpi__c || '',
                    org: acc.Id ? 'VMAP' : 'APAL'
                }));
                this.isExternalRetrieveSuccessful = result.isExternalRetrieveSuccessful;
            })
            .catch((error) => {
                console.error('Error loading accounts:', error);
            });
    }

    get shouldShowError() {
        return this.showError && !this.showDropdown;
    }

    get filteredVMAPAccounts() {
        return this.filterAccounts('VMAP');
    }

    get filteredAPALAccounts() {
        return this.filterAccounts('APAL');
    }

    handleInputChange(event) {
        this.searchTerm = event.target.value;
        this.showDropdown = this.searchTerm.length >= 3;
    }

    handleFocus() {
        if (this.searchTerm.length >= 3 && !this.selectedAccount) {
            this.showDropdown = true;
        }
    }

    handleBlur() {
        console.log('Blur event triggered' + this.selectedAccount);
        setTimeout(() => {
            this.showDropdown = false;
            if (!this.selectedAccount) {
                this.showError = true;
            }
        }, 150);
    }

    preventBlur(event) {
        event.preventDefault();
    }

    handleSelect(event) {
        const selectedId = event.currentTarget.dataset.id;
        const account = this.allAccounts.find(acc => acc.id === selectedId);
        const originalAccount = this.originalAccounts.find(acc =>
            acc.Id === selectedId || acc.AccountSync_Id__c === selectedId
        );
        const matchingOriginal = this.originalAccounts.find(acc =>
            acc.AccountSync_Id__c === selectedId && acc.Id
        );
        const finalAccountId = matchingOriginal ? matchingOriginal.Id : account.id;

        this.searchTerm = `${account.firstName} ${account.lastName}`;
        this.showDropdown = false;
        this.selectedAccount = account;
        this.showError = false;

        const accountSelectedEvent = new CustomEvent('accountselected', {
            detail: {
                accountId: finalAccountId,
                accountRecord: originalAccount
            },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(accountSelectedEvent);
    }

    clearSelection() {
        this.selectedAccount = null;
        this.searchTerm = '';
        this.showDropdown = false;
        this.showError = false;

        const clearSelectionEvent = new CustomEvent('clearselection', {
            bubbles: true,
            composed: true
        });

        this.dispatchEvent(clearSelectionEvent);

        setTimeout(() => {
            this.template.querySelector('input').focus();
        }, 0);
    }

    filterAccounts(org) {
        if (this.searchTerm.length < 3) return [];

        const term = this.searchTerm.toLowerCase().trim();
        const terms = term.split(/\s+/);

        return this.allAccounts
            .filter(acc => acc.org === org)
            .filter(acc => {
                const fullName = `${acc.firstName} ${acc.lastName}`.toLowerCase();
                const reverseFullName = `${acc.lastName} ${acc.firstName}`.toLowerCase();

                const matchesFullName = terms.every(t =>
                    fullName.includes(t) || reverseFullName.includes(t)
                );

                const matchesOtherFields =
                    acc.email.toLowerCase().includes(term) ||
                    acc.phone.toLowerCase().includes(term) ||
                    acc.npi.toLowerCase().includes(term);

                return matchesFullName || matchesOtherFields;
            })
            .slice(0, 20);
    }

    @api
    showValidationError() {
        this.showError = true;
    }

    get inputClass() {
        return `slds-input ${this.showError ? 'slds-has-error error-background-input' : this.selectedAccount ? 'box-shadow' : ''}`;
    }

    @api
    addNewAccount(newAccount) {
        console.log('⚡ New account added:', newAccount);
        const formatted = {
            id: newAccount.Id || newAccount.AccountSync_Id__c,
            firstName: newAccount.FirstName || '',
            lastName: newAccount.LastName || '',
            email: newAccount.PersonEmail || '',
            phone: newAccount.Phone || '',
            npi: newAccount.pcpnpi__c || '',
            org: newAccount.Id ? 'VMAP' : 'APAL'
        };

        this.allAccounts = [formatted, ...this.allAccounts];
        this.originalAccounts = [newAccount, ...this.originalAccounts];
        this.selectedAccount = formatted;
        this.searchTerm = `${formatted.firstName} ${formatted.lastName}`;
    
        this.showDropdown = false;
        this.showError = false;
        
    }

launchFlow() {
    this.isModalOpen = true;
}

closeModal() {
    console.log('✅ closeModal triggered');
    this.isModalOpen = false;
}

/*handleFlowStatusChange(event) {
//    if (event.detail.status === 'FINISHED' && event.detail.output) {
        const newAccountOutput = event.detail.output.find(o => o.name === 'newAccount');
        if (newAccountOutput && newAccountOutput.value) {
            this.addNewAccount(newAccountOutput.value);
        }
        this.closeModal();
    }
} */

/*handleFlowStatusChange(event) {
      console.log('⚡ Flow status change:', event.detail.status);
    if (event.detail.status === 'FINISHED' && event.detail.output) {
        const newAccountOutput = event.detail.output.find(o => o.name === 'newProvider');

        if (newAccountOutput && newAccountOutput.value) {
            this.addNewAccount(newAccountOutput.value);

            // Actualiza selectedSearchTerm para el Flow
            const fullName = `${newAccountOutput.value.FirstName || ''} ${newAccountOutput.value.LastName || ''}`.trim();
            this.searchTerm = fullName;

            const flowUpdate = new FlowAttributeChangeEvent('selectedSearchTerm', this.searchTerm);
            this.dispatchEvent(flowUpdate);
        }

        this.closeModal();
    }
} */

 /*   handleFlowStatusChange(event) {
    console.log('📦 Flow output:', JSON.stringify(event.detail, null, 2));


    if (event.detail.status && event.detail.status.includes('FINISHED')) {
        console.log('⚡ Flow status change fired:', event.detail.status);
        const newAccountOutput = event.detail.outputVariables?.find(o => o.name === 'provider');
        console.log('🔍 newAccountOutput:', newAccountOutput);

        if (newAccountOutput?.value) {
            console.log('⚡ New account from Flow:', newAccountOutput.value);
            this.addNewAccount(newAccountOutput.value);

            // Actualizar el valor en el input y notificar al Flow
            const fullName = `${newAccountOutput.value.FirstName || ''} ${newAccountOutput.value.LastName || ''}`.trim();
            this.searchTerm = fullName;
            console.log('🔍 searchTerm:', this.searchTerm);

            const flowUpdate = new FlowAttributeChangeEvent('selectedSearchTerm', this.searchTerm);
            this.dispatchEvent(flowUpdate);
            console.log('⚡ Flow attribute change dispatched:', flowUpdate);
        }
        console.log('✅ Flow status change finished');
        this.closeModal();
        console.log('✅ Modal closed');

    }
} */
handleFlowStatusChange(event) {
    console.log('📦 Flow output:', JSON.stringify(event.detail, null, 2));

    if (event.detail.status && event.detail.status.includes('FINISHED')) {
        console.log('⚡ Flow status change fired:', event.detail.status);
        const newAccountOutput = event.detail.outputVariables?.find(o => o.name === 'provider');
        console.log('🔍 newAccountOutput:', newAccountOutput);

        if (newAccountOutput?.value) {
            console.log('⚡ New account from Flow:', newAccountOutput.value);
            this.addNewAccount(newAccountOutput.value);

            try {
                const fullName = `${newAccountOutput.value.FirstName || ''} ${newAccountOutput.value.LastName || ''}`.trim();
                this.searchTerm = fullName;
                console.log('🔍 searchTerm:', this.searchTerm);

                const flowUpdate = new FlowAttributeChangeEvent('selectedSearchTerm', this.searchTerm);
                this.dispatchEvent(flowUpdate);
                console.log('⚡ Flow attribute change dispatched:', flowUpdate);
            } catch (error) {
                console.error('❌ Error building fullName or dispatching FlowAttributeChangeEvent:', error);
            }
        }

        console.log('✅ Flow status change finished');
        this.closeModal();
        console.log('✅ Modal closed');
    }
}


}