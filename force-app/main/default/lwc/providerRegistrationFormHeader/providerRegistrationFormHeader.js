import { LightningElement } from 'lwc';
import PROVIDER_FORM from '@salesforce/resourceUrl/provider_form';

export default class ProviderRegistrationFormHeader extends LightningElement {
    logoUrl = `${PROVIDER_FORM}/provider_form/healthhaven-logo.png`;
}