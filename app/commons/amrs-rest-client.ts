import btoa from 'btoa';
import { AxiosResponse, AxiosRequestConfig } from 'axios';

import * as config from "../../configs/config.json";

import  HttpClient  from './http-client';

 
const token = btoa( config.openmrs.username + ':' + config.openmrs.password);

const openmrsProtocol = config.openmrs.https ? 'https' : 'http';
const appName = config.openmrs.applicationName || 'amrs';
const amrsBaseUrl = openmrsProtocol + '://' + config.openmrs.host + ':'
        + config.openmrs.port + '/' + appName;
console.log('baseUrl: '+ amrsBaseUrl);

export default class AmrsRestClient extends HttpClient {
    constructor() {
		super(amrsBaseUrl);
		this.initializeResponseInterceptor();
		this.initializeRequestInterceptor();
	}

	private initializeResponseInterceptor = () => {
		this.axios.interceptors.response.use(this.handleResponse, this.handleError);
	};

	private initializeRequestInterceptor = () => {
		this.axios.interceptors.request.use(this.handleRequest, this.handleError);
	};

	private handleRequest = (config: AxiosRequestConfig) => {
		config.headers['Authorization'] = 'Basic ' + token;

		return config;
	};

	private handleResponse = ({ data }: AxiosResponse) => data;
}
