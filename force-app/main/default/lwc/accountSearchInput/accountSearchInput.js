import {LightningElement, track, api} from 'lwc';
import getAccounts from '@salesforce/apex/AccountSearchInputControllerApal.retrieveAllAccounts';
import getHelpText from '@salesforce/apex/AccountSearchInputControllerApal.getInputHelpTextContent';
import getCurrentAccount from '@salesforce/apex/AccountSearchInputControllerApal.getCurrentAccountRecord';

export default class AccountSearchDropdown extends LightningElement {
    @api recordId;
    @api accountRecord;
    @track searchTerm = '';
    @track showDropdown = false;
    @track selectedAccount = null;
    @track allAccounts = [];

    @track originalAccounts = [];
    @track showError = false;
    @track helpTextContent;
    @track isExternalRetrieveSuccessful;

    @api isFromFlow = false;

    connectedCallback() {
        getAccounts()
            .then((result) => {
                this.originalAccounts = result.accounts;
                this.allAccounts = result.accounts.map(acc => ({
                    id: acc.Id || acc.AccountSync_Id__c,
                    firstName: acc.FirstName || '',
                    middleName: acc.MiddleName || '',
                    lastName: acc.LastName || '',
                    suffix: acc.Suffix || '',
                    email: acc.PersonEmail || '',
                    phone: acc.Phone || '',
                    npi: acc.pcpnpi__c || '',
                    org: acc.Id ? 'VMAP' : 'APAL'
                }));
                if (this.accountRecord) {
                    const formatted = {
                        id: this.accountRecord.Id || this.accountRecord.AccountSync_Id__c,
                        firstName: this.accountRecord.FirstName || '',
                        middleName: this.accountRecord.MiddleName || '',
                        lastName: this.accountRecord.LastName || '',
                        suffix: this.accountRecord.Suffix || '',
                        email: this.accountRecord.PersonEmail || '',
                        phone: this.accountRecord.Phone || '',
                        npi: this.accountRecord.pcpnpi__c || '',
                        org: this.accountRecord.Id ? 'VMAP' : 'APAL'
                    };
                    this.selectedAccount = formatted;
                    this.searchTerm = `${formatted.firstName} ${formatted.middleName ? formatted.middleName + '' : ''}${formatted.lastName}${formatted.suffix ? ', ' + formatted.suffix : ''}`;
                    this.processSelect(formatted.id);
                } else {
                    const initialPopulationEvent = new CustomEvent('initialpopulation', {
                        bubbles: true,
                        composed: true
                    });
                    this.dispatchEvent(initialPopulationEvent);
                }

                this.isExternalRetrieveSuccessful = result.isExternalRetrieveSuccessful;
                const loadingEndEvent = new CustomEvent('loadingend', {
                    bubbles: true,
                    composed: true
                });
                if (this.recordId) {
                    console.log('Calling getCurrentAccount with recordId:', this.recordId);
                    getCurrentAccount({recordId: this.recordId})
                        .then(currentAccount => {
                            const formatted = {
                                id: currentAccount.Id || currentAccount.AccountSync_Id__c,
                                firstName: currentAccount.FirstName || '',
                                middleName: currentAccount.MiddleName || '',
                                lastName: currentAccount.LastName || '',
                                suffix: currentAccount.Suffix || '',
                                email: currentAccount.PersonEmail || '',
                                phone: currentAccount.Phone || '',
                                npi: currentAccount.pcpnpi__c || '',
                                org: currentAccount.Id ? 'VMAP' : 'APAL'
                            };
                            this.selectedAccount = formatted;
                            this.searchTerm = `${formatted.firstName} ${formatted.middleName ? formatted.middleName + '' : ''}${formatted.lastName}${formatted.suffix ? ', ' + formatted.suffix : ''}`;
                            const loadingEndEventSuccess = new CustomEvent('loadingend', {
                                detail: {
                                    accountId: currentAccount.Id,
                                },
                                bubbles: true,
                                composed: true
                            });
                            this.dispatchEvent(loadingEndEventSuccess);
                        })
                        .catch(error => {
                            this.dispatchEvent(loadingEndEvent);
                              console.error('Error fetching current account:', JSON.stringify(error, null, 2));
                            console.error('Error fetching current account:', error);
                        });
                } else {
                    this.dispatchEvent(loadingEndEvent);
                }
            })
            .catch((error) => {
                console.error('Error loading accounts:', error);
            });

        getHelpText()
            .then((data) => {
                this.helpTextContent = data;
            })
            .catch((error) => {
                console.error('Error loading settings:', error);
            });
    } 

    get inputLockStyle() {
        return this.selectedAccount ? 'pointer-events: none;' : '';
    }

    get dropdownClass() {
        return this.isFromFlow
            ? 'slds-listbox dropdown-scrollable slds-listbox_vertical slds-dropdown slds-dropdown_fluid slds-dropdown_left'
            : 'slds-listbox custom-dropdown-fixed slds-listbox_vertical slds-dropdown_fluid slds-dropdown_left';
    }

    get shouldShowError() {
        return this.showError && !this.showDropdown;
    }

    get filteredVMAPAccounts() {
        return this.filterAccounts('APAL');
    }

    get filteredAPALAccounts() {
        return this.filterAccounts('VMAP');
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
        console.log('handleSelect');
        console.log('event.currentTarget.dataset.id: ' + event.currentTarget.dataset.id);
        this.processSelect(event.currentTarget.dataset.id);

    }

    processSelect(selectedId) {
        const account = this.allAccounts.find(acc => acc.id === selectedId);
        const originalAccount = this.originalAccounts.find(acc =>
            acc.Id === selectedId || acc.AccountSync_Id__c === selectedId
        );
        const matchingOriginal = this.originalAccounts.find(acc =>
            acc.AccountSync_Id__c === selectedId && acc.Id
        );
        const finalAccountId = matchingOriginal ? matchingOriginal.Id : account.id;

        this.searchTerm = `${account.firstName} ${account.middleName ? account.middleName + '' : ''}${account.lastName}${account.suffix ? '' + account.suffix : ''}`;
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

                const cleanedPhone = acc.phone.replace(/\D/g, '');
                const cleanedSearchTerm = term.replace(/\D/g, '');

                const matchesPhone =
                    cleanedSearchTerm.length >= 3 && cleanedPhone.includes(cleanedSearchTerm);

                const matchesOtherFields =
                    acc.email.toLowerCase().includes(term) ||
                    matchesPhone ||
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

    get shouldShowSelectOrClearMessage() {
        return this.showError && this.searchTerm && !this.selectedAccount;
    }

    @api
    addNewAccount(newAccount) {
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
        this.searchTerm =
            `${formatted.firstName}` +
            `${formatted.middleName ? ' ' + formatted.middleName : ''}` +
            `${formatted.lastName ? ' ' + formatted.lastName : ''}` +
            `${formatted.suffix ? ', ' + formatted.suffix : ''}`;
        this.showDropdown = false;
        this.showError = false;
    }

    @api
    setPreSelectedAccount(accountRecordId) {
        this.processSelect(accountRecordId)
    }
}