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
    const searchInput = this.template.querySelector('c-account-search-input');
    console.log('🎯 outputVariables del Flow:', JSON.stringify(outputVariables));

    setTimeout(() => {
        try {
            let providerRecord = null;
            let practiceRecord = null;

            // 🧩 Leer variables devueltas del Flow
            outputVariables.forEach(outputVar => {
                if (outputVar.name === 'provider' && outputVar.value) {
                    providerRecord = outputVar.value;
                }
                if (outputVar.name === 'practiceRecordFull' && outputVar.value) {
                    practiceRecord = outputVar.value;
                }
            });

            // ✅ Provider principal
            if (providerRecord) {
                this.accountId = providerRecord.Id;
                this.accountRecord = null;

                if (searchInput && typeof searchInput.addNewAccount === 'function') {
                    searchInput.addNewAccount(providerRecord);
                }

                this.dispatchEvent(
                    new CustomEvent('accountselected', {
                        detail: {
                            accountId: providerRecord.Id,
                            accountRecord: providerRecord
                        },
                        bubbles: true,
                        composed: true
                    })
                );

                console.log(
                    '✅ Provider agregado correctamente:',
                    providerRecord.Name || `${providerRecord.FirstName || ''} ${providerRecord.LastName || ''}`
                );
            }

            // 🌐 Evento global Practice
            if (practiceRecord) {
                const displayName =
                    practiceRecord.Name ||
                    `${practiceRecord.FirstName || ''} ${practiceRecord.LastName || ''}`.trim();

                window.dispatchEvent(
                    new CustomEvent('practiceselected', {
                        detail: {
                            practiceId: practiceRecord.Id,
                            practiceRecord: practiceRecord
                        }
                    })
                );

                // 🔁 Notificar al Flow principal para persistirlo
            this.dispatchEvent(new FlowAttributeChangeEvent('practiceRecord', this.practiceRecord));
            this.dispatchEvent(new FlowAttributeChangeEvent('practiceId', this.practiceId));

            console.log('📩 Flow principal actualizado con nuevo Practice.');

                console.log('🌐 Practice global event dispatched:', displayName);
            } else {
                console.warn('⚠️ No se encontró practiceRecord en outputVariables');
            }

        } catch (e) {
            console.warn('⚠️ Error controlado en finishAction:', e);
        }
    }, 350);
};




  /*  finishAction = ({ outputVariables }) => {
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
                        // 🔊 Notificar globalmente el nuevo Practice
window.dispatchEvent(new CustomEvent('practicecreated', {
  detail: { practiceId: practice.Id, practiceRecord: practice }
}));
            }
        });
    } */
}