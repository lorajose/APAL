import { LightningElement } from 'lwc';

export default class ProviderFormLoader extends LightningElement {

    rendered = false;

    renderedCallback() {
        if (this.rendered) return;
        this.rendered = true;

        // Espera a que LWR termine de construir el DOM
        setTimeout(() => {
            this.initLoader();
        }, 250); // 250 ms = perfecto para LWR
    }

    initLoader() {

        console.log('🚀 Provider Form Loader initialized');

        // Load CSS
        this.safeCss('/sfsites/c/resource/provider_form/styles.css');

        // Load form JS
        this.safeJs('/sfsites/c/resource/provider_form/form.js')

        // Load recaptcha wrapper
        .then(() => this.safeJs('/sfsites/c/resource/provider_form/recaptcha.js'))

        // Load Google API
        .then(() => this.safeJs(
            'https://www.google.com/recaptcha/api.js?onload=recaptchaLoadCallback&render=explicit'
        ))

        .catch(err => {
            console.error('❌ providerFormLoader failed:', err);
        });
    }

    safeJs(url) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = () => {
                console.log('JS loaded:', url);
                resolve();
            }
            s.onerror = () => {
                console.error('❌ JS failed:', url);
                reject(url);
            };
            document.head.appendChild(s);
        });
    }

    safeCss(url) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = url;
        document.head.appendChild(l);
        console.log('CSS loaded:', url);
    }
}