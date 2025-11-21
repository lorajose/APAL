import { LightningElement } from 'lwc';
import PROVIDER_FORM from '@salesforce/resourceUrl/provider_form';

export default class ProviderRegistrationFormFooter extends LightningElement {

    // Logos dentro del ZIP
    dbhdsLogo = `${PROVIDER_FORM}/provider_form/DBHDS-Logo.png`;
    msvLogo = `${PROVIDER_FORM}/provider_form/msv-crop.png`;
    apalLogo = `${PROVIDER_FORM}/provider_form/HH-APAL_Logo.png`;
    mcLogo = `${PROVIDER_FORM}/provider_form/mc-logo.png`; // AJUSTA EL NOMBRE EXACTO SI CAMBIA

}