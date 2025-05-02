/**
 * Created by ArtemShevchenko on 02.04.2025.
 */

import {LightningElement, api, track} from 'lwc';

export default class ExternalAccountCreationError extends LightningElement {
    @track showDetails = false;
    @api errorMessage;
    @api errorHeader;

    get errorHeaderText() {
        return this.errorHeader
            ? this.errorHeader
            : 'We ran into a problem creating the VMAP account. Check the details below for more information.';
    }

    toggleErrorDetails() {
        this.showDetails = !this.showDetails;
    }

    get toggleLabel() {
        return this.showDetails ? 'Hide details' : 'See details';
    }
}