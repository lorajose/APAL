import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getFlowsAndCounts from '@salesforce/apex/FlowLauncherController.getFlowsAndCounts';

export default class FlowLauncher extends NavigationMixin(LightningElement) {
    @api recordId; // ID del caso actual
    @track buttons = []; // Lista de botones generados dinámicamente

    // Usamos el wire para obtener los flujos y contadores automáticamente
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

    // Método para refrescar el componente cuando se necesite (por ejemplo, con un botón)
    handleRefresh() {
        // Refresca los datos manualmente, usando el método wire
        getFlowsAndCounts({ caseId: this.recordId })
        .then((data) => {
            if (data) {
                this.buttons = data.map(item => ({
                    key: item.objectName,
                    label: `${item.objectLabel} (${item.recordCount})`,
                    flowApiName: item.flowApiName,
                }));
            } else {
                alert('No se cargaron flujos');
            }
        })
        .catch((error) => {
            console.error('Error al cargar flujos:', error);
        });
    }

    handleButtonClick(event) {
        const flowApiName = event.target.dataset.flowName;
        const flowUrl = `/flow/${flowApiName}?recordId=${this.recordId}`;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: flowUrl 
            }
        });
    }

    // Si necesitas un refresco cada vez que se renderiza el componente, puedes usar 'renderedCallback'
    renderedCallback() {
        // Aquí puedes refrescar los datos si es necesario
        // Asegúrate de que no lo estés llamando en un bucle infinito
        this.handleRefresh();
    }
}