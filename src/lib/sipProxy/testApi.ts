import * as webApi from "./outbound.webApi";


let contact= {
  id: '358880032664586^3B@566a1d522b06654d4fc546bd08709b1d',
  uri: 'sip:358880032664586@172.20.10.10:48897;transport=tls;app-id=851039092461;pn-type=firebase;pn-tok=coDkwCraEFc:APA91bEOOaMkoe_ddMQRxtiZzZiVQr5wFshQYVhJSYHPKufRvQIunBsgxPiXemF18iUUkmBKkckq0f57Nc52QSHOBxu-cOhiB7EzbxRLowFLJzrA6quQNnhIC3xLbNov6NmKZ4LU4fOT',
  path: '<sip:192.168.0.20:37920;transport=TCP;lr>,  <sip:outbound-proxy.socket:50610;flowtoken=f58d1c870b4e504e6047301bcfe17647;transport=TLS;lr>',
  endpoint: '358880032664586',
  user_agent: 'user-agent=LinphoneAndroid/3.2.7 (belle-sip/1.6.1)_endpoint=358880032664586_+sip.instance="<urn:uuid:3d181f29-48a8-4076-945b-459f7b0cf191>"',
  via_port: 48897 
};

webApi.wakeUpDevice.run(contact).then(status=> console.log({ status }));