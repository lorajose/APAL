import { LightningElement, api, track } from 'lwc';
//import { getRecordIdFromUrl } from 'c/utils';

export default class ButtonBarWithFlowModal extends LightningElement {
  @api recordId; // Automatically passed on record pages
  @track isModalOpen = false;
  @track selectedFlow = '';
  @track modalTitle = '';
  @track flowInputs = [];

  connectedCallback() {
    // Get the current record ID from the URL if not provided explicitly
    if (!this.recordId) {
      this.recordId = getRecordIdFromUrl();
    }
  }

  handleOpenConcern() {
    this.openFlowModal('Patient_Concerns', 'New Concern');
  }

  handleOpenMedication() {
    this.openFlowModal('Patient_Medications', 'New Medication');
  }

  handleOpenSubstance() {
    this.openFlowModal('Patient_Substances', 'New Substance');
  }

  handleOpenSafetyRisk() {
    this.openFlowModal('Patient_Safety_Risks', 'New Safety Risk');
  }

  handleOpenScreener() {
    this.openFlowModal('Patient_Screener', 'New Screener');
  }

  openFlowModal(flowApiName, title) {
    if (!this.recordId) {
      console.error('Record ID is missing. Flow cannot be launched.');
      return;
    }
    this.selectedFlow = flowApiName;
    this.modalTitle = title;
    this.flowInputs = [{ name: 'recordId', type: 'String', value: this.recordId }];
    this.isModalOpen = true;
  }

  handleCloseModal() {
    this.isModalOpen = false;
    this.selectedFlow = '';
    this.modalTitle = '';
    this.flowInputs = [];
  }
  handleFlowStatusChange(event) {
    // Check if the flow was finished or saved
    if (event.detail.status === 'FINISHED' || event.detail.status === 'FINISHED_SCREEN') {
      this.handleCloseModal();
    }
  }
}