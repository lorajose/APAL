import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getFlowsAndCounts from '@salesforce/apex/FlowLauncherController.getFlowsAndCounts';
//import { subscribe, unsubscribe, onError, setDebugFlag } from 'lightning/empApi';

export default class FlowLauncher extends NavigationMixin(LightningElement) {
    @api recordId; // ID del caso actual
    @track buttons = [];
    //isLoading = false;
    //subscription = null;
    //channelName = '/event/FlowStatusChange__e';

    connectedCallback() {
     //  this.refreshFlowsAndCounts();
       //this.subscribeToPlatformEvent();
    } 

    @wire(getFlowsAndCounts, { caseId: '$recordId' })
    wiredFlows({ error, data }) {
        if (data) {
            this.refreshFlowsAndCounts(data);
            console.log('data inside wire ', data);
        } else if (error) {
            console.error('Error al cargar flujos:', error);
        }
    }

   /*  disconnectedCallback() {
       this.unsubscribeFromPlatformEvent();
    } */

     // Este método actualiza los botones con los nuevos datos
     refreshFlowsAndCounts(data) {
        this.buttons = data.map(item => ({
            key: item.objectName,
            label: `${item.objectLabel} (${item.recordCount})`,
            flowApiName: item.flowApiName
        }));
    }

    // Llamar al Apex Controller para obtener los datos
    /* refreshFlowsAndCounts() {
        // this.isLoading = true;
         console.log('recordId ', this.recordId);
         getFlowsAndCounts({ caseId: this.recordId })
             .then((data) => {
                 console.log('data -> ', data);
                 if (!data || data.length === 0) {
                     console.warn('No flows found.');
                     this.buttons = [];
                 }else {
                     this.buttons = data.map(item => ({
                         key: item.objectName,
                         label: `${item.objectLabel} (${item.recordCount})`,
                         flowApiName: item.flowApiName
                     }));
                     console.log('buttons => ', this.buttons);
              }
             })
             .catch((error) => {
                 console.error('Error fetching flows and counts:', error);
             })
             .finally(() => {
                 this.isLoading = false;
             });
     } */

    handleButtonClick(event) {
        const flowApiName = event.target.dataset.flowName;
        console.log('Flow Open Event:', flowApiName); 
        const flowUrl = `/flow/${flowApiName}?recordId=${this.recordId}`;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: flowUrl
            }
        }
      );
    } 
    
    // Suscripción al Platform Event
    /* subscribeToPlatformEvent() {
        const messageCallback = (response) => {
            console.log('Nuevo evento recibido:', response);
            const message = response.data.payload;
            this.handleFlowStatusChange(message);
        };

        subscribe(this.channelName, -1, messageCallback)
            .then((response) => {
                console.log('Suscripción exitosa:', response.channel);
                this.subscription = response;
            })
            .catch((error) => {
                console.error('Error al suscribirse:', error);
            });

        onError((error) => {
            console.error('Error en Platform Event:', error);
        });
    } */


   /* handleFlowStatusChange(message) {
        console.log('Flow Status Change Event:', message);
        console.log('Actualizando los botones...', message.FlowName__c);
        this.refreshFlowsAndCounts();   // Mensaje de actualización de botones
        const actionsToNavigateBack = ['Save', 'Cancel'];
        alert('message.FlowName__c ' + message.FlowName__c);
        if (actionsToNavigateBack.includes(message.FlowName__c)) {
                this.navigateBackToRecord();
               // Actualizar los botones después de volver al caso
        }
    } */

  /*  navigateBackToRecord() {
        console.log('Record ID:', this.recordId); // Asegúrate de que este valor sea correcto
        // Navigate to a Salesforce record page
        // this[NavigationMixin.Navigate]({
        //     type: 'standard__recordPage',
        //     attributes: {
        //         recordId: this.recordId, // Use your actual record ID here
        //         objectApiName: 'Case', // Specify the object (e.g., Account)
        //         actionName: 'view' // Action to perform (e.g., view, edit)
        //     }
        // });
        let caseRecordIdURL = `com.salesforce.fieldservice://v1/sObject/${this.recordId}/details`;
        this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: caseRecordIdURL
                }
            }
        );
    } */

    // Desuscripción del Platform Event
   /* unsubscribeFromPlatformEvent() {
        if (this.subscription) {
            unsubscribe(this.subscription, (response) => {
                console.log('Desuscripción exitosa:', response);
            })
            .catch((error) => {
                console.error('Error al desuscribirse:', error);
            });
        }
    } */
}