import { LightningElement, api, track } from 'lwc';

export default class ModalFlowButton extends LightningElement {
    @api label;
    @api variant = 'brand';
    @api flowApiName;
    @api finishAction; // Callback del padre (por ejemplo practiceInCaseFlow)

    @track isModalOpen = false;

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleStatusChange(event) {
        const status = event.detail.status;

        if (status === 'FINISHED_SCREEN' || status === 'FINISHED') {
            const outputVariables = event.detail.outputVariables || [];

            console.log('✅ Flow finished, outputVariables:', JSON.stringify(outputVariables));
            console.log('✅ Jose Lora:', JSON.stringify(event.detail));     
                   // 🧩 1️⃣ Llamar el callback del padre (si está definido)
            if (this.finishAction && typeof this.finishAction === 'function') {
                try {
                    this.finishAction({ outputVariables });
                    console.log('🧠 Flow Name:', this.flowApiName);
                    console.log('📤 Output Variables:', event.detail.outputVariables);

                } catch (error) {
                    console.error('Error in finishAction callback:', error);
                }
            }

            // 🧩 2️⃣ Enviar evento al padre (segundo mecanismo, como el Provider)
            this.dispatchEvent(
                new CustomEvent('finish', {
                    detail: { outputVariables }
                })
            );

            // 🧩 3️⃣ Cerrar el modal solo después del dispatch
            setTimeout(() => this.closeModal(), 150);
        }
    }
}