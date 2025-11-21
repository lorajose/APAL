public with sharing class ProviderRegistrationController {

    // 👇 Usa tu SECRET KEY de reCAPTCHA v2
    private static final String RECAPTCHA_SECRET = '6LerTNcqAAAAAFuX7hybW7c9OnmEBm8GeNmkMOQ0';
    private static final String RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

    @AuraEnabled
    public static String submitLead(String jsonPayload, String recaptchaToken) {
        if (String.isBlank(recaptchaToken)) {
            throw new AuraHandledException('Please complete the reCAPTCHA.');
        }

        // 1) Validar reCAPTCHA en Google
        if (!validateRecaptcha(recaptchaToken)) {
            throw new AuraHandledException('reCAPTCHA validation failed.');
        }

        // 2) Parsear los datos del formulario
        Map<String, Object> raw = (Map<String, Object>) JSON.deserializeUntyped(jsonPayload);

        // 3) Construir el cuerpo para Web-to-Lead
        Map<String, String> params = new Map<String, String>();
        params.put('oid', '00D820000008huw');
        params.put('retURL', 'https://www.msv.org/programs/apal/');

        // Mapear todos los campos por name (exacto al HTML)
        for (String key : raw.keySet()) {
            Object val = raw.get(key);
            if (val == null) continue;

            String s = String.valueOf(val);
            if (String.isBlank(s)) continue;

            params.put(key, s);
        }

        // 4) Construir body x-www-form-urlencoded
        String body = '';
        for (String key : params.keySet()) {
            if (body != '') body += '&';
            body += key + '=' + EncodingUtil.urlEncode(params.get(key), 'UTF-8');
        }

        // 5) Callout a Web-to-Lead
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setBody(body);

        Http http = new Http();
        HTTPResponse res = http.send(req);

        if (res.getStatusCode() >= 200 && res.getStatusCode() < 300) {
            return 'OK';
        } else {
            throw new AuraHandledException('Web-to-Lead error: ' + res.getStatus() + ' ' + res.getBody());
        }
    }

    // 🔒 Valida el token contra Google
    private static Boolean validateRecaptcha(String token) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(RECAPTCHA_VERIFY_URL);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');

        String body = 'secret=' + EncodingUtil.urlEncode(RECAPTCHA_SECRET, 'UTF-8')
                    + '&response=' + EncodingUtil.urlEncode(token, 'UTF-8');
        req.setBody(body);

        Http http = new Http();
        HTTPResponse res = http.send(req);

        if (res.getStatusCode() != 200) {
            System.debug('reCAPTCHA HTTP error: ' + res.getStatus());
            return false;
        }

        Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        Boolean success = (Boolean) result.get('success');

        return success == true;
    }
}