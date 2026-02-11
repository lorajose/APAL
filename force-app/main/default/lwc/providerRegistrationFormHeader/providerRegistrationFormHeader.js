import { LightningElement } from 'lwc';
import PROVIDER_FORM from '@salesforce/resourceUrl/provider_form';

export default class ProviderRegistrationFormHeader extends LightningElement {
    // Definimos las rutas desde el Static Resource
    logoUrl = `${PROVIDER_FORM}/provider_form/healthhaven-logo.png`;
    faviconUrl = `${PROVIDER_FORM}/provider_form/favicon.ico`; 

    connectedCallback() {
        // Aumentamos un poco el tiempo para ganar la carrera al render de Salesforce
        setTimeout(() => {
            document.title = 'HealthHaven Registration';
            this.forceFavicon(this.faviconUrl);
        }, 1200);
    }

    forceFavicon(url) {
        // 1. Eliminar iconos existentes para evitar conflictos
        const existingIcons = document.querySelectorAll("link[rel*='icon']");
        existingIcons.forEach(icon => icon.parentNode.removeChild(icon));

        // 2. Crear el nuevo link apuntando a nuestro Static Resource
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'icon'; 
        link.href = url;

        document.head.appendChild(link);
        
        // 3. Truco extra: Algunos navegadores necesitan rel="shortcut icon" también
        const shortcutLink = document.createElement('link');
        shortcutLink.rel = 'shortcut icon';
        shortcutLink.href = url;
        document.head.appendChild(shortcutLink);
    }
}