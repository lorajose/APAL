import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getFlowsAndCounts from '@salesforce/apex/FlowLauncherController.getFlowsAndCounts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'; 

export default class FlowLauncher extends NavigationMixin(LightningElement) {
    @api recordId; // ID del caso actual
    buttons = [];
    isMobile = false;

    connectedCallback() {
        // Usar window.matchMedia para detectar si el dispositivo es móvil
        this.checkIfMobile();
        // Agregar un listener de resize para reaccionar a cambios de tamaño
        window.addEventListener('resize', this.checkIfMobile.bind(this));
    }

    // Verificar si el dispositivo es móvil usando matchMedia
    checkIfMobile() {
        const mediaQuery = window.matchMedia('(max-width: 318px)');
        this.isMobile = mediaQuery.matches; // Establece isMobile como true si la pantalla es pequeña
        console.log(`Es móvil: ${this.isMobile}`);
    }

    @wire(getFlowsAndCounts, { caseId: '$recordId' })
    wiredFlows({ error, data }) {
        if (data) {
            this.buttons = data.map(item => ({
                key: item.objectName,
                label: `${item.objectLabel} (${item.recordCount})`,
                flowApiName: item.flowApiName
            }));
        } else if (error) {
            console.error('Error al cargar flujos:', error);
        }
    }
    handleButtonClick(event) {
        const flowApiName = event.target.dataset.flowName;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/flow/${flowApiName}?recordId=${this.recordId}`
            }
        });
    }

   // Computar el nombre de la clase para los botones
   get computeButtonClass() {
    const buttonClass = this.isMobile ? 'mobile-button' : 'desktop-button';
    
    // Mostrar el toast cuando cambie la clase
    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Clase de botón',
            message: `La clase de botón es: ${buttonClass}`,
            variant: 'info',
        })
    );
    
    return buttonClass;
}

}