/**
 * @author Artem Shevchenko
 * @date 02.25.2025
 *
 * @description A utility service for constructing and sending HTTP callout requests.
 * Provides a fluent interface for setting request parameters.
 */
public with sharing class CalloutService {

    public static final Integer STATUS_CODE_200 = 200;
    public static final Integer STATUS_CODE_400 = 400;
    public static final Integer STATUS_CODE_401 = 401;
    public static final Integer STATUS_CODE_404 = 404;

    public static final Set<Integer> CONNECTION_ISSUES_STATUS_CODES = new Set<Integer>{
            STATUS_CODE_401,
            STATUS_CODE_404
    };

    private static final String METHOD_POST = 'POST';
    private static final String METHOD_GET = 'GET';
    private static final String HEADER_CONTENT_TYPE = 'Content-Type';
    private static final String CONTENT_TYPE_JSON = 'application/json';

    /**
     * @description Creates a new POST request instance.
     * @return A configured RequestInstance object for a POST request.
     */
    public RequestInstance createPOSTRequest() {
        return this.createRequest(METHOD_POST);
    }

    public RequestInstance createGETRequest() {
        return this.createRequest(METHOD_GET);
    }

    /**
     * @description Sends an HTTP request.
     * @param requestInstance The RequestInstance containing the request configuration.
     * @return HttpResponse The response from the external system.
     */
    public HttpResponse sendRequest(RequestInstance requestInstance) {
        return new Http().send(requestInstance.request);
    }

    public void setRestResponse(Integer statusCode, Object body, RestResponse response) {
        response.statusCode = statusCode;
        response.responseBody = Blob.valueOf(JSON.serialize(body));
    }

    /**
     * @description Creates a new request instance with the specified HTTP method.
     * @param method The HTTP method (e.g., POST, GET).
     * @return A configured RequestInstance object.
     */
    private RequestInstance createRequest(String method) {
        return new RequestInstance(method);
    }

    /**
     * @description Represents an HTTP request instance.
     */
    public class RequestInstance {
        public HttpRequest request;

        /**
         * @description Initializes a new RequestInstance with the specified HTTP method.
         * @param method The HTTP method (e.g., POST, GET).
         */
        public RequestInstance(String method) {
            this.request = new HttpRequest();
            this.request.setHeader(HEADER_CONTENT_TYPE, CONTENT_TYPE_JSON);
            this.request.setMethod(method);
        }

        /**
         * @description Sets the endpoint for the request.
         * @param endpoint The API endpoint URL.
         * @return The updated RequestInstance object.
         */
        public RequestInstance setEndpoint(String endpoint) {
            this.request.setEndpoint(endpoint);
            return this;
        }

        /**
         * @description Sets the request body.
         * @param body The JSON string representing the request payload.
         * @return The updated RequestInstance object.
         */
        public RequestInstance setBody(String body) {
            this.request.setBody(body);
            return this;
        }
    }
}